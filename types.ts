export type ModelType = 'PRO' | 'FLASH';

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export interface ReferenceImage {
  base64Data: string; // full data URL (data:image/...;base64,...)
  mimeType: string;
  fileName: string;
}

export interface GeneratedImage {
  id: string;
  base64Data: string;
  mimeType: string;
  prompt: string;
  model: ModelType;
  aspectRatio: AspectRatio;
  timestamp: number;
}

export interface GenerationConfig {
  model: ModelType;
  prompt: string;
  aspectRatio: AspectRatio;
  numberOfImages: number;
  referenceImage?: ReferenceImage;
}

export interface GenerationSession {
  id: string;
  config: GenerationConfig;
  images: GeneratedImage[];
  timestamp: number;
  status: 'generating' | 'completed' | 'error';
  error?: string;
}
