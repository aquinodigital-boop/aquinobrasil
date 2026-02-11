import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { ModelSelector } from './components/ModelSelector';
import { AspectRatioSelector } from './components/AspectRatioSelector';
import { ImageCountSelector } from './components/ImageCountSelector';
import { PromptInput } from './components/PromptInput';
import { ImageGallery } from './components/ImageGallery';
import { generateImages } from './services/geminiService';
import type { ModelType, AspectRatio, GenerationSession } from './types';

const App: React.FC = () => {
  const [model, setModel] = useState<ModelType>('FLASH');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [imageCount, setImageCount] = useState(1);
  const [sessions, setSessions] = useState<GenerationSession[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);

  // Scroll to top of gallery when new session is added
  useEffect(() => {
    if (sessions.length > 0 && galleryRef.current) {
      galleryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [sessions.length]);

  const handleGenerate = useCallback(
    async (prompt: string) => {
      const sessionId = crypto.randomUUID();
      const config = {
        model,
        prompt,
        aspectRatio,
        numberOfImages: imageCount,
      };

      // Add generating session
      const newSession: GenerationSession = {
        id: sessionId,
        config,
        images: [],
        timestamp: Date.now(),
        status: 'generating',
      };

      setSessions((prev) => [...prev, newSession]);
      setIsGenerating(true);

      try {
        const images = await generateImages(config);
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, images, status: 'completed' as const }
              : s
          )
        );
      } catch (error: any) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  status: 'error' as const,
                  error: error.message || 'Erro desconhecido ao gerar imagens',
                }
              : s
          )
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [model, aspectRatio, imageCount]
  );

  const modelColor = model === 'PRO' ? 'amber' : 'cyan';

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      <Header />

      <main className="flex-1 flex flex-col max-w-lg mx-auto w-full">
        {/* Controls Section */}
        <div className="px-4 pt-4 pb-2 flex flex-col gap-4">
          {/* Model Selector */}
          <ModelSelector
            selectedModel={model}
            onModelChange={setModel}
            disabled={isGenerating}
          />

          {/* Config Toggle */}
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-800 text-xs text-slate-400 hover:text-slate-300 hover:border-gray-700 transition-all"
          >
            <span className="font-semibold uppercase tracking-wider">
              Configuracoes &middot; {aspectRatio} &middot; {imageCount}{' '}
              {imageCount === 1 ? 'imagem' : 'imagens'}
            </span>
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${
                showConfig ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Collapsible Config */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              showConfig ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="flex flex-col gap-4 pb-2">
              <AspectRatioSelector
                selectedRatio={aspectRatio}
                onRatioChange={setAspectRatio}
                disabled={isGenerating}
              />
              <ImageCountSelector
                count={imageCount}
                onCountChange={setImageCount}
                disabled={isGenerating}
              />
            </div>
          </div>

          {/* Prompt Input */}
          <PromptInput
            onSubmit={handleGenerate}
            disabled={isGenerating}
            modelColor={modelColor}
          />
        </div>

        {/* Divider */}
        <div className="mx-4 my-2 border-t border-gray-800/50" />

        {/* Gallery Section */}
        <div ref={galleryRef} className="flex-1 px-4 pb-8">
          <ImageGallery sessions={sessions} />
        </div>
      </main>

      {/* Bottom safe area for mobile */}
      <div className="h-safe-bottom" />
    </div>
  );
};

export default App;
