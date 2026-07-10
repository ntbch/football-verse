FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

FROM base AS test

RUN pip install --no-cache-dir -r requirements-dev.txt
CMD ["python", "-m", "pytest", "-q"]

FROM base AS runtime

EXPOSE 8091
CMD ["uvicorn", "match_engine.main:app", "--host", "0.0.0.0", "--port", "8091"]
