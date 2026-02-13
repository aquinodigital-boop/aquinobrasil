import React from "react";
import type { AppStep } from "../types";

interface StepIndicatorProps {
  currentStep: AppStep;
}

const steps: { key: AppStep; label: string; number: number }[] = [
  { key: "upload", label: "Upload", number: 1 },
  { key: "arrange", label: "Organizar", number: 2 },
  { key: "settings", label: "Configurar", number: 3 },
  { key: "processing", label: "Processar", number: 4 },
  { key: "result", label: "Resultado", number: 5 },
];

const stepOrder: Record<AppStep, number> = {
  upload: 0,
  arrange: 1,
  settings: 2,
  processing: 3,
  result: 4,
};

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const currentIndex = stepOrder[currentStep];

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;

        return (
          <React.Fragment key={step.key}>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div
                className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-500
                  ${isCompleted
                    ? "bg-violet-500 text-white"
                    : isCurrent
                      ? "bg-violet-500/20 text-violet-400 ring-2 ring-violet-500/50"
                      : "bg-gray-800 text-gray-500"
                  }
                `}
              >
                {isCompleted ? (
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`hidden sm:block text-xs font-medium transition-colors duration-300
                  ${isCurrent ? "text-violet-400" : isCompleted ? "text-slate-400" : "text-gray-600"}
                `}
              >
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={`w-6 sm:w-10 h-0.5 rounded-full transition-all duration-500
                  ${index < currentIndex ? "bg-violet-500" : "bg-gray-700"}
                `}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
