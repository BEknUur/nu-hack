from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any

import numpy as np

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from services.best_side.features import CARDINALS, extract_feature_vector, parse_feature_polygons


@dataclass(frozen=True)
class Sample:
    sample_id: str
    features: np.ndarray
    label: int


def softmax(logits: np.ndarray) -> np.ndarray:
    shifted = logits - logits.max(axis=1, keepdims=True)
    exp = np.exp(shifted)
    return exp / exp.sum(axis=1, keepdims=True)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def get_feature_id(feature: dict[str, Any]) -> str:
    props = feature.get("properties") or {}
    raw_id = feature.get("id") or props.get("id") or props.get("@id")
    return str(raw_id)


def build_samples(geojson_path: Path, summary_path: Path) -> tuple[list[Sample], list[str], date]:
    geojson = load_json(geojson_path)
    summary = load_json(summary_path)

    summary_by_id = {
        str(building["id"]): building
        for building in summary.get("buildings", [])
        if building.get("id")
    }
    feature_by_id = {
        get_feature_id(feature): feature
        for feature in geojson.get("features", [])
    }

    feature_date = datetime.fromisoformat(summary["meta"]["date"]).date()
    samples: list[Sample] = []
    dropped = 0

    for building_id, building in summary_by_id.items():
        feature = feature_by_id.get(building_id)
        if not feature:
            dropped += 1
            continue

        polygons = parse_feature_polygons(feature)
        if not polygons:
            dropped += 1
            continue

        center = building.get("center") or {}
        center_tuple = (
            float(center.get("lng", 0.0)),
            float(center.get("lat", 0.0)),
        )
        height = float(building.get("height", 3.0))
        x = extract_feature_vector(
            polygons,
            center=center_tuple,
            height=height,
            feature_date=feature_date,
            tz_offset_hours=int(summary["meta"].get("timezoneOffsetHours", 5)),
        )
        label_name = str(building.get("bestSide", "S"))
        label_idx = CARDINALS.index(label_name) if label_name in CARDINALS else CARDINALS.index("S")
        samples.append(Sample(sample_id=building_id, features=x, label=label_idx))

    if not samples:
        raise RuntimeError("No training samples were built from the static dataset")

    if dropped:
        print(f"Dropped {dropped} buildings with missing geometry or labels")

    return samples, CARDINALS, feature_date


