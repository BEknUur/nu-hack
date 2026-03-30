from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any, Literal

import numpy as np

from .features import PolygonInput, extract_feature_vector, parse_feature_polygons

Side = Literal["N", "E", "S", "W"]
SIDES: tuple[Side, ...] = ("N", "E", "S", "W")

ARTIFACT_PATH = Path(__file__).resolve().parent / "artifacts" / "best_side_model.json"


@dataclass(frozen=True)
class BestSidePrediction:
    best_side: Side
    confidence: float
    probabilities: dict[Side, float]
    model_version: str
    source: str


class BestSideModel:
    def __init__(self, artifact: dict[str, Any]) -> None:
        self.artifact = artifact
        self.version = str(artifact.get("version", "unknown"))
        self.feature_names = list(artifact["feature_names"])
        self.classes: list[Side] = [str(side) for side in artifact["classes"]]
        self.mean = np.asarray(artifact["feature_mean"], dtype=np.float64)
        self.std = np.asarray(artifact["feature_std"], dtype=np.float64)
        self.weights = np.asarray(artifact["weights"], dtype=np.float64)
        self.bias = np.asarray(artifact["bias"], dtype=np.float64)

    @classmethod
    def load(cls, path: Path = ARTIFACT_PATH) -> "BestSideModel":
        if not path.exists():
            raise FileNotFoundError(f"Best-side model artifact not found: {path}")
        return cls(json.loads(path.read_text(encoding="utf-8")))

    def predict_proba(self, x: np.ndarray) -> np.ndarray:
        if x.ndim == 1:
            x = x.reshape(1, -1)
        x_norm = (x - self.mean) / self.std
        logits = x_norm @ self.weights + self.bias
        logits = logits - logits.max(axis=1, keepdims=True)
        exp = np.exp(logits)
        return exp / exp.sum(axis=1, keepdims=True)

    def predict_from_polygons(
        self,
        polygons: list[PolygonInput],
        *,
        center: tuple[float, float] | None,
        height: float,
        feature_date: date,
        tz_offset_hours: int = 5,
    ) -> BestSidePrediction:
        x = extract_feature_vector(
            polygons,
            center=center,
            height=height,
            feature_date=feature_date,
            tz_offset_hours=tz_offset_hours,
        )
        probabilities = self.predict_proba(x)[0]
        best_idx = int(np.argmax(probabilities))
        proba_map = {
            side: float(probabilities[idx])
            for idx, side in enumerate(self.classes)
        }
        best_side = self.classes[best_idx]
        return BestSidePrediction(
            best_side=best_side,
            confidence=float(probabilities[best_idx]),
            probabilities=proba_map,
            model_version=self.version,
            source="ml",
        )

    @classmethod
    def from_selected_building(
        cls,
        building: dict[str, Any],
        *,
        date_value: date,
        tz_offset_hours: int = 5,
    ) -> tuple[np.ndarray, list[Side]]:
        polygons = [
            PolygonInput(
                outer=[tuple(map(float, point)) for point in polygon["outer"]],
                holes=[
                    [tuple(map(float, point)) for point in hole]
                    for hole in polygon.get("holes", [])
                ],
            )
            for polygon in building.get("polygons", [])
        ]
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
            feature_date=date_value,
            tz_offset_hours=tz_offset_hours,
        )
        return x, list(SIDES)


def load_model_or_raise() -> BestSideModel:
    return BestSideModel.load()


def building_input_to_polygons(building: dict[str, Any]) -> list[PolygonInput]:
    polygons: list[PolygonInput] = []
    for polygon in building.get("polygons", []):
        polygons.append(
            PolygonInput(
                outer=[tuple(map(float, pt)) for pt in polygon["outer"]],
                holes=[
                    [tuple(map(float, pt)) for pt in hole]
                    for hole in polygon.get("holes", [])
                ],
            )
        )
    return polygons


def predict_best_side(
    building: dict[str, Any],
    *,
    date_value: date,
    tz_offset_hours: int = 5,
) -> BestSidePrediction:
    model = load_model_or_raise()
    polygons = building_input_to_polygons(building)
    center = building.get("center") or {}
    center_tuple = (
        float(center.get("lng", 0.0)),
        float(center.get("lat", 0.0)),
    )
    height = float(building.get("height", 3.0))
    return model.predict_from_polygons(
        polygons,
        center=center_tuple,
        height=height,
        feature_date=date_value,
        tz_offset_hours=tz_offset_hours,
    )

