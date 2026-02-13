import React, { useState, useCallback, useEffect } from 'react';
import type { PhotoAgentData } from '../types';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { XIcon } from './icons/XIcon';
import { UploadIcon } from './icons/UploadIcon';

interface PhotoAgentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PhotoAgentData) => void;
  productName: string;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const ImageInput: React.FC<{
  id: string;
  label: string;
  image: string | null;
  onImageChange: (base64: string | null) => void;
}> = ({ id, label, image, onImageChange }) => {
  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const base64 = await fileToBase64(file);
      onImageChange(base64);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-2">
        {image ? (
          <div className="relative group">
            <img src={image} alt="Preview" className="w-full h-48 object-contain rounded-lg bg-gray-900 border border-gray-700" />
            <button
              type="button"
              onClick={() => onImageChange(null)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-red-500 transition-all opacity-0 group-hover:opacity-100"
              title="Remover imagem"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <label
            htmlFor={id}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800/50 transition-colors ${isDragging ? 'border-indigo-500 bg-gray-800/80' : 'hover:bg-gray-800/80 hover:border-indigo-500'}`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center pointer-events-none">
              <UploadIcon className="w-10 h-10 mb-3 text-gray-400" />
              <p className="mb-2 text-sm text-gray-400">
                <span className="font-semibold text-indigo-400">Clique para enviar</span> ou arraste e solte
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, WEBP</p>
            </div>
            <input id={id} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </label>
        )}
      </div>
    </div>
  );
};


export const PhotoAgentModal: React.FC<PhotoAgentModalProps> = ({ open, onClose, onSubmit, productName }) => {
  const [productBrandName, setProductBrandName] = useState('');
  const [hexColor, setHexColor] = useState('');
  const [productImage, setProductImage] = useState<string | null>(null);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      // Reset state when modal is closed
      setProductBrandName('');
      setHexColor('');
      setProductImage(null);
      setLogoImage(null);
      setError(null);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productImage) {
      setError('A imagem do produto é obrigatória.');
      return;
    }
    if (!productBrandName.trim()) {
      setError('O nome da marca é obrigatório.');
      return;
    }
    setError(null);
    onSubmit({
      productImage,
      productBrandName,
      logoImage: logoImage ?? undefined,
      hexColor: hexColor || undefined,
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl border border-gray-700/80 transform transition-all"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fade-in-up 0.3s ease-out' }}
      >
        <style>{`
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        <div className="flex justify-between items-start p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Configurar Agente de IA</h2>
            <p className="text-slate-400 mt-1">Forneça os detalhes para: <span className="font-semibold text-indigo-400">{productName}</span></p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-gray-700 hover:text-slate-200 transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-6">
                 <ImageInput
                    id="product-image"
                    label="Imagem do Produto (Obrigatório)"
                    image={productImage}
                    onImageChange={setProductImage}
                  />
                  <ImageInput
                    id="logo-image"
                    label="Logo da Loja (Opcional - para marca d'água)"
                    image={logoImage}
                    onImageChange={setLogoImage}
                  />
              </div>
              <div className="space-y-6 flex flex-col">
                  <div className="space-y-2">
                    <Label htmlFor="brand-name">Marca do Produto (Obrigatório)</Label>
                    <Input
                      id="brand-name"
                      value={productBrandName}
                      onChange={(e) => setProductBrandName(e.target.value)}
                      placeholder="Ex: Coral"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hex-color">Cor do Conteúdo do Produto (Opcional)</Label>
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 flex-shrink-0">
                        <input
                          type="color"
                          value={hexColor || '#ffffff'}
                          onChange={(e) => setHexColor(e.target.value)}
                          className="w-full h-full p-0 border-none rounded-md cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-gray-700"
                        />
                      </div>
                      <Input
                          id="hex-color"
                          value={hexColor}
                          onChange={(e) => setHexColor(e.target.value)}
                          placeholder="Ex: #ff0000"
                      />
                    </div>
                    <p className="text-xs text-slate-500 pt-1">
                      Use para destacar a cor específica do conteúdo, como uma tinta ou um líquido.
                    </p>
                  </div>
                   {error && <p className="text-red-400 text-sm text-center pt-2">{error}</p>}
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-900/50 border-t border-gray-700 flex justify-end space-x-4 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-700 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-600 transition-all duration-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-[0_0_15px_rgba(124,58,237,0.4)] hover:shadow-[0_0_25px_rgba(124,58,237,0.6)] focus:outline-none focus:ring-4 focus:ring-purple-500/50"
            >
              Gerar Prompts
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};