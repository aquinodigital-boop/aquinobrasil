import React, { useEffect, useState } from "react";

interface ProcessingViewProps {
  progress: number;
  status: string;
}

const processingSteps = [
  { threshold: 0, label: "Iniciando processamento..." },
  { threshold: 10, label: "Analisando vídeos de entrada..." },
  { threshold: 25, label: "Normalizando resoluções e codecs..." },
  { threshold: 50, label: "Aplicando transições entre clipes..." },
  { threshold: 75, label: "Renderizando vídeo final..." },
  { threshold: 90, label: "Otimizando para reprodução web..." },
  { threshold: 100, label: "Composição concluída!" },
];

export const ProcessingView: React.FC<ProcessingViewProps> = ({
  progress,
  status,
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
    <div className="flex flex-col items-center justify-center py-16 space-y-8">
      {/* Animação circular */}
      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke="currentColor"
            className="text-gray-700"
            strokeWidth="6"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke="currentColor"
            className="text-violet-500 transition-all duration-300"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            strokeDashoffset={`${2 * Math.PI * 42 * (1 - animatedProgress / 100)}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-100">
            {Math.round(animatedProgress)}%
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-slate-200">
          {status === "processing"
            ? `Processando${dots}`
            : status === "completed"
              ? "Concluído!"
              : "Erro no processamento"}
        </h3>
        <p className="text-slate-400 text-sm max-w-md">
          {currentStep?.label || "Preparando..."}
        </p>
      </div>

      {/* Steps list */}
      <div className="w-full max-w-md space-y-2">
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
                  ${isCompleted
                    ? "bg-violet-500 border-violet-500"
                    : isActive
                      ? "border-violet-500"
                      : "border-gray-600"
                  }
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
    </div>
  );
};
