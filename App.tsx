import React, { useState, useEffect, useCallback } from 'react';
import { PBRMaps, MapType, MaterialSettings, Preset } from './types';
import { generateBaseTexture, analyzeTextureMetadata } from './services/geminiService';
import { 
  generateNormalMap, 
  generateRoughnessMap, 
  generateMetalnessMap, 
  generateAOMap,
  generateHeightMap 
} from './utils/textureUtils';
import Preview3D from './components/Preview3D';

const PRESETS: Preset[] = [
  { name: 'Stone Brick', icon: 'fa-cubes', prompt: 'Ancient medieval stone bricks, weathered granite, deep mortar joints, realistic moss, seamless tiling' },
  { name: 'Rusted Iron', icon: 'fa-shield-halved', prompt: 'Corroded industrial steel, heavy pitting, realistic orange oxidation, metallic scratches, seamless' },
  { name: 'Oak Wood', icon: 'fa-tree', prompt: 'Natural weathered oak planks, vertical grain, fine wood fibers, realistic light brown satin finish, seamless' },
  { name: 'Sci-Fi Hull', icon: 'fa-rocket', prompt: 'Titanium spaceship armor panels, carbon fiber weave, subtle heat discoloration, futuristic patterns, seamless' },
  { name: 'Dry Earth', icon: 'fa-mountain', prompt: 'Arid desert mud flats, deep cracks, sun-baked clay, realistic sediment layers, seamless' },
];

