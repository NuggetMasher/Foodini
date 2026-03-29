from sqlalchemy import Column, Integer, String, Text, ForeignKey
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class SavedRecipe(Base):
    __tablename__ = "saved_recipes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    description = Column(Text)
    ingredients = Column(Text)  # JSON array stored as string
    instructions = Column(Text)  # JSON array stored as string
    prep_time = Column(String)
    cook_time = Column(String)
    servings = Column(Integer)
    dietary_tags = Column(Text)  # JSON array stored as string
    image_url = Column(Text, nullable=True)

class Recipe(Base):
    __tablename__ = "recipes"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    ingredients = Column(Text)  # Comma separated
    instructions = Column(Text)
    cuisine = Column(String)
    dietary_tags = Column(String) # Comma separated

class UserPreference(Base):
    __tablename__ = "user_preferences"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, ForeignKey("users.username"))
    ingredients = Column(Text)
    dietary_prefs = Column(Text)
    cuisine_prefs = Column(Text)