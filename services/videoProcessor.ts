/**
 * Video Processor - Processamento de vídeo 100% no browser com FFmpeg.wasm
 * Sem necessidade de backend/servidor.
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { CompositionSettings } from "../types";

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoading = false;
let ffmpegLoaded = false;

/**
 * Carrega e inicializa o FFmpeg.wasm
 */
export async function loadFFmpeg(
  onProgress?: (msg: string) => void
): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegLoaded) return ffmpegInstance;

  if (ffmpegLoading) {
    // Aguardar carregamento em andamento
    while (ffmpegLoading) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (ffmpegInstance && ffmpegLoaded) return ffmpegInstance;
  }

  ffmpegLoading = true;
  onProgress?.("Carregando motor de vídeo...");

  try {
    const ffmpeg = new FFmpeg();

    ffmpeg.on("log", ({ message }) => {
      // console.log("[FFmpeg]", message);
    });

    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

    onProgress?.("Baixando FFmpeg WebAssembly...");

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm"
      ),
    });

    ffmpegInstance = ffmpeg;
    ffmpegLoaded = true;
    onProgress?.("Motor de vídeo pronto!");
    return ffmpeg;
  } finally {
    ffmpegLoading = false;
  }
}

/**
 * Obtém metadados de um arquivo de vídeo usando HTMLVideoElement
 */
