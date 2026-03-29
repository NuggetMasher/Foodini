import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, UserPreferences } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateRecipes(prefs: UserPreferences): Promise<Recipe[]> {
  const prompt = `Generate 3 creative and delicious meal ideas based on these inputs:
    Available Ingredients: ${prefs.ingredients.join(", ")}
    Dietary Restrictions: ${prefs.dietaryRestrictions.join(", ")}
    Cuisine Preference: ${prefs.cuisinePreference || "Any"}

    Provide detailed recipes including prep time, cook time, and clear instructions.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
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
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse recipes:", e);
    return [];
  }
}

export async function extractIngredientsFromImage(base64Image: string, mimeType: string): Promise<string[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      },
      {
        text: "Identify all the food ingredients visible in this image. Return them as a simple list of ingredient names.",
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse ingredients from image:", e);
    return [];
  }
}
