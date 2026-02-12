import React, { useState, useEffect } from 'react';

export interface AuthConfig {
  mode: 'ai-studio' | 'vertex-ai';
  apiKey?: string;
  projectId?: string;
  location?: string;
  accessToken?: string;
}

const STORAGE_KEY = 'nano_banana_auth_config';

export const getStoredAuthConfig = (): AuthConfig | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const storeAuthConfig = (config: AuthConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
};

export const clearAuthConfig = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
};

interface ApiKeyModalProps {
  onAuthSet: (config: AuthConfig) => void;
}

const LOCATIONS = [
  'us-central1',
  'us-east1',
  'us-west1',
  'europe-west1',
  'europe-west4',
  'asia-northeast1',
  'asia-southeast1',
  'southamerica-east1',
];

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onAuthSet }) => {
  const [mode, setMode] = useState<'ai-studio' | 'vertex-ai'>('vertex-ai');
  const [apiKey, setApiKey] = useState('');
  const [projectId, setProjectId] = useState('');
  const [location, setLocation] = useState('us-central1');
  const [accessToken, setAccessToken] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'vertex-ai') {
      if (!projectId.trim()) {
        setError('Insira o Project ID do Google Cloud');
        return;
      }
      if (!accessToken.trim() && !apiKey.trim()) {
        setError('Insira o Access Token ou API Key');
        return;
      }
      const config: AuthConfig = {
        mode: 'vertex-ai',
        projectId: projectId.trim(),
        location,
        accessToken: accessToken.trim() || undefined,
        apiKey: apiKey.trim() || undefined,
      };
      storeAuthConfig(config);
      onAuthSet(config);
    } else {
      if (!apiKey.trim()) {
        setError('Insira a API Key do Google AI Studio');
        return;
      }
      const config: AuthConfig = {
        mode: 'ai-studio',
        apiKey: apiKey.trim(),
      };
      storeAuthConfig(config);
      onAuthSet(config);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-sm my-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 flex items-center justify-center shadow-xl shadow-amber-500/30 mb-3">
            <span className="text-2xl" role="img" aria-label="banana">&#127820;</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Nano Banana Pro</h1>
          <p className="text-xs text-slate-500 mt-0.5">Imagen 3 &middot; Gerador de Imagens</p>
        </div>

        {/* Mode selector */}
        <div className="flex bg-gray-900 rounded-xl p-1 border border-gray-800 mb-5">
          <button
            type="button"
            onClick={() => { setMode('vertex-ai'); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'vertex-ai'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'text-slate-500'
            }`}
          >
            <div>Vertex AI</div>
            <div className={`text-[9px] font-normal mt-0.5 ${mode === 'vertex-ai' ? 'text-amber-500/60' : 'text-slate-600'}`}>
              Imagen 3 completo
            </div>
          </button>
          <button
            type="button"
            onClick={() => { setMode('ai-studio'); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'ai-studio'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-500'
            }`}
          >
            <div>AI Studio</div>
            <div className={`text-[9px] font-normal mt-0.5 ${mode === 'ai-studio' ? 'text-cyan-500/60' : 'text-slate-600'}`}>
              API gratuita
            </div>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'vertex-ai' ? (
            <>
              {/* Project ID */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Project ID (Google Cloud)
                </label>
                <input
                  type="text"
                  value={projectId}
                  onChange={(e) => { setProjectId(e.target.value); setError(''); }}
                  placeholder="meu-projeto-12345"
                  className="w-full bg-gray-900/80 border border-gray-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 p-3 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                />
              </div>

              {/* Location */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Regiao
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-gray-900/80 border border-gray-800 rounded-lg text-sm text-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                >
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Access Token */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Access Token <span className="text-slate-600">(recomendado)</span>
                </label>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={accessToken}
                  onChange={(e) => { setAccessToken(e.target.value); setError(''); }}
                  placeholder="ya29.a0AfH6SM..."
                  className="w-full bg-gray-900/80 border border-gray-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 p-3 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                />
                <p className="text-[9px] text-slate-600 leading-relaxed px-0.5">
                  Execute no terminal: <span className="font-mono text-slate-500">gcloud auth print-access-token</span>
                </p>
              </div>

              {/* OR separator */}
              <div className="flex items-center gap-3 px-1">
                <div className="flex-1 border-t border-gray-800" />
                <span className="text-[10px] text-slate-600 font-medium">OU</span>
                <div className="flex-1 border-t border-gray-800" />
              </div>

              {/* API Key */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  API Key (Google Cloud)
                </label>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setError(''); }}
                  placeholder="AIza..."
                  className="w-full bg-gray-900/80 border border-gray-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 p-3 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                />
              </div>
            </>
          ) : (
            /* AI Studio mode */
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                API Key (Google AI Studio)
              </label>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setError(''); }}
                placeholder="AIza..."
                className="w-full bg-gray-900/80 border border-gray-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
                autoFocus
              />
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-cyan-500 hover:text-cyan-400 transition-colors px-0.5"
              >
                Criar API Key no AI Studio (gratis)
              </a>
            </div>
          )}

          {/* Show/hide toggle */}
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors self-start px-0.5"
          >
            {showKey ? 'Ocultar credenciais' : 'Mostrar credenciais'}
          </button>

          {error && <p className="text-xs text-red-400 px-0.5">{error}</p>}

          <button
            type="submit"
            className={`w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-300 transform active:scale-[0.98] ${
              mode === 'vertex-ai'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
            }`}
          >
            Entrar
          </button>
        </form>

        {/* Info box */}
        {mode === 'vertex-ai' && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
            <p className="text-[10px] text-amber-400/80 leading-relaxed font-medium">
              Vertex AI permite usar Imagen 3 com editImage e EDIT_MODE_PRODUCT_IMAGE para preservar seu produto com total fidelidade.
            </p>
          </div>
        )}
        {mode === 'ai-studio' && (
          <div className="mt-4 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/15">
            <p className="text-[10px] text-cyan-400/80 leading-relaxed">
              Com AI Studio voce pode gerar imagens do zero. Para edicao de produto com referencia, use Vertex AI.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
