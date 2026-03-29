from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session # Correct Import
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
import models, schemas, database, services, json

# Security Setup
SECRET_KEY = "CHEF_SECRET_KEY_123"
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI()

# Enable CORS for the Website
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Database
models.Base.metadata.create_all(bind=database.engine)

# AUTH HELPERS
def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid session")

# ROUTES
@app.post("/signup")
def signup(user: schemas.UserAuth, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username taken")
        
    # FIX: Add [:72] to the password here
    hashed = pwd_context.hash(user.password[:72]) 
    
    new_user = models.User(username=user.username, hashed_password=hashed)
    db.add(new_user)
    db.commit()
    return {"message": "Success"}

@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    
    # FIX: Add [:72] to the password check here
    if not user or not pwd_context.verify(form_data.password[:72], user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid Login")
        
    token = jwt.encode({"sub": user.username, "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer"}

@app.post("/set-preferences")
def set_prefs(prefs: schemas.UserPrefUpdate, db: Session = Depends(database.get_db), user: str = Depends(get_current_user)):
    db_pref = db.query(models.UserPreference).filter(models.UserPreference.username == user).first()
    if not db_pref:
        db_pref = models.UserPreference(username=user)
        db.add(db_pref)
    db_pref.ingredients = json.dumps(prefs.ingredients)
    db_pref.dietary_prefs = json.dumps(prefs.dietary_prefs)
    db_pref.cuisine_prefs = json.dumps(prefs.cuisine_prefs)
    db.commit()
    return {"status": "saved"}

@app.get("/generate-meals")
def generate(db: Session = Depends(database.get_db), user: str = Depends(get_current_user)):
    return services.get_suggested_meals(db, user)