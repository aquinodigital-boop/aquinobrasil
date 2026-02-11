import React from 'react';
import type { ModelType } from '../types';

interface ModelSelectorProps {
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
  disabled?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
        Modelo
      </label>
      <div className="relative flex bg-gray-900 rounded-xl p-1 border border-gray-800">
        {/* Sliding indicator */}
        <div
          className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg transition-all duration-300 ease-out ${
            selectedModel === 'PRO'
              ? 'left-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
              : 'left-[calc(50%+2px)] bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
          }`}
        />

        <button
          type="button"
          onClick={() => onModelChange('PRO')}
          disabled={disabled}
          className={`relative flex-1 flex flex-col items-center py-2.5 px-3 rounded-lg transition-all duration-300 z-10 ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs">&#9733;</span>
            <span
              className={`text-sm font-bold tracking-wide transition-colors duration-300 ${
                selectedModel === 'PRO' ? 'text-amber-400' : 'text-slate-500'
              }`}
            >
              PRO
            </span>
          </div>
          <span
            className={`text-[10px] mt-0.5 transition-colors duration-300 ${
              selectedModel === 'PRO' ? 'text-amber-500/70' : 'text-slate-600'
            }`}
          >
            Imagen 3 &middot; Alta Qualidade
          </span>
        </button>

        <button
          type="button"
          onClick={() => onModelChange('FLASH')}
          disabled={disabled}
          className={`relative flex-1 flex flex-col items-center py-2.5 px-3 rounded-lg transition-all duration-300 z-10 ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs">&#9889;</span>
            <span
              className={`text-sm font-bold tracking-wide transition-colors duration-300 ${
                selectedModel === 'FLASH' ? 'text-cyan-400' : 'text-slate-500'
              }`}
            >
              FLASH
            </span>
          </div>
          <span
            className={`text-[10px] mt-0.5 transition-colors duration-300 ${
              selectedModel === 'FLASH' ? 'text-cyan-500/70' : 'text-slate-600'
            }`}
          >
            Gemini Flash &middot; Rapido
          </span>
        </button>
      </div>
    </div>
  );
};
