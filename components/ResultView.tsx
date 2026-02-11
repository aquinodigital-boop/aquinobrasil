import React, { useRef, useState } from "react";
import { DownloadIcon } from "./icons/DownloadIcon";
import { PlayIcon } from "./icons/PlayIcon";
import { getDownloadUrl, getPreviewUrl } from "../services/apiService";

interface ResultViewProps {
  jobId: string;
  onReset: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({ jobId, onReset }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const previewUrl = getPreviewUrl(jobId);
  const downloadUrl = getDownloadUrl(jobId);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* Cabeçalho de sucesso */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-100">
          Vídeo Composto com Sucesso!
        </h2>
        <p className="text-slate-400">
          Seu vídeo está pronto para download e compartilhamento
        </p>
      </div>

      {/* Player de vídeo */}
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden bg-black shadow-2xl shadow-violet-500/10 border border-gray-700/50">
        <video
          ref={videoRef}
          src={previewUrl}
          className="w-full"
          controls
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        >
          Seu navegador não suporta o elemento de vídeo.
        </video>
      </div>

      {/* Ações */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <a
          href={downloadUrl}
          download
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
        >
          <DownloadIcon className="w-5 h-5" />
          Baixar Vídeo
        </a>

        <button
          onClick={onReset}
          className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-slate-300 font-semibold rounded-xl border border-gray-700 transition-all duration-300 hover:bg-gray-700 hover:text-slate-100"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
          </svg>
          Criar Novo Vídeo
        </button>
      </div>

      {/* Dica */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 max-w-md text-center">
        <p className="text-xs text-slate-400">
          O vídeo foi otimizado para reprodução web e redes sociais.
          Para melhor qualidade, baixe o arquivo e faça upload diretamente na plataforma desejada.
        </p>
      </div>
    </div>
  );
};
