import React, { useState } from 'react';

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
  modelColor: string;
}

const SUGGESTIONS = [
  "Um gato astronauta flutuando no espaco com a Terra ao fundo, estilo fotorrealista",
  "Paisagem de montanhas com lago cristalino ao por do sol, fotografia profissional",
  "Retrato de uma raposa cyberpunk com neon, arte digital detalhada",
  "Mesa de cafe da manha japonesa tradicional, fotografia de alimentos premium",
  "Cidade futurista flutuante nas nuvens com jardins suspensos, concept art",
  "Bolo de chocolate gourmet com frutas vermelhas, fotografia de estudio",
];

export const PromptInput: React.FC<PromptInputProps> = ({
  onSubmit,
  disabled = false,
  modelColor,
}) => {
  const [prompt, setPrompt] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !disabled) {
      onSubmit(prompt.trim());
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
    setShowSuggestions(false);
  };

  const gradientClass =
    modelColor === 'amber'
      ? 'from-amber-500 to-yellow-600'
      : 'from-cyan-500 to-blue-600';

  const shadowClass =
    modelColor === 'amber'
      ? 'shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]'
      : 'shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]';

  const focusRingClass =
    modelColor === 'amber'
      ? 'focus-within:ring-amber-500/30 focus-within:border-amber-500/50'
      : 'focus-within:ring-cyan-500/30 focus-within:border-cyan-500/50';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Prompt
        </label>
        <button
          type="button"
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider transition-colors"
        >
          {showSuggestions ? 'Fechar' : 'Sugestoes'}
        </button>
      </div>

      {showSuggestions && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSuggestionClick(s)}
              className="flex-shrink-0 max-w-[200px] text-left text-xs bg-gray-900/80 border border-gray-800 rounded-lg px-3 py-2 text-slate-400 hover:text-slate-200 hover:border-indigo-500/30 hover:bg-gray-900 transition-all duration-200"
            >
              {s.length > 60 ? s.substring(0, 60) + '...' : s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div
          className={`relative rounded-xl border border-gray-800 bg-gray-900/60 transition-all duration-300 ring-2 ring-transparent ${focusRingClass}`}
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Descreva a imagem que voce quer gerar..."
            disabled={disabled}
            rows={3}
            className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-600 p-3.5 pb-2 resize-none focus:outline-none disabled:opacity-50"
          />
          <div className="flex items-center justify-between px-3.5 pb-3">
            <span className="text-[10px] text-slate-600">
              {prompt.length} caracteres
            </span>
            {prompt.trim() && (
              <button
                type="button"
                onClick={() => setPrompt('')}
                className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={!prompt.trim() || disabled}
          className={`w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r ${gradientClass} transition-all duration-300 transform active:scale-[0.98] ${shadowClass} disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none`}
        >
          {disabled ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Gerando...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
              Gerar Imagem
            </span>
          )}
        </button>
      </form>
    </div>
  );
};
