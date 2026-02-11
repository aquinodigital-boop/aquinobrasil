import React, { useEffect, useState } from "react";

interface ProcessingViewProps {
  progress: number;
  status: string;
  message?: string;
}

const processingSteps = [
  { threshold: 0, label: "Iniciando processamento..." },
  { threshold: 5, label: "Carregando motor de vídeo (FFmpeg)..." },
  { threshold: 10, label: "Carregando vídeos na memória..." },
  { threshold: 25, label: "Normalizando resoluções e codecs..." },
  { threshold: 60, label: "Aplicando transições entre clipes..." },
  { threshold: 70, label: "Renderizando vídeo final..." },
  { threshold: 90, label: "Finalizando..." },
  { threshold: 100, label: "Composição concluída!" },
];

export const ProcessingView: React.FC<ProcessingViewProps> = ({
  progress,
  status,
  message,
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimatedProgress((prev) => {
        if (prev < progress) return Math.min(prev + 0.5, progress);
        return prev;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [progress]);

  useEffect(() => {
    if (status === "processing") {
      const timer = setInterval(() => {
        setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
      }, 500);
      return () => clearInterval(timer);
    }
  }, [status]);

  const currentStep = [...processingSteps]
    .reverse()
    .find((s) => animatedProgress >= s.threshold);

  return (
    <div className="flex flex-col items-center justify-center py-10 sm:py-16 space-y-6 sm:space-y-8">
      {/* Animação circular */}
      <div className="relative w-32 h-32 sm:w-40 sm:h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" stroke="currentColor" className="text-gray-700" strokeWidth="6" fill="none" />
          <circle
            cx="50" cy="50" r="42" stroke="currentColor"
            className="text-violet-500 transition-all duration-300"
            strokeWidth="6" fill="none" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            strokeDashoffset={`${2 * Math.PI * 42 * (1 - animatedProgress / 100)}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl sm:text-3xl font-bold text-slate-100">
            {Math.round(animatedProgress)}%
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="text-center space-y-2 px-4">
        <h3 className="text-lg sm:text-xl font-semibold text-slate-200">
          {status === "processing"
            ? `Processando${dots}`
            : status === "completed"
              ? "Concluído!"
              : "Erro no processamento"}
        </h3>
        <p className="text-slate-400 text-xs sm:text-sm max-w-md">
          {message || currentStep?.label || "Preparando..."}
        </p>
      </div>

      {/* Steps list - esconder em telas muito pequenas */}
      <div className="w-full max-w-md space-y-2 hidden sm:block">
        {processingSteps.slice(0, -1).map((step, i) => {
          const isActive = animatedProgress >= step.threshold;
          const isCompleted =
            i < processingSteps.length - 2 &&
            animatedProgress >= processingSteps[i + 1].threshold;

          return (
            <div
              key={i}
              className={`flex items-center gap-3 text-sm transition-all duration-500
                ${isActive ? "opacity-100" : "opacity-30"}
              `}
            >
              <div
                className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300
                  ${isCompleted ? "bg-violet-500 border-violet-500" : isActive ? "border-violet-500" : "border-gray-600"}
                `}
              >
                {isCompleted && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </div>
              <span className={isCompleted ? "text-slate-300" : isActive ? "text-slate-400" : "text-slate-600"}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Aviso */}
      {status === "processing" && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 max-w-sm text-center mx-4">
          <p className="text-[11px] sm:text-xs text-slate-500">
            Processando no seu dispositivo. Mantenha esta aba aberta e a tela ligada.
            Em celulares o processo pode levar mais tempo.
          </p>
        </div>
      )}
    </div>
  );
};
