# Use a slim Python image
FROM python:3.11-slim

# Install system dependencies needed for some Python packages
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy only the requirements first to leverage Docker cache
COPY backend/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY backend/ ./backend/

# Set environment variables
ENV FLASK_APP=backend/main.py
ENV PYTHONUNBUFFERED=1

# Hugging Face Spaces runs on port 7860 by default
EXPOSE 7860

# Start the application with Gunicorn
# Note: We bind to 0.0.0.0:7860 as required by Hugging Face
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "backend.main:app"]