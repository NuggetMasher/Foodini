export interface Recipe {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: string;
  cookTime: string;
  servings: number;
  dietaryTags: string[];
}

export interface UserPreferences {
  ingredients: string[];
  dietaryRestrictions: string[];
  cuisinePreference?: string;
}
