import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChefHat, Plus, X, Utensils, Clock, Users, Leaf, AlertCircle, 
  Loader2, Sparkles, ChevronRight, Lock, User as UserIcon, ArrowRight 
} from "lucide-react";

// --- OPTIONS ---
const DIETARY_OPTIONS = ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto", "Paleo", "Low-Carb", "Nut-Free"];

export default function App() {
  // --- AUTH STATE ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  // --- DASHBOARD STATE ---
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [currentIngredient, setCurrentIngredient] = useState("");
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [cuisine, setCuisine] = useState("");
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- 1. AUTH LOGIC ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignup) {
        const res = await fetch('http://127.0.0.1:8000/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        if (res.ok) { alert("Created! Please Log In."); setIsSignup(false); }
        else { setError("User already exists."); }
      } else {
        const body = new FormData();
        body.append('username', username);
        body.append('password', password);
        const res = await fetch('http://127.0.0.1:8000/token', { method: 'POST', body });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem('myToken', data.access_token);
          setIsLoggedIn(true);
        } else { setError("Login failed."); }
      }
    } catch { setError("Backend Offline"); }
    setLoading(false);
  };

  // --- 2. GENERATE MEALS LOGIC ---
  const handleGenerate = async () => {
    if (ingredients.length === 0) { setError("Add an ingredient!"); return; }
    setLoading(true);
    const token = localStorage.getItem('myToken');

    try {
      // Step A: Save preferences to Python
      await fetch('http://127.0.0.1:8000/set-preferences', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients, dietary_prefs: restrictions, cuisine_prefs: [cuisine] })
      });

      // Step B: Get Meals from Python
      const res = await fetch('http://127.0.0.1:8000/generate-meals', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setRecipes(data);
    } catch { setError("Failed to get recipes"); }
    setLoading(false);
  };

  // Helper UI functions
  const addIngredient = () => {
    if (currentIngredient.trim()) { setIngredients([...ingredients, currentIngredient.trim()]); setCurrentIngredient(""); }
  };
  const toggleRestriction = (res: string) => {
    setRestrictions(prev => prev.includes(res) ? prev.filter(r => r !== res) : [...prev, res]);
  };

  // --- VIEW 1: AUTHENTICATION PAGE ---
  if (!isLoggedIn) {
    return (
      // Background is now a consistent warm orange-tint across both screens
      <div className="min-h-screen bg-orange-50/50 flex items-center justify-center p-6 transition-colors duration-500">
        <AnimatePresence mode="wait">
          {isSignup ? (
            // --- SIGN UP VIEW (Centered & Vibrant) ---
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
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Start your Journey</h1>
                {/* SUBTEXT IS NOW CENTERED */}
                <p className="text-orange-600 font-medium text-sm mt-2 max-w-[250px] mx-auto text-center">
                  Create an account to unlock personalized magic recipes
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                 <div className="group relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-300 group-focus-within:text-orange-500 transition-colors" size={20} />
                    <input className="w-full bg-orange-50/30 border border-orange-100 p-4 pl-12 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all placeholder:text-orange-200" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
                 </div>
                 <div className="group relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-300 group-focus-within:text-orange-500 transition-colors" size={20} />
                    <input className="w-full bg-orange-50/30 border border-orange-100 p-4 pl-12 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all placeholder:text-orange-200" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                 </div>
                 
                 <button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-2xl font-bold text-lg shadow-xl shadow-orange-200 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all">
                   {loading ? <Loader2 className="animate-spin" /> : "Join the Kitchen"} <ChevronRight size={20}/>
                 </button>
              </form>

              <div className="mt-8 pt-6 border-t border-orange-50 text-center">
                <p className="text-sm text-gray-500">
                  Already a chef? {" "}
                  <button onClick={() => {setIsSignup(false); setError(null);}} className="text-orange-600 font-bold hover:underline underline-offset-4">Log in</button>
                </p>
              </div>
            </motion.div>
          ) : (
            // --- LOGIN VIEW (Now Orange Branded & Centered) ---
            <motion.div 
              key="login"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              // Standardized with orange borders and orange shadow
              className="max-w-md w-full bg-white border-2 border-orange-100 p-10 rounded-[2.5rem] shadow-2xl shadow-orange-200/40"
            >
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4">
                  <ChefHat size={32} />
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome Back</h1>
                <p className="text-gray-400 text-sm mt-2 font-medium max-w-[200px] mx-auto">
                   Ready to see what is cooking today?
                </p>
              </div>
              
              <form onSubmit={handleAuth} className="space-y-4 text-left">
                 <div className="space-y-1.5 group">
                    <label className="text-[10px] font-bold text-orange-400 ml-1 uppercase tracking-widest">Username</label>
                    <input className="w-full bg-white border border-orange-100 p-4 rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all placeholder:text-gray-300" placeholder="Your chef name" value={username} onChange={e => setUsername(e.target.value)} required />
                 </div>
                 <div className="space-y-1.5 group">
                    <label className="text-[10px] font-bold text-orange-400 ml-1 uppercase tracking-widest">Password</label>
                    <input className="w-full bg-white border border-orange-100 p-4 rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all placeholder:text-gray-300" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                 </div>

                 {error && (
                    <div className="flex items-center gap-2 text-red-500 text-xs bg-red-50 p-3 rounded-xl border border-red-100 mt-2">
                        <AlertCircle size={14} /> {error}
                    </div>
                 )}

                 <button className="w-full bg-orange-500 text-white p-4 rounded-2xl font-bold text-lg shadow-xl shadow-orange-100 flex items-center justify-center gap-2 hover:bg-orange-600 hover:scale-[1.01] transition-all mt-4">
                   {loading ? <Loader2 className="animate-spin" /> : "Sign In"} <ArrowRight size={20}/>
                 </button>
              </form>

              <button onClick={() => {setIsSignup(true); setError(null);}} className="mt-8 text-sm font-semibold text-gray-400 hover:text-orange-500 transition-colors block w-full text-center">
                New here? <span className="underline decoration-orange-200">Start for free</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
  // --- VIEW 2: THE FULL DASHBOARD ---
  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A]">
      <header className="border-b border-gray-100 bg-white/80 sticky top-0 z-50 p-6">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 text-orange-600 font-bold text-xl"><ChefHat/> Foodini</div>
          <button onClick={() => setIsLoggedIn(false)} className="text-gray-400 hover:text-red-500 text-sm font-medium">Log Out</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-12">
          
          {/* Sidebar Controls */}
          <section className="space-y-10">
            <div>
              <h2 className="text-3xl font-light italic serif mb-2">Hello, {username}</h2>
              <p className="text-gray-400 text-sm">Let's find something delicious.</p>
            </div>

            <div className="space-y-6">
              <label className="text-xs font-bold uppercase text-gray-400">Your Ingredients</label>
              <div className="flex gap-2">
                <input type="text" value={currentIngredient} onChange={(e) => setCurrentIngredient(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addIngredient()} placeholder="e.g. Onion, Beef" className="flex-1 border border-gray-100 p-3 rounded-xl focus:border-orange-500 outline-none" />
                <button onClick={addIngredient} className="bg-gray-900 text-white p-3 rounded-xl"><Plus/></button>
              </div>
              <div className="flex flex-wrap gap-2">
                {ingredients.map(ing => (
                  <span key={ing} className="bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-xs flex items-center gap-2 border border-orange-100">
                    {ing} <X size={14} className="cursor-pointer" onClick={() => setIngredients(ingredients.filter(i => i !== ing))}/>
                  </span>
                ))}
              </div>

              <label className="text-xs font-bold uppercase text-gray-400">Dietary Needs</label>
              <div className="grid grid-cols-2 gap-2">
                {DIETARY_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => toggleRestriction(opt)} className={`p-2.5 rounded-xl text-xs font-medium border transition-all ${restrictions.includes(opt) ? "bg-gray-900 text-white" : "bg-white text-gray-600"}`}>
                    {opt}
                  </button>
                ))}
              </div>

              <button onClick={handleGenerate} disabled={loading} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-orange-100 flex items-center justify-center gap-2 hover:bg-orange-600 transition-all">
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate Magic Meals
              </button>
            </div>
          </section>

          {/* Results Area */}
          <section className="space-y-8">
            {recipes.length > 0 ? (
              recipes.map((r, i) => (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} key={i} className="bg-white border border-gray-50 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex gap-2 mb-2">{r.dietaryTags?.map((t:any) => <span className="text-[10px] bg-orange-50 text-orange-500 font-bold px-2 py-0.5 rounded">{t}</span>)}</div>
                  <h3 className="text-xl font-bold mb-2">{r.title}</h3>
                  <p className="text-gray-500 text-sm mb-4">{r.description}</p>
                  <div className="grid grid-cols-3 text-center border-t border-gray-50 pt-4">
                     <div><span className="block text-xs font-bold text-gray-400">PREP</span><span className="text-sm font-medium">{r.prepTime}</span></div>
                     <div><span className="block text-xs font-bold text-gray-400">COOK</span><span className="text-sm font-medium">{r.cookTime}</span></div>
                     <div><span className="block text-xs font-bold text-gray-400">SERVES</span><span className="text-sm font-medium">{r.servings}</span></div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-20">
                <Utensils size={64} className="mb-4" />
                <p>Waiting for your magic...</p>
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}