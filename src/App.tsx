import { useState, useEffect, ChangeEvent, useRef, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChefHat,
  Utensils,
  Clock,
  Users,
  Leaf,
  AlertCircle,
  Loader2,
  Sparkles,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  Trash2,
  Camera,
  Plus,
  X,
  Lock,
  User as UserIcon,
  ArrowRight,
} from "lucide-react";
import { Recipe } from "./types";
import { extractIngredientsFromImage, generateRecipeImage } from "./services/gemini";
import { compressImage } from "./utils/image";
import { API_BASE_URL } from "./config";

const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Keto",
  "Paleo",
  "Low-Carb",
  "Nut-Free",
];

export default function App() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // App state
  const [activeTab, setActiveTab] = useState<"generator" | "saved">("generator");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [currentIngredient, setCurrentIngredient] = useState("");
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [cuisine, setCuisine] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("myToken");
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  // Load user preferences (ingredients, restrictions, cuisine) when logged in
  useEffect(() => {
    if (isLoggedIn) {
      const loadPreferences = async () => {
        try {
          const token = localStorage.getItem("myToken");
          if (!token) return;

          const res = await fetch(`${API_BASE_URL}/get-preferences`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.ok) {
            const prefs = await res.json();
            setIngredients(prefs.ingredients || []);
            setRestrictions(prefs.dietary_prefs || []);
            setCuisine(prefs.cuisine_prefs?.[0] || "");
          }
        } catch (err) {
          console.error("Failed to load preferences:", err);
        }
      };

      loadPreferences();
    }
  }, [isLoggedIn]);

  // Load saved recipes from the database when logged in
  useEffect(() => {
    if (isLoggedIn) {
      const loadSavedRecipes = async () => {
        try {
          const token = localStorage.getItem("myToken");
          if (!token) return;

          const res = await fetch(`${API_BASE_URL}/saved-recipes`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.ok) {
            const recipes = await res.json();
            setSavedRecipes(recipes);
          }
        } catch (err) {
          console.error("Failed to load saved recipes:", err);
        }
      };

      loadSavedRecipes();
    }
  }, [isLoggedIn]);

  // Auto-save preferences when ingredients, restrictions, or cuisine changes
  useEffect(() => {
    if (!isLoggedIn) return;

    const savePreferences = async () => {
      try {
        const token = localStorage.getItem("myToken");
        if (!token) return;

        await fetch(`${API_BASE_URL}/set-preferences`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ingredients,
            dietary_prefs: restrictions,
            cuisine_prefs: cuisine ? [cuisine] : [],
          }),
        });
      } catch (err) {
        console.error("Failed to auto-save preferences:", err);
      }
    };

    // Debounce the save by using a timeout
    const timeoutId = setTimeout(savePreferences, 500);
    return () => clearTimeout(timeoutId);
  }, [ingredients, restrictions, cuisine, isLoggedIn]);

  const addIngredient = () => {
    const trimmed = currentIngredient.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients((prev) => [...prev, trimmed]);
      setCurrentIngredient("");
    }
  };

  const removeIngredient = (ing: string) => {
    setIngredients((prev) => prev.filter((i) => i !== ing));
  };

  const toggleRestriction = (res: string) => {
    setRestrictions((prev) =>
      prev.includes(res) ? prev.filter((r) => r !== res) : [...prev, res]
    );
  };

  const toggleSaveRecipe = async (recipe: Recipe) => {
    const token = localStorage.getItem("myToken");
    if (!token) {
      setError("Please log in to save recipes");
      return;
    }

    const isSaved = savedRecipes.some((r) => r.title === recipe.title);

    try {
      if (isSaved) {
        // Find the saved recipe to get its ID
        const savedRecipe = savedRecipes.find((r) => r.title === recipe.title);
        if (!savedRecipe || !("id" in savedRecipe)) return;

        const id = (savedRecipe as any).id;
        const res = await fetch(`${API_BASE_URL}/saved-recipes/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          setSavedRecipes((prev) => prev.filter((r) => r.title !== recipe.title));
        } else {
          setError("Failed to delete saved recipe");
        }
      } else {
        const recipeToSave = { ...recipe };

        if (recipeToSave.imageUrl && recipeToSave.imageUrl.startsWith("data:image")) {
          try {
            recipeToSave.imageUrl = await compressImage(recipeToSave.imageUrl, 800, 0.7);
          } catch (e) {
            console.error("Failed to compress image", e);
          }
        }

        const res = await fetch(`${API_BASE_URL}/save-recipe`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: recipeToSave.title,
            description: recipeToSave.description,
            ingredients: recipeToSave.ingredients,
            instructions: recipeToSave.instructions,
            prep_time: recipeToSave.prepTime,
            cook_time: recipeToSave.cookTime,
            servings: recipeToSave.servings,
            dietary_tags: recipeToSave.dietaryTags,
            image_url: recipeToSave.imageUrl,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setSavedRecipes((prev) => [
            ...prev,
            {
              ...recipeToSave,
              id: data.id,
            } as any,
          ]);
        } else {
          setError("Failed to save recipe");
        }
      }
    } catch (err) {
      console.error("Error toggling save recipe:", err);
      setError("Failed to save recipe. Please try again.");
    }
  };

  const processIngredientsImage = async (base64String: string, mimeType: string) => {
    setImageLoading(true);
    setError(null);

    try {
      const extracted = await extractIngredientsFromImage(base64String, mimeType);

      const newIngredients = extracted.filter(
        (ing) =>
          !ingredients.some((existing) => existing.toLowerCase() === ing.toLowerCase())
      );

      if (newIngredients.length > 0) {
        setIngredients((prev) => [...prev, ...newIngredients]);
      } else {
        setError("No new ingredients found in the image.");
      }
    } catch (err) {
      setError("Failed to extract ingredients. Please try again.");
      console.error(err);
    } finally {
      setImageLoading(false);
    }
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageLoading(true);
    setError(null);

    try {
      const reader = new FileReader();

      reader.onloadend = async () => {
        try {
          const result = reader.result;
          if (typeof result !== "string") {
            throw new Error("Image could not be read.");
          }

          const base64String = result.split(",")[1];
          if (!base64String) {
            throw new Error("Invalid image data.");
          }

          await processIngredientsImage(base64String, file.type);
        } catch (err) {
          setError("Failed to process image. Please try again.");
          console.error(err);
          setImageLoading(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (err) {
      setError("Failed to process image. Please try again.");
      console.error(err);
      setImageLoading(false);
    } finally {
      e.target.value = "";
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Could not access camera. Please check permissions.");
      setShowCamera(false);
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const base64String = canvas.toDataURL("image/jpeg").split(",")[1];

    if (base64String) {
      void processIngredientsImage(base64String, "image/jpeg");
    }

    stopCamera();
  };

  const handleAuth = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignup) {
const res = await fetch(`${API_BASE_URL}/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        if (res.ok) {
          setIsSignup(false);
          setError("Account created. Please log in.");
          setPassword("");
        } else {
          setError("User already exists.");
        }
      } else {
        const body = new FormData();
        body.append("username", username);
        body.append("password", password);

        const res = await fetch(`${API_BASE_URL}/token`, {
          method: "POST",
          body,
        });

        if (res.ok) {
          const data = await res.json();
          localStorage.setItem("myToken", data.access_token);
          setIsLoggedIn(true);
        } else {
          setError("Login failed.");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Backend offline.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (ingredients.length === 0) {
      setError("Please add at least one ingredient!");
      return;
    }

    setError(null);
    setLoading(true);

    const token = localStorage.getItem("myToken");

    try {
      await fetch(`${API_BASE_URL}/set-preferences`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ingredients,
          dietary_prefs: restrictions,
          cuisine_prefs: cuisine ? [cuisine] : [],
        }),
      });

      const res = await fetch(`${API_BASE_URL}/generate-meals`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${res.status}`);
      }

      const data: Recipe[] = await res.json();
      
      // Generate images for recipes in parallel
      const recipesWithImages: Recipe[] = [];
      for (const recipe of data) {
        // Generate image asynchronously but add recipe immediately
        const imagePromise = generateRecipeImage(recipe.title, recipe.description)
          .catch((e) => {
            console.error(`Failed to generate image for ${recipe.title}:`, e);
            return undefined;
          });
        
        recipesWithImages.push({
          ...recipe,
          imageUrl: await imagePromise,
        });
      }
      
      setRecipes(recipesWithImages);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Failed to get recipes.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("myToken");
    setIsLoggedIn(false);
    setUsername("");
    setPassword("");
    setRecipes([]);
    setSavedRecipes([]);
    setError(null);
    setShowCamera(false);
    setIngredients([]);
    setCurrentIngredient("");
    setRestrictions([]);
    setCuisine("");
    stopCamera();
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-orange-50/50 flex items-center justify-center p-6 transition-colors duration-500">
        <AnimatePresence mode="wait">
          {isSignup ? (
            <motion.div
              key="signup"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="max-w-md w-full bg-white border-2 border-orange-100 p-10 rounded-[2.5rem] shadow-2xl shadow-orange-200/40 relative overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-200 rounded-full blur-3xl opacity-30" />

              <div className="flex flex-col items-center text-center mb-8 relative">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4">
                  <Sparkles size={32} />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                  Start your Journey
                </h1>
                <p className="text-orange-600 font-medium text-sm mt-2 max-w-[250px] mx-auto text-center">
                  Create an account to unlock personalized magic recipes
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                <div className="group relative">
                  <UserIcon
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-300 group-focus-within:text-orange-500 transition-colors"
                    size={20}
                  />
                  <input
                    className="w-full bg-orange-50/30 border border-orange-100 p-4 pl-12 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all placeholder:text-orange-200"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="group relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-300 group-focus-within:text-orange-500 transition-colors"
                    size={20}
                  />
                  <input
                    className="w-full bg-orange-50/30 border border-orange-100 p-4 pl-12 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all placeholder:text-orange-200"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-500 text-xs bg-red-50 p-3 rounded-xl border border-red-100 mt-2">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}

                <button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-2xl font-bold text-lg shadow-xl shadow-orange-200 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all">
                  {loading ? <Loader2 className="animate-spin" /> : "Join the Kitchen"}
                  <ChevronRight size={20} />
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-orange-50 text-center">
                <p className="text-sm text-gray-500">
                  Already a chef?{" "}
                  <button
                    onClick={() => {
                      setIsSignup(false);
                      setError(null);
                    }}
                    className="text-orange-600 font-bold hover:underline underline-offset-4"
                    type="button"
                  >
                    Log in
                  </button>
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="login"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="max-w-md w-full bg-white border-2 border-orange-100 p-10 rounded-[2.5rem] shadow-2xl shadow-orange-200/40"
            >
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4">
                  <ChefHat size={32} />
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  Welcome Back
                </h1>
                <p className="text-gray-400 text-sm mt-2 font-medium max-w-[200px] mx-auto">
                  Ready to see what is cooking today?
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4 text-left">
                <div className="space-y-1.5 group">
                  <label className="text-[10px] font-bold text-orange-400 ml-1 uppercase tracking-widest">
                    Username
                  </label>
                  <input
                    className="w-full bg-white border border-orange-100 p-4 rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all placeholder:text-gray-300"
                    placeholder="Your chef name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5 group">
                  <label className="text-[10px] font-bold text-orange-400 ml-1 uppercase tracking-widest">
                    Password
                  </label>
                  <input
                    className="w-full bg-white border border-orange-100 p-4 rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all placeholder:text-gray-300"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-500 text-xs bg-red-50 p-3 rounded-xl border border-red-100 mt-2">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}

                <button className="w-full bg-orange-500 text-white p-4 rounded-2xl font-bold text-lg shadow-xl shadow-orange-100 flex items-center justify-center gap-2 hover:bg-orange-600 hover:scale-[1.01] transition-all mt-4">
                  {loading ? <Loader2 className="animate-spin" /> : "Sign In"}
                  <ArrowRight size={20} />
                </button>
              </form>

              <button
                onClick={() => {
                  setIsSignup(true);
                  setError(null);
                }}
                className="mt-8 text-sm font-semibold text-gray-400 hover:text-orange-500 transition-colors block w-full text-center"
                type="button"
              >
                New here? <span className="underline decoration-orange-200">Start for free</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-orange-100">
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
              <ChefHat size={24} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Foodini</h1>
          </div>

          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
              <button
                onClick={() => setActiveTab("generator")}
                className={`${
                  activeTab === "generator" ? "text-orange-600" : "hover:text-gray-900"
                } transition-colors`}
                type="button"
              >
                Generator
              </button>
              <button
                onClick={() => setActiveTab("saved")}
                className={`${
                  activeTab === "saved" ? "text-orange-600" : "hover:text-gray-900"
                } transition-colors flex items-center gap-2`}
                type="button"
              >
                Saved Recipes
                {savedRecipes.length > 0 && (
                  <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                    {savedRecipes.length}
                  </span>
                )}
              </button>
            </nav>

            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 text-sm font-medium"
              type="button"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 overflow-hidden">
        <div className="grid md:grid-cols-[350px_1fr] gap-0 md:h-[calc(100vh-80px)]">
          <section className="space-y-10 md:overflow-y-auto py-8 pr-8 md:border-r md:border-gray-100 custom-scrollbar">
            <div>
              <h2 className="text-3xl font-light tracking-tight mb-2 italic serif">
                What&apos;s in your kitchen?
              </h2>
              <p className="text-gray-500 text-sm">Add the ingredients you have on hand.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Ingredients
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentIngredient}
                    onChange={(e) => setCurrentIngredient(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addIngredient()}
                    placeholder="Type ingredient and press Enter..."
                    className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <button
                    onClick={startCamera}
                    disabled={imageLoading}
                    className={`bg-white border border-gray-200 p-3 rounded-xl hover:border-orange-500 hover:text-orange-500 transition-all flex items-center justify-center ${
                      imageLoading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    title="Take a photo"
                    type="button"
                  >
                    {imageLoading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Camera size={20} />
                    )}
                  </button>
                  <label
                    htmlFor="image-upload"
                    className={`bg-white border border-gray-200 p-3 rounded-xl hover:border-orange-500 hover:text-orange-500 transition-all cursor-pointer flex items-center justify-center ${
                      imageLoading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    title="Upload from device"
                  >
                    <Plus size={20} />
                  </label>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <AnimatePresence>
                    {ingredients.map((ing) => (
                      <motion.span
                        key={ing}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-xs font-medium border border-orange-100"
                      >
                        {ing}
                        <button
                          onClick={() => removeIngredient(ing)}
                          className="hover:text-orange-900"
                          type="button"
                        >
                          <X size={14} />
                        </button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Dietary Preferences
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DIETARY_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => toggleRestriction(opt)}
                      className={`text-left px-4 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                        restrictions.includes(opt)
                          ? "bg-gray-900 border-gray-900 text-white"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                      type="button"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Cuisine Style (Optional)
                </label>
                <select
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all appearance-none"
                >
                  <option value="">Any Cuisine</option>
                  <option value="Italian">Italian</option>
                  <option value="Mexican">Mexican</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Thai">Thai</option>
                  <option value="Indian">Indian</option>
                  <option value="American">American</option>
                  <option value="Mediterranean">Mediterranean</option>
                  <option value="French">French</option>
                </select>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-xl border border-red-100">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-orange-500 text-white py-4 rounded-2xl font-semibold shadow-xl shadow-orange-200 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 group"
                type="button"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Generating Magic...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
                    Generate Meal Ideas
                  </>
                )}
              </button>
            </div>
          </section>

          <section className="space-y-8 md:overflow-y-auto py-8 pl-12 custom-scrollbar">
            <AnimatePresence mode="wait">
              {activeTab === "generator" ? (
                recipes.length > 0 ? (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                      <h3 className="text-xl font-semibold">Recommended for You</h3>
                      <span className="text-sm text-gray-400">{recipes.length} recipes found</span>
                    </div>

                    <div className="space-y-12">
                      {recipes.map((recipe, idx) => (
                        <motion.div
                          key={recipe.title}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="group"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex flex-wrap gap-2">
                              {recipe.dietaryTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] uppercase tracking-wider font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>

                            <button
                              onClick={() => toggleSaveRecipe(recipe)}
                              className={`p-2 rounded-full transition-all ${
                                savedRecipes.some((r) => r.title === recipe.title)
                                  ? "bg-orange-500 text-white shadow-lg shadow-orange-200"
                                  : "bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                              }`}
                              type="button"
                            >
                              {savedRecipes.some((r) => r.title === recipe.title) ? (
                                <BookmarkCheck size={20} />
                              ) : (
                                <Bookmark size={20} />
                              )}
                            </button>
                          </div>

                          <h4 className="text-2xl font-medium mb-3 group-hover:text-orange-500 transition-colors">
                            {recipe.title}
                          </h4>

                          {recipe.imageUrl && (
                            <div className="mb-6 overflow-hidden rounded-2xl aspect-video bg-gray-100 border border-gray-100">
                              <img
                                src={recipe.imageUrl}
                                alt={recipe.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}

                          <p className="text-gray-600 text-sm leading-relaxed mb-6">
                            {recipe.description}
                          </p>

                          <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                                Prep
                              </span>
                              <div className="flex items-center gap-1.5 text-sm font-medium">
                                <Clock size={14} className="text-gray-400" />
                                {recipe.prepTime}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                                Cook
                              </span>
                              <div className="flex items-center gap-1.5 text-sm font-medium">
                                <Utensils size={14} className="text-gray-400" />
                                {recipe.cookTime}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                                Serves
                              </span>
                              <div className="flex items-center gap-1.5 text-sm font-medium">
                                <Users size={14} className="text-gray-400" />
                                {recipe.servings}
                              </div>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-8 bg-white border border-gray-100 p-6 rounded-3xl shadow-sm">
                            <div>
                              <h5 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Leaf size={16} className="text-green-500" />
                                Ingredients
                              </h5>
                              <ul className="space-y-2">
                                {recipe.ingredients.map((item, i) => (
                                  <li key={i} className="text-sm text-gray-600 flex gap-2">
                                    <span className="text-orange-300">•</span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <h5 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ChevronRight size={16} className="text-orange-500" />
                                Instructions
                              </h5>
                              <ol className="space-y-4">
                                {recipe.instructions.map((step, i) => (
                                  <li key={i} className="text-sm text-gray-600 flex gap-3">
                                    <span className="font-bold text-gray-300 tabular-nums">
                                      {i + 1}
                                    </span>
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center py-20 space-y-6"
                  >
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                      <Utensils size={48} />
                    </div>
                    <div>
                      <h3 className="text-xl font-medium text-gray-900">No recipes yet</h3>
                      <p className="text-gray-500 max-w-xs mx-auto mt-2">
                        Add your ingredients and preferences to discover delicious meal ideas.
                      </p>
                    </div>
                  </motion.div>
                )
              ) : (
                <motion.div
                  key="saved"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <h3 className="text-xl font-semibold">Your Saved Recipes</h3>
                    <span className="text-sm text-gray-400">{savedRecipes.length} saved</span>
                  </div>

                  {savedRecipes.length > 0 ? (
                    <div className="space-y-12">
                      {savedRecipes.map((recipe, idx) => (
                        <motion.div
                          key={recipe.title}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="group"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex flex-wrap gap-2">
                              {recipe.dietaryTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] uppercase tracking-wider font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>

                            <button
                              onClick={() => toggleSaveRecipe(recipe)}
                              className="p-2 rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all"
                              title="Remove from saved"
                              type="button"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>

                          <h4 className="text-2xl font-medium mb-3 group-hover:text-orange-500 transition-colors">
                            {recipe.title}
                          </h4>

                          {recipe.imageUrl && (
                            <div className="mb-6 overflow-hidden rounded-2xl aspect-video bg-gray-100 border border-gray-100">
                              <img
                                src={recipe.imageUrl}
                                alt={recipe.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}

                          <p className="text-gray-600 text-sm leading-relaxed mb-6">
                            {recipe.description}
                          </p>

                          <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                                Prep
                              </span>
                              <div className="flex items-center gap-1.5 text-sm font-medium">
                                <Clock size={14} className="text-gray-400" />
                                {recipe.prepTime}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                                Cook
                              </span>
                              <div className="flex items-center gap-1.5 text-sm font-medium">
                                <Utensils size={14} className="text-gray-400" />
                                {recipe.cookTime}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                                Serves
                              </span>
                              <div className="flex items-center gap-1.5 text-sm font-medium">
                                <Users size={14} className="text-gray-400" />
                                {recipe.servings}
                              </div>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-8 bg-white border border-gray-100 p-6 rounded-3xl shadow-sm">
                            <div>
                              <h5 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Leaf size={16} className="text-green-500" />
                                Ingredients
                              </h5>
                              <ul className="space-y-2">
                                {recipe.ingredients.map((item, i) => (
                                  <li key={i} className="text-sm text-gray-600 flex gap-2">
                                    <span className="text-orange-300">•</span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <h5 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ChevronRight size={16} className="text-orange-500" />
                                Instructions
                              </h5>
                              <ol className="space-y-4">
                                {recipe.instructions.map((step, i) => (
                                  <li key={i} className="text-sm text-gray-600 flex gap-3">
                                    <span className="font-bold text-gray-300 tabular-nums">
                                      {i + 1}
                                    </span>
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-20 space-y-6">
                      <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                        <Bookmark size={48} />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium text-gray-900">No saved recipes</h3>
                        <p className="text-gray-500 max-w-xs mx-auto mt-2">
                          Recipes you save will appear here for easy access later.
                        </p>
                        <button
                          onClick={() => setActiveTab("generator")}
                          className="mt-6 text-orange-500 font-semibold hover:text-orange-600 transition-colors"
                          type="button"
                        >
                          Go to Generator →
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </main>

      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4"
          >
            <div className="relative w-full max-w-2xl aspect-[3/4] bg-gray-900 rounded-3xl overflow-hidden shadow-2xl">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex flex-col justify-between p-6">
                <div className="flex justify-end">
                  <button
                    onClick={stopCamera}
                    className="bg-white/20 backdrop-blur-md text-white p-2 rounded-full hover:bg-white/30 transition-colors"
                    type="button"
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="flex justify-center pb-4">
                  <button
                    onClick={capturePhoto}
                    className="w-20 h-20 bg-white rounded-full border-8 border-white/30 flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
                    type="button"
                  >
                    <div className="w-14 h-14 bg-white rounded-full border-2 border-gray-200" />
                  </button>
                </div>
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <p className="text-white/60 text-sm mt-6">
              Position ingredients in the frame and tap the button
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}