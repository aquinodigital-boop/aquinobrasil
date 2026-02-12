import React, { useState, useRef } from 'react';
import type { ReferenceImage } from '../types';

interface PromptInputProps {
  onSubmit: (prompt: string, referenceImage?: ReferenceImage) => void;
  disabled?: boolean;
  modelColor: string;
}

const SUGGESTIONS_WITH_REF = [
  "Produto em uma mesa de madeira rustica com iluminacao dourada ao por do sol",
  "Fundo de estudio branco profissional com sombra suave",
  "Cenario de praia tropical com areia branca e mar azul ao fundo",
  "Sobre uma bancada de marmore com flores e vegetacao natural",
  "Cozinha gourmet moderna e sofisticada com iluminacao quente",
  "Fundo de natal com luzes bokeh douradas e decoracao festiva",
  "Mesa de cafe da manha elegante com xicara e croissant ao lado",
  "Cenario urbano moderno com concreto e plantas verdes",
];

const SUGGESTIONS_NO_REF = [
  "Foto profissional de produto em fundo branco, estudio premium",
  "Paisagem de montanhas com lago cristalino ao por do sol",
  "Retrato de uma raposa cyberpunk com neon, arte digital detalhada",
  "Bolo de chocolate gourmet com frutas vermelhas, fotografia de estudio",
  "Interior de loja moderna e minimalista com iluminacao natural",
  "Composicao flat lay vista de cima com acessorios sobre marmore",
];

const fileToReferenceImage = (file: File): Promise<ReferenceImage> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        base64Data: reader.result as string,
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const suggestions = referenceImage ? SUGGESTIONS_WITH_REF : SUGGESTIONS_NO_REF;

  const gradientClass = 'from-amber-500 to-orange-600';
  const shadowClass = 'shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]';

  return (
    <div className="flex flex-col gap-3">

      {/* ========== FOTO DO PRODUTO (PRINCIPAL) ========== */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            Foto do Produto
          </label>
          {referenceImage && (
            <button
              type="button"
              onClick={() => setReferenceImage(null)}
              disabled={disabled}
              className="text-[10px] font-semibold text-red-400 hover:text-red-300 uppercase tracking-wider transition-colors"
            >
              Remover
            </button>
          )}
        </div>

        {referenceImage ? (
          /* Preview da foto enviada */
          <div className="relative rounded-xl border border-amber-500/30 bg-gray-900/60 overflow-hidden">
            <div className="flex items-center gap-3 p-3">
              <img
                src={referenceImage.base64Data}
                alt="Produto"
                className="w-24 h-24 object-cover rounded-lg border border-gray-700 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 text-[9px] font-bold uppercase tracking-wider border border-amber-500/25">
                    Imagen 3
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[9px] font-bold uppercase tracking-wider border border-emerald-500/25">
                    Produto Protegido
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  O produto sera preservado fielmente. Descreva o cenario desejado no prompt abaixo.
                </p>
                <p className="text-[10px] text-slate-600 mt-1 truncate">{referenceImage.fileName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="w-full py-2 text-[11px] font-medium text-amber-400/70 hover:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 border-t border-amber-500/20 transition-all disabled:opacity-50"
            >
              Trocar foto
            </button>
          </div>
        ) : (
          /* Upload area grande e chamativa */
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="w-full rounded-xl border-2 border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50 active:bg-amber-500/15 transition-all p-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-amber-400">
                  Enviar foto do produto
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Galeria, arquivos, Google Drive ou camera
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  PNG, JPG, WEBP
                </p>
              </div>
            </div>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* ========== PROMPT ========== */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {referenceImage ? 'Descreva o cenario' : 'Prompt'}
          </label>
          <button
            type="button"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider transition-colors"
          >
            {showSuggestions ? 'Fechar' : 'Ideias'}
          </button>
        </div>

        {showSuggestions && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setPrompt(s); setShowSuggestions(false); }}
                className="flex-shrink-0 max-w-[220px] text-left text-xs bg-gray-900/80 border border-gray-800 rounded-lg px-3 py-2 text-slate-400 hover:text-slate-200 hover:border-amber-500/30 hover:bg-gray-900 transition-all duration-200"
              >
                {s.length > 70 ? s.substring(0, 70) + '...' : s}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="relative rounded-xl border border-gray-800 bg-gray-900/60 transition-all duration-300 ring-2 ring-transparent focus-within:ring-amber-500/30 focus-within:border-amber-500/50">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                referenceImage
                  ? "Ex: Produto sobre mesa de madeira com flores e luz natural..."
                  : "Descreva a imagem que voce quer gerar..."
              }
              disabled={disabled}
              rows={3}
              className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-600 p-3.5 pb-2 resize-none focus:outline-none disabled:opacity-50"
            />
            <div className="flex items-center justify-between px-3.5 pb-2.5">
              <span className="text-[10px] text-slate-600">{prompt.length} chars</span>
              {prompt.trim() && (
                <button type="button" onClick={() => setPrompt('')} className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">
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
                Gerando com Imagen 3...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
                {referenceImage ? 'Gerar com Imagen 3' : 'Gerar Imagem'}
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
