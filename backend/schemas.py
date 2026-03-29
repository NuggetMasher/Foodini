from pydantic import BaseModel
from typing import List, Optional

class UserAuth(BaseModel):
    username: str
    password: str

class UserPrefUpdate(BaseModel):
    ingredients: List[str]
    dietary_prefs: List[str]
    cuisine_prefs: List[str]

class Token(BaseModel):
    access_token: str
    token_type: str

class RecipeCreate(BaseModel):
    title: str
    description: str
    ingredients: List[str]
    instructions: List[str]
    prep_time: str
    cook_time: str
    servings: int
    dietary_tags: List[str]
    image_url: Optional[str] = None

class RecipeResponse(BaseModel):
    id: int
    title: str
    description: str
    ingredients: List[str]
    instructions: List[str]
    prep_time: str
    cook_time: str
    servings: int
    dietary_tags: List[str]
    image_url: Optional[str] = None

    class Config:
        from_attributes = True