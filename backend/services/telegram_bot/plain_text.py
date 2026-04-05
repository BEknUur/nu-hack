import re


def strip_telegram_markdown(text: str) -> str:
    """Normalize model output to plain text before sending it to Telegram."""
    cleaned = text.replace("\r\n", "\n")
    cleaned = re.sub(r"```[\s\S]*?```", "", cleaned)
    cleaned = re.sub(r"^\s{0,3}#{1,6}\s*", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"^\s{0,3}(?:[-*_]){3,}\s*$", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"^\s{0,3}>\s?", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"^\s*[*+•]\s+", "- ", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1: \2", cleaned)

    for token in ("**", "__", "~~", "`"):
        cleaned = cleaned.replace(token, "")

    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def prepare_telegram_text(text: str) -> str:
    return strip_telegram_markdown(text).strip()
