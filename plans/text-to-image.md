# Text-to-Image Integration Plan
> Senior Backend Developer Plan  
> API: `https://lim.alem.al/v1/images/generations`  
> Model: `text-to-image` (Qwen/Qwen-Image-2512 via alem.ai)

---

## Overview

Добавляем новый сервис `text_to_image` в backend по стандартному паттерну проекта.  
Frontend будет вызывать наш endpoint — мы проксируем на alem.ai и возвращаем URL/base64 изображения.

---

## Files to Create / Modify

### 1. `backend/services/text_to_image/config.py` ← NEW
Настройки: API key, base URL, default model, default size.

```python
# TextToImageSettings(BaseSettings)
# Fields:
#   api_key: str  — из env TEXT_TO_IMAGE_API_KEY
#   api_url: str  — "https://lim.alem.al/v1/images/generations"
#   model: str    — "text-to-image"
#   default_size: str — "1024x1024"
```

### 2. `backend/services/text_to_image/service.py` ← NEW
Бизнес-логика: вызов alem.ai API, обработка ответа.

```python
# async def generate_image(
#     prompt: str,
#     size: str = "1024x1024",
#     n: int = 1,
# ) -> list[str]:  # returns list of image URLs or base64
#
# Internals:
#   - POST to alem.ai with httpx.AsyncClient(timeout=60s)
#   - Parse response: data[].url or data[].b64_json
#   - Raise HTTPException on API errors
#   - Log prompt + size (no logging of API key)
```

### 3. `backend/services/text_to_image/router/schemas.py` ← NEW
Pydantic models.

```python
# class ImageGenerateRequest(BaseModel):
#     prompt: str                     # required, max_length=500
#     size: str = "1024x1024"         # "512x512" | "1024x1024"
#     n: int = 1                      # 1..4
#     context: str | None = None      # optional: "tree" | "solar" | "apartment"
#                                     # used to auto-prefix the prompt with domain context
#
# class GeneratedImage(BaseModel):
#     url: str | None = None
#     b64_json: str | None = None
#
# class ImageGenerateResponse(BaseModel):
#     images: list[GeneratedImage]
#     prompt_used: str                # actual prompt sent (after context prefix)
```

### 4. `backend/services/text_to_image/router/router.py` ← NEW
FastAPI router.

```python
# APIRouter(prefix="/ml/text-to-image", tags=["text-to-image"])
#
# POST /ml/text-to-image/generate
#   Body: ImageGenerateRequest
#   Returns: ImageGenerateResponse
#   - Validates prompt not empty
#   - Applies context prefix if context field provided:
#       "tree"      → "Urban tree planting visualization in Astana: {prompt}"
#       "solar"     → "Solar panel installation visualization in Astana: {prompt}"
#       "apartment" → "Apartment interior natural lighting visualization: {prompt}"
#   - Calls service.generate_image()
#   - Returns structured response
```

### 5. `backend/services/text_to_image/__init__.py` ← NEW
Empty init.

### 6. `backend/envs/dev.env` ← MODIFY
Add:
```
TEXT_TO_IMAGE_API_KEY=sk-9o50ujL6VZBLGr-_Ak9fYw
```

### 7. `backend/main.py` ← MODIFY
Register new router:
```python
from services.text_to_image.router.router import router as text_to_image_router
app.include_router(text_to_image_router)
```

---

## API Contract

### `POST /ml/text-to-image/generate`

**Request:**
```json
{
  "prompt": "Покажи как будет выглядеть дерево через 10 лет на этом месте",
  "size": "1024x1024",
  "n": 1,
  "context": "tree"
}
```

**Response:**
```json
{
  "images": [
    { "url": "https://..." }
  ],
  "prompt_used": "Urban tree planting visualization in Astana: Покажи как будет выглядеть дерево..."
}
```

**Errors:**
| Status | Cause |
|--------|-------|
| 400 | Empty prompt |
| 422 | Invalid size/n |
| 502 | alem.ai API failed |
| 504 | Timeout (>60s) |

---

## Context Prefixes (auto-enrichment)

Когда frontend передаёт `context`, мы добавляем domain prefix к промпту, чтобы модель давала более релевантный результат:

| context | Prefix |
|---------|--------|
| `tree` | `"Urban tree planting visualization in Astana, Kazakhstan. Realistic architectural render: "` |
| `solar` | `"Solar panel installation on building rooftop in Astana, Kazakhstan. Architectural visualization: "` |
| `apartment` | `"Apartment interior with natural sunlight, Astana. Realistic render: "` |
| `worker` | `"Construction worker safety in extreme heat, Astana. Realistic scene: "` |
| `null` | No prefix — prompt used as-is |

---

## Implementation Order

```
1. config.py           — 10 min
2. service.py          — 20 min
3. schemas.py          — 10 min
4. router.py           — 15 min
5. main.py update      — 5 min
6. env update          — 2 min
7. Manual API test     — 10 min
```

---

## Notes

- alem.ai API возвращает ответ по формату OpenAI Images API (`data[].url` или `data[].b64_json`)
- Timeout 60s — генерация изображений медленнее чем LLM
- `size` параметр: проверить какие размеры поддерживает модель (судя по доке — `"50x50"` в примере, но скорее всего это placeholder — тестируем `1024x1024`)
- CORS уже открыт на всех origins в main.py — ничего менять не нужно
- API key в env, НЕ в коде

---

## Frontend Integration Points (следующий шаг)

После готовности endpoint:
1. `TreeCandidateCard` — кнопка "Visualize" после AI explanation
2. `SolarCandidateCard` — кнопка "Visualize" после factor bars
3. `SunInfoPopup` — кнопка "Generate interior" для apartments
