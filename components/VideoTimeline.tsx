import React, { useState } from "react";
import type { VideoClip } from "../types";
import { TrashIcon } from "./icons/TrashIcon";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons/ChevronIcon";

interface VideoTimelineProps {
  clips: VideoClip[];
  onReorder: (clips: VideoClip[]) => void;
  onRemove: (clipId: string) => void;
}

export const VideoTimeline: React.FC<VideoTimelineProps> = ({
  clips,
  onReorder,
  onRemove,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const moveClip = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= clips.length) return;
    const newClips = [...clips];
    const [moved] = newClips.splice(fromIndex, 1);
    newClips.splice(toIndex, 0, moved);
    newClips.forEach((c, i) => (c.order = i));
    onReorder(newClips);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      moveClip(draggedIndex, index);
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const totalDuration = clips.reduce((sum, c) => sum + c.duration, 0);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 10);
    return m > 0 ? `${m}:${String(s).padStart(2, "0")}.${ms}` : `${s}.${ms}s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-200">
          Timeline ({clips.length} clipe{clips.length !== 1 ? "s" : ""})
        </h3>
        <span className="text-sm text-slate-400">
          Duração total: {formatDuration(totalDuration)}
        </span>
      </div>

      {/* Timeline visual */}
      <div className="relative">
        {/* Progress bar */}
        <div className="h-2 bg-gray-800 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, (totalDuration / 30) * 100)}%` }}
          />
        </div>

        {/* Clips */}
        <div className="grid gap-3">
          {clips.map((clip, index) => (
            <div
              key={clip.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`group flex items-center gap-4 p-3 rounded-xl border transition-all duration-200 cursor-grab active:cursor-grabbing
                ${draggedIndex === index
                  ? "border-violet-500 bg-violet-500/10 scale-[1.02] shadow-lg shadow-violet-500/10"
                  : "border-gray-700/50 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800/80"
                }
              `}
            >
              {/* Número do clipe */}
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center text-sm font-bold">
                {index + 1}
              </div>

              {/* Thumbnail */}
              <div className="flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden bg-gray-700">
                {clip.thumbnailUrl ? (
                  <img
                    src={clip.thumbnailUrl}
                    alt={clip.filename}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                    Video
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">
                  {clip.filename}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                  <span>{formatDuration(clip.duration)}</span>
                  <span>{clip.width}x{clip.height}</span>
                  <span>{formatBytes(clip.size_bytes)}</span>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveClip(index, index - 1);
                  }}
                  disabled={index === 0}
                  className="p-1.5 rounded-lg hover:bg-gray-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="Mover para cima"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveClip(index, index + 1);
                  }}
                  disabled={index === clips.length - 1}
                  className="p-1.5 rounded-lg hover:bg-gray-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="Mover para baixo"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(clip.id);
                  }}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                  title="Remover"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {clips.length > 0 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <div className={`h-1.5 w-1.5 rounded-full ${totalDuration >= 25 && totalDuration <= 30 ? "bg-green-500" : totalDuration > 30 ? "bg-amber-500" : "bg-blue-500"}`} />
          <span className="text-xs text-slate-400">
            {totalDuration < 25
              ? `Adicione mais vídeos para atingir 25-30s (faltam ${formatDuration(25 - totalDuration)})`
              : totalDuration <= 30
                ? "Duração ideal para redes sociais!"
                : `Duração acima do ideal (${formatDuration(totalDuration - 30)} excedentes) - será ajustada automaticamente`}
          </span>
        </div>
      )}
    </div>
  );
};
