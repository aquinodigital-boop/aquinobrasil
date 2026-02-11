import React from 'react';
import { ImageCard } from './ImageCard';
import type { GenerationSession } from '../types';

interface ImageGalleryProps {
  sessions: GenerationSession[];
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ sessions }) => {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 rounded-2xl bg-gray-900/80 border border-gray-800 flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
        </div>
        <p className="text-slate-500 text-sm font-medium text-center">
          Suas imagens geradas aparecerao aqui
        </p>
        <p className="text-slate-600 text-xs mt-1 text-center">
          Escreva um prompt e clique em Gerar Imagem
        </p>
      </div>
    );
  }

  // Display sessions in reverse chronological order
  const sortedSessions = [...sessions].reverse();

  return (
    <div className="flex flex-col gap-6">
      {sortedSessions.map((session) => (
        <div key={session.id} className="flex flex-col gap-3">
          {/* Session header */}
          <div className="flex items-start gap-2 px-1">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                {session.config.prompt}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  session.config.model === 'PRO' ? 'text-amber-500' : 'text-cyan-500'
                }`}>
                  {session.config.model}
                </span>
                <span className="text-[10px] text-slate-600">&middot;</span>
                <span className="text-[10px] text-slate-600">
                  {session.config.aspectRatio}
                </span>
                <span className="text-[10px] text-slate-600">&middot;</span>
                <span className="text-[10px] text-slate-600">
                  {new Date(session.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>

          {/* Images grid */}
          {session.status === 'generating' && (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: session.config.numberOfImages }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center animate-pulse"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-indigo-500 animate-spin" />
                    </div>
                    <span className="text-[10px] text-slate-600 font-medium">Gerando...</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {session.status === 'error' && (
            <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-xs text-red-400">{session.error || 'Erro ao gerar imagens'}</p>
              </div>
            </div>
          )}

          {session.status === 'completed' && session.images.length > 0 && (
            <div className={`grid gap-2 ${
              session.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
            }`}>
              {session.images.map((image) => (
                <ImageCard key={image.id} image={image} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
