# Docker Quick Start Guide

## Prerequisites
- Docker installed
- Docker Compose installed  
- Gemini API key from https://aistudio.google.com/apikey

## One-Time Setup

### 1. Create .env file
```bash
cp .env.example .env
```

### 2. Add your Gemini API Key
Edit `.env` and add:
```
GEMINI_API_KEY=your_actual_key_here
```

## Run the Application

### Start Docker
```bash
docker-compose up -d
```

This will:
- Build the Docker image (takes 2-3 minutes on first run)
- Compile the React frontend
- Install Python dependencies
- Start the application

### Access the App
- **Frontend**: http://localhost:5003
- **Backend API**: http://localhost:8000

### View Logs
```bash
docker-compose logs -f foodini
```

### Stop the App
```bash
docker-compose down
```

## Troubleshooting

### Image won't build
- Make sure Docker is running
- Check that you have at least 4GB free disk space
- Run `docker-compose build --no-cache`

### Port already in use
If port 5003 or 8000 are in use, edit `docker-compose.yml`:
```yaml
ports:
  - "YOUR_PORT:3000"  # Frontend
  - "YOUR_API_PORT:8000"  # Backend
```

### API calls not working
- Check that `GEMINI_API_KEY` is set in `.env`
- Check logs: `docker-compose logs foodini`

### Frontend shows blank page
- Check browser console for errors (F12)
- Verify backend is running: `docker-compose ps`

## Architecture Notes

Both frontend and backend run in the same container:
- Frontend: Vite React app, served as static files from FastAPI
- Backend: Python FastAPI server on port 8000
- Database: SQLite database persisted to your machine

The frontend makes API calls to `http://localhost:8000` by default.

## File Structure
```
.
├── Dockerfile          # Multi-stage Docker build
├── docker-compose.yml  # Docker Compose config
├── .env               # Environment variables (create from .env.example)
├── .env.example       # Template (safe to commit)
├── src/
│   ├── config.ts      # API configuration
│   └── App.tsx        # Main app (uses API_BASE_URL)
├── backend/
│   ├── main.py        # FastAPI server (serves static files)
│   ├── requirements.txt
│   └── static/        # Frontend built files (created by Docker)
└── package.json       # Frontend dependencies
```

## Next Steps

After starting, try:
1. Create an account
2. Add ingredients
3. Generate meal ideas
4. Save recipes to your account

All data is persisted to the database in your local machine!