const App: React.FC = () => {
  const [maps, setMaps] = useState<PBRMaps>({
    albedo: null,
    normal: null,
    roughness: null,
    metalness: null,
    ao: null,
    height: null,
  });

  const [settings, setSettings] = useState<MaterialSettings>({
    repeat: 1,
    normalScale: 1.2,
    roughnessIntensity: 0.8,
    metalnessIntensity: 0.2,
    displacementScale: 0.08
  });

  const [prompt, setPrompt] = useState(PRESETS[0].prompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewShape, setPreviewShape] = useState<'sphere' | 'cube' | 'plane'>('sphere');
  const [error, setError] = useState<string | null>(null);
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      // Priority 1: Check if a valid API_KEY exists in environment
      const envKey = process.env.API_KEY;
      if (envKey && envKey !== 'undefined' && envKey.length > 10) {
        setShowKeyPrompt(false);
        return;
      }

      // Priority 2: Check AI Studio platform bridge
      try {
        const aiStudio = (window as any).aistudio;
        if (aiStudio) {
          const hasKey = await aiStudio.hasSelectedApiKey();
          setShowKeyPrompt(!hasKey);
        } else {
          setShowKeyPrompt(true);
        }
      } catch (e) {
        setShowKeyPrompt(true);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    try {
      const aiStudio = (window as any).aistudio;
      if (aiStudio) {
        await aiStudio.openSelectKey();
        setShowKeyPrompt(false);
      } else {
        setError("Platform selector unavailable. Please add a new API_KEY to your Vercel/Local environment variables.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const processAllMaps = useCallback(async (albedoUrl: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      const metadata = await analyzeTextureMetadata(albedoUrl);
      
      const [normal, roughness, metalness, ao, height] = await Promise.all([
        generateNormalMap(albedoUrl, 2.5),
        generateRoughnessMap(albedoUrl, (metadata.suggestedRoughness || 0.6) * 1.2),
        generateMetalnessMap(albedoUrl, (metadata.suggestedMetalness || 0) > 0.5),
        generateAOMap(albedoUrl),
        generateHeightMap(albedoUrl)
      ]);

      setMaps({ albedo: albedoUrl, normal, roughness, metalness, ao, height });
      setSettings(prev => ({
        ...prev,
        roughnessIntensity: metadata.suggestedRoughness || 0.6,
        metalnessIntensity: metadata.suggestedMetalness || 0
      }));
    } catch (err: any) {
      if (err.message?.includes("leaked") || err.message?.includes("403")) {
        setError("API Key Terblokir (Leaked). Silakan buat API Key baru di Google AI Studio!");
        setShowKeyPrompt(true);
      } else {
        setError(err.message || "Failed processing high-quality maps.");
      }
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleGenerate = async () => {
    if (!prompt) return;
    
    setIsGenerating(true);
    setError(null);
    try {
      const albedoUrl = await generateBaseTexture(prompt);
      await processAllMaps(albedoUrl);
    } catch (err: any) {
      if (err.message?.includes("leaked") || err.message?.includes("403")) {
        setError("API Key Terblokir (Leaked). Silakan buat API Key baru di Google AI Studio!");
        setShowKeyPrompt(true);
      } else if (err.message?.includes("Requested entity was not found")) {
        setShowKeyPrompt(true);
      } else {
        setError(err.message || "Generation failed.");
      }
      setIsGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const albedoUrl = event.target?.result as string;
        processAllMaps(albedoUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadMap = (url: string | null, name: string) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `PBR_${name}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200">
      {/* Key Modal */}
      {showKeyPrompt && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[110] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/20 rounded-3xl p-10 text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8 text-red-500">
              <i className="fas fa-shield-virus text-3xl animate-pulse"></i>
            </div>
            <h2 className="text-3xl font-black text-white mb-4 tracking-tight">API Key Invalid</h2>
            <p className="text-slate-400 text-sm mb-10 leading-relaxed">
              Kunci API Anda mungkin telah <b>bocor (leaked)</b> atau belum disetel. Silakan buat kunci baru di Google AI Studio dan update Environment Variables Anda.
            </p>
            <div className="flex flex-col gap-4">
              <button 
                onClick={handleOpenKeySelector}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
              >
                Gunakan Platform Selector
              </button>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold py-2"
              >
                Buat API Key Baru <i className="fas fa-external-link-alt ml-1"></i>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-16 border-b border-slate-800/50 flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <i className="fas fa-cubes text-white text-xl"></i>
          </div>
          <div>
            <h1 className="font-black text-lg tracking-tight leading-none text-white">ROBLOX PBR FORGE</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-bold">2K AI Texture Engine</p>
          </div>
        </div>
        
        <button 
          onClick={() => {
            const mapTypes: MapType[] = ['albedo', 'normal', 'roughness', 'metalness', 'ao', 'height'];
            mapTypes.forEach(m => maps[m] && downloadMap(maps[m], m.toUpperCase()));
          }}
          disabled={!maps.albedo}
          className="px-6 py-2.5 bg-white hover:bg-slate-200 disabled:opacity-20 rounded-full text-slate-950 text-xs font-black transition-all"
        >
          <i className="fas fa-download mr-2"></i> EXPORT ALL
        </button>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-slate-800/50 bg-slate-900/10 p-6 flex flex-col gap-8 overflow-y-auto">
          <section>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Generation Prompt</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-32 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none"
              placeholder="e.g. Weathered basalt rock with moss patches..."
            />
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full mt-4 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-all shadow-xl shadow-indigo-600/20"
            >
              {isGenerating ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-bolt mr-2"></i>}
              {isGenerating ? 'FORGING...' : 'GENERATE HD'}
            </button>
          </section>

          <section>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">Presets</label>
            <div className="space-y-2">
              {PRESETS.map(p => (
                <button 
                  key={p.name}
                  onClick={() => { setPrompt(p.prompt); handleGenerate(); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/20 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/40 transition-all text-left group"
                >
                  <i className={`fas ${p.icon} text-slate-500 group-hover:text-indigo-400`}></i>
                  <span className="text-xs font-bold text-slate-300">{p.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-auto">
             <label className="w-full py-4 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-800/20 transition-all group">
                <i className="fas fa-cloud-upload text-slate-600 group-hover:text-indigo-400"></i>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Analyze Image</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
             </label>
          </section>
        </aside>

        {/* Viewport */}
        <section className="flex-1 flex flex-col p-6 gap-6 relative">
          <div className="flex-1 rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/30 relative">
             <Preview3D maps={maps} shape={previewShape} settings={settings} />
             
             {/* Controls Overlay */}
             <div className="absolute top-6 right-6 w-52 p-5 bg-slate-950/60 backdrop-blur-xl border border-slate-800/50 rounded-2xl shadow-2xl flex flex-col gap-5">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Shape</label>
                  <div className="flex bg-slate-900 rounded-lg p-1">
                    {(['sphere', 'cube', 'plane'] as const).map(s => (
                      <button 
                        key={s} 
                        onClick={() => setPreviewShape(s)} 
                        className={`flex-1 py-1 rounded text-[9px] font-bold uppercase transition-all ${previewShape === s ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Tiling</label>
                      <span className="text-[9px] text-indigo-400">{settings.repeat}x</span>
                    </div>
                    <input type="range" min="1" max="5" step="1" value={settings.repeat} onChange={(e) => setSettings({...settings, repeat: parseInt(e.target.value)})} className="w-full accent-indigo-500" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Normal Depth</label>
                    <input type="range" min="0" max="3" step="0.1" value={settings.normalScale} onChange={(e) => setSettings({...settings, normalScale: parseFloat(e.target.value)})} className="w-full accent-indigo-500" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Smoothness</label>
                    <input type="range" min="0" max="1" step="0.01" value={settings.roughnessIntensity} onChange={(e) => setSettings({...settings, roughnessIntensity: parseFloat(e.target.value)})} className="w-full accent-indigo-500" />
                  </div>
                </div>
             </div>
          </div>

          {/* Asset Gallery */}
          <div className="h-48 flex gap-4 overflow-x-auto">
            {(['albedo', 'normal', 'roughness', 'metalness', 'ao', 'height'] as MapType[]).map((type) => (
              <div key={type} className="flex-none w-44 flex flex-col gap-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{type}</span>
                  {maps[type] && <i className="fas fa-check text-green-500 text-[10px]"></i>}
                </div>
                <div 
                  onClick={() => maps[type] && downloadMap(maps[type], type)}
                  className={`aspect-square bg-slate-900 rounded-2xl border-2 overflow-hidden transition-all relative cursor-pointer ${maps[type] ? 'border-indigo-500/50 opacity-100' : 'border-slate-800 opacity-30 hover:opacity-50'}`}
                >
                  {maps[type] ? (
                    <>
                      <img src={maps[type]!} alt={type} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-indigo-600/0 hover:bg-indigo-600/20 flex items-center justify-center transition-all opacity-0 hover:opacity-100">
                        <i className="fas fa-download text-white"></i>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                       <div className="w-8 h-8 rounded-full border border-slate-800 animate-pulse"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Global Error */}
      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-6 py-3 rounded-full text-xs font-bold shadow-2xl z-[200] flex items-center gap-3 animate-bounce">
          <i className="fas fa-exclamation-triangle"></i>
          <span className="max-w-xs truncate">{error}</span>
          <button onClick={() => setError(null)} className="ml-2 hover:opacity-70"><i className="fas fa-times"></i></button>
        </div>
      )}
    </div>
  );
};

export default App;