import React from "react";
import type { TransitionOption } from "../types";

interface TransitionSelectorProps {
  transitions: TransitionOption[];
  selectedTransition: string;
  onSelect: (transitionId: string) => void;
  transitionDuration: number;
  onDurationChange: (duration: number) => void;
}

const transitionIcons: Record<string, string> = {
  fade: "~",
  dissolve: "*",
  wipe_left: "<",
  wipe_right: ">",
  wipe_up: "^",
  wipe_down: "v",
  slide_left: "<<",
  slide_right: ">>",
  zoom_in: "+",
  none: "|",
};

export const TransitionSelector: React.FC<TransitionSelectorProps> = ({
  transitions,
  selectedTransition,
  onSelect,
  transitionDuration,
  onDurationChange,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-slate-200 mb-1">Tipo de Transição</h3>
        <p className="text-xs sm:text-sm text-slate-400 mb-4">
          Escolha como os clipes serão conectados
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
          {transitions.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={`flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all duration-200
                ${selectedTransition === t.id
                  ? "border-violet-500 bg-violet-500/10 text-violet-300 shadow-lg shadow-violet-500/10"
                  : "border-gray-700/50 bg-gray-800/50 text-slate-400 active:border-gray-500 sm:hover:border-gray-600 sm:hover:text-slate-300"
                }
              `}
            >
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-sm sm:text-lg font-mono font-bold
                  ${selectedTransition === t.id
                    ? "bg-violet-500/20 text-violet-400"
                    : "bg-gray-700/50 text-gray-500"
                  }
                `}
              >
                {transitionIcons[t.id] || "?"}
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">
                {t.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs sm:text-sm font-medium text-slate-300">
            Duração da transição
          </label>
          <span className="text-xs sm:text-sm font-mono text-violet-400">
            {transitionDuration.toFixed(1)}s
          </span>
        </div>
        <input
          type="range"
          min="0.1"
          max="2.0"
          step="0.1"
          value={transitionDuration}
          onChange={(e) => onDurationChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
        />
        <div className="flex justify-between text-[10px] sm:text-xs text-slate-500 mt-1">
          <span>Rápida</span>
          <span>Lenta</span>
        </div>
      </div>
    </div>
  );
};
