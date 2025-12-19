import React, { useState, useEffect, useRef } from 'react';
import { 
  Languages, 
  ArrowRightLeft, 
  Copy, 
  Check, 
  Sparkles, 
  Globe, 
  BookOpen,
  X,
  Loader2
} from 'lucide-react';
import API_BASE_URL from '../config/env';
const apiKey = API_BASE_URL; // System provides key

// --- Utils & Constants ---

const LANGUAGES = [
  { code: 'auto', name: 'Detect Language' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ar', name: 'Arabic' },
  { code: 'tr', name: 'Turkish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
];

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// --- Components ---

const GlassCard = ({ children, className = "" }) => (
  // Dark Mode Glass: Matte black/grey with subtle border
  <div 
    className={`backdrop-blur-2xl bg-[#1E2024]/80 border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.2)] rounded-3xl p-4 md:p-6 transition-all duration-500 hover:bg-[#25282D]/90 ${className}`}
  >
    {children}
  </div>
);

const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#0F1115]">
      {/* Dark Korean Theme Accents - Muted, Sophisticated Pastels on Dark */}
      <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] bg-[#2A2640] rounded-full blur-[120px] animate-float-slow opacity-60"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-[#1C2836] rounded-full blur-[100px] animate-float-slower opacity-60"></div>
      <div className="absolute top-[30%] right-[20%] w-[40vw] h-[40vw] bg-[#2D232F] rounded-full blur-[90px] animate-pulse-slow opacity-50"></div>
    </div>
  );
};

