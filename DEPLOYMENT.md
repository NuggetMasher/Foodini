# Exporting and Deploying Foodini on Another Device

## Step 1: Export Images on Development Machine

Run the export script on your development machine (where you built the Docker images):

```powershell
.\export-images.ps1
```

This will:
- Build the production Docker images
- Export them as tar files to `./docker-exports/` directory
- Create `foodini-backend.tar` and `foodini-frontend.tar`

## Step 2: Transfer Files to Target Device

Copy these files to the target device:

1. **Required:** `docker-exports/foodini-backend.tar`
2. **Required:** `docker-exports/foodini-frontend.tar`
3. **Required:** `docker-compose.prod.yml`
4. **Required:** `.env` (with your GEMINI_API_KEY)
5. **Optional:** `import-images.ps1` (convenience script)

**On the target device**, create a folder and organize:
```
deployment/
├── foodini-backend.tar
├── foodini-frontend.tar
├── docker-compose.prod.yml
├── .env
└── import-images.ps1
```

## Step 3: Import and Run on Target Device

### Option A: Using the import script (easiest)

```powershell
cd deployment
.\import-images.ps1
```

### Option B: Manual import

If you prefer not to use the script:

```powershell
cd deployment

# Load the images
docker load -i foodini-backend.tar
docker load -i foodini-frontend.tar

# Start the application
docker-compose -f docker-compose.prod.yml down    # Stop any existing containers
docker-compose -f docker-compose.prod.yml up -d   # Start fresh
```

## Step 4: Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs

## Stopping the Application

```powershell
docker-compose -f docker-compose.prod.yml down
```

## Viewing Logs

```powershell
# All logs
docker-compose -f docker-compose.prod.yml logs -f

# Backend only
docker-compose -f docker-compose.prod.yml logs -f backend

# Frontend only
docker-compose -f docker-compose.prod.yml logs -f frontend
```

## Notes

- The `.env` file **must** contain `GEMINI_API_KEY=your_actual_key_here`
- Database file persists in the same directory as `docker-compose.prod.yml` (backend/database.db)
- Images are tagged as `foodini-backend:latest` and `foodini-frontend:latest`
- Both containers restart automatically unless stopped with `docker-compose down`
