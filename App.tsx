import React, { useState, useEffect, useCallback, useRef } from "react";
import type {
  VideoClip,
  TransitionOption,
  CompositionSettings,
  JobStatus,
  AppStep,
} from "./types";
import { VideoUploader } from "./components/VideoUploader";
import { VideoTimeline } from "./components/VideoTimeline";
import { TransitionSelector } from "./components/TransitionSelector";
import { CompositionConfig } from "./components/CompositionConfig";
import { ProcessingView } from "./components/ProcessingView";
import { ResultView } from "./components/ResultView";
import { StepIndicator } from "./components/StepIndicator";
import {
  uploadVideos,
  getTransitions,
  startComposition,
  getJobStatus,
  deleteVideo,
} from "./services/apiService";
import { VideoIcon } from "./components/icons/VideoIcon";

const DEFAULT_SETTINGS: CompositionSettings = {
  transition_type: "fade",
  transition_duration: 0.5,
  target_duration: 30,
  output_width: 1080,
  output_height: 1920,
};

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>("upload");
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [transitions, setTransitions] = useState<TransitionOption[]>([]);
  const [settings, setSettings] = useState<CompositionSettings>(DEFAULT_SETTINGS);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Verificar se backend está online
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/health");
        setBackendOnline(res.ok);
      } catch {
        setBackendOnline(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  // Carregar transições disponíveis
  useEffect(() => {
    const loadTransitions = async () => {
      try {
        const t = await getTransitions();
        setTransitions(t);
      } catch {
        // Usar transições padrão se backend não responder
        setTransitions([
          { id: "fade", name: "Fade", description: "Transição suave" },
          { id: "dissolve", name: "Dissolve", description: "Dissolução" },
          { id: "wipe_left", name: "Wipe Left", description: "Limpa para esquerda" },
          { id: "slide_right", name: "Slide Right", description: "Desliza direita" },
          { id: "none", name: "Corte Seco", description: "Sem transição" },
        ]);
      }
    };
    loadTransitions();
  }, []);

  // Polling do status do job
  useEffect(() => {
    if (jobStatus && jobStatus.status === "processing" && jobStatus.job_id) {
      pollingRef.current = setInterval(async () => {
        try {
          const status = await getJobStatus(jobStatus.job_id);
          setJobStatus(status);
          if (status.status === "completed" || status.status === "error") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (status.status === "completed") {
              setStep("result");
            }
          }
        } catch {
          // Continuar polling
        }
      }, 1500);

      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [jobStatus?.job_id, jobStatus?.status]);

  // ====== Handlers ======

  const handleFilesSelected = useCallback(async (files: File[]) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const uploaded = await uploadVideos(files);
      setClips((prev) => {
        const newClips = [
          ...prev,
          ...uploaded.map((v, i) => ({ ...v, order: prev.length + i })),
        ];
        return newClips;
      });
      setStep("arrange");
    } catch (err: any) {
      setUploadError(err.message || "Erro ao fazer upload dos vídeos");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleReorderClips = useCallback((newClips: VideoClip[]) => {
    setClips(newClips);
  }, []);

  const handleRemoveClip = useCallback(
    async (clipId: string) => {
      try {
        await deleteVideo(clipId);
      } catch {
        // Remover localmente mesmo se a API falhar
      }
      setClips((prev) => prev.filter((c) => c.id !== clipId));
    },
    []
  );

  const handleStartComposition = useCallback(async () => {
    if (clips.length < 2) {
      setUploadError("São necessários pelo menos 2 vídeos");
      return;
    }

    setStep("processing");
    setUploadError(null);

    try {
      const videoIds = clips.map((c) => c.id);
      const status = await startComposition(videoIds, settings);
      setJobStatus(status);
    } catch (err: any) {
      setUploadError(err.message || "Erro ao iniciar composição");
      setStep("settings");
    }
  }, [clips, settings]);

  const handleReset = useCallback(() => {
    setStep("upload");
    setClips([]);
    setJobStatus(null);
    setUploadError(null);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const canProceedFromArrange = clips.length >= 2;
  const canProceedFromSettings = canProceedFromArrange;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <VideoIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100">VideoComposer</h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                Composição inteligente de vídeos curtos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status do backend */}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  backendOnline === null
                    ? "bg-gray-500 animate-pulse"
                    : backendOnline
                      ? "bg-green-500"
                      : "bg-red-500"
                }`}
              />
              <span className="text-xs text-slate-500 hidden sm:block">
                {backendOnline === null
                  ? "Conectando..."
                  : backendOnline
                    ? "Backend Online"
                    : "Backend Offline"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="bg-gray-900/50 border-b border-gray-800/50 py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <StepIndicator currentStep={step} />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Backend offline warning */}
        {backendOnline === false && step !== "result" && (
          <div className="mb-6 bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <div>
              <p className="text-amber-400 text-sm font-medium">Backend não conectado</p>
              <p className="text-amber-400/70 text-xs mt-1">
                Inicie o backend com: <code className="bg-amber-900/30 px-1.5 py-0.5 rounded text-amber-300">cd backend && pip install -r requirements.txt && python main.py</code>
              </p>
            </div>
          </div>
        )}

        {/* Error display */}
        {uploadError && (
          <div className="mb-6 bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <p className="text-red-400 text-sm">{uploadError}</p>
            <button
              onClick={() => setUploadError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400 mb-3">
                Crie vídeos incríveis
              </h2>
              <p className="text-slate-400 text-lg">
                Combine vídeos curtos em conteúdo profissional para redes sociais.
                Adicione transições suaves e exporte em segundos.
              </p>
            </div>

            <VideoUploader
              onFilesSelected={handleFilesSelected}
              isUploading={isUploading}
            />

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              {[
                {
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  ),
                  title: "Processamento Rápido",
                  desc: "FFmpeg otimizado para composição eficiente de vídeos",
                },
                {
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                    </svg>
                  ),
                  title: "Transições Profissionais",
                  desc: "10+ tipos de transições suaves e naturais",
                },
                {
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                  ),
                  title: "Pronto para Redes Sociais",
                  desc: "Formatos otimizados para Reels, TikTok e Stories",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-5 text-center"
                >
                  <div className="w-12 h-12 mx-auto rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center mb-3">
                    {feature.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-slate-500">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step: Arrange */}
        {step === "arrange" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-1">
                Organize seus clipes
              </h2>
              <p className="text-slate-400">
                Arraste para reordenar, remova os que não deseja, e adicione mais vídeos se necessário.
              </p>
            </div>

            <VideoTimeline
              clips={clips}
              onReorder={handleReorderClips}
              onRemove={handleRemoveClip}
            />

            {/* Adicionar mais vídeos */}
            <VideoUploader
              onFilesSelected={handleFilesSelected}
              isUploading={isUploading}
              maxFiles={10 - clips.length}
            />

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => {
                  setClips([]);
                  setStep("upload");
                }}
                className="px-5 py-2.5 text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium"
              >
                Voltar
              </button>
              <button
                onClick={() => setStep("settings")}
                disabled={!canProceedFromArrange}
                className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
              >
                Configurar Transições
              </button>
            </div>
          </div>
        )}

        {/* Step: Settings */}
        {step === "settings" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-1">
                Configure a composição
              </h2>
              <p className="text-slate-400">
                Escolha a transição, formato e duração do seu vídeo final.
              </p>
            </div>

            <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
              <TransitionSelector
                transitions={transitions}
                selectedTransition={settings.transition_type}
                onSelect={(id) =>
                  setSettings((s) => ({ ...s, transition_type: id }))
                }
                transitionDuration={settings.transition_duration}
                onDurationChange={(d) =>
                  setSettings((s) => ({ ...s, transition_duration: d }))
                }
              />
            </div>

            <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-6">
              <CompositionConfig
                settings={settings}
                onChange={setSettings}
              />
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setStep("arrange")}
                className="px-5 py-2.5 text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium"
              >
                Voltar
              </button>
              <button
                onClick={handleStartComposition}
                disabled={!canProceedFromSettings}
                className="px-8 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none text-lg"
              >
                Compor Vídeo
              </button>
            </div>
          </div>
        )}

        {/* Step: Processing */}
        {step === "processing" && (
          <ProcessingView
            progress={jobStatus?.progress ?? 5}
            status={jobStatus?.status ?? "processing"}
          />
        )}

        {/* Step: Result */}
        {step === "result" && jobStatus?.job_id && (
          <ResultView jobId={jobStatus.job_id} onReset={handleReset} />
        )}

        {/* Error from job */}
        {step === "processing" && jobStatus?.status === "error" && (
          <div className="mt-8 text-center space-y-4">
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 max-w-md mx-auto">
              <p className="text-red-400 font-medium mb-2">Erro no processamento</p>
              <p className="text-red-400/70 text-sm">{jobStatus.error}</p>
            </div>
            <button
              onClick={() => setStep("settings")}
              className="px-6 py-2.5 bg-gray-800 text-slate-300 font-medium rounded-xl border border-gray-700 hover:bg-gray-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-slate-600">
            VideoComposer - Composição inteligente de vídeos curtos para redes sociais
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
