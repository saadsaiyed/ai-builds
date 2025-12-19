import React, { useEffect, useState, Suspense, lazy } from 'react';
import './App.css';

const ChadBot = lazy(() => import('./pages/ChadBot'));
const Translator = lazy(() => import('./pages/Translator'));

function loadModelViewer() {
  if (typeof window === 'undefined') return;
  if (window.customElements && window.customElements.get && window.customElements.get('model-viewer')) return;
  // Load module build first (modern browsers)
  const s = document.createElement('script');
  s.type = 'module';
  s.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
  s.defer = true;
  document.head.appendChild(s);

  // Add nomodule UMD fallback for older loaders/bundlers that don't support ESM
  const s2 = document.createElement('script');
  s2.noModule = true;
  s2.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer-umd.js';
  s2.defer = true;
  document.head.appendChild(s2);
}

const NavBar = ({ active, setActive }) => (
  <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-6xl">
    <nav className="backdrop-blur-lg bg-black/30 border border-white/6 rounded-3xl px-5 py-3 flex items-center justify-between shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-[0_8px_40px_rgba(139,92,246,0.25)] flex items-center justify-center font-bold text-white">AI</div>
        <div className="ml-1">
          <div className="text-xs text-zinc-300 font-semibold">ai-builds</div>
          <div className="text-[10px] text-zinc-400">Futuristic Playground</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => setActive('home')} className={`px-3 py-2 rounded-xl text-sm font-medium ${active==='home'? 'bg-white/6 text-white':'text-zinc-300 hover:text-white'}`}>Home</button>
        <button onClick={() => setActive('translator')} className={`px-3 py-2 rounded-xl text-sm font-medium ${active==='translator'? 'bg-white/6 text-white':'text-zinc-300 hover:text-white'}`}>Translator</button>
        <button onClick={() => setActive('chadbot')} className={`px-3 py-2 rounded-xl text-sm font-medium ${active==='chadbot'? 'bg-white/6 text-white':'text-zinc-300 hover:text-white'}`}>ChadBot</button>
        <a href="#" className="ml-2 px-3 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold shadow-md">Get Started</a>
      </div>
    </nav>
  </header>
);

export default function App() {
  const [active, setActive] = useState('home');

  useEffect(() => {
    loadModelViewer();
  }, []);

  return (
    <div className="min-h-screen bg-[#050205] text-white overflow-hidden relative">

      {/* Animated background blobs */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-40 -top-40 w-[60vw] h-[60vw] bg-gradient-to-br from-[#3b0f8a] to-[#ff4db6] opacity-10 rounded-full blur-3xl animate-blob" />
        <div className="absolute -right-40 -bottom-40 w-[60vw] h-[60vw] bg-gradient-to-br from-[#00c6ff] to-[#8a2be2] opacity-8 rounded-full blur-3xl animate-blob animation-delay-2000" />
      </div>

      <NavBar active={active} setActive={setActive} />

      <main className="relative z-10 pt-32 px-6">
        {active === 'home' && (
          <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tighter">
                Dive into the future of <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-300 to-fuchsia-300">conversational AI</span>
              </h1>
              <p className="text-zinc-300 max-w-xl">Beautiful tools, intelligent models, and immersive UI. Explore instant translation, chat analysis, and predictive replies in one futuristic playground.</p>

              <div className="flex gap-3 items-center">
                <button onClick={() => setActive('chadbot')} className="px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-[0_20px_50px_rgba(139,92,246,0.18)] font-bold">Open ChadBot</button>
                <button onClick={() => setActive('translator')} className="px-6 py-3 rounded-2xl border border-white/10 text-zinc-200 hover:bg-white/5">Open Translator</button>
              </div>

              <div className="mt-6 flex gap-3 items-center text-sm text-zinc-400">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_12px_rgba(34,197,94,0.2)]" />
                  Live demo
                </div>
                <div>•</div>
                <div>Secure • Fast • Experimental</div>
              </div>
            </div>

            <div className="relative w-full h-[420px] overflow-hidden bg-transparent p-0">
              <div className="w-full h-full">
                {/* 3D model viewer without box chrome, fully interactive */}
                <model-viewer
                  src="https://modelviewer.dev/shared-assets/models/Astronaut.glb"
                  alt="Interactive 3D"
                  ar
                  camera-controls
                  auto-rotate
                  exposure="1"
                  style={{ width: '100%', height: '100%', borderRadius: 0, pointerEvents: 'auto' }}
                />
              </div>
            </div>
          </section>
        )}

        {active === 'translator' && (
          <div className="max-w-6xl mx-auto">
            <Suspense fallback={<div className="text-center text-zinc-400 py-24">Loading Translator…</div>}>
              <Translator />
            </Suspense>
          </div>
        )}

        {active === 'chadbot' && (
          <div className="max-w-6xl mx-auto">
            <Suspense fallback={<div className="text-center text-zinc-400 py-24">Loading ChadBot…</div>}>
              <ChadBot />
            </Suspense>
          </div>
        )}
      </main>

      <footer className="absolute bottom-6 left-0 right-0 text-center z-20">
        <div className="max-w-4xl mx-auto text-xs text-zinc-500">Made For Fun | Checkout <a href="https://noohsolutions.ca" className="text-violet-400 hover:text-violet-300">Nooh Solutions</a></div>
      </footer>
    </div>
  );
}
