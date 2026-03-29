import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserPreferences } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateRecipeImage(title: string, description: string): Promise<string | undefined> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `A professional, high-quality food photography shot of a dish called "${title}". ${description}. The lighting is warm and natural, plated beautifully on a clean background.`,
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error(`Failed to generate image for ${title}:`, e);
  }
  return undefined;
}

export async function generateRecipes(prefs: UserPreferences): Promise<Recipe[]> {
  const prompt = `Generate up to 6 unique creative and delicious meal ideas based on these inputs:
    Available Ingredients: ${prefs.ingredients.join(", ")}
    Dietary Restrictions: ${prefs.dietaryRestrictions.join(", ")}
    Cuisine Preference: ${prefs.cuisinePreference || "Any"}

    Provide detailed recipes including prep time, cook time, and clear instructions.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: "You are a professional chef. Strictly prioritize dietary restrictions. If a user provides ingredients that conflict with their selected dietary preferences (e.g., meat in a vegetarian request), ignore the conflicting ingredients and do not include them in the recipes. Focus on creating delicious meals using the remaining valid ingredients and common pantry staples.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            ingredients: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            instructions: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            prepTime: { type: Type.STRING },
            cookTime: { type: Type.STRING },
            servings: { type: Type.NUMBER },
            dietaryTags: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
          },
          required: ["title", "description", "ingredients", "instructions", "prepTime", "cookTime", "servings", "dietaryTags"],
        },
      },
    },
  });

  try {
    const recipes: Recipe[] = JSON.parse(response.text);
    
    // Generate images for each recipe sequentially to avoid rate limits
    const recipesWithImages: Recipe[] = [];
    for (const recipe of recipes) {
      const imageUrl = await generateRecipeImage(recipe.title, recipe.description);
      recipesWithImages.push({ ...recipe, imageUrl });
    }

    return recipesWithImages;
  } catch (e) {
    console.error("Failed to parse recipes:", e);
    return [];
  }
}
