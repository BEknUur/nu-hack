# План: Supabase Auth — Backend

**Дата:** 2026-04-04 | **Ветка:** `supabase-user`

---

## Архитектура

```
Frontend (форма) → POST /auth/* → FastAPI → Supabase Auth API
                                           → almasdb (User модель)
```

Supabase Auth хранит пользователей у себя.  
Наш `almasdb` хранит `User` профиль привязанный к `supabase_user_id`.  
JWT токен приходит от Supabase — мы валидируем его на каждом защищённом эндпоинте.

---

## Новые файлы (точная структура)

```
backend/
├── core/
│   ├── supabase/
│   │   ├── __init__.py
│   │   ├── config.py          # SupabaseSettings (как AlemLLMSettings)
│   │   └── client.py          # supabase_admin = create_client(...)
│   └── auth/
│       ├── __init__.py
│       └── dependencies.py    # get_current_user — Depends для защиты роутов
└── services/
    └── auth/
        ├── __init__.py
        ├── models.py           # User — SQLAlchemy модель (как GeocodingSample)
        ├── service.py          # register / login / refresh / logout
        └── router/
            ├── __init__.py
            ├── schemas.py      # Pydantic: RegisterRequest, LoginRequest, AuthResponse...
            └── router.py       # APIRouter(prefix="/auth", tags=["auth"])
```

---

## Изменения в существующих файлах

| Файл | Что меняем |
|------|------------|
| `envs/dev.env` | +4 переменных Supabase |
| `backend/.env.example` | +4 переменных Supabase |
| `core/database/session/database.py` | `create_db_schema()` → добавить `import services.auth.models` |
| `main.py` | импорт + `app.include_router(auth_router)` |

---

## Детали каждого файла

### `core/supabase/config.py`
Паттерн — точно как `services/alemllm/config.py`:
```python
class SupabaseSettings(BaseSettings):
    url: str = Field(..., alias="SUPABASE_URL")
    anon_key: str = Field(..., alias="SUPABASE_ANON_KEY")
    service_key: str = Field(..., alias="SUPABASE_SERVICE_KEY")
    jwt_secret: str = Field(..., alias="SUPABASE_JWT_SECRET")
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
```

### `core/supabase/client.py`
```python
from supabase import create_client
supabase_admin = create_client(supabase_settings.url, supabase_settings.service_key)
```

### `core/auth/dependencies.py`
```python
# HTTPBearer → достаём token → jose.jwt.decode(token, jwt_secret, algorithms=["HS256"])
# audience="authenticated" — стандарт Supabase
# возвращает payload (sub = supabase user_id, email, role)
# при ошибке → HTTP 401
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    ...
```

### `services/auth/models.py`
Паттерн — точно как `services/ml_data/models.py`:
```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID]              # наш внутренний id (uuid4)
    supabase_user_id: Mapped[str] # sub из JWT, уникальный
    email: Mapped[str]            # уникальный
    created_at: Mapped[datetime]  # server_default=func.now()
```

### `services/auth/service.py`
Чистые async функции:
- `register(email, password)` → `supabase_admin.auth.sign_up()` + создать `User` в DB
- `login(email, password)` → `supabase_admin.auth.sign_in_with_password()`
- `refresh(refresh_token)` → `supabase_admin.auth.refresh_session()`
- `logout(jwt)` → `supabase_admin.auth.sign_out()`

### `services/auth/router/schemas.py`
```python
class RegisterRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user_id: str   # supabase_user_id
    email: str

class UserMeResponse(BaseModel):
    id: str          # наш internal UUID
    supabase_user_id: str
    email: str
    created_at: datetime
```

### `services/auth/router/router.py`
```
POST /auth/register  → register()
POST /auth/login     → login()
POST /auth/refresh   → refresh()
POST /auth/logout    → logout()  [требует Depends(get_current_user)]
GET  /auth/me        → get user из DB по supabase_user_id [требует Depends(get_current_user)]
```

---

## env переменные (добавить в `envs/dev.env`)

```
SUPABASE_URL=https://a1-supabase-turarbeks-almas.dedicatedapp.alem.ai
SUPABASE_ANON_KEY=<из Dashboard → Settings → API>
SUPABASE_SERVICE_KEY=<из Dashboard → Settings → API>
SUPABASE_JWT_SECRET=<из Dashboard → Settings → API → JWT Settings>
```

---

## Зависимости (добавить в `pyproject.toml`)

```
supabase>=2.0.0
python-jose[cryptography]>=3.3.0
```

---

## Порядок выполнения

- [ ] 1. Достать ключи из Supabase Dashboard → вписать в `envs/dev.env`
- [ ] 2. `uv add supabase python-jose[cryptography]`
- [ ] 3. `core/supabase/__init__.py`, `config.py`, `client.py`
- [ ] 4. `core/auth/__init__.py`, `dependencies.py`
- [ ] 5. `services/auth/__init__.py`, `models.py`
- [ ] 6. `services/auth/service.py`
- [ ] 7. `services/auth/router/__init__.py`, `schemas.py`, `router.py`
- [ ] 8. Изменить `core/database/session/database.py` → добавить импорт User модели
- [ ] 9. Изменить `main.py` → подключить auth router
- [ ] 10. Изменить `backend/.env.example` → добавить supabase переменные
- [ ] 11. Тест: register → login → GET /auth/me с токеном
