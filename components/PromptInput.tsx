import React, { useState, useRef } from 'react';
import type { ReferenceImage } from '../types';

interface PromptInputProps {
  onSubmit: (prompt: string, referenceImage?: ReferenceImage) => void;
  disabled?: boolean;
  modelColor: string;
}

const SUGGESTIONS = [
  "Mude o fundo para uma praia tropical ao por do sol",
  "Coloque o produto em um cenario de estudio com iluminacao profissional",
  "Adicione um fundo de floresta verde exuberante",
  "Crie uma cena de mesa de cafe com o produto em destaque",
  "Mude o cenario para uma cozinha gourmet moderna",
  "Coloque em um fundo de marmore branco com luz suave lateral",
];

const SUGGESTIONS_NO_REF = [
  "Um gato astronauta flutuando no espaco com a Terra ao fundo, estilo fotorrealista",
  "Paisagem de montanhas com lago cristalino ao por do sol, fotografia profissional",
  "Retrato de uma raposa cyberpunk com neon, arte digital detalhada",
  "Mesa de cafe da manha japonesa tradicional, fotografia de alimentos premium",
  "Cidade futurista flutuante nas nuvens com jardins suspensos, concept art",
  "Bolo de chocolate gourmet com frutas vermelhas, fotografia de estudio",
];

const fileToReferenceImage = (file: File): Promise<ReferenceImage> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({
        base64Data: dataUrl,
        mimeType: file.type || 'image/jpeg',
        fileName: file.name,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const PromptInput: React.FC<PromptInputProps> = ({
  onSubmit,
  disabled = false,
  modelColor,
}) => {
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<ReferenceImage | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !disabled) {
      onSubmit(prompt.trim(), referenceImage || undefined);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const ref = await fileToReferenceImage(file);
        setReferenceImage(ref);
      } catch (err) {
        console.error('Erro ao processar imagem:', err);
      }
    }
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = () => {
    setReferenceImage(null);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
    setShowSuggestions(false);
  };

  const suggestions = referenceImage ? SUGGESTIONS : SUGGESTIONS_NO_REF;

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

  const borderAccent =
    modelColor === 'amber' ? 'border-amber-500/30' : 'border-cyan-500/30';

  return (
    <div className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between px-1">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {referenceImage ? 'Referencia + Prompt' : 'Prompt'}
        </label>
        <button
          type="button"
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider transition-colors"
        >
          {showSuggestions ? 'Fechar' : 'Sugestoes'}
        </button>
      </div>

      {/* Suggestions */}
      {showSuggestions && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
          {suggestions.map((s, i) => (
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

      {/* Reference image preview */}
      {referenceImage && (
        <div className={`relative rounded-xl border ${borderAccent} bg-gray-900/40 p-2`}>
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0">
              <img
                src={referenceImage.base64Data}
                alt="Referencia"
                className="w-20 h-20 object-cover rounded-lg border border-gray-700"
              />
              <div className="absolute -top-1.5 -left-1.5 px-1.5 py-0.5 rounded-md bg-violet-600 text-[8px] font-bold text-white uppercase tracking-wider">
                REF
              </div>
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-[11px] font-semibold text-slate-300 leading-tight">
                Foto de referencia
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                {referenceImage.fileName}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 font-semibold">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  PRODUTO PRESERVADO
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={disabled}
              className="flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors disabled:opacity-50"
              title="Remover referencia"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div
          className={`relative rounded-xl border border-gray-800 bg-gray-900/60 transition-all duration-300 ring-2 ring-transparent ${focusRingClass}`}
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              referenceImage
                ? "Descreva o que deseja alterar no cenario/fundo (o produto sera preservado)..."
                : "Descreva a imagem que voce quer gerar..."
            }
            disabled={disabled}
            rows={3}
            className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-600 p-3.5 pb-2 resize-none focus:outline-none disabled:opacity-50"
          />
          <div className="flex items-center justify-between px-3 pb-2.5">
            <div className="flex items-center gap-2">
              {/* Upload reference image button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  referenceImage
                    ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30 hover:bg-violet-500/25'
                    : 'bg-gray-800/80 text-slate-500 border border-gray-700 hover:text-slate-300 hover:border-gray-600'
                } active:scale-95 disabled:opacity-50 disabled:active:scale-100`}
                title="Enviar foto de referencia"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
                {referenceImage ? 'Trocar foto' : 'Foto referencia'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
              <span className="text-[10px] text-slate-600">
                {prompt.length} chars
              </span>
            </div>
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
              {referenceImage ? 'Editar Imagem' : 'Gerar Imagem'}
            </span>
          )}
        </button>
      </form>
    </div>
  );
};
