import React from 'react';
import type { ModelType } from '../types';

interface LoadingOverlayProps {
  model: ModelType;
  count: number;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ model, count }) => {
  const accentColor = model === 'PRO' ? 'amber' : 'cyan';
  const dotClass = model === 'PRO' ? 'bg-amber-400' : 'bg-cyan-400';
  const textClass = model === 'PRO' ? 'text-amber-400' : 'text-cyan-400';

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-6 p-8">
      {/* Animated dots */}
      <div className="flex items-center gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full ${dotClass} animate-bounce`}
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
          />
        ))}
      </div>

      {/* Text */}
      <div className="text-center">
        <p className="text-base font-semibold text-slate-200">
          Gerando {count} {count === 1 ? 'imagem' : 'imagens'}...
        </p>
        <p className={`text-sm mt-1 ${textClass}`}>
          {model === 'PRO' ? 'Imagen 3 - Alta Qualidade' : 'Gemini Flash - Modo Rapido'}
        </p>
        <p className="text-xs text-slate-600 mt-3">
          Isso pode levar alguns segundos
        </p>
      </div>

      {/* Progress bar animation */}
      <div className="w-48 h-1 rounded-full bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${
            model === 'PRO' ? 'from-amber-500 to-yellow-400' : 'from-cyan-500 to-blue-400'
          } animate-progress-bar`}
        />
      </div>
    </div>
  );
};
