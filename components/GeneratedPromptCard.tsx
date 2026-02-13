import React, { useState } from 'react';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';

interface GeneratedPromptCardProps {
  prompt: string;
  index?: number;
  title?: string;
}

export const GeneratedPromptCard: React.FC<GeneratedPromptCardProps> = ({ prompt, index, title }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (title) {
    return (
       <div className="rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 p-1 shadow-2xl shadow-blue-500/20">
        <div className="bg-gray-950 p-5 rounded-lg relative">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-600 to-blue-700 text-white text-sm font-bold mb-4 tracking-wider shadow-md">
                {title}
              </span>
              <p className="text-slate-200 text-base">{prompt}</p>
            </div>
            <button
              onClick={handleCopy}
              className="absolute top-4 right-4 p-2 rounded-md bg-gray-800/50 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition-all"
              title="Copiar prompt"
            >
              {copied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <ClipboardIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isUltimate = index === 0;

  if (isUltimate) {
    return (
      <div className="rounded-xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 p-1 shadow-2xl shadow-yellow-500/20">
        <div className="bg-gray-950 p-5 rounded-lg relative">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-sm font-bold mb-4 tracking-wider shadow-md">
                ✨ PROMPT ULTIMATE (CAPA) ✨
              </span>
              <p className="text-slate-200 text-base">{prompt}</p>
            </div>
            <button
              onClick={handleCopy}
              className="absolute top-4 right-4 p-2 rounded-md bg-gray-800/50 text-slate-400 hover:bg-amber-500/20 hover:text-amber-300 transition-all"
              title="Copiar prompt"
            >
              {copied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <ClipboardIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Regular prompt card
  return (
    <div className="bg-gray-900/80 p-5 rounded-lg border border-gray-800 shadow-lg transition-all relative group hover:border-indigo-500/30">
      <div className="absolute -inset-px bg-gradient-to-r from-indigo-700/50 to-purple-700/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md" aria-hidden="true"></div>
      <div className="relative flex justify-between items-start">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-indigo-900/70 text-indigo-300 text-xs font-semibold mb-3 tracking-wide">
            PROMPT #{index}
          </span>
          <p className="text-slate-200 text-base">{prompt}</p>
        </div>
        <button
          onClick={handleCopy}
          className="absolute top-0 right-0 p-2 rounded-md bg-gray-800/50 text-slate-400 hover:bg-gray-700/80 hover:text-slate-100 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
          title="Copiar prompt"
        >
          {copied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <ClipboardIcon className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};
