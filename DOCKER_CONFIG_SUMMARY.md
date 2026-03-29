# Docker Configuration Summary

## What was set up:

### 1. Multi-stage Dockerfile
- **Stage 1 (frontend-builder)**: Builds React/Vite app with Node
  - Compiles TypeScript and Tailwind CSS
  - Output: `/app/dist`
  
- **Stage 2 (python)**: Runs the final application
  - Python 3.11 base image
  - Installs backend dependencies from requirements.txt
  - Copies built frontend to `backend/static`
  - Runs FastAPI server on port 8000

### 2. Docker Compose Configuration
Maps the following ports:
- **Frontend (5003:3000)** - Available at http://localhost:5003
- **Backend API (8000:8000)** - Available at http://localhost:8000

Environment variables are loaded from `.env` file

### 3. Backend Configuration Changes
- Added StaticFiles mounting to serve frontend from FastAPI
- Frontend files served from `backend/static` directory
- API routes remain at `/api` endpoints
- Static mount is placed at the end to not interfere with API routes

### 4. Frontend Configuration Changes
- Created `src/config.ts` with dynamic API base URL
- All API calls updated to use `API_BASE_URL` config
- Default: `http://localhost:8000` (works for both dev and Docker)
- Can be overridden with `VITE_API_URL` environment variable

### 5. Files Created/Modified

**Created:**
- `Dockerfile` - Multi-stage build
- `docker-compose.yml` - Orchestration config
- `.env.example` - Environment template
- `.dockerignore` - Optimize Docker builds
- `DOCKER_SETUP.md` - Docker documentation
- `src/config.ts` - API URL config

**Modified:**
- `backend/main.py` - Added static files serving
- `src/App.tsx` - Updated all API calls to use config
- `src/services/gemini.ts` - Exported generateRecipeImage

## Usage

```bash
# Copy environment template
cp .env.example .env

# Add your Gemini API key to .env
# GEMINI_API_KEY=your_key_here

# Build and run
docker-compose up -d

# View logs
docker-compose logs -f foodini

# Stop
docker-compose down
```

## Architecture

```
                    Host Machine
    ┌─────────────────────────────────────┐
    │  Browser @ http://localhost:5003   │
    └────────────────┬────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │   Docker Container (8000)  │
        │  ┌──────────────────────┐  │
        │  │  FastAPI Backend     │  │
        │  │  (Port 8000)         │  │
        │  │  ├─ API Routes       │  │
        │  │  └─ Static Files     │  │
        │  │     (React SPA)      │  │
        │  └──────────────────────┘  │
        │  ┌──────────────────────┐  │
        │  │  SQLAlchemy DB       │  │
        │  │  (database.db)       │  │
        │  └──────────────────────┘  │
        └────────────────────────────┘
```

## Next Steps

1. Build the image: `docker-compose build`
2. Start the service: `docker-compose up -d`
3. Access frontend at: http://localhost:5003
4. Access API at: http://localhost:8000

The frontend will make API calls to `http://localhost:8000` automatically.