def split_samples(samples: list[Sample], seed: int, val_ratio: float = 0.2) -> tuple[list[int], list[int]]:
    rng = np.random.default_rng(seed)
    indices = np.arange(len(samples))
    rng.shuffle(indices)
    split = max(1, int(len(indices) * (1.0 - val_ratio)))
    train_idx = indices[:split].tolist()
    val_idx = indices[split:].tolist()
    if not val_idx:
        val_idx = train_idx[-max(1, len(train_idx) // 10):]
    return train_idx, val_idx


def accuracy(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float((y_true == y_pred).mean())


def macro_f1(y_true: np.ndarray, y_pred: np.ndarray, n_classes: int) -> float:
    f1s: list[float] = []
    for cls in range(n_classes):
        tp = float(np.sum((y_true == cls) & (y_pred == cls)))
        fp = float(np.sum((y_true != cls) & (y_pred == cls)))
        fn = float(np.sum((y_true == cls) & (y_pred != cls)))
        precision = tp / (tp + fp) if tp + fp > 0 else 0.0
        recall = tp / (tp + fn) if tp + fn > 0 else 0.0
        if precision + recall == 0:
            f1s.append(0.0)
        else:
            f1s.append(2.0 * precision * recall / (precision + recall))
    return float(sum(f1s) / len(f1s))


def train_model(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    *,
    epochs: int,
    learning_rate: float,
    l2: float,
    seed: int,
) -> tuple[np.ndarray, np.ndarray, dict[str, float]]:
    n_samples, n_features = X_train.shape
    n_classes = int(y_train.max()) + 1
    rng = np.random.default_rng(seed)

    feature_mean = X_train.mean(axis=0)
    feature_std = X_train.std(axis=0)
    feature_std = np.where(feature_std < 1e-8, 1.0, feature_std)

    X_train_n = (X_train - feature_mean) / feature_std
    X_val_n = (X_val - feature_mean) / feature_std

    class_counts = np.bincount(y_train, minlength=n_classes).astype(np.float64)
    class_weights = np.zeros_like(class_counts)
    np.divide(
        n_samples,
        n_classes * class_counts,
        out=class_weights,
        where=class_counts > 0,
    )
    sample_weights = class_weights[y_train]

    weights = rng.normal(0.0, 0.01, size=(n_features, n_classes))
    bias = np.zeros(n_classes, dtype=np.float64)

    m_w = np.zeros_like(weights)
    v_w = np.zeros_like(weights)
    m_b = np.zeros_like(bias)
    v_b = np.zeros_like(bias)
    beta1 = 0.9
    beta2 = 0.999
    eps = 1e-8
    best_state: tuple[np.ndarray, np.ndarray] | None = None
    best_val = -1.0
    patience = 30
    no_improve = 0

    eye = np.eye(n_classes, dtype=np.float64)

    for epoch in range(1, epochs + 1):
        logits = X_train_n @ weights + bias
        probs = softmax(logits)
        y_onehot = eye[y_train]
        grad_logits = (probs - y_onehot) * sample_weights[:, None] / n_samples
        grad_w = X_train_n.T @ grad_logits + l2 * weights
        grad_b = grad_logits.sum(axis=0)

        m_w = beta1 * m_w + (1.0 - beta1) * grad_w
        v_w = beta2 * v_w + (1.0 - beta2) * (grad_w * grad_w)
        m_b = beta1 * m_b + (1.0 - beta1) * grad_b
        v_b = beta2 * v_b + (1.0 - beta2) * (grad_b * grad_b)

        m_w_hat = m_w / (1.0 - beta1**epoch)
        v_w_hat = v_w / (1.0 - beta2**epoch)
        m_b_hat = m_b / (1.0 - beta1**epoch)
        v_b_hat = v_b / (1.0 - beta2**epoch)

        weights -= learning_rate * m_w_hat / (np.sqrt(v_w_hat) + eps)
        bias -= learning_rate * m_b_hat / (np.sqrt(v_b_hat) + eps)

        val_probs = softmax(X_val_n @ weights + bias)
        val_pred = val_probs.argmax(axis=1)
        val_acc = accuracy(y_val, val_pred)

        if val_acc > best_val + 1e-6:
            best_val = val_acc
            best_state = (weights.copy(), bias.copy())
            no_improve = 0
        else:
            no_improve += 1

        if epoch % 10 == 0 or epoch == 1 or epoch == epochs:
            train_pred = (softmax(X_train_n @ weights + bias)).argmax(axis=1)
            train_acc = accuracy(y_train, train_pred)
            train_f1 = macro_f1(y_train, train_pred, n_classes)
            val_f1 = macro_f1(y_val, val_pred, n_classes)
            print(
                f"epoch={epoch:03d} "
                f"train_acc={train_acc:.4f} train_f1={train_f1:.4f} "
                f"val_acc={val_acc:.4f} val_f1={val_f1:.4f}"
            )

        if no_improve >= patience:
            print(f"Early stopping at epoch {epoch}; best val_acc={best_val:.4f}")
            break

    if best_state is not None:
        weights, bias = best_state

    metrics = {
        "val_accuracy": float(best_val),
    }
    return feature_mean, feature_std, {"weights": weights, "bias": bias, **metrics}


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the best-side classifier from the static shadow dataset")
    parser.add_argument(
        "--geojson",
        default=str((BACKEND_ROOT.parent / "dataset" / "output" / "block-buildings.geojson").resolve()),
        help="Path to the annotated building GeoJSON",
    )
    parser.add_argument(
        "--summary",
        default=str((BACKEND_ROOT.parent / "dataset" / "output" / "block-summary.json").resolve()),
        help="Path to the summary JSON that contains labels",
    )
    parser.add_argument(
        "--output",
        default=str((BACKEND_ROOT / "services" / "best_side" / "artifacts" / "best_side_model.json").resolve()),
        help="Where to write the trained artifact",
    )
    parser.add_argument("--epochs", type=int, default=180, help="Training epochs")
    parser.add_argument("--learning-rate", type=float, default=0.03, help="Adam step size")
    parser.add_argument("--l2", type=float, default=0.0005, help="L2 regularization strength")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    samples, classes, feature_date = build_samples(Path(args.geojson), Path(args.summary))
    train_idx, val_idx = split_samples(samples, seed=args.seed)

    X = np.stack([sample.features for sample in samples]).astype(np.float64)
    y = np.asarray([sample.label for sample in samples], dtype=np.int64)

    X_train = X[train_idx]
    y_train = y[train_idx]
    X_val = X[val_idx]
    y_val = y[val_idx]

    feature_mean, feature_std, trained = train_model(
        X_train,
        y_train,
        X_val,
        y_val,
        epochs=args.epochs,
        learning_rate=args.learning_rate,
        l2=args.l2,
        seed=args.seed,
    )

    weights = trained["weights"]
    bias = trained["bias"]
    X_norm = (X - feature_mean) / feature_std
    probs = softmax(X_norm @ weights + bias)
    preds = probs.argmax(axis=1)
    train_acc = accuracy(y, preds)
    train_f1 = macro_f1(y, preds, len(classes))

    artifact = {
        "version": "1.0.0",
        "model_type": "softmax_regression",
        "classes": classes,
        "feature_names": [
            "log_area",
            "log_perimeter",
            "compactness",
            "bbox_width_m",
            "bbox_height_m",
            "bbox_aspect_ratio",
            "height_m",
            "center_lat",
            "center_lng",
            "edge_share_n",
            "edge_share_e",
            "edge_share_s",
            "edge_share_w",
            "month_sin",
            "month_cos",
            "day_sin",
            "day_cos",
        ],
        "feature_mean": feature_mean.tolist(),
        "feature_std": feature_std.tolist(),
        "weights": weights.tolist(),
        "bias": bias.tolist(),
        "metrics": {
            "train_accuracy": train_acc,
            "train_macro_f1": train_f1,
            "val_accuracy": trained["val_accuracy"],
        },
        "dataset": {
            "samples": len(samples),
            "train_samples": len(train_idx),
            "val_samples": len(val_idx),
            "feature_date": feature_date.isoformat(),
        },
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(artifact, indent=2), encoding="utf-8")
    print(f"Saved best-side model artifact to {output_path}")
    print(json.dumps(artifact["metrics"], indent=2))


if __name__ == "__main__":
    main()
