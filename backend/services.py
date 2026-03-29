import json
from sqlalchemy.orm import Session
import models

def get_suggested_meals(db: Session, username: str):
    # Find user prefs
    prefs = db.query(models.UserPreference).filter(models.UserPreference.username == username).first()
    if not prefs:
        return []

    # Simple Mock: In a real app, this would filter based on ingredients
    # We return one sample recipe to prove it works
    return [{
        "title": "Healthy Chef Special",
        "description": "A delicious custom meal based on your preferences.",
        "ingredients": ["Tomato", "Spinach", "Garlic"],
        "instructions": ["Chop everything.", "Sauté in pan.", "Serve hot."],
        "dietaryTags": ["Vegan", "Healthy"],
        "prepTime": "10 min",
        "cookTime": "15 min",
        "servings": "2"
    }]