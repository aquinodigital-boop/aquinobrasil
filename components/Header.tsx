import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/50">
      <div className="px-4 py-3 flex items-center justify-between max-w-lg mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <span className="text-lg" role="img" aria-label="banana">&#127820;</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight tracking-tight">
              Nano Banana Pro
            </h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
              Gerador de Imagens IA
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Gemini</span>
          </div>
        </div>
      </div>
    </header>
  );
};
