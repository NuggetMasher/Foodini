import json
from sqlalchemy.orm import Session
import models
import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables from .env file
load_dotenv()

# Configure Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
    print("✓ Gemini API configured successfully")
else:
    print("WARNING: GEMINI_API_KEY environment variable not set")

def get_suggested_meals(db: Session, username: str):
    # Find user prefs
    prefs = db.query(models.UserPreference).filter(models.UserPreference.username == username).first()
    
    if not prefs:
        print(f"No preferences found for user: {username}")
        return []

    # Parse the stored JSON preferences
    ingredients = json.loads(prefs.ingredients) if prefs.ingredients else []
    dietary_prefs = json.loads(prefs.dietary_prefs) if prefs.dietary_prefs else []
    cuisine_prefs = json.loads(prefs.cuisine_prefs) if prefs.cuisine_prefs else []
    
    print(f"User preferences - Ingredients: {ingredients}, Restrictions: {dietary_prefs}, Cuisine: {cuisine_prefs}")
    
    if not ingredients:
        print("No ingredients provided by user")
        return []

    try:
        # Generate recipes using Gemini
        recipes = generate_recipes_with_gemini(
            ingredients=ingredients,
            dietary_restrictions=dietary_prefs,
            cuisine_preference=cuisine_prefs[0] if cuisine_prefs else None
        )
        print(f"Successfully generated {len(recipes)} recipes")
        return recipes
    except Exception as e:
        print(f"Error generating recipes: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise  # Re-raise so main.py can catch and return proper error

def generate_recipes_with_gemini(ingredients, dietary_restrictions, cuisine_preference):
    """Generate recipes using Google Generative AI based on user preferences"""
    
    if not os.getenv("GEMINI_API_KEY"):
        raise ValueError("GEMINI_API_KEY environment variable not set")
    
    prompt = f"""Generate up to 6 unique, creative and delicious meal ideas based on these inputs:
Available Ingredients: {', '.join(ingredients) if ingredients else 'None specified'}
Dietary Restrictions: {', '.join(dietary_restrictions) if dietary_restrictions else 'None'}
Cuisine Preference: {cuisine_preference if cuisine_preference else 'Any'}

Provide detailed recipes including prep time, cook time, servings, and clear step-by-step instructions.
Focus on recipes that use the available ingredients and respect the dietary restrictions.

Return the response as a JSON array. Do NOT include ```json markers or any other markdown formatting.
Just return valid JSON array directly."""

    print(f"Generating recipes with prompt...")
    
    try:
        model = genai.GenerativeModel(
            "gemini-3-flash-preview",
            system_instruction="You are a professional chef. Strictly prioritize dietary restrictions. If a user provides ingredients that conflict with their selected dietary preferences (e.g., meat in a vegetarian request), ignore the conflicting ingredients and do not include them in the recipes. Focus on creating delicious meals using the remaining valid ingredients and common pantry staples. Always respond with valid JSON only."
        )
        
        print("Calling Gemini API...")
        response = model.generate_content(
            prompt + "\n\nRESPOND ONLY WITH A JSON ARRAY, NO MARKDOWN OR EXTRA TEXT."
        )
        
        print(f"Received response from Gemini")
        # Parse the response
        response_text = response.text.strip()
        print(f"Response text length: {len(response_text)}")
        print(f"Response preview: {response_text[:200]}...")
        
        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()
        
        recipes = json.loads(response_text)
        print(f"Parsed {len(recipes)} recipes from JSON")
        
        # Ensure all recipes have the correct fields with proper keys
        formatted_recipes = []
        for recipe in recipes:
            formatted_recipe = {
                "title": recipe.get("title", "Untitled Recipe"),
                "description": recipe.get("description", ""),
                "ingredients": recipe.get("ingredients", []),
                "instructions": recipe.get("instructions", []),
                "prepTime": recipe.get("prepTime", recipe.get("prep_time", "Unknown")),
                "cookTime": recipe.get("cookTime", recipe.get("cook_time", "Unknown")),
                "servings": recipe.get("servings", 2),
                "dietaryTags": recipe.get("dietaryTags", recipe.get("dietary_tags", []))
            }
            formatted_recipes.append(formatted_recipe)
        
        return formatted_recipes
        
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        print(f"Failed to parse: {response_text[:300]}")
        raise
    except Exception as e:
        print(f"Error calling Gemini API: {type(e).__name__}: {e}")
        raise