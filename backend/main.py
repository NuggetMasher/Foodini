from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session # Correct Import
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
import models, schemas, database, services, json
import os

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
    password_bytes = user.password.encode("utf-8")
    if len(password_bytes) > 72:
        raise HTTPException(status_code=400, detail="Password must be 72 bytes or fewer.")

    hashed = pwd_context.hash(user.password)
    
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

@app.get("/get-preferences")
def get_prefs(db: Session = Depends(database.get_db), user: str = Depends(get_current_user)):
    db_pref = db.query(models.UserPreference).filter(models.UserPreference.username == user).first()
    if not db_pref:
        return {"ingredients": [], "dietary_prefs": [], "cuisine_prefs": []}
    
    return {
        "ingredients": json.loads(db_pref.ingredients) if db_pref.ingredients else [],
        "dietary_prefs": json.loads(db_pref.dietary_prefs) if db_pref.dietary_prefs else [],
        "cuisine_prefs": json.loads(db_pref.cuisine_prefs) if db_pref.cuisine_prefs else []
    }

@app.get("/generate-meals")
def generate(db: Session = Depends(database.get_db), user: str = Depends(get_current_user)):
    try:
        recipes = services.get_suggested_meals(db, user)
        return recipes
    except Exception as e:
        print(f"Fatal error in /generate-meals: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate recipes: {str(e)}")

@app.post("/save-recipe")
def save_recipe(
    recipe: schemas.RecipeCreate,
    db: Session = Depends(database.get_db),
    username: str = Depends(get_current_user)
):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_recipe = models.SavedRecipe(
        user_id=user.id,
        title=recipe.title,
        description=recipe.description,
        ingredients=json.dumps(recipe.ingredients),
        instructions=json.dumps(recipe.instructions),
        prep_time=recipe.prep_time,
        cook_time=recipe.cook_time,
        servings=recipe.servings,
        dietary_tags=json.dumps(recipe.dietary_tags),
        image_url=recipe.image_url
    )
    db.add(db_recipe)
    db.commit()
    db.refresh(db_recipe)
    return {"id": db_recipe.id, "message": "Recipe saved successfully"}

@app.get("/saved-recipes")
def get_saved_recipes(
    db: Session = Depends(database.get_db),
    username: str = Depends(get_current_user)
):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    recipes = db.query(models.SavedRecipe).filter(models.SavedRecipe.user_id == user.id).all()
    
    result = []
    for recipe in recipes:
        result.append({
            "id": recipe.id,
            "title": recipe.title,
            "description": recipe.description,
            "ingredients": json.loads(recipe.ingredients) if recipe.ingredients else [],
            "instructions": json.loads(recipe.instructions) if recipe.instructions else [],
            "prepTime": recipe.prep_time,
            "cookTime": recipe.cook_time,
            "servings": recipe.servings,
            "dietaryTags": json.loads(recipe.dietary_tags) if recipe.dietary_tags else [],
            "imageUrl": recipe.image_url
        })
    
    return result

@app.delete("/saved-recipes/{recipe_id}")
def delete_saved_recipe(
    recipe_id: int,
    db: Session = Depends(database.get_db),
    username: str = Depends(get_current_user)
):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    recipe = db.query(models.SavedRecipe).filter(
        models.SavedRecipe.id == recipe_id,
        models.SavedRecipe.user_id == user.id
    ).first()
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found or unauthorized")
    
    db.delete(recipe)
    db.commit()
    return {"message": "Recipe deleted successfully"}

# Mount static files (frontend) - Must be last!
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")