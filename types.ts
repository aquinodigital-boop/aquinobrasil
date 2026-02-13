// ====== Types para o App de Composição de Vídeos ======

export interface VideoClip {
  id: string;
  filename: string;
  duration: number;
  width: number;
  height: number;
  size_bytes: number;
  file: File;
  thumbnailUrl: string; // data URL da thumbnail gerada no browser
  objectUrl: string; // URL.createObjectURL para preview
  order: number;
}

export interface TransitionOption {
  id: string;
  name: string;
  description: string;
}

export interface CompositionSettings {
  transition_type: string;
  transition_duration: number;
  target_duration: number;
  output_width: number;
  output_height: number;
}

export type AppStep = "upload" | "arrange" | "settings" | "processing" | "result";
