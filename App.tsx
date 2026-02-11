import React, { useState, useEffect, useCallback, useRef } from "react";
import type {
  VideoClip,
  TransitionOption,
  CompositionSettings,
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
  getVideoMetadata,
  generateThumbnail,
  composeVideos,
  getAvailableTransitions,
} from "./services/videoProcessor";
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
  const [error, setError] = useState<string | null>(null);

  // Processamento
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState("");
  const [processingStatus, setProcessingStatus] = useState<"processing" | "completed" | "error">("processing");

  // Resultado
  const [resultBlobUrl, setResultBlobUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  // Carregar transições (tudo local, sem API)
  useEffect(() => {
    setTransitions(getAvailableTransitions());
  }, []);

  // Cleanup de object URLs ao desmontar
  useEffect(() => {
    return () => {
      clips.forEach((c) => {
        if (c.objectUrl) URL.revokeObjectURL(c.objectUrl);
      });
      if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);
    };
  }, []);

  // ====== Handlers ======

  const handleFilesSelected = useCallback(async (files: File[]) => {
    setIsUploading(true);
    setError(null);

    try {
      const newClips: VideoClip[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validar tipo
        if (!file.type.startsWith("video/")) {
          throw new Error(`"${file.name}" não é um vídeo válido`);
        }

        // Validar tamanho (max 200MB)
        if (file.size > 200 * 1024 * 1024) {
          throw new Error(`"${file.name}" excede 200MB`);
        }

        // Obter metadados via HTMLVideoElement
        const meta = await getVideoMetadata(file);

        if (meta.duration < 0.5) {
          throw new Error(`"${file.name}" é muito curto (mínimo 0.5s)`);
        }
        if (meta.duration > 120) {
          throw new Error(`"${file.name}" excede 2 minutos`);
        }

        // Gerar thumbnail via Canvas
        const thumbnail = await generateThumbnail(file);

        const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

        newClips.push({
          id,
          filename: file.name,
          duration: meta.duration,
          width: meta.width,
          height: meta.height,
          size_bytes: file.size,
          file,
          thumbnailUrl: thumbnail,
          objectUrl: URL.createObjectURL(file),
          order: i,
        });
      }

      setClips((prev) => {
        const updated = [
          ...prev,
          ...newClips.map((c, i) => ({ ...c, order: prev.length + i })),
        ];
        return updated;
      });
      setStep("arrange");
    } catch (err: any) {
      setError(err.message || "Erro ao processar vídeos");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleReorderClips = useCallback((newClips: VideoClip[]) => {
    setClips(newClips);
  }, []);

  const handleRemoveClip = useCallback((clipId: string) => {
    setClips((prev) => {
      const clip = prev.find((c) => c.id === clipId);
      if (clip?.objectUrl) URL.revokeObjectURL(clip.objectUrl);
      return prev.filter((c) => c.id !== clipId);
    });
  }, []);

  const handleStartComposition = useCallback(async () => {
    if (clips.length < 2) {
      setError("São necessários pelo menos 2 vídeos");
      return;
    }

    setStep("processing");
    setError(null);
    setProcessingProgress(0);
    setProcessingStatus("processing");
    setProcessingMessage("Preparando...");

    try {
      const sortedClips = [...clips].sort((a, b) => a.order - b.order);
      const files = sortedClips.map((c) => c.file);
      const durations = sortedClips.map((c) => c.duration);

      const blob = await composeVideos(
        files,
        durations,
        settings,
        (progress, message) => {
          setProcessingProgress(progress);
          setProcessingMessage(message);
        }
      );

      // Criar URL para preview/download
      const url = URL.createObjectURL(blob);
      setResultBlob(blob);
      setResultBlobUrl(url);
      setProcessingStatus("completed");
      setProcessingProgress(100);
      setStep("result");
    } catch (err: any) {
      console.error("Erro na composição:", err);
      setProcessingStatus("error");
      setError(err.message || "Erro ao compor vídeo");
    }
  }, [clips, settings]);

  const handleReset = useCallback(() => {
    // Limpar URLs anteriores
    clips.forEach((c) => {
      if (c.objectUrl) URL.revokeObjectURL(c.objectUrl);
    });
    if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);

    setStep("upload");
    setClips([]);
    setResultBlobUrl(null);
    setResultBlob(null);
    setError(null);
    setSettings(DEFAULT_SETTINGS);
    setProcessingProgress(0);
    setProcessingStatus("processing");
  }, [clips, resultBlobUrl]);

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
                Composição de vídeos curtos - 100% no navegador
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-slate-500 hidden sm:block">
              Processamento Local
            </span>
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
        {/* Error display */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <p className="text-red-400 text-sm flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300 flex-shrink-0"
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
                Tudo processado diretamente no seu navegador - sem upload para servidores.
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
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>
                  ),
                  title: "100% Privado",
                  desc: "Seus vídeos nunca saem do seu navegador. Sem servidores.",
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
                  clips.forEach((c) => {
                    if (c.objectUrl) URL.revokeObjectURL(c.objectUrl);
                  });
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
          <>
            <ProcessingView
              progress={processingProgress}
              status={processingStatus}
              message={processingMessage}
            />
            {processingStatus === "error" && (
              <div className="mt-8 text-center space-y-4">
                <button
                  onClick={() => setStep("settings")}
                  className="px-6 py-2.5 bg-gray-800 text-slate-300 font-medium rounded-xl border border-gray-700 hover:bg-gray-700 transition-colors"
                >
                  Tentar novamente
                </button>
              </div>
            )}
          </>
        )}

        {/* Step: Result */}
        {step === "result" && resultBlobUrl && (
          <ResultView
            videoUrl={resultBlobUrl}
            videoBlob={resultBlob}
            onReset={handleReset}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-slate-600">
            VideoComposer - Composição de vídeos 100% no navegador. Seus arquivos nunca saem do seu dispositivo.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
