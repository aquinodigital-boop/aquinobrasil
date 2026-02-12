import React, { useState } from 'react';

const STORAGE_KEY = 'nano_banana_api_key';

export const getStoredApiKey = (): string | null => {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
};

export const storeApiKey = (key: string): void => {
  try { localStorage.setItem(STORAGE_KEY, key); } catch {}
};

export const clearApiKey = (): void => {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
};

interface ApiKeyModalProps {
  onApiKeySet: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onApiKeySet }) => {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) { setError('Insira sua API Key'); return; }
    if (trimmed.length < 20) { setError('API Key parece invalida'); return; }
    storeApiKey(trimmed);
    onApiKeySet(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 flex items-center justify-center shadow-xl shadow-amber-500/30 mb-4">
            <span className="text-3xl" role="img" aria-label="banana">&#127820;</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Nano Banana Pro</h1>
          <p className="text-sm text-slate-500 mt-1">Imagen 3 &middot; Gerador de Imagens</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">API Key do Gemini</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={key}
                onChange={(e) => { setKey(e.target.value); setError(''); }}
                placeholder="Cole sua API Key aqui..."
                className="w-full bg-gray-900/80 border border-gray-800 rounded-xl text-sm text-slate-200 placeholder-slate-600 p-3.5 pr-12 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                autoFocus
              />
              <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors text-xs">
                {showKey ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>

          <button type="submit" className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-amber-500 to-orange-600 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all active:scale-[0.98]">
            Entrar
          </button>
        </form>

        <div className="mt-6 p-4 rounded-xl bg-gray-900/60 border border-gray-800">
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors">
            Criar API Key no Google AI Studio
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
          </a>
        </div>
      </div>
    </div>
  );
};
