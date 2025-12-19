import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Sparkles, ChevronDown, RefreshCw, Brain, X, Loader2, Zap } from 'lucide-react';
import API_BASE_URL from '../config/env';

// --- Configuration ---
const apiKey = API_BASE_URL; // API Key provided by runtime environment

// --- Helper Functions ---

const cleanText = (text) => {
    return text.replace(/\u202F/g, ' ').replace(/\u00A0/g, ' ');
};

const fixMojibake = (text) => {
    try {
        // Attempt to fix double-encoded UTF-8 (e.g. "ð\u009f\u0098\u0085" -> "😅")
        // This works by treating the chars as individual bytes and re-decoding them
        return decodeURIComponent(escape(text));
    } catch (e) {
        // If decoding fails (e.g. text was already correct or contained characters > 255), return original
        return text;
    }
};

const parseChat = (rawText) => {
    // 0. Try JSON parsing first (for LLM/training data formats)
    try {
        let trimmed = rawText.trim();
        // Remove markdown code blocks if present
        trimmed = trimmed.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');

        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            const json = JSON.parse(trimmed);
            const jsonMessages = Array.isArray(json) ? json : (json.messages || []);

            if (Array.isArray(jsonMessages) && jsonMessages.length > 0) {
                const messages = [];
                const participants = new Set();

                jsonMessages.forEach((msg, idx) => {
                    if (msg.role && msg.content) {
                        // Capitalize role for better display (e.g. "user" -> "User")
                        const sender = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
                        participants.add(sender);

                        messages.push({
                            id: `json-${idx}-${Math.random().toString(36).substr(2, 5)}`,
                            date: '',
                            time: '',
                            sender: sender,
                            content: fixMojibake(msg.content) // Apply encoding fix here
                        });
                    }
                });

                if (messages.length > 0) {
                    return { messages, participants: Array.from(participants) };
                }
            }
        }
    } catch (e) {
        console.log("JSON Parse failed, falling back to regex", e);
        // JSON parse failed, fall back to regex text parsing
    }

    const lines = rawText.split('\n');
    const messages = [];
    const participants = new Set();

    // Define supported patterns in order of specificity (most specific first)
    const patterns = [
        {
            // 1. WhatsApp Android / Original: "2025-06-12, 11:20 a.m. - Sender: Message"
            id: 'android_iso',
            regex: /^(\d{4}-\d{2}-\d{2}),\s*(\d{1,2}:\d{2})\s*([ap]\.?m\.?)\s*-\s*([^:]+):\s*(.*)/i,
            parse: (m) => ({ date: m[1], time: `${m[2]} ${m[3]}`, sender: m[4], content: m[5] })
        },
        {
            // 2. WhatsApp iOS / Web (Brackets): "[12/06/2025, 11:20:00 AM] Sender: Message"
            // Also matches "[12/06/25 11:20 AM] Sender: Message"
            id: 'ios_brackets',
            regex: /^\[(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})[,\sT]+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap]\.?[Mm]\.?)?)\]\s*([^:]+):\s*(.*)/i,
            parse: (m) => ({ date: m[1], time: m[2], sender: m[3], content: m[4] })
        },
        {
            // 3. WhatsApp Short Date: "12/06/2025, 11:20 am - Sender: Message"
            id: 'android_short',
            regex: /^(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}),\s*(\d{1,2}:\d{2}\s*[APap]\.?[Mm]\.?)\s*-\s*([^:]+):\s*(.*)/i,
            parse: (m) => ({ date: m[1], time: m[2], sender: m[3], content: m[4] })
        },
        {
            // 4. Generic "Sender: Message" (Instagram/Web copy-paste fallback)
            // Checks for "Name: Content" at start of line. 
            // Limited to 30 chars for name to avoid matching regular sentences like "Note: this is..."
            id: 'generic',
            regex: /^([^\s:][^:]{0,30}):\s+(.+)/,
            parse: (m) => ({ date: '', time: '', sender: m[1], content: m[2] })
        }
    ];

    let currentMessage = null;

    lines.forEach((line) => {
        const cleanedLine = cleanText(line.trim());
        if (!cleanedLine) return;

        let extracted = null;

        // Try to match line against known patterns
        for (const p of patterns) {
            const match = cleanedLine.match(p.regex);
            if (match) {
                extracted = p.parse(match);
                break;
            }
        }

        if (extracted) {
            // If we found a new message header, push the previous message
            if (currentMessage) messages.push(currentMessage);

            const sender = extracted.sender.trim();
            participants.add(sender);

            currentMessage = {
                // Create a unique-ish ID
                id: Math.random().toString(36).substr(2, 9),
                date: extracted.date || 'Unknown',
                time: extracted.time || '',
                sender,
                content: extracted.content.trim(),
            };
        } else {
            // If no pattern matched, treat as continuation of previous message
            if (currentMessage) {
                currentMessage.content += `\n${cleanedLine}`;
            }
        }
    });

    // Push the last message
    if (currentMessage) messages.push(currentMessage);

    return { messages, participants: Array.from(participants) };
};

