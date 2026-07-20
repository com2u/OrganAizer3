# Image for the OrganAIzer agent worker and web/token server.
FROM python:3.13-slim

WORKDIR /app

# System deps kept minimal; livekit-agents wheels are self-contained.
RUN pip install --no-cache-dir --upgrade pip

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY web ./web
COPY data ./data

# Default command runs the agent worker in production mode.
# The web service overrides this in docker-compose.
CMD ["python", "-m", "app.agent", "start"]
