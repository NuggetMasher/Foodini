import { useState, ChangeEvent, useRef } from "react";
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
  Camera,
  Image as ImageIcon,
  Plus,
  X,
  RotateCcw
} from "lucide-react";
import { Recipe, UserPreferences } from "./types";
import { generateRecipes, extractIngredientsFromImage } from "./services/gemini";

const DIETARY_OPTIONS = [
  "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", 
  "Keto", "Paleo", "Low-Carb", "Nut-Free"
];

export default function App() {
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

  const addIngredient = () => {
    if (currentIngredient.trim() && !ingredients.includes(currentIngredient.trim())) {
      setIngredients([...ingredients, currentIngredient.trim()]);
      setCurrentIngredient("");
    }
  };

  const removeIngredient = (ing: string) => {
    setIngredients(ingredients.filter(i => i !== ing));
  };

  const toggleRestriction = (res: string) => {
    setRestrictions(prev => 
      prev.includes(res) ? prev.filter(r => r !== res) : [...prev, res]
    );
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageLoading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        await processIngredientsImage(base64String, file.type);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Failed to process image. Please try again.");
      console.error(err);
      setImageLoading(false);
    }
  };

  const processIngredientsImage = async (base64String: string, mimeType: string) => {
    setImageLoading(true);
    try {
      const extracted = await extractIngredientsFromImage(base64String, mimeType);
      
      const newIngredients = extracted.filter(ing => 
        !ingredients.some(existing => existing.toLowerCase() === ing.toLowerCase())
      );
      
      if (newIngredients.length > 0) {
        setIngredients(prev => [...prev, ...newIngredients]);
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

  const startCamera = async () => {
    setShowCamera(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef && 'current' in videoRef && videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Could not access camera. Please check permissions.");
      setShowCamera(false);
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (videoRef && 'current' in videoRef && videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef && 'current' in videoRef && videoRef.current && canvasRef && 'current' in canvasRef && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const base64String = canvas.toDataURL('image/jpeg').split(',')[1];
        processIngredientsImage(base64String, 'image/jpeg');
        stopCamera();
      }
    }
  };

  const handleGenerate = async () => {
    if (ingredients.length === 0) {
      setError("Please add at least one ingredient!");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await generateRecipes({
        ingredients,
        dietaryRestrictions: restrictions,
        cuisinePreference: cuisine
      });
      setRecipes(result);
    } catch (err) {
      setError("Failed to generate recipes. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-orange-100">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
              <ChefHat size={24} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Foodini</h1>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
            <a href="#" className="text-orange-600">Generator</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Saved Recipes</a>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 overflow-hidden">
        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-12 lg:h-[calc(100vh-80px)] py-8">
          {/* Controls */}
          <section className="space-y-10 lg:overflow-y-auto lg:pr-6 custom-scrollbar">
            <div>
              <h2 className="text-3xl font-light tracking-tight mb-2 italic serif">What's in your kitchen?</h2>
              <p className="text-gray-500 text-sm">Add the ingredients you have on hand.</p>
            </div>

            <div className="space-y-6">
              {/* Ingredients Input */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Ingredients</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentIngredient}
                    onChange={(e) => setCurrentIngredient(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addIngredient()}
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
                    className={`bg-white border border-gray-200 p-3 rounded-xl hover:border-orange-500 hover:text-orange-500 transition-all flex items-center justify-center ${imageLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Take a photo"
                  >
                    {imageLoading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Camera size={20} />
                    )}
                  </button>
                  <label
                    htmlFor="image-upload"
                    className={`bg-white border border-gray-200 p-3 rounded-xl hover:border-orange-500 hover:text-orange-500 transition-all cursor-pointer flex items-center justify-center ${imageLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                        <button onClick={() => removeIngredient(ing)} className="hover:text-orange-900">
                          <X size={14} />
                        </button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Dietary Restrictions */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Dietary Preferences</label>
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
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cuisine */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Cuisine Style (Optional)</label>
                <select
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all appearance-none"
                >
                  <option value="">Any Cuisine</option>
                  <option value="Italian">Italian</option>
                  <option value="Mexican">Mexican</option>
                  <option value="Asian">Asian</option>
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

          {/* Results */}
          <section className="space-y-8 lg:overflow-y-auto lg:pr-6 custom-scrollbar">
            <AnimatePresence mode="wait">
              {recipes.length > 0 ? (
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
                        <div className="flex flex-wrap gap-2 mb-4">
                          {recipe.dietaryTags.map(tag => (
                            <span key={tag} className="text-[10px] uppercase tracking-wider font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <h4 className="text-2xl font-medium mb-3 group-hover:text-orange-500 transition-colors">{recipe.title}</h4>
                        <p className="text-gray-600 text-sm leading-relaxed mb-6">{recipe.description}</p>
                        
                        <div className="grid grid-cols-3 gap-4 mb-8">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Prep</span>
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                              <Clock size={14} className="text-gray-400" />
                              {recipe.prepTime}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Cook</span>
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                              <Utensils size={14} className="text-gray-400" />
                              {recipe.cookTime}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Serves</span>
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
                                  <span className="font-bold text-gray-300 tabular-nums">{i + 1}</span>
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
              )}
            </AnimatePresence>
          </section>
        </div>
      </main>

      {/* Camera Modal */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4"
          >
            <div className="relative w-full max-w-2xl aspect-[3/4] bg-gray-900 rounded-3xl overflow-hidden shadow-2xl">
              <video
                ref={videoRef as any}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex flex-col justify-between p-6">
                <div className="flex justify-end">
                  <button
                    onClick={stopCamera}
                    className="bg-white/20 backdrop-blur-md text-white p-2 rounded-full hover:bg-white/30 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="flex justify-center pb-4">
                  <button
                    onClick={capturePhoto}
                    className="w-20 h-20 bg-white rounded-full border-8 border-white/30 flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
                  >
                    <div className="w-14 h-14 bg-white rounded-full border-2 border-gray-200" />
                  </button>
                </div>
              </div>
            </div>
            <canvas ref={canvasRef as any} className="hidden" />
            <p className="text-white/60 text-sm mt-6">Position ingredients in the frame and tap the button</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