export function getVideoMetadata(
  file: File
): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";

    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
      URL.revokeObjectURL(url);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Não foi possível ler o vídeo: ${file.name}`));
    };

    video.src = url;
  });
}

/**
 * Gera uma thumbnail de um vídeo usando Canvas
 */
export function generateThumbnail(
  file: File,
  time: number = 0.5
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);

    video.onloadeddata = () => {
      video.currentTime = Math.min(time, video.duration * 0.3);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const scale = 160 / Math.max(video.videoWidth, video.videoHeight);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve(dataUrl);
        } else {
          resolve("");
        }
      } catch {
        resolve("");
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(""); // Não falhar por causa de thumbnail
    };

    video.src = url;
  });
}

/**
 * Calcula as durações dos clipes para atingir a duração alvo
 */
function calculateClipDurations(
  originalDurations: number[],
  targetDuration: number,
  transitionDuration: number
): number[] {
  const n = originalDurations.length;
  if (n === 0) return [];

  const totalTransitionTime = (n - 1) * transitionDuration;
  const availableTime = targetDuration + totalTransitionTime;
  const totalOriginal = originalDurations.reduce((a, b) => a + b, 0);

  if (totalOriginal <= 0) {
    const perClip = availableTime / n;
    return originalDurations.map(() => perClip);
  }

  return originalDurations.map((dur) => {
    const ratio = dur / totalOriginal;
    let clipDur = ratio * availableTime;
    clipDur = Math.min(clipDur, dur);
    clipDur = Math.max(clipDur, 1.5);
    return clipDur;
  });
}

/**
 * Mapeamento de nomes de transição para o FFmpeg xfade
 */
const TRANSITION_MAP: Record<string, string> = {
  fade: "fade",
  dissolve: "dissolve",
  wipe_left: "wipeleft",
  wipe_right: "wiperight",
  wipe_up: "wipeup",
  wipe_down: "wipedown",
  slide_left: "slideleft",
  slide_right: "slideright",
  zoom_in: "squeezev",
  none: "fade",
};

/**
 * Compõe múltiplos vídeos em um único vídeo com transições.
 * Tudo roda no browser via FFmpeg.wasm.
 */
export async function composeVideos(
  files: File[],
  durations: number[],
  settings: CompositionSettings,
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
  if (files.length === 0) throw new Error("Nenhum vídeo fornecido");
  if (files.length > 10) throw new Error("Máximo de 10 vídeos");

  onProgress?.(5, "Inicializando motor de vídeo...");
  const ffmpeg = await loadFFmpeg((msg) => onProgress?.(8, msg));

  const td = settings.transition_duration;
  const ffTransition = TRANSITION_MAP[settings.transition_type] || "fade";

  // Determinar resolução de saída - usar valores menores para performance no browser
  const outW = Math.min(settings.output_width, 720);
  const outH = Math.min(
    settings.output_height,
    Math.round((720 / settings.output_width) * settings.output_height)
  );

  // Calcular durações ideais
  const clipDurations = calculateClipDurations(durations, settings.target_duration, td);

  // 1. Carregar cada vídeo no sistema de arquivos virtual
  onProgress?.(10, "Carregando vídeos na memória...");
  for (let i = 0; i < files.length; i++) {
    const ext = files[i].name.split(".").pop() || "mp4";
    await ffmpeg.writeFile(`input_${i}.${ext}`, await fetchFile(files[i]));
    onProgress?.(
      10 + Math.round((i / files.length) * 15),
      `Carregando vídeo ${i + 1} de ${files.length}...`
    );
  }

  // 2. Normalizar cada clipe (resolução, duração, codec)
  onProgress?.(25, "Normalizando vídeos...");
  for (let i = 0; i < files.length; i++) {
    const ext = files[i].name.split(".").pop() || "mp4";
    const dur = clipDurations[i];

    await ffmpeg.exec([
      "-i", `input_${i}.${ext}`,
      "-t", dur.toFixed(2),
      "-vf", `scale=${outW}:${outH}:force_original_aspect_ratio=decrease,pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=24`,
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "28",
      "-an",
      "-pix_fmt", "yuv420p",
      `-y`, `norm_${i}.mp4`,
    ]);

    onProgress?.(
      25 + Math.round((i / files.length) * 30),
      `Normalizando vídeo ${i + 1} de ${files.length}...`
    );
  }

  // 3. Compor com transições
  onProgress?.(60, "Aplicando transições...");

  if (files.length === 1) {
    // Apenas um vídeo - copiar diretamente
    await ffmpeg.exec([
      "-i", "norm_0.mp4",
      "-c", "copy",
      "-y", "output.mp4",
    ]);
  } else {
    // Construir filtro xfade para múltiplos vídeos
    const inputArgs: string[] = [];
    for (let i = 0; i < files.length; i++) {
      inputArgs.push("-i", `norm_${i}.mp4`);
    }

    // Obter durações reais dos arquivos normalizados
    // Para simplificar, usamos as durações calculadas
    const realDurations = clipDurations;

    let filterComplex = "";

    if (files.length === 2) {
      const offset = Math.max(0, realDurations[0] - td);
      filterComplex = `[0:v][1:v]xfade=transition=${ffTransition}:duration=${td}:offset=${offset.toFixed(2)}[outv]`;
    } else {
      // Primeiro par
      let offset = Math.max(0, realDurations[0] - td);
      filterComplex = `[0:v][1:v]xfade=transition=${ffTransition}:duration=${td}:offset=${offset.toFixed(2)}[v01]`;

      for (let i = 2; i < files.length; i++) {
        offset += realDurations[i - 1] - td;
        offset = Math.max(0, offset);
        const prevLabel = i === 2 ? "v01" : `v${i - 1}`;
        const outLabel = i === files.length - 1 ? "outv" : `v${i}`;
        filterComplex += `;[${prevLabel}][${i}:v]xfade=transition=${ffTransition}:duration=${td}:offset=${offset.toFixed(2)}[${outLabel}]`;
      }
    }

    onProgress?.(70, "Renderizando vídeo final...");

    await ffmpeg.exec([
      ...inputArgs,
      "-filter_complex", filterComplex,
      "-map", "[outv]",
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "26",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-y", "output.mp4",
    ]);
  }

  onProgress?.(90, "Finalizando...");

  // 4. Ler o arquivo de saída
  const data = await ffmpeg.readFile("output.mp4");

  // 5. Limpar arquivos temporários
  for (let i = 0; i < files.length; i++) {
    const ext = files[i].name.split(".").pop() || "mp4";
    try {
      await ffmpeg.deleteFile(`input_${i}.${ext}`);
      await ffmpeg.deleteFile(`norm_${i}.mp4`);
    } catch {
      // Ignorar erros de limpeza
    }
  }
  try {
    await ffmpeg.deleteFile("output.mp4");
  } catch {
    // Ignorar
  }

  onProgress?.(100, "Concluído!");

  // Converter Uint8Array para Blob
  const blob = new Blob([data], { type: "video/mp4" });
  return blob;
}

/**
 * Lista as transições disponíveis (local, sem API)
 */
export function getAvailableTransitions() {
  return [
    { id: "fade", name: "Fade", description: "Transição suave com fade in/out" },
    { id: "dissolve", name: "Dissolve", description: "Dissolução gradual entre clipes" },
    { id: "wipe_left", name: "Wipe Left", description: "Limpa da direita para a esquerda" },
    { id: "wipe_right", name: "Wipe Right", description: "Limpa da esquerda para a direita" },
    { id: "wipe_up", name: "Wipe Up", description: "Limpa de baixo para cima" },
    { id: "wipe_down", name: "Wipe Down", description: "Limpa de cima para baixo" },
    { id: "slide_left", name: "Slide Left", description: "Desliza para a esquerda" },
    { id: "slide_right", name: "Slide Right", description: "Desliza para a direita" },
    { id: "zoom_in", name: "Zoom Squeeze", description: "Efeito de zoom/squeeze vertical" },
    { id: "none", name: "Corte Seco", description: "Sem transição - corte direto" },
  ];
}
