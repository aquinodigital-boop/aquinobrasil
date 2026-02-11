/**
 * API Service - Comunicação com o backend de composição de vídeos
 */

import type { VideoClip, TransitionOption, JobStatus, CompositionSettings } from "../types";

const API_BASE = "http://localhost:8000/api";

/**
 * Upload de múltiplos vídeos
 */
export async function uploadVideos(files: File[]): Promise<VideoClip[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await fetch(`${API_BASE}/videos/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "Erro no upload" }));
    throw new Error(err.detail || "Erro ao fazer upload dos vídeos");
  }

  const data = await response.json();
  return data.map((v: any, index: number) => ({
    ...v,
    order: index,
  }));
}

/**
 * Lista transições disponíveis
 */
export async function getTransitions(): Promise<TransitionOption[]> {
  const response = await fetch(`${API_BASE}/transitions`);
  if (!response.ok) {
    throw new Error("Erro ao buscar transições");
  }
  return response.json();
}

/**
 * Inicia composição de vídeos
 */
export async function startComposition(
  videoIds: string[],
  settings: CompositionSettings
): Promise<JobStatus> {
  const response = await fetch(`${API_BASE}/compose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      video_ids: videoIds,
      ...settings,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "Erro na composição" }));
    throw new Error(err.detail || "Erro ao iniciar composição");
  }

  return response.json();
}

/**
 * Consulta status de um job
 */
export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!response.ok) {
    throw new Error("Erro ao consultar status do job");
  }
  return response.json();
}

/**
 * URL para download do vídeo final
 */
export function getDownloadUrl(jobId: string): string {
  return `${API_BASE}/videos/download/${jobId}`;
}

/**
 * URL para preview do vídeo final
 */
export function getPreviewUrl(jobId: string): string {
  return `${API_BASE}/videos/preview/${jobId}`;
}

/**
 * URL da thumbnail
 */
export function getThumbnailUrl(videoId: string): string {
  return `${API_BASE}/thumbnails/${videoId}.jpg`;
}

/**
 * Remove um vídeo
 */
export async function deleteVideo(videoId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/videos/${videoId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Erro ao remover vídeo");
  }
}
