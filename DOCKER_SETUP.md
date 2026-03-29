# Foodini - Docker Setup Guide

## Prerequisites

- Docker and Docker Compose installed
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

## Quick Start

### 1. Set up environment variables

Copy the example file and add your Gemini API key:

```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:

```
GEMINI_API_KEY=your_actual_api_key_here
```

### 2. Build and run with Docker Compose

```bash
docker-compose up -d
```

This will:
- Build the Docker image (compiles frontend with Vite, builds backend with Python)
- Start the container with both frontend and backend
- Frontend available at: `http://localhost:5003`
- Backend API available at: `http://localhost:8000`

### 3. View logs

```bash
docker-compose logs -f foodini
```

### 4. Stop the service

```bash
docker-compose down
```

## Port Mapping

- **Frontend (Vite)**: `5003:3000` - Access at http://localhost:5003
- **Backend (FastAPI)**: `8000:8000` - Access at http://localhost:8000

## Environment Variables

The following environment variables can be set in `.env`:

- `GEMINI_API_KEY` - Your Google Gemini API key (required)

## Notes

- The frontend files are built during Docker image creation and served as static files from the FastAPI backend
- The database is persisted in a volume at `./backend/database.db`
- The `.env` file is automatically loaded by the backend

## Development

For local development without Docker, see the main README.md file.
