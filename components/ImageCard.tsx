import React, { useState } from 'react';
import type { GeneratedImage } from '../types';

interface ImageCardProps {
  image: GeneratedImage;
}

export const ImageCard: React.FC<ImageCardProps> = ({ image }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const imageSrc = `data:${image.mimeType};base64,${image.base64Data}`;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const link = document.createElement('a');
      link.href = imageSrc;
      const ext = image.mimeType.includes('png') ? 'png' : 'jpg';
      link.download = `nano-banana-${image.model.toLowerCase()}-${image.id.slice(0, 8)}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erro ao baixar:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    try {
      const blob = await fetch(imageSrc).then(r => r.blob());
      const file = new File([blob], `nano-banana-${image.id.slice(0, 8)}.png`, { type: image.mimeType });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Imagem gerada por Nano Banana Pro',
        });
      } else {
        handleDownload();
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        handleDownload();
      }
    }
  };

  const modelBadgeClass =
    image.model === 'PRO'
      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';

  return (
    <>
      <div className="group relative rounded-2xl overflow-hidden bg-gray-900 border border-gray-800 shadow-lg transition-all duration-300 hover:border-gray-700">
        {/* Image */}
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full block"
        >
          <img
            src={imageSrc}
            alt={image.prompt}
            className="w-full h-auto object-cover"
            loading="lazy"
          />
        </button>

        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Model badge */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${modelBadgeClass}`}>
            {image.model}
          </span>
        </div>

        {/* Action buttons */}
        <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={handleShare}
            className="p-2 rounded-lg bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors border border-white/10"
            title="Compartilhar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="p-2 rounded-lg bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors border border-white/10 disabled:opacity-50"
            title="Baixar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
          onClick={() => setIsExpanded(false)}
        >
          <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={imageSrc}
              alt={image.prompt}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            {/* Close button */}
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute -top-3 -right-3 p-2 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors border border-gray-700 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* Bottom action bar */}
            <div className="absolute -bottom-14 left-0 right-0 flex items-center justify-center gap-3">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${modelBadgeClass}`}>
                {image.model}
              </span>
              <span className="text-xs text-slate-500">{image.aspectRatio}</span>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Baixar
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-white text-xs font-bold hover:bg-gray-700 transition-colors border border-gray-700"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
                Compartilhar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
