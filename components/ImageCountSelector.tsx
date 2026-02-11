import React from 'react';

interface ImageCountSelectorProps {
  count: number;
  onCountChange: (count: number) => void;
  disabled?: boolean;
}

const counts = [1, 2, 3, 4];

export const ImageCountSelector: React.FC<ImageCountSelectorProps> = ({
  count,
  onCountChange,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
        Quantidade
      </label>
      <div className="flex gap-1.5">
        {counts.map((c) => {
          const isSelected = count === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onCountChange(c)}
              disabled={disabled}
              className={`flex-1 py-2 rounded-lg border text-sm font-bold transition-all duration-200 ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } ${
                isSelected
                  ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.1)]'
                  : 'bg-gray-900/50 border-gray-800 text-slate-500 hover:border-gray-700'
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
};
