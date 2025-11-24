
import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Download, Sparkles, Wand2, 
  Film, Aperture, Image as ImageIcon,
  KeyRound, History, ScanLine, Loader2, Zap
} from 'lucide-react';

import { PRESETS } from './constants';
import { Preset, ProcessingState, GradeParams, ColorStats } from './types';
import * as GeminiService from './services/geminiService';
import { loadImage, computeColorStats } from './services/imageUtils';
import { WebGLRenderer } from './services/webglService';
import { ComparisonViewer } from './components/ComparisonViewer';
import { ProcessingLog } from './components/ProcessingLog';

export default function App() {
  // Image State (URLs)
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [refImage, setRefImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  
  // HTML Elements for Processing
  const [sourceImgEl, setSourceImgEl] = useState<HTMLImageElement | null>(null);
  const [refImgEl, setRefImgEl] = useState<HTMLImageElement | null>(null);

  const [hasApiKey, setHasApiKey] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  
  // Analysis State
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [procState, setProcState] = useState<ProcessingState>({
    isProcessing: false,
    stage: '',
    progress: 0
  });

  // WebGL Ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);

  // --- Initialization ---
  useEffect(() => {
    checkKey();
    if (canvasRef.current) {
        try {
            rendererRef.current = new WebGLRenderer(canvasRef.current);
        } catch (e) {
            console.error("WebGL Init Failed", e);
            alert("WebGL not supported. Rendering will fail.");
        }
    }
  }, []);

  const checkKey = async () => {
    const hasKey = await GeminiService.checkApiKey();
    setHasApiKey(hasKey);
  };

  const handleConnectApiKey = async () => {
    try {
        await GeminiService.requestApiKey();
        setTimeout(checkKey, 1000); 
    } catch (e) {
        console.error("API Key selection failed", e);
    }
  };

  // --- Handlers ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'source' | 'ref') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const url = reader.result as string;
        try {
            const img = await loadImage(url);
            if (type === 'source') {
              setSourceImage(url);
              setSourceImgEl(img);
              setResultImage(null);
              setActivePreset(null);
              setAnalysisResult(null);
            } else {
              setRefImage(url);
              setRefImgEl(img);
            }
        } catch (e) {
            console.error("Failed to load image", e);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const updateProgress = (stage: string, progress: number) => {
    setProcState(prev => ({ ...prev, isProcessing: true, stage, progress }));
  };

  const finishProcessing = () => {
     setProcState(prev => ({ ...prev, isProcessing: false, progress: 100 }));
     setTimeout(() => {
        setProcState(prev => ({ ...prev, isProcessing: false, stage: '' }));
     }, 1000);
  };

  const handleAnalyzeImage = async () => {
    if (!sourceImage) return;
    if (!hasApiKey) {
        await handleConnectApiKey();
        if (!(await GeminiService.checkApiKey())) return;
        setHasApiKey(true);
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
        const result = await GeminiService.analyzeImage(sourceImage, 'technical');
        setAnalysisResult(result);
    } catch (error: any) {
        console.error("Analysis failed:", error);
        setAnalysisResult("Analysis failed. Quota limits may be reached.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  /**
   * The Core Grading Function
   * Orchestrates the WebGL pipeline.
   */
  const processGrade = async (preset?: Preset) => {
    if (!sourceImage || !sourceImgEl || !rendererRef.current) return;

    // Default Cinematic Params
    let params: GradeParams = {
        lift: [0,0,0], gamma: [1,1,1], gain: [1,1,1],
        saturation: 1, temperature: 0, tint: 0,
        contrast: 0.1, vignette: 0.0, grain: 0.0, crosstalk: 0.1,
        satRolloff: 0.0,
        shadowTint: [0,0,0], highlightTint: [0,0,0],
        mix: 0
    };

    updateProgress('Analyzing Source', 10);
    // Always compute source stats for the transfer engine
    params.sourceStats = computeColorStats(sourceImgEl);

    // MODE 1: Preset (Instant)
    if (preset) {
        setActivePreset(preset.id);
        updateProgress('Applying Preset', 50);
        if (preset.defaultParams) {
            params = { ...params, ...preset.defaultParams };
        }
        params.mix = 0; 
    } 
    // MODE 2: Reference Match (Instant, Local Math)
    else if (refImage && refImgEl && !aiPrompt) {
        setActivePreset('ref_match');
        updateProgress('Extracting Color DNA', 30);
        params.targetStats = computeColorStats(refImgEl);
        params.mix = 1.0; // Full statistical match
        updateProgress('Matching Statistics', 60);
    }
    // MODE 3: AI Text Prompt (Server required)
    else if (aiPrompt) {
        setActivePreset('custom_ai');
        if (!hasApiKey) {
            await handleConnectApiKey();
            if (!(await GeminiService.checkApiKey())) return;
            setHasApiKey(true);
        }
        updateProgress('Interpreting Request', 30);
        try {
            const aiParams = await GeminiService.generateGradingParams(aiPrompt);
            params = { ...params, ...aiParams, mix: 0 };
        } catch (e) {
            alert("AI Error. Check quota.");
            finishProcessing();
            return;
        }
    }

    // RENDER
    updateProgress('GPU Rendering', 80);
    try {
        rendererRef.current.render(sourceImgEl, params);
        // Convert canvas to image for the viewer
        const resultUrl = canvasRef.current!.toDataURL('image/jpeg', 0.9);
        setResultImage(resultUrl);
    } catch (e) {
        console.error("Render error", e);
    }
    
    finishProcessing();
  };

  const handleDownload = () => {
    if (resultImage) {
      const link = document.createElement('a');
      link.href = resultImage;
      link.download = `Lutoria_Export_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#050505] text-zinc-300 font-sans overflow-hidden">
      {/* Hidden Canvas for WebGL */}
      <canvas ref={canvasRef} className="hidden" />

      {/* --- LEFT SIDEBAR: Tools & Presets --- */}
      <aside className="w-80 flex flex-col border-r border-white/5 bg-[#0a0a0a]">
        
        {/* Header Logo */}
        <div className="h-16 flex items-center px-6 border-b border-white/5 gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
                <Film className="text-white w-4 h-4" />
            </div>
            <div>
                <h1 className="text-sm font-bold text-white tracking-wide">Lutoria <span className="text-indigo-500">AI</span></h1>
                <p className="text-[10px] text-zinc-500 font-mono">Turn your photos into films.</p>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            
            {/* Input Section */}
            <section className="space-y-4">
                <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Source Media</h2>
                
                <div className="grid grid-cols-2 gap-3">
                    {/* Source Upload */}
                    <label className={`aspect-square rounded-xl border border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group
                        ${sourceImage ? 'border-indigo-500/50 bg-indigo-900/10' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50'}`}>
                        {sourceImage ? (
                            <img src={sourceImage} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <Upload className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400" />
                                <span className="text-[10px] text-zinc-600 uppercase font-bold">Import Log</span>
                            </div>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'source')} />
                    </label>

                    {/* Reference Upload */}
                    <label className={`aspect-square rounded-xl border border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group
                        ${refImage ? 'border-purple-500/50 bg-purple-900/10' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50'}`}>
                        {refImage ? (
                            <img src={refImage} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <ImageIcon className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400" />
                                <span className="text-[10px] text-zinc-600 uppercase font-bold">Match Ref</span>
                            </div>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'ref')} />
                    </label>
                </div>
                
                {refImage && (
                    <button 
                        onClick={() => processGrade()}
                        disabled={procState.isProcessing}
                        className="w-full py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 text-purple-200 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition"
                    >
                        <Zap size={14} className="fill-purple-400 text-purple-400" /> Instant Match
                    </button>
                )}
            </section>

            {/* Presets Grid */}
            <section className="space-y-4">
                <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-between">
                    Looks Library 
                    <History size={12} className="text-zinc-600 hover:text-zinc-400 cursor-pointer" />
                </h2>
                <div className="grid grid-cols-1 gap-3">
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.id}
                            onClick={() => processGrade(preset)}
                            disabled={!sourceImage || procState.isProcessing}
                            className={`group relative h-16 rounded-lg overflow-hidden border transition-all text-left
                                ${activePreset === preset.id ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-zinc-800 hover:border-zinc-600'}
                                disabled:opacity-50 disabled:cursor-not-allowed
                            `}
                        >
                            <div 
                                className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity"
                                style={{ background: `linear-gradient(to right, ${preset.gradientColors[0]}, ${preset.gradientColors[1]})` }}
                            />
                            <div className="relative z-10 p-3 flex flex-col justify-center h-full">
                                <span className="text-xs font-bold text-zinc-200">{preset.name}</span>
                                <span className="text-[10px] text-zinc-500 line-clamp-1">{preset.desc}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </section>
        </div>
      </aside>

      {/* --- CENTER STAGE: Viewer --- */}
      <main className="flex-1 flex flex-col relative bg-[#050505]">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8">
            <div className="flex-1 flex justify-center">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    Get Cinematic Film look in 1 click
                </span>
            </div>
            <div className="flex items-center gap-2 absolute right-8">
                <button 
                    disabled={!resultImage}
                    onClick={handleDownload}
                    className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                    <Download size={14} /> Export
                </button>
            </div>
        </header>

        <div className="flex-1 p-8 flex items-center justify-center overflow-hidden relative">
            <ComparisonViewer 
                beforeImage={sourceImage} 
                afterImage={resultImage} 
                isProcessing={procState.isProcessing}
            />
            
            <ProcessingLog state={procState} />
        </div>
      </main>

      {/* --- RIGHT SIDEBAR: AI Assistant --- */}
      <aside className="w-80 border-l border-white/5 bg-[#0a0a0a] flex flex-col">
        <div className="p-6 h-16 border-b border-white/5 flex items-center">
             <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Wand2 size={14} /> AI Colorist
             </h2>
        </div>
        
        <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
             
             {/* API Key Check */}
            {!hasApiKey && (
                <button 
                    onClick={handleConnectApiKey}
                    className="w-full py-2 bg-red-900/20 hover:bg-red-800/30 border border-red-900/50 text-red-200 text-xs rounded flex items-center justify-center gap-2 transition mb-4"
                >
                    <KeyRound size={12} /> Connect Cloud API
                </button>
            )}

             {/* Custom Grade Section */}
             <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4">
                <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                    Describe a specific mood or lighting condition. The AI will generate a parameter set for the GPU engine.
                </p>
                <textarea 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g., 'Dreamy 1980s Kodak film look, warm halation, nostalgic afternoon sun...'"
                    className="w-full h-24 bg-black border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 placeholder-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-900 outline-none resize-none mb-3"
                />
                
                <div className="space-y-2">
                    <button 
                        onClick={() => processGrade()}
                        disabled={!sourceImage || !aiPrompt || procState.isProcessing}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Aperture size={14} /> Generate Custom Look
                    </button>
                    
                    <button 
                        onClick={handleAnalyzeImage}
                        disabled={!sourceImage || isAnalyzing || procState.isProcessing}
                        className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed border border-white/5"
                    >
                        {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <ScanLine size={14} />} 
                        {isAnalyzing ? "Analyzing..." : "Analyze Source"}
                    </button>
                </div>

                {/* Analysis Result Display */}
                {analysisResult && (
                    <div className="mt-3 p-3 bg-black/40 rounded-lg border border-indigo-500/20 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 mb-1.5">
                            <Sparkles size={10} className="text-indigo-400" />
                            <span className="text-[10px] font-bold text-indigo-300 uppercase">Technical Insight</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
                            {analysisResult}
                        </p>
                    </div>
                )}
             </div>

        </div>
      </aside>

    </div>
  );
}