const SelectionPopup = ({ position, data, loading, error, onClose }) => {
  const popupRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, arrowOffset: 0, showBelow: false });

  // STRICT Positioning Logic
  useEffect(() => {
    if (!position || !popupRef.current) return;

    const popupWidth = popupRef.current.offsetWidth || 280;
    const padding = 16; // Safety margin from screen edges
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight; // Use viewport height
    
    // 1. Calculate Horizontal Position (Clamp Logic)
    const halfWidth = popupWidth / 2;
    const minCenter = halfWidth + padding;
    const maxCenter = windowWidth - halfWidth - padding;
    const clampedCenter = Math.max(minCenter, Math.min(position.x, maxCenter));
    const shift = clampedCenter - position.x;

    // 2. Calculate Vertical Position
    // Check if there is enough space above
    const spaceAbove = position.y;
    // Check if showing below puts it off screen
    // Approx height 250px
    const showBelow = spaceAbove < 240; 
    
    const top = showBelow ? position.y + 24 : position.y - 12;

    setCoords({
      left: clampedCenter,
      top: top,
      arrowOffset: -shift, 
      showBelow
    });

  }, [position, data, loading, error]); 

  if (!position) return null;

  return (
    <div 
      ref={popupRef}
      className="fixed z-50 animate-in fade-in zoom-in-95 duration-200"
      style={{ 
        top: coords.top, 
        left: coords.left, 
        transform: coords.showBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
        width: 'max-content',
        maxWidth: '90vw' 
      }}
    >
      <div className="bg-[#1A1C20] backdrop-blur-xl border border-white/10 text-slate-200 p-4 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] min-w-[280px] max-w-sm relative">
        
        {/* Dynamic Arrow */}
        <div 
          className={`absolute w-4 h-4 bg-[#1A1C20] border-r border-b border-white/10 rotate-45 transition-all duration-200`}
          style={{ 
            left: `calc(50% + ${coords.arrowOffset}px - 8px)`, 
            [coords.showBelow ? 'top' : 'bottom']: '-9px',
            borderRight: coords.showBelow ? 'none' : '1px solid rgba(255,255,255,0.1)',
            borderBottom: coords.showBelow ? 'none' : '1px solid rgba(255,255,255,0.1)',
            borderLeft: coords.showBelow ? '1px solid rgba(255,255,255,0.1)' : 'none',
            borderTop: coords.showBelow ? '1px solid rgba(255,255,255,0.1)' : 'none',
            backgroundColor: '#1A1C20'
          }}
        ></div>

        <button 
          onClick={onClose}
          className="absolute top-2 right-2 text-slate-500 hover:text-white transition-colors p-1"
        >
          <X size={14} />
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-4 gap-2 text-[#B4A0E5]">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm font-medium">Looking up...</span>
          </div>
        ) : error ? (
          <div className="text-red-300 text-sm py-2">{error}</div>
        ) : data ? (
          <div className="space-y-3 animate-slide-up">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={10} className="text-[#B4A0E5]" />
              Detected: <span className="text-slate-300">{data.detectedSource}</span>
            </div>
            
            <div className="space-y-2">
              {data.results.map((res, idx) => (
                <div key={idx} className="bg-[#23262B] rounded-xl p-3 border border-white/5">
                  <div className="text-[11px] text-[#88B3C8] mb-1.5 font-bold uppercase tracking-wide">{res.langName}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {res.translations.map((t, i) => (
                      <span key={i} className="text-sm bg-[#2D3138] px-2.5 py-1 rounded-lg text-slate-200 border border-white/5 hover:border-[#B4A0E5]/30 transition-colors">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const LanguageSelector = ({ selected, onChange, exclude = [], label, accentColor = "text-[#B4A0E5]" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLang = LANGUAGES.find(l => l.code === selected) || LANGUAGES[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">{label}</label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-[#1A1C20] hover:bg-[#23262B] text-slate-200 p-3.5 rounded-2xl transition-all duration-300 border border-white/5 hover:border-white/10 group"
      >
        <span className="flex items-center gap-2 truncate font-medium">
          {selectedLang.code === 'auto' ? 
            <Sparkles size={16} className="text-[#FFD166] flex-shrink-0 group-hover:rotate-12 transition-transform" /> : 
            <Globe size={16} className={`${accentColor} flex-shrink-0 group-hover:rotate-12 transition-transform`} />
          }
          <span className="truncate text-sm">{selectedLang.name}</span>
        </span>
        <span className="text-slate-600 text-xs ml-2 group-hover:translate-y-0.5 transition-transform">▼</span>
      </button>
      
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-[#1A1C20] border border-white/10 rounded-2xl shadow-2xl p-1.5 custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
          {LANGUAGES.filter(l => !exclude.includes(l.code)).map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                onChange(lang.code);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center justify-between font-medium ${
                selected === lang.code 
                  ? 'bg-[#2D3138] text-white' 
                  : 'text-slate-400 hover:bg-[#23262B] hover:text-slate-200'
              }`}
            >
              {lang.name}
              {selected === lang.code && <Check size={14} className="text-[#B4A0E5]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!text) return;
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
    document.body.removeChild(textArea);
  };

  return (
    <button 
      onClick={handleCopy}
      className={`p-2.5 rounded-full transition-all duration-300 text-slate-500 hover:text-white hover:bg-[#2D3138] active:scale-95`}
      title="Copy translation"
    >
      {copied ? <Check size={18} className="text-[#88B3C8] animate-bounce" /> : <Copy size={18} />}
    </button>
  );
};

export default function AI_Translator() {
  const [inputText, setInputText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto'); 
  const [targetLang1, setTargetLang1] = useState('en');
  const [targetLang2, setTargetLang2] = useState('fr');
  
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [detectedSource, setDetectedSource] = useState(null);

  // Popup State
  const [popup, setPopup] = useState({ 
    show: false, 
    x: 0, 
    y: 0, 
    text: '', 
    loading: false, 
    data: null,
    error: null 
  });

  const debouncedText = useDebounce(inputText, 800);

  // --- Main Translation Effect ---
  useEffect(() => {
    const translate = async () => {
      if (!debouncedText.trim()) {
        setResult(null);
        setDetectedSource(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const prompt = `
          Act as a high-end translation engine. 
          Task: Translate the following text simultaneously into two target languages.
          
          Input Text: "${debouncedText}"
          Source Language Code: "${sourceLang}" (If 'auto', detect the language).
          Target Language 1 Code: "${targetLang1}"
          Target Language 2 Code: "${targetLang2}"

          Instructions:
          1. Detect the source language if source is 'auto'.
          2. Provide a main translation for both targets.
          3. CRITICAL: If the input is a SINGLE WORD or a short phrase (under 3 words), provide 3 "synonyms" or "alternatives" for EACH target language to help the user understand nuances.
          4. Return ONLY valid JSON. No markdown formatting.

          JSON Structure:
          {
            "detectedSource": "Language Name (e.g. English)",
            "t1": "Translation 1",
            "t1_alts": ["synonym1", "synonym2", "synonym3"],
            "t2": "Translation 2",
            "t2_alts": ["synonym1", "synonym2", "synonym3"]
          }
        `;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json"
              }
            }),
          }
        );

        const data = await response.json();
        
        if (data.error) throw new Error(data.error.message);
        
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
            const jsonResult = JSON.parse(content);
            setResult(jsonResult);
            if (jsonResult.detectedSource) {
                setDetectedSource(jsonResult.detectedSource);
            }
        }
      } catch (err) {
        console.error(err);
        setError("Translation service temporarily unavailable.");
      } finally {
        setIsLoading(false);
      }
    };

    translate();
  }, [debouncedText, sourceLang, targetLang1, targetLang2]);

  // --- Selection / Hover Translation Effect ---
  useEffect(() => {
    const handleSelection = async () => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      if (!selectedText) {
        setPopup(prev => ({ ...prev, show: false }));
        return;
      }

      if (popup.show && popup.text === selectedText) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // FIXED: Do NOT add window.scrollY here. 'rect.top' is viewport relative.
      // Since the popup is 'fixed', we want viewport relative coordinates.
      setPopup({
        show: true,
        x: rect.left + rect.width / 2, 
        y: rect.top, // Use viewport y directly
        text: selectedText,
        loading: true,
        data: null,
        error: null
      });

      try {        
        const l1Name = LANGUAGES.find(l => l.code === targetLang1)?.name || targetLang1;
        const l2Name = LANGUAGES.find(l => l.code === targetLang2)?.name || targetLang2;

        const prompt = `
          Dictionary Lookup Task:
          Selected Text: "${selectedText}"
          
          Goal:
          1. Detect the language of the selected text.
          2. Translate it into "${l1Name}" and "${l2Name}".
          3. Provide 2-3 short, dictionary-style synonyms or translations for each.
          
          Return ONLY valid JSON:
          {
            "detectedSource": "Detected Language Name",
            "results": [
              { "langName": "${l1Name}", "translations": ["word1", "word2"] },
              { "langName": "${l2Name}", "translations": ["word1", "word2"] }
            ]
          }
        `;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" }
            }),
          }
        );

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (content) {
          const jsonResult = JSON.parse(content);
          setPopup(prev => ({
            ...prev,
            loading: false,
            data: jsonResult
          }));
        } else {
            throw new Error("No data");
        }
      } catch (err) {
        setPopup(prev => ({ 
            ...prev, 
            loading: false, 
            error: "Could not fetch dictionary." 
        }));
      }
    };

    const onMouseUp = () => {
        // Debounce selection slightly to allow mobile selection handles to settle
        setTimeout(handleSelection, 150);
    };

    // Use touchend for mobile interactions in addition to mouseup
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchend', onMouseUp);
    document.addEventListener('keyup', onMouseUp);

    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchend', onMouseUp);
      document.removeEventListener('keyup', onMouseUp);
    };
  }, [targetLang1, targetLang2]); 


  const clearInput = () => {
    setInputText('');
    setResult(null);
    setDetectedSource(null);
    setPopup(prev => ({ ...prev, show: false }));
  };

  const swapLanguages = () => {
    setTargetLang1(targetLang2);
    setTargetLang2(targetLang1);
  };

  return (
    <div className="font-sans selection:bg-[#B4A0E5]/30 selection:text-white relative min-h-screen text-[#E2E8F0]">
      <AnimatedBackground />
      
      {/* Selection Popup Portal */}
      {popup.show && (
          <SelectionPopup 
            position={{ x: popup.x, y: popup.y }} 
            data={popup.data} 
            loading={popup.loading} 
            error={popup.error}
            onClose={() => setPopup(prev => ({ ...prev, show: false }))}
          />
      )}

      <div className="relative max-w-6xl mx-auto px-4 py-8 md:py-16 flex flex-col items-center min-h-screen z-10">
        
        {/* Header */}
        <header className="mb-8 md:mb-12 text-center">
          <div className="inline-flex items-center justify-center p-3 mb-4 rounded-2xl bg-[#1E2024] border border-white/5 shadow-lg animate-float">
            <Languages className="w-8 h-8 text-[#B4A0E5] mr-3" />
            <h1 className="text-2xl md:text-4xl font-extrabold text-[#E2E8F0] tracking-tight">
              Gemini <span className="text-[#B4A0E5]">Nuit</span>
            </h1>
          </div>
          <p className="text-slate-500 text-sm md:text-base max-w-md mx-auto px-4 font-medium">
            Simultaneous, real-time neural translation.
          </p>
        </header>

        {/* Main Interface Grid */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          
          {/* Source Panel (Left/Top) */}
          <div className="lg:col-span-4 flex flex-col gap-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <GlassCard className="flex-1 min-h-[250px] md:min-h-[400px] flex flex-col group border-l-2 border-l-[#B4A0E5]/50">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div className="w-40 md:w-48">
                  <LanguageSelector 
                    label="Translate From"
                    selected={sourceLang} 
                    onChange={setSourceLang}
                    accentColor="text-[#B4A0E5]"
                  />
                </div>
                {detectedSource && sourceLang === 'auto' && (
                  <span className="text-xs bg-[#2D3138] px-3 py-1 rounded-full text-slate-300 animate-in zoom-in duration-300 border border-white/5 flex items-center gap-1 shadow-sm">
                    <Sparkles size={12} className="text-[#FFD166]" /> 
                    <span className="font-semibold">{detectedSource}</span>
                  </span>
                )}
              </div>

              <div className="relative flex-1">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type anything..."
                  className="w-full h-full bg-transparent border-0 resize-none focus:ring-0 text-lg md:text-2xl text-slate-200 placeholder-slate-600 leading-relaxed font-normal"
                  spellCheck="false"
                  autoFocus
                />
                {inputText && (
                  <button 
                    onClick={clearInput}
                    className="absolute top-0 right-0 p-2 text-slate-500 hover:text-white transition-all hover:rotate-90"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs text-slate-500 font-medium">
                <span>{inputText.length} chars</span>
                <span className={`flex items-center gap-2 transition-all duration-300 ${isLoading ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
                  <Loader2 size={14} className="animate-spin text-[#B4A0E5]" /> Processing
                </span>
              </div>
            </GlassCard>
          </div>

          {/* Controls */}
          <div className="lg:col-span-1 flex flex-row lg:flex-col items-center justify-center gap-4 py-2 lg:py-0 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="h-px w-full lg:w-px lg:h-full bg-gradient-to-r lg:bg-gradient-to-b from-transparent via-white/5 to-transparent"></div>
            <button 
              onClick={swapLanguages}
              className="p-3 md:p-4 rounded-full bg-[#1A1C20] hover:bg-[#25282D] border border-white/10 shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 group flex-shrink-0"
              title="Swap Target Languages"
            >
              <ArrowRightLeft className="text-slate-500 group-hover:text-[#B4A0E5] transition-colors group-hover:rotate-180 duration-500" size={20} />
            </button>
            <div className="h-px w-full lg:w-px lg:h-full bg-gradient-to-r lg:bg-gradient-to-b from-transparent via-white/5 to-transparent"></div>
          </div>

          {/* Output Panels (Right/Bottom) */}
          <div className="lg:col-span-7 flex flex-col gap-4 md:gap-6">
            
            {/* Target 1 */}
            <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <GlassCard className="relative overflow-hidden group hover:border-[#88B3C8]/30 transition-all duration-500 border-l-2 border-l-[#88B3C8]/50">
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="w-40">
                    <LanguageSelector 
                      label="Target 1"
                      selected={targetLang1} 
                      onChange={setTargetLang1}
                      exclude={['auto', targetLang2]}
                      accentColor="text-[#88B3C8]"
                    />
                  </div>
                  <div className="flex gap-2">
                     <CopyButton text={result?.t1} />
                  </div>
                </div>

                <div className="min-h-[100px] flex flex-col justify-center relative z-10">
                  {isLoading && !result ? (
                    <div className="animate-pulse space-y-3 opacity-30">
                       <div className="h-4 bg-slate-400 rounded w-3/4"></div>
                       <div className="h-4 bg-slate-500 rounded w-1/2"></div>
                    </div>
                  ) : result ? (
                    <>
                      <p className="text-xl md:text-3xl text-slate-200 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-700">
                        {result.t1}
                      </p>
                      {/* Synonyms/Alternatives Section */}
                      {result.t1_alts && result.t1_alts.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-white/5 animate-in fade-in duration-1000 delay-200">
                          <div className="flex items-center gap-2 mb-2 text-[#88B3C8] text-[10px] uppercase tracking-widest font-bold">
                            <BookOpen size={10} />
                            <span>Nuances</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {result.t1_alts.map((alt, i) => (
                              <span key={i} className="px-3 py-1.5 rounded-lg bg-[#2D3138] text-[#88B3C8] text-sm border border-white/5 hover:border-[#88B3C8]/30 transition-colors cursor-default">
                                {alt}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-600 italic text-sm md:text-base font-normal">Translation appears here...</p>
                  )}
                </div>
              </GlassCard>
            </div>

            {/* Target 2 */}
            <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <GlassCard className="relative overflow-hidden group hover:border-[#F4A5AE]/30 transition-all duration-500 border-l-2 border-l-[#F4A5AE]/50">
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="w-40">
                    <LanguageSelector 
                      label="Target 2"
                      selected={targetLang2} 
                      onChange={setTargetLang2}
                      exclude={['auto', targetLang1]}
                      accentColor="text-[#F4A5AE]"
                    />
                  </div>
                  <div className="flex gap-2">
                     <CopyButton text={result?.t2} />
                  </div>
                </div>

                <div className="min-h-[100px] flex flex-col justify-center relative z-10">
                  {isLoading && !result ? (
                    <div className="animate-pulse space-y-3 opacity-30">
                       <div className="h-4 bg-slate-400 rounded w-3/4"></div>
                       <div className="h-4 bg-slate-500 rounded w-1/2"></div>
                    </div>
                  ) : result ? (
                    <>
                      <p className="text-xl md:text-3xl text-slate-200 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-700">
                        {result.t2}
                      </p>
                      {/* Synonyms/Alternatives Section */}
                      {result.t2_alts && result.t2_alts.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-white/5 animate-in fade-in duration-1000 delay-300">
                          <div className="flex items-center gap-2 mb-2 text-[#F4A5AE] text-[10px] uppercase tracking-widest font-bold">
                            <BookOpen size={10} />
                            <span>Nuances</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {result.t2_alts.map((alt, i) => (
                              <span key={i} className="px-3 py-1.5 rounded-lg bg-[#2D3138] text-[#F4A5AE] text-sm border border-white/5 hover:border-[#F4A5AE]/30 transition-colors cursor-default">
                                {alt}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-600 italic text-sm md:text-base font-normal">Translation appears here...</p>
                  )}
                </div>
              </GlassCard>
            </div>

          </div>
        </div>

        {/* Footer info */}
        {error && (
          <div className="mt-8 p-4 rounded-xl bg-red-900/20 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 animate-bounce shadow-sm">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
            {error}
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3E4C59;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #52606D;
        }
        
        /* Animations */
        @keyframes float-slow {
          0% { transform: translate(0, 0); }
          50% { transform: translate(20px, 30px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes float-slower {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, -20px) scale(1.1); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        @keyframes slide-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float-y {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }

        .animate-float-slow { animation: float-slow 10s ease-in-out infinite; }
        .animate-float-slower { animation: float-slower 15s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 6s ease-in-out infinite; }
        .animate-slide-up { animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .animate-float { animation: float-y 6s ease-in-out infinite; }
        .animate-spin-slow { animation: spin 10s linear infinite; }
        .animate-scale-in { animation: scaleIn 0.2s ease-out forwards; }
        
        @keyframes scaleIn {
            from { transform: scale(0); }
            to { transform: scale(1); }
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}