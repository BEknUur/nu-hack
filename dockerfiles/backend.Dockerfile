FROM python:3.12-slim

WORKDIR /app

RUN pip install uv

COPY backend/pyproject.toml backend/uv.lock ./

RUN uv sync --no-dev --frozen

COPY backend/ ./
COPY dataset/output/ ../dataset/output/

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
