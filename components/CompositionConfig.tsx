import React from "react";
import type { CompositionSettings } from "../types";

interface CompositionConfigProps {
  settings: CompositionSettings;
  onChange: (settings: CompositionSettings) => void;
}

const presets = [
  { label: "Reels / TikTok (9:16)", width: 1080, height: 1920 },
  { label: "Feed Instagram (1:1)", width: 1080, height: 1080 },
  { label: "YouTube Shorts (9:16)", width: 1080, height: 1920 },
  { label: "Landscape (16:9)", width: 1920, height: 1080 },
  { label: "Story (9:16)", width: 1080, height: 1920 },
];

export const CompositionConfig: React.FC<CompositionConfigProps> = ({
  settings,
  onChange,
}) => {
  const currentPreset = presets.find(
    (p) => p.width === settings.output_width && p.height === settings.output_height
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-200 mb-1">
          Configurações de Saída
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          Defina o formato e a duração do vídeo final
        </p>
      </div>

      {/* Duração alvo */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-300">
            Duração alvo do vídeo final
          </label>
          <span className="text-sm font-mono text-violet-400">
            {settings.target_duration.toFixed(0)}s
          </span>
        </div>
        <input
          type="range"
          min="10"
          max="60"
          step="1"
          value={settings.target_duration}
          onChange={(e) =>
            onChange({ ...settings, target_duration: parseFloat(e.target.value) })
          }
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>10s</span>
          <span className="text-green-500/70 font-medium">25-30s (ideal)</span>
          <span>60s</span>
        </div>
      </div>

      {/* Formato de saída */}
      <div>
        <label className="text-sm font-medium text-slate-300 block mb-3">
          Formato / Resolução
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() =>
                onChange({
                  ...settings,
                  output_width: preset.width,
                  output_height: preset.height,
                })
              }
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200
                ${settings.output_width === preset.width && settings.output_height === preset.height
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-gray-700/50 bg-gray-800/50 hover:border-gray-600"
                }
              `}
            >
              {/* Aspect ratio visual */}
              <div className="flex-shrink-0">
                <div
                  className={`border-2 rounded-sm ${
                    settings.output_width === preset.width && settings.output_height === preset.height
                      ? "border-violet-400"
                      : "border-gray-500"
                  }`}
                  style={{
                    width: preset.width > preset.height ? 28 : Math.round(28 * (preset.width / preset.height)),
                    height: preset.height > preset.width ? 28 : Math.round(28 * (preset.height / preset.width)),
                  }}
                />
              </div>
              <div className="text-left">
                <p className={`text-sm font-medium ${
                  settings.output_width === preset.width && settings.output_height === preset.height
                    ? "text-violet-300"
                    : "text-slate-300"
                }`}>
                  {preset.label}
                </p>
                <p className="text-xs text-slate-500">
                  {preset.width}x{preset.height}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Resumo */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
        <h4 className="text-sm font-medium text-slate-300 mb-3">Resumo</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-slate-500">Duração:</span>
            <span className="text-slate-200 ml-2">{settings.target_duration}s</span>
          </div>
          <div>
            <span className="text-slate-500">Resolução:</span>
            <span className="text-slate-200 ml-2">
              {settings.output_width}x{settings.output_height}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Transição:</span>
            <span className="text-slate-200 ml-2 capitalize">{settings.transition_type}</span>
          </div>
          <div>
            <span className="text-slate-500">Dur. transição:</span>
            <span className="text-slate-200 ml-2">{settings.transition_duration}s</span>
          </div>
        </div>
      </div>
    </div>
  );
};
