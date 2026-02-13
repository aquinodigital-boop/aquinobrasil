import React, { useState, useRef, useCallback } from "react";
import type { VideoClip } from "../types";
import { TrashIcon } from "./icons/TrashIcon";
import { ChevronUpIcon, ChevronDownIcon } from "./icons/ChevronIcon";

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
  const [touchDragIndex, setTouchDragIndex] = useState<number | null>(null);
  const touchStartY = useRef(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const moveClip = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= clips.length) return;
    const newClips = [...clips];
    const [moved] = newClips.splice(fromIndex, 1);
    newClips.splice(toIndex, 0, moved);
    newClips.forEach((c, i) => (c.order = i));
    onReorder(newClips);
  }, [clips, onReorder]);

  // Desktop drag
  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      moveClip(draggedIndex, index);
      setDraggedIndex(index);
    }
  };
  const handleDragEnd = () => setDraggedIndex(null);

  // Touch drag para mobile
  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    setTouchDragIndex(index);
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = useCallback((index: number, e: React.TouchEvent) => {
    if (touchDragIndex === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    const threshold = 50;

    if (diff > threshold && touchDragIndex < clips.length - 1) {
      moveClip(touchDragIndex, touchDragIndex + 1);
      setTouchDragIndex(touchDragIndex + 1);
      touchStartY.current = currentY;
    } else if (diff < -threshold && touchDragIndex > 0) {
      moveClip(touchDragIndex, touchDragIndex - 1);
      setTouchDragIndex(touchDragIndex - 1);
      touchStartY.current = currentY;
    }
  }, [touchDragIndex, clips.length, moveClip]);

  const handleTouchEnd = () => setTouchDragIndex(null);

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
        <h3 className="text-base sm:text-lg font-semibold text-slate-200">
          Timeline ({clips.length} clipe{clips.length !== 1 ? "s" : ""})
        </h3>
        <span className="text-xs sm:text-sm text-slate-400">
          Total: {formatDuration(totalDuration)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, (totalDuration / 30) * 100)}%` }}
        />
      </div>

      {/* Clips */}
      <div className="grid gap-2 sm:gap-3">
        {clips.map((clip, index) => {
          const isActive = draggedIndex === index || touchDragIndex === index;
          return (
            <div
              key={clip.id}
              ref={(el) => { itemRefs.current[index] = el; }}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(index, e)}
              onTouchMove={(e) => handleTouchMove(index, e)}
              onTouchEnd={handleTouchEnd}
              className={`flex items-center gap-2 sm:gap-4 p-2.5 sm:p-3 rounded-xl border transition-all duration-200 touch-none
                ${isActive
                  ? "border-violet-500 bg-violet-500/10 scale-[1.02] shadow-lg shadow-violet-500/10"
                  : "border-gray-700/50 bg-gray-800/50 active:border-gray-600 active:bg-gray-800/80"
                }
              `}
            >
              {/* Número */}
              <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs sm:text-sm font-bold">
                {index + 1}
              </div>

              {/* Thumbnail */}
              <div className="flex-shrink-0 w-12 h-9 sm:w-16 sm:h-12 rounded-lg overflow-hidden bg-gray-700">
                {clip.thumbnailUrl ? (
                  <img
                    src={clip.thumbnailUrl}
                    alt={clip.filename}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-[10px]">
                    Video
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-200 truncate">
                  {clip.filename}
                </p>
                <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-slate-400 mt-0.5">
                  <span>{formatDuration(clip.duration)}</span>
                  <span className="hidden sm:inline">{clip.width}x{clip.height}</span>
                  <span>{formatBytes(clip.size_bytes)}</span>
                </div>
              </div>

              {/* Botoes - sempre visiveis no mobile */}
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); moveClip(index, index - 1); }}
                  disabled={index === 0}
                  className="p-1.5 sm:p-2 rounded-lg active:bg-gray-700 sm:hover:bg-gray-700 text-slate-400 active:text-slate-200 sm:hover:text-slate-200 disabled:opacity-20 transition-colors"
                  aria-label="Mover para cima"
                >
                  <ChevronUpIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); moveClip(index, index + 1); }}
                  disabled={index === clips.length - 1}
                  className="p-1.5 sm:p-2 rounded-lg active:bg-gray-700 sm:hover:bg-gray-700 text-slate-400 active:text-slate-200 sm:hover:text-slate-200 disabled:opacity-20 transition-colors"
                  aria-label="Mover para baixo"
                >
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(clip.id); }}
                  className="p-1.5 sm:p-2 rounded-lg active:bg-red-500/20 sm:hover:bg-red-500/20 text-slate-400 active:text-red-400 sm:hover:text-red-400 transition-colors"
                  aria-label="Remover"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {clips.length > 0 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <div className={`h-1.5 w-1.5 rounded-full ${totalDuration >= 25 && totalDuration <= 30 ? "bg-green-500" : totalDuration > 30 ? "bg-amber-500" : "bg-blue-500"}`} />
          <span className="text-[11px] sm:text-xs text-slate-400 text-center">
            {totalDuration < 25
              ? `Adicione mais vídeos (faltam ${formatDuration(25 - totalDuration)} para 25s)`
              : totalDuration <= 30
                ? "Duração ideal para redes sociais!"
                : `Acima do ideal - será ajustado automaticamente`}
          </span>
        </div>
      )}
    </div>
  );
};
