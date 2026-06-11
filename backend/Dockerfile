FROM python:3.12-slim

# Install Node.js and npm (required for npx @arizeai/phoenix-mcp)
RUN apt-get update && apt-get install -y curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . ./backend
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]


