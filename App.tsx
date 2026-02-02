import React, { useState } from 'react';
import { PhotoAgentModal } from './components/PhotoAgentModal';
import { GeneratedPromptCard } from './components/GeneratedPromptCard';
import type { PhotoAgentData } from './types';
import { generatePrompts } from './services/geminiService';
import { Input } from './components/ui/Input';
import { Label } from './components/ui/Label';

const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productName, setProductName] = useState("");
  const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptsVisible, setPromptsVisible] = useState(false);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const handleSubmit = async (data: PhotoAgentData) => {
    handleCloseModal();
    setIsLoading(true);
    setError(null);
    setGeneratedPrompts([]);
    setPromptsVisible(false);
    try {
      const prompts = await generatePrompts({ ...data, productName });
      setGeneratedPrompts(prompts);
      setTimeout(() => setPromptsVisible(true), 100);
    } catch (err: any) {
      setError(err.message || "Falha ao gerar os prompts. Tente novamente.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500 pb-2" style={{ textShadow: '0 0 15px rgba(192, 132, 252, 0.2)' }}>
                Gerador de Prompts Estratégicos
            </h1>
            <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
                Use nosso agente de IA para criar prompts de imagem de alta conversão para seu produto.
            </p>
        </header>

        <main className="bg-gray-900/60 backdrop-blur-md p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700/50">
            <div className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="product-name" className="text-lg font-semibold text-slate-200">
                        Qual é o seu produto?
                    </Label>
                    <p className="text-sm text-slate-400">
                        Comece informando o nome do produto para o qual você deseja gerar os prompts.
                    </p>
                    <Input
                        id="product-name"
                        placeholder="Ex: Tinta Acrílica Fosca Premium Vermelho Intenso"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        className="text-lg p-4 h-auto mt-2"
                    />
                </div>
                <div className="text-center pt-2">
                    <button
                        onClick={handleOpenModal}
                        disabled={!productName.trim() || isLoading}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] focus:outline-none focus:ring-4 focus:ring-purple-500/50 disabled:from-gray-700 disabled:to-gray-800 disabled:shadow-none disabled:text-slate-400 disabled:cursor-not-allowed disabled:scale-100"
                    >
                        Iniciar Agente de IA
                    </button>
                </div>
            </div>
        </main>

        {isLoading && (
            <div className="mt-10 text-center">
                 <div className="flex justify-center items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-indigo-400 animate-pulse [animation-delay:-0.3s]"></div>
                    <div className="w-4 h-4 rounded-full bg-indigo-400 animate-pulse [animation-delay:-0.15s]"></div>
                    <div className="w-4 h-4 rounded-full bg-indigo-400 animate-pulse"></div>
                </div>
                <p className="mt-6 text-slate-300 text-lg">Gerando prompts... Por favor, aguarde.</p>
                <p className="text-slate-500 text-sm">Nossa IA está criando a estratégia perfeita para suas imagens.</p>
            </div>
        )}

        {error && (
            <div className="mt-10 text-center bg-red-900/30 border border-red-500/50 p-4 rounded-lg">
                <p className="text-red-400">{error}</p>
            </div>
        )}

        {generatedPrompts.length > 0 && !isLoading && (
            <section className="mt-12">
                <h3 className="text-3xl font-bold text-center mb-8 text-slate-100">✨ Resultados Gerados ✨</h3>
                <div className="space-y-4">
                    {generatedPrompts.map((prompt, index) => (
                        <div 
                           key={index} 
                           className={`transition-all duration-700 ease-out ${promptsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`} 
                           style={{ transitionDelay: `${index * 100}ms` }}
                        >
                            <GeneratedPromptCard prompt={prompt} index={index} />
                        </div>
                    ))}
                </div>
            </section>
        )}
      </div>

      <PhotoAgentModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        productName={productName}
      />
    </div>
  );
};

export default App;