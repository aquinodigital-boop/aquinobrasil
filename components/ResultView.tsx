import React, { useRef, useState, useCallback } from "react";
import { DownloadIcon } from "./icons/DownloadIcon";

interface ResultViewProps {
  videoUrl: string;
  videoBlob: Blob | null;
  onReset: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({ videoUrl, videoBlob, onReset }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleDownload = useCallback(() => {
    if (!videoBlob) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `video_composto_${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [videoUrl, videoBlob]);

  return (
    <div className="flex flex-col items-center gap-6 sm:gap-8 py-6 sm:py-8">
      {/* Cabeçalho de sucesso */}
      <div className="text-center space-y-2 px-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-3">
          <svg className="w-7 h-7 sm:w-8 sm:h-8 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
          Vídeo Pronto!
        </h2>
        <p className="text-sm sm:text-base text-slate-400">
          Pronto para download e compartilhamento
        </p>
      </div>

      {/* Player de vídeo */}
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden bg-black shadow-2xl shadow-violet-500/10 border border-gray-700/50">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full"
          controls
          playsInline
          webkit-playsinline=""
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        >
          Seu navegador não suporta o elemento de vídeo.
        </video>
      </div>

      {/* Tamanho do arquivo */}
      {videoBlob && (
        <p className="text-xs text-slate-500">
          Tamanho: {(videoBlob.size / (1024 * 1024)).toFixed(1)} MB
        </p>
      )}

      {/* Ações */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-sm sm:max-w-none sm:w-auto px-4 sm:px-0">
        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 px-6 py-3.5 sm:py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl transition-all duration-300 active:scale-95 sm:hover:scale-105 shadow-lg shadow-violet-500/25"
        >
          <DownloadIcon className="w-5 h-5" />
          Baixar Vídeo
        </button>

        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 px-6 py-3.5 sm:py-3 bg-gray-800 text-slate-300 font-semibold rounded-xl border border-gray-700 transition-all duration-300 active:bg-gray-700 sm:hover:bg-gray-700"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
          </svg>
          Criar Novo Vídeo
        </button>
      </div>

      {/* Dica */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 max-w-md text-center mx-4">
        <p className="text-[11px] sm:text-xs text-slate-400">
          Processado no seu dispositivo - nenhum dado enviado para servidores.
        </p>
      </div>
    </div>
  );
};
