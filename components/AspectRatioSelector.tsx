import React from 'react';
import type { AspectRatio } from '../types';

interface AspectRatioSelectorProps {
  selectedRatio: AspectRatio;
  onRatioChange: (ratio: AspectRatio) => void;
  disabled?: boolean;
}

const ratios: { value: AspectRatio; label: string; icon: string }[] = [
  { value: '1:1', label: '1:1', icon: 'w-4 h-4' },
  { value: '4:3', label: '4:3', icon: 'w-4 h-3' },
  { value: '3:4', label: '3:4', icon: 'w-3 h-4' },
  { value: '16:9', label: '16:9', icon: 'w-5 h-3' },
  { value: '9:16', label: '9:16', icon: 'w-3 h-5' },
];

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({
  selectedRatio,
  onRatioChange,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
        Proporcao
      </label>
      <div className="flex gap-1.5">
        {ratios.map((ratio) => {
          const isSelected = selectedRatio === ratio.value;
          return (
            <button
              key={ratio.value}
              type="button"
              onClick={() => onRatioChange(ratio.value)}
              disabled={disabled}
              className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg border transition-all duration-200 ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } ${
                isSelected
                  ? 'bg-indigo-500/15 border-indigo-500/40 shadow-[0_0_8px_rgba(99,102,241,0.1)]'
                  : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div
                className={`${ratio.icon} rounded-sm border transition-colors duration-200 ${
                  isSelected
                    ? 'border-indigo-400 bg-indigo-500/30'
                    : 'border-slate-600 bg-slate-700/50'
                }`}
              />
              <span
                className={`text-[10px] font-semibold transition-colors duration-200 ${
                  isSelected ? 'text-indigo-300' : 'text-slate-500'
                }`}
              >
                {ratio.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
