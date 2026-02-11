import React, { useCallback, useRef, useState } from "react";
import { UploadIcon } from "./icons/UploadIcon";
import { VideoIcon } from "./icons/VideoIcon";

interface VideoUploaderProps {
  onFilesSelected: (files: File[]) => void;
  isUploading: boolean;
  maxFiles?: number;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  onFilesSelected,
  isUploading,
  maxFiles = 10,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("video/")
      );
      if (files.length > 0) {
        onFilesSelected(files.slice(0, maxFiles));
      }
    },
    [onFilesSelected, maxFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onFilesSelected(files.slice(0, maxFiles));
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onFilesSelected, maxFiles]
  );

  return (
    <div
      className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer group
        ${isDragging
          ? "border-violet-400 bg-violet-500/10 scale-[1.01]"
          : "border-gray-600 hover:border-violet-500/60 hover:bg-gray-800/50"
        }
        ${isUploading ? "pointer-events-none opacity-60" : ""}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-4">
        <div
          className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300
            ${isDragging
              ? "bg-violet-500/20 text-violet-300"
              : "bg-gray-800 text-gray-400 group-hover:bg-violet-500/10 group-hover:text-violet-400"
            }`}
        >
          {isUploading ? (
            <div className="w-8 h-8 border-3 border-violet-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <UploadIcon className="w-10 h-10" />
          )}
        </div>

        <div>
          <h3 className="text-xl font-semibold text-slate-200 mb-1">
            {isUploading ? "Enviando vídeos..." : "Arraste seus vídeos aqui"}
          </h3>
          <p className="text-slate-400 text-sm">
            {isUploading
              ? "Aguarde enquanto processamos seus arquivos"
              : `ou clique para selecionar (máx. ${maxFiles} vídeos)`}
          </p>
        </div>

        <div className="flex items-center gap-6 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <VideoIcon className="w-4 h-4" />
            MP4, MOV, AVI, WebM
          </span>
          <span>5-60s cada</span>
          <span>Max 100MB/arquivo</span>
        </div>
      </div>
    </div>
  );
};
