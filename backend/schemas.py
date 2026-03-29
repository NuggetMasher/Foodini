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