FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY backend/ ./backend/

# FIX: Add the backend directory to the Python path
ENV PYTHONPATH=/app/backend
ENV FLASK_APP=backend/main.py
ENV PYTHONUNBUFFERED=1

EXPOSE 7860

# Start the application
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "backend.main:app"]