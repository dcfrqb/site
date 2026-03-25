FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Web-api source
COPY src/ ./src/

# PYTHONPATH:
#   /app/src          — web_api пакет
#   /opt/vpn-bot/src  — shared код бота (db/models, remnawave, services, etc.)
#                       монтируется как volume в production
ENV PYTHONPATH=/app/src:/opt/vpn-bot/src
ENV PYTHONUNBUFFERED=1

EXPOSE 8002

CMD ["uvicorn", "web_api.main:app", "--host", "0.0.0.0", "--port", "8002", "--workers", "2"]
