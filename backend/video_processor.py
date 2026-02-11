"""
Video Processor - Módulo de processamento de vídeos com FFmpeg.
Responsável por combinar múltiplos vídeos curtos com transições profissionais.
"""

import os
import subprocess
import json
import uuid
import shutil
from typing import List, Optional
from dataclasses import dataclass, field
from enum import Enum


class TransitionType(str, Enum):
    FADE = "fade"
    DISSOLVE = "dissolve"
    WIPE_LEFT = "wipe_left"
    WIPE_RIGHT = "wipe_right"
    WIPE_UP = "wipe_up"
    WIPE_DOWN = "wipe_down"
    SLIDE_LEFT = "slide_left"
    SLIDE_RIGHT = "slide_right"
    ZOOM_IN = "zoom_in"
    NONE = "none"


@dataclass
class VideoClip:
    path: str
    duration: float = 0.0
    width: int = 0
    height: int = 0
    fps: float = 30.0

    def __post_init__(self):
        if os.path.exists(self.path):
            self._probe()

    def _probe(self):
        """Obtém informações do vídeo usando ffprobe."""
        try:
            cmd = [
                "ffprobe", "-v", "quiet",
                "-print_format", "json",
                "-show_format", "-show_streams",
                self.path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if result.returncode != 0:
                return

            info = json.loads(result.stdout)

            # Encontrar stream de vídeo
            for stream in info.get("streams", []):
                if stream.get("codec_type") == "video":
                    self.width = int(stream.get("width", 0))
                    self.height = int(stream.get("height", 0))
                    # Calcular FPS
                    r_frame_rate = stream.get("r_frame_rate", "30/1")
                    if "/" in r_frame_rate:
                        num, den = r_frame_rate.split("/")
                        self.fps = float(num) / float(den) if float(den) != 0 else 30.0
                    else:
                        self.fps = float(r_frame_rate)
                    break

            # Duração
            fmt = info.get("format", {})
            self.duration = float(fmt.get("duration", 0))
        except Exception as e:
            print(f"Erro ao analisar vídeo {self.path}: {e}")


@dataclass
class CompositionSettings:
    target_duration: float = 30.0  # Duração alvo em segundos
    transition_duration: float = 0.5  # Duração da transição em segundos
    transition_type: TransitionType = TransitionType.FADE
    output_width: int = 1080
    output_height: int = 1920  # Formato vertical (9:16)
    output_fps: int = 30
    output_format: str = "mp4"


class VideoComposer:
    """Classe principal para composição de vídeos."""

    def __init__(self, temp_dir: str = "temp", output_dir: str = "output"):
        self.temp_dir = temp_dir
        self.output_dir = output_dir
        os.makedirs(temp_dir, exist_ok=True)
        os.makedirs(output_dir, exist_ok=True)

    def _normalize_clip(self, clip: VideoClip, settings: CompositionSettings, index: int) -> str:
        """Normaliza um clipe: resolução, fps, codec."""
        output_path = os.path.join(self.temp_dir, f"normalized_{index}_{uuid.uuid4().hex[:8]}.mp4")

        # Filtro para escalar e adicionar padding para manter aspect ratio
        filter_complex = (
            f"scale={settings.output_width}:{settings.output_height}:"
            f"force_original_aspect_ratio=decrease,"
            f"pad={settings.output_width}:{settings.output_height}:(ow-iw)/2:(oh-ih)/2:black,"
            f"setsar=1,fps={settings.output_fps}"
        )

        cmd = [
            "ffmpeg", "-y", "-i", clip.path,
            "-vf", filter_complex,
            "-c:v", "libx264", "-preset", "fast",
            "-crf", "23",
            "-an",  # Remover áudio por simplicidade
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            output_path
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            raise RuntimeError(f"Erro ao normalizar vídeo {index}: {result.stderr}")

        return output_path

    def _trim_clip(self, clip_path: str, duration: float, index: int) -> str:
        """Corta um clipe para a duração especificada."""
        output_path = os.path.join(self.temp_dir, f"trimmed_{index}_{uuid.uuid4().hex[:8]}.mp4")

        cmd = [
            "ffmpeg", "-y", "-i", clip_path,
            "-t", str(duration),
            "-c:v", "libx264", "-preset", "fast",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            output_path
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            raise RuntimeError(f"Erro ao cortar vídeo {index}: {result.stderr}")

        return output_path

    def _calculate_clip_durations(
        self, clips: List[VideoClip], settings: CompositionSettings
    ) -> List[float]:
        """Calcula a duração de cada clipe para atingir a duração alvo."""
        n = len(clips)
        if n == 0:
            return []

        # Tempo total das transições
        total_transition_time = (n - 1) * settings.transition_duration
        # Tempo disponível para conteúdo
        available_time = settings.target_duration + total_transition_time

        # Distribuir proporcionalmente baseado nas durações originais
        total_original = sum(c.duration for c in clips)

        if total_original <= 0:
            # Distribuir igualmente
            per_clip = available_time / n
            return [per_clip] * n

        durations = []
        for clip in clips:
            ratio = clip.duration / total_original
            clip_dur = ratio * available_time
            # Limitar entre 2s e duração original
            clip_dur = min(clip_dur, clip.duration)
            clip_dur = max(clip_dur, 2.0)
            durations.append(clip_dur)

        return durations

    def _build_xfade_filter(
        self,
        num_clips: int,
        durations: List[float],
        settings: CompositionSettings,
    ) -> str:
        """Constrói o filtro xfade para transições entre clipes."""

        transition_map = {
            TransitionType.FADE: "fade",
            TransitionType.DISSOLVE: "dissolve",
            TransitionType.WIPE_LEFT: "wipeleft",
            TransitionType.WIPE_RIGHT: "wiperight",
            TransitionType.WIPE_UP: "wipeup",
            TransitionType.WIPE_DOWN: "wipedown",
            TransitionType.SLIDE_LEFT: "slideleft",
            TransitionType.SLIDE_RIGHT: "slideright",
            TransitionType.ZOOM_IN: "squeezev",
            TransitionType.NONE: "fade",
        }

        ffmpeg_transition = transition_map.get(settings.transition_type, "fade")
        td = settings.transition_duration

        if num_clips == 1:
            return "[0:v]copy[outv]"

        filters = []
        offset = durations[0] - td

        if num_clips == 2:
            filters.append(
                f"[0:v][1:v]xfade=transition={ffmpeg_transition}:"
                f"duration={td}:offset={max(0, offset)}[outv]"
            )
        else:
            # Primeiro par
            filters.append(
                f"[0:v][1:v]xfade=transition={ffmpeg_transition}:"
                f"duration={td}:offset={max(0, offset)}[v01]"
            )

            for i in range(2, num_clips):
                offset += durations[i - 1] - td
                prev_label = f"v{str(i - 2).zfill(2)}{str(i - 1).zfill(2)}" if i == 2 else f"v{i - 1}"
                if i == 2:
                    prev_label = "v01"

                if i == num_clips - 1:
                    out_label = "outv"
                else:
                    out_label = f"v{i}"

                filters.append(
                    f"[{prev_label}][{i}:v]xfade=transition={ffmpeg_transition}:"
                    f"duration={td}:offset={max(0, offset)}[{out_label}]"
                )

        return ";".join(filters)

    def compose(
        self,
        video_paths: List[str],
        settings: Optional[CompositionSettings] = None,
        job_id: Optional[str] = None,
    ) -> str:
        """
        Compõe múltiplos vídeos em um único vídeo final com transições.

        Args:
            video_paths: Lista de caminhos dos vídeos de entrada
            settings: Configurações da composição
            job_id: ID único do job

        Returns:
            Caminho do vídeo final
        """
        if settings is None:
            settings = CompositionSettings()

        if not job_id:
            job_id = uuid.uuid4().hex[:12]

        if len(video_paths) == 0:
            raise ValueError("Nenhum vídeo fornecido")

        if len(video_paths) > 10:
            raise ValueError("Máximo de 10 vídeos permitidos")

        # 1. Carregar e analisar clipes
        clips = [VideoClip(path=p) for p in video_paths]
        for i, clip in enumerate(clips):
            if clip.duration <= 0:
                raise ValueError(f"Vídeo {i + 1} não pôde ser analisado ou está vazio")

        # 2. Calcular durações
        durations = self._calculate_clip_durations(clips, settings)

        # 3. Normalizar clipes
        normalized_paths = []
        for i, clip in enumerate(clips):
            norm_path = self._normalize_clip(clip, settings, i)
            # Cortar se necessário
            norm_clip = VideoClip(path=norm_path)
            if norm_clip.duration > durations[i]:
                trimmed = self._trim_clip(norm_path, durations[i], i)
                normalized_paths.append(trimmed)
            else:
                normalized_paths.append(norm_path)

        # Recalcular durações reais após normalização
        actual_durations = []
        for p in normalized_paths:
            c = VideoClip(path=p)
            actual_durations.append(c.duration)

        # 4. Construir filtro de transição
        filter_complex = self._build_xfade_filter(
            len(normalized_paths), actual_durations, settings
        )

        # 5. Gerar vídeo final
        output_path = os.path.join(self.output_dir, f"composed_{job_id}.mp4")

        cmd = ["ffmpeg", "-y"]
        for p in normalized_paths:
            cmd.extend(["-i", p])

        cmd.extend([
            "-filter_complex", filter_complex,
            "-map", "[outv]",
            "-c:v", "libx264", "-preset", "fast",
            "-crf", "20",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            output_path
        ])

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            raise RuntimeError(f"Erro na composição final: {result.stderr}")

        # 6. Limpar arquivos temporários
        for p in normalized_paths:
            try:
                os.remove(p)
            except OSError:
                pass

        return output_path

    def get_video_info(self, video_path: str) -> dict:
        """Retorna informações sobre um vídeo."""
        clip = VideoClip(path=video_path)
        return {
            "duration": round(clip.duration, 2),
            "width": clip.width,
            "height": clip.height,
            "fps": round(clip.fps, 2),
        }

    def generate_thumbnail(self, video_path: str, output_path: str, time: float = 0.5) -> str:
        """Gera uma thumbnail de um vídeo."""
        cmd = [
            "ffmpeg", "-y", "-i", video_path,
            "-ss", str(time),
            "-vframes", "1",
            "-vf", "scale=320:-1",
            output_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            raise RuntimeError(f"Erro ao gerar thumbnail: {result.stderr}")
        return output_path

    def cleanup_job(self, job_id: str):
        """Limpa arquivos temporários de um job."""
        for f in os.listdir(self.temp_dir):
            if job_id in f:
                try:
                    os.remove(os.path.join(self.temp_dir, f))
                except OSError:
                    pass
