// ====== Types para o App de Composição de Vídeos ======

export interface VideoClip {
  id: string;
  filename: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  thumbnail_url: string;
  size_bytes: number;
  file?: File;
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

export interface JobStatus {
  job_id: string;
  status: "processing" | "completed" | "error";
  progress: number;
  output_url: string | null;
  error: string | null;
}

export type AppStep = "upload" | "arrange" | "settings" | "processing" | "result";