const callGemini = async (prompt) => {
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );

        if (!response.ok) throw new Error('API Error');

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (error) {
        console.error("Gemini Request Failed", error);
        return null;
    }
};

// --- Styled Components ---

const Card = ({ children, className = "" }) => (
    <div className={`relative bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        {children}
    </div>
);

const GradientButton = ({ children, onClick, className = "", icon: Icon, loading = false, variant = "primary" }) => {
    const variants = {
        primary: "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-[0_0_40px_-10px_rgba(139,92,246,0.5)]",
        secondary: "bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-300 hover:text-white"
    };

    return (
        <button
            onClick={onClick}
            disabled={loading}
            className={`
        group relative flex items-center justify-center gap-3 px-6 py-3 rounded-2xl font-bold tracking-wide transition-all duration-300
        active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed
        ${variants[variant]}
        ${className}
      `}
        >
            <span className="relative z-10 flex items-center gap-2">
                {loading ? <Loader2 className="animate-spin" size={20} /> : (Icon && <Icon size={20} className={variant === 'primary' ? "group-hover:rotate-12 transition-transform" : ""} />)}
                {children}
            </span>
            {variant === 'primary' && <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20 group-hover:ring-white/40 transition-all" />}
        </button>
    );
};

const SelectBox = ({ label, options, selected, onChange, placeholder }) => (
    <div className="flex flex-col gap-2 group">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1 group-focus-within:text-violet-400 transition-colors">{label}</label>
        <div className="relative">
            <select
                value={selected}
                onChange={(e) => onChange(e.target.value)}
                className="w-full appearance-none bg-zinc-950/50 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all cursor-pointer hover:bg-zinc-900"
            >
                <option value="" disabled>{placeholder}</option>
                {options.map(opt => (
                    <option key={opt} value={opt} className="bg-zinc-900">{opt}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
        </div>
    </div>
);

const InputBox = ({ label, value, onChange, placeholder }) => (
    <div className="flex flex-col gap-2 group">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1 group-focus-within:text-fuchsia-400 transition-colors">{label}</label>
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-zinc-950/50 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500 transition-all placeholder:text-zinc-700"
            placeholder={placeholder}
        />
    </div>
);

// --- Main Component ---

export default function ChadBot() {
    const [step, setStep] = useState('input');
    // Updated default text to show mixed formats
    const [rawText, setRawText] = useState(``);

    // Configuration State
    const [detectedParticipants, setDetectedParticipants] = useState([]);

    // Mappings
    const [leftOriginal, setLeftOriginal] = useState('');
    const [leftAlias, setLeftAlias] = useState('');

    const [rightOriginal, setRightOriginal] = useState('');
    const [rightAlias, setRightAlias] = useState('');

    // AI State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisData, setAnalysisData] = useState(null);
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
    const [isPredicting, setIsPredicting] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (rawText) {
            const { participants } = parseChat(rawText);
            setDetectedParticipants(participants);
            setAnalysisData(null); // Clear cached analysis when chat changes
            setIsAnalysisOpen(false); // close analysis panel when chat changes

            // Smart Auto-Assign
            const leftIsValid = participants.includes(leftOriginal);
            const rightIsValid = participants.includes(rightOriginal);

            if ((!leftIsValid || !rightIsValid) && participants.length > 0) {
                if (participants.length >= 2) {
                    const newRight = participants[0];
                    const newLeft = participants[1];
                    setRightOriginal(newRight);
                    setRightAlias(newRight);
                    setLeftOriginal(newLeft);
                    setLeftAlias(newLeft);
                } else if (participants.length === 1) {
                    setRightOriginal(participants[0]);
                    setRightAlias(participants[0]);
                    setLeftOriginal('');
                    setLeftAlias('');
                }
            }
        }
    }, [rawText]);

    // Scroll to bottom on new message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [rawText, step]);

    const handleLeftSelect = (val) => {
        setLeftOriginal(val);
        if (!leftAlias || detectedParticipants.includes(leftAlias)) setLeftAlias(val);
    };

    const handleRightSelect = (val) => {
        setRightOriginal(val);
        if (!rightAlias || detectedParticipants.includes(rightAlias)) setRightAlias(val);
    };

    const handleVisualize = () => {
        if (!leftOriginal || !rightOriginal) {
            alert("Please select the original names for both sides.");
            return;
        }
        setStep('preview');
    };

    const getProcessedMessages = () => {
        const { messages: rawMessages } = parseChat(rawText);
        return rawMessages.map(msg => {
            if (msg.sender === leftOriginal) {
                return { ...msg, side: 'left', displayName: leftAlias || leftOriginal };
            }
            if (msg.sender === rightOriginal) {
                return { ...msg, side: 'right', displayName: rightAlias || rightOriginal };
            }
            return null;
        }).filter(Boolean);
    };

    // --- AI Features ---

    const handleAnalyzeChat = async (forceRefresh = false) => {
        // If called from an onClick without args React will pass the SyntheticEvent as first arg.
        // Detect that and treat it as no force refresh.
        if (forceRefresh && typeof forceRefresh === 'object' && (forceRefresh.nativeEvent || forceRefresh._reactName)) {
            forceRefresh = false;
        }

        console.log('[Insights] handleAnalyzeChat called', { analysisDataExists: !!analysisData, isAnalysisOpen, isAnalyzing, forceRefresh });

        // Prevent duplicate concurrent requests unless explicitly forcing refresh
        if (isAnalyzing && !forceRefresh) {
            console.log('[Insights] Analysis already in progress — skipping new request');
            if (analysisData) setIsAnalysisOpen(true);
            return;
        }

        // If analysis already exists and not forcing refresh, just open the panel
        if (analysisData && !forceRefresh) {
            setIsAnalysisOpen(true);
            return;
        }

        setIsAnalyzing(true);
        const msgs = getProcessedMessages().map(m => `${m.displayName}: ${m.content}`).join('\n');
        console.log('[Insights] Prepared prompt with messages count:', msgs ? msgs.split('\n').length : 0);
        const prompt = `
      Analyze this chat conversation contextually.
      Participants: ${leftAlias} and ${rightAlias}.
      
      Provide a response in strict JSON format with the following keys:
      {
        "summary": "2 concise sentences summarizing the main topic",
        "tone": "One or two words describing the emotional tone (e.g. Professional, Flirty, Tense)",
        "dynamic": "A brief psychological assessment of the relationship dynamic between the two",
        "key_topics": ["topic 1", "topic 2", "topic 3"]
      }

      Chat Log:
      ${msgs}
    `;

        console.log('[Insights] Calling Gemini...');
        const result = await callGemini(prompt);
        console.log('[Insights] Gemini call completed', { resultExists: !!result });

        if (result) {
            try {
                const jsonString = result.replace(/```json/g, '').replace(/```/g, '').trim();
                const data = JSON.parse(jsonString);
                setAnalysisData(data);
                setIsAnalysisOpen(true);
            } catch (e) {
                setAnalysisData({
                    summary: result,
                    tone: "Analytical",
                    dynamic: "Complex interaction detected.",
                    key_topics: []
                });
                setIsAnalysisOpen(true);
            }
        }
        setIsAnalyzing(false);
    };

    const handlePredictNext = async () => {
        setIsPredicting(true);
        const msgs = getProcessedMessages().slice(-50);
        const lastMsg = msgs[msgs.length - 1];

        const nextSpeakerOriginal = lastMsg.sender === leftOriginal ? rightOriginal : leftOriginal;
        const nextSpeakerAlias = lastMsg.sender === leftOriginal ? rightAlias : leftAlias;

        const chatContext = msgs.map(m => `${m.displayName}: ${m.content}`).join('\n');

        const prompt = `
      Based on the chat history below, write the NEXT message for "${nextSpeakerAlias}".
      
      Constraints:
      - Match the user's existing writing style, sentence length, and tone perfectly.
      - Keep it concise.
      - Output ONLY the raw message text, no quotes or labels.
      
      Chat History:
      ${chatContext}
    `;

        const prediction = await callGemini(prompt);

        if (prediction) {
            // 1. Check if we are in JSON mode
            let isJson = false;
            let jsonContent = null;
            let cleanedRaw = rawText.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');

            try {
                if (cleanedRaw.startsWith('{') || cleanedRaw.startsWith('[')) {
                    jsonContent = JSON.parse(cleanedRaw);
                    isJson = true;
                }
            } catch (e) { isJson = false; }

            if (isJson && jsonContent) {
                // 2. Append to JSON
                const newMsgObj = {
                    role: nextSpeakerOriginal.toLowerCase(), // Best guess at role format (e.g. "User" -> "user")
                    content: prediction.trim()
                };

                if (Array.isArray(jsonContent)) {
                    jsonContent.push(newMsgObj);
                } else if (jsonContent.messages && Array.isArray(jsonContent.messages)) {
                    jsonContent.messages.push(newMsgObj);
                } else {
                    // Fallback if structure is weird, treat as text
                    isJson = false;
                }

                if (isJson) {
                    setRawText(JSON.stringify(jsonContent, null, 2));
                }
            }

            if (!isJson) {
                // 3. Fallback: Append as Text
                const now = new Date();
                const dateStr = now.toISOString().split('T')[0];
                const ampm = now.getHours() >= 12 ? 'p.m.' : 'a.m.';
                const newLine = `\n${dateStr}, ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')} ${ampm} - ${nextSpeakerOriginal}: ${prediction.trim()}`;
                setRawText(prev => prev + newLine);
            }
        }
        setIsPredicting(false);
    };

    // --- Input View ---
    if (step === 'input') {
        return (
            <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-violet-500/30 selection:text-violet-200 overflow-hidden relative">
                <div className="fixed inset-0 z-0">
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-900/20 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-900/20 rounded-full blur-[120px]" />
                    <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-indigo-900/10 rounded-full blur-[100px]" />
                </div>

                <div className="relative z-10 container mx-auto px-4 py-12 min-h-screen flex flex-col items-center justify-center max-w-5xl">
                    <div className="text-center mb-12 space-y-4">
                        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-zinc-800 to-black border border-zinc-700 shadow-xl mb-4">
                            <Sparkles className="text-violet-400" size={24} />
                        </div>
                        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-zinc-200 to-zinc-500">
                            Nexus Chat
                        </h1>
                        <p className="text-zinc-400 text-lg max-w-md mx-auto">
                            Transform raw data into a visual masterpiece.
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8 w-full">
                        <Card className="p-8 flex flex-col h-full">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-200">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold border border-zinc-700">1</span>
                                    Source Data
                                </h2>
                                <button
                                    onClick={() => { setRawText(''); setDetectedParticipants([]); }}
                                    className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
                                >
                                    <RefreshCw size={12} /> Reset
                                </button>
                            </div>
                            <textarea
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                placeholder="Paste chat from WhatsApp, Instagram, or JSON...
Supported formats:
- [12/06/2025, 11:00 AM] Name: Message
- 2025-06-12, 11:00 a.m. - Name: Message
- Name: Message
- JSON (Role/Content)"
                                className="w-full flex-1 min-h-[300px] bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 text-sm font-mono text-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none custom-scrollbar"
                                style={{ lineHeight: '1.6' }}
                            ></textarea>
                        </Card>

                        <div className="flex flex-col gap-6">
                            <Card className="p-8 flex-1">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-200 mb-8">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold border border-zinc-700">2</span>
                                    Configuration
                                </h2>

                                {detectedParticipants.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-48 text-zinc-500 text-sm italic border-2 border-dashed border-zinc-800 rounded-xl">
                                        Paste text to detect participants
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <div className="relative p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/50">
                                            <div className="absolute -top-3 left-4 px-2 bg-[#121214] text-xs font-bold text-zinc-500 uppercase tracking-widest border border-zinc-800 rounded">
                                                Left Side (Them)
                                            </div>
                                            <div className="grid gap-4">
                                                <SelectBox
                                                    label="Original Name in Chat"
                                                    options={detectedParticipants}
                                                    selected={leftOriginal}
                                                    onChange={handleLeftSelect}
                                                    placeholder="Select sender..."
                                                />
                                                <InputBox
                                                    label="Display As (Rename)"
                                                    value={leftAlias}
                                                    onChange={setLeftAlias}
                                                    placeholder="e.g. Client"
                                                />
                                            </div>
                                        </div>

                                        <div className="relative p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/50">
                                            <div className="absolute -top-3 left-4 px-2 bg-[#121214] text-xs font-bold text-zinc-500 uppercase tracking-widest border border-zinc-800 rounded">
                                                Right Side (You)
                                            </div>
                                            <div className="grid gap-4">
                                                <SelectBox
                                                    label="Original Name in Chat"
                                                    options={detectedParticipants}
                                                    selected={rightOriginal}
                                                    onChange={handleRightSelect}
                                                    placeholder="Select sender..."
                                                />
                                                <InputBox
                                                    label="Display As (Rename)"
                                                    value={rightAlias}
                                                    onChange={setRightAlias}
                                                    placeholder="e.g. Me"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </Card>

                            <GradientButton onClick={handleVisualize} icon={Sparkles} className="w-full text-lg">
                                Generate Interface
                            </GradientButton>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- Preview View ---
    const displayMessages = getProcessedMessages();

    return (
        <div className="h-screen bg-[#050505] text-white font-sans overflow-hidden flex flex-col relative">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-violet-600/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[0%] left-[-10%] w-[50vw] h-[50vw] bg-fuchsia-600/10 rounded-full blur-[150px]" />
            </div>

            {/* Header */}
            <header className="flex-none sticky top-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/5">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={() => setStep('input')}
                        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium group"
                    >
                        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Config
                    </button>

                    <div className="text-center">
                        <h1 className="text-sm font-bold tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200 opacity-90">
                            {leftAlias} & {rightAlias}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleAnalyzeChat()}
                            disabled={isAnalyzing}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/20 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                        >
                            {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
                            Insights
                        </button>
                    </div>
                </div>
            </header>

            {/* Analysis Modal */}
            {isAnalysisOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <Card className="max-w-md w-full p-0">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-violet-200">
                                <Sparkles size={16} className="text-fuchsia-400" /> Neural Analysis
                            </h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleAnalyzeChat(true)}
                                    disabled={isAnalyzing}
                                    className="text-xs px-2 py-1 rounded bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30 transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                    {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                    Refresh
                                </button>
                                <button onClick={() => setIsAnalysisOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <h4 className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-bold">Summary</h4>
                                <p className="text-zinc-200 text-sm leading-relaxed">{analysisData.summary}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                                    <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1 font-bold">Tone</h4>
                                    <p className="text-fuchsia-300 font-medium">{analysisData.tone}</p>
                                </div>
                                <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                                    <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1 font-bold">Dynamic</h4>
                                    <p className="text-violet-300 text-xs leading-snug">{analysisData.dynamic}</p>
                                </div>
                            </div>
                            {analysisData.key_topics && (
                                <div className="flex gap-2 flex-wrap">
                                    {analysisData.key_topics.map(topic => (
                                        <span key={topic} className="px-2 py-1 rounded bg-white/5 text-zinc-400 text-[10px] border border-white/5">
                                            #{topic}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* Chat Container */}
            <main className="flex-1 overflow-y-auto px-4 py-8 relative z-10 custom-scrollbar">
                <div className="max-w-3xl mx-auto space-y-6 pb-32">

                    <div className="flex justify-center mb-12">
                        <span className="px-4 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] uppercase tracking-widest text-zinc-500">
                            Encrypted Connection
                        </span>
                    </div>

                    {displayMessages.length === 0 ? (
                        <div className="text-center text-zinc-500 py-20">No messages found matching criteria.</div>
                    ) : (
                        displayMessages.map((msg, idx) => {
                            const isRight = msg.side === 'right';
                            const isSequence = idx > 0 && displayMessages[idx - 1].side === msg.side;

                            return (
                                <div
                                    key={msg.id}
                                    className={`flex w-full ${isRight ? 'justify-end' : 'justify-start'} ${isSequence ? 'mt-1' : 'mt-6'}`}
                                >
                                    {!isRight && !isSequence && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-300 mr-3 shadow-lg border border-white/5 self-end mb-1">
                                            {msg.displayName.charAt(0).toUpperCase()}
                                        </div>
                                    )}

                                    <div
                                        className={`
                      relative max-w-[80%] px-5 py-3 text-[15px] leading-relaxed backdrop-blur-md shadow-2xl transition-all duration-300 hover:scale-[1.01]
                      ${isRight
                                                ? 'bg-gradient-to-br from-violet-600/90 to-fuchsia-600/90 text-white rounded-[20px] rounded-br-[4px] border border-white/10'
                                                : 'bg-zinc-800/60 text-zinc-100 rounded-[20px] rounded-bl-[4px] border border-white/5'
                                            }
                      ${isSequence ? (isRight ? 'rounded-tr-[8px]' : 'rounded-tl-[8px]') : ''}
                    `}
                                    >
                                        {!isSequence && !isRight && (
                                            <div className="text-[10px] font-bold text-zinc-400 mb-1 tracking-wide opacity-50 uppercase">
                                                {msg.displayName}
                                            </div>
                                        )}

                                        <span className="whitespace-pre-wrap font-light tracking-wide">{msg.content}</span>

                                        <div className={`text-[9px] mt-2 flex justify-end gap-1 ${isRight ? 'text-white/60' : 'text-zinc-500'}`}>
                                            {msg.time}
                                        </div>
                                    </div>

                                    {isRight && !isSequence && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-[10px] font-bold text-white ml-3 shadow-lg shadow-fuchsia-500/20 border border-white/10 self-end mb-1">
                                            {msg.displayName.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                    <div ref={scrollRef} />
                </div>
            </main>

            {/* Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-20">
                <div className="max-w-3xl mx-auto flex justify-center">
                    <GradientButton
                        variant="secondary"
                        onClick={handlePredictNext}
                        loading={isPredicting}
                        icon={Zap}
                        className="rounded-full px-8 shadow-2xl border-violet-500/30 text-violet-200 hover:text-white hover:border-violet-400"
                    >
                        {isPredicting ? "Generating..." : "Predict Next Reply"}
                    </GradientButton>
                </div>
            </div>

        </div>
    );
}