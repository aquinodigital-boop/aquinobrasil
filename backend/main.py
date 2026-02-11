"""
API Principal - Composição de Vídeos Curtos
FastAPI backend para upload, processamento e composição de vídeos.
"""

import os
import uuid
import shutil
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from video_processor import VideoComposer, CompositionSettings, TransitionType


# Diretórios
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
TEMP_DIR = os.path.join(os.path.dirname(__file__), "temp")
THUMBNAILS_DIR = os.path.join(os.path.dirname(__file__), "thumbnails")

for d in [UPLOAD_DIR, OUTPUT_DIR, TEMP_DIR, THUMBNAILS_DIR]:
    os.makedirs(d, exist_ok=True)

# Instância do compositor
composer = VideoComposer(temp_dir=TEMP_DIR, output_dir=OUTPUT_DIR)

# Jobs em memória (em produção, usar Redis/DB)
jobs: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Limpar diretórios temporários na inicialização."""
    # Startup
    for d in [TEMP_DIR]:
        for f in os.listdir(d):
            try:
                os.remove(os.path.join(d, f))
            except OSError:
                pass
    yield
    # Shutdown - limpar tudo
    pass


app = FastAPI(
    title="Video Composer API",
    description="API para composição de vídeos curtos com transições profissionais",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ====== Models ======

class ComposeRequest(BaseModel):
    video_ids: List[str]
    transition_type: str = "fade"
    transition_duration: float = 0.5
    target_duration: float = 30.0
    output_width: int = 1080
    output_height: int = 1920


class JobStatus(BaseModel):
    job_id: str
    status: str  # "processing", "completed", "error"
    progress: float = 0.0
    output_url: Optional[str] = None
    error: Optional[str] = None


class VideoInfo(BaseModel):
    id: str
    filename: str
    duration: float
    width: int
    height: int
    fps: float
    thumbnail_url: str
    size_bytes: int


# ====== Endpoints ======

@app.get("/")
async def root():
    return {"message": "Video Composer API v1.0.0", "status": "running"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}


@app.post("/api/videos/upload", response_model=List[VideoInfo])
async def upload_videos(files: List[UploadFile] = File(...)):
    """Upload de múltiplos vídeos."""
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Máximo de 10 vídeos por upload")

    uploaded = []

    for file in files:
        # Validar tipo
        if not file.content_type or not file.content_type.startswith("video/"):
            raise HTTPException(
                status_code=400,
                detail=f"Arquivo '{file.filename}' não é um vídeo válido"
            )

        # Validar tamanho (max 100MB por arquivo)
        content = await file.read()
        if len(content) > 100 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail=f"Arquivo '{file.filename}' excede 100MB"
            )

        # Salvar
        video_id = uuid.uuid4().hex[:12]
        ext = os.path.splitext(file.filename or "video.mp4")[1] or ".mp4"
        filename = f"{video_id}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)

        with open(filepath, "wb") as f:
            f.write(content)

        # Obter informações do vídeo
        try:
            info = composer.get_video_info(filepath)
        except Exception as e:
            os.remove(filepath)
            raise HTTPException(
                status_code=400,
                detail=f"Não foi possível analisar '{file.filename}': {str(e)}"
            )

        # Validar duração (máx 60s por clipe)
        if info["duration"] > 60:
            os.remove(filepath)
            raise HTTPException(
                status_code=400,
                detail=f"Vídeo '{file.filename}' excede 60 segundos"
            )

        if info["duration"] < 0.5:
            os.remove(filepath)
            raise HTTPException(
                status_code=400,
                detail=f"Vídeo '{file.filename}' é muito curto (mínimo 0.5s)"
            )

        # Gerar thumbnail
        thumb_path = os.path.join(THUMBNAILS_DIR, f"{video_id}.jpg")
        try:
            composer.generate_thumbnail(filepath, thumb_path)
        except Exception:
            thumb_path = ""

        uploaded.append(VideoInfo(
            id=video_id,
            filename=file.filename or "video.mp4",
            duration=info["duration"],
            width=info["width"],
            height=info["height"],
            fps=info["fps"],
            thumbnail_url=f"/api/thumbnails/{video_id}.jpg" if thumb_path else "",
            size_bytes=len(content),
        ))

    return uploaded


@app.get("/api/thumbnails/{filename}")
async def get_thumbnail(filename: str):
    """Retorna thumbnail de um vídeo."""
    filepath = os.path.join(THUMBNAILS_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Thumbnail não encontrada")
    return FileResponse(filepath, media_type="image/jpeg")


@app.post("/api/compose", response_model=JobStatus)
async def compose_videos(request: ComposeRequest, background_tasks: BackgroundTasks):
    """Inicia a composição de vídeos."""
    # Validar vídeos
    video_paths = []
    for vid_id in request.video_ids:
        # Encontrar arquivo
        found = False
        for f in os.listdir(UPLOAD_DIR):
            if f.startswith(vid_id):
                video_paths.append(os.path.join(UPLOAD_DIR, f))
                found = True
                break
        if not found:
            raise HTTPException(
                status_code=404,
                detail=f"Vídeo '{vid_id}' não encontrado"
            )

    if len(video_paths) < 2:
        raise HTTPException(
            status_code=400,
            detail="São necessários pelo menos 2 vídeos para composição"
        )

    # Validar tipo de transição
    try:
        transition = TransitionType(request.transition_type)
    except ValueError:
        transition = TransitionType.FADE

    # Criar job
    job_id = uuid.uuid4().hex[:12]
    jobs[job_id] = {
        "status": "processing",
        "progress": 0.0,
        "output_url": None,
        "error": None,
    }

    # Configurações
    settings = CompositionSettings(
        target_duration=max(10.0, min(60.0, request.target_duration)),
        transition_duration=max(0.1, min(2.0, request.transition_duration)),
        transition_type=transition,
        output_width=request.output_width,
        output_height=request.output_height,
    )

    # Processar em background
    background_tasks.add_task(
        _process_composition, job_id, video_paths, settings
    )

    return JobStatus(
        job_id=job_id,
        status="processing",
        progress=0.0,
    )


def _process_composition(
    job_id: str, video_paths: List[str], settings: CompositionSettings
):
    """Processamento da composição em background."""
    try:
        jobs[job_id]["progress"] = 10.0

        output_path = composer.compose(
            video_paths=video_paths,
            settings=settings,
            job_id=job_id,
        )

        jobs[job_id]["status"] = "completed"
        jobs[job_id]["progress"] = 100.0
        jobs[job_id]["output_url"] = f"/api/videos/download/{job_id}"
        jobs[job_id]["output_path"] = output_path

    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
        print(f"Erro no job {job_id}: {e}")


@app.get("/api/jobs/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    """Retorna o status de um job de composição."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job não encontrado")

    job = jobs[job_id]
    return JobStatus(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        output_url=job.get("output_url"),
        error=job.get("error"),
    )


@app.get("/api/videos/download/{job_id}")
async def download_video(job_id: str):
    """Download do vídeo composto final."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job não encontrado")

    job = jobs[job_id]
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Vídeo ainda não está pronto")

    output_path = job.get("output_path")
    if not output_path or not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="Arquivo de saída não encontrado")

    return FileResponse(
        output_path,
        media_type="video/mp4",
        filename=f"video_composto_{job_id}.mp4",
    )


@app.get("/api/videos/preview/{job_id}")
async def preview_video(job_id: str):
    """Stream do vídeo para preview no browser."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job não encontrado")

    job = jobs[job_id]
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Vídeo ainda não está pronto")

    output_path = job.get("output_path")
    if not output_path or not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="Arquivo de saída não encontrado")

    return FileResponse(
        output_path,
        media_type="video/mp4",
        headers={"Accept-Ranges": "bytes"},
    )


@app.delete("/api/videos/{video_id}")
async def delete_video(video_id: str):
    """Remove um vídeo uploadado."""
    found = False
    for f in os.listdir(UPLOAD_DIR):
        if f.startswith(video_id):
            os.remove(os.path.join(UPLOAD_DIR, f))
            found = True
            break

    # Remover thumbnail
    thumb_path = os.path.join(THUMBNAILS_DIR, f"{video_id}.jpg")
    if os.path.exists(thumb_path):
        os.remove(thumb_path)

    if not found:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")

    return {"message": "Vídeo removido com sucesso"}


@app.get("/api/transitions")
async def list_transitions():
    """Lista transições disponíveis."""
    return [
        {"id": "fade", "name": "Fade", "description": "Transição suave com fade in/out"},
        {"id": "dissolve", "name": "Dissolve", "description": "Dissolução gradual entre clipes"},
        {"id": "wipe_left", "name": "Wipe Left", "description": "Limpa da direita para a esquerda"},
        {"id": "wipe_right", "name": "Wipe Right", "description": "Limpa da esquerda para a direita"},
        {"id": "wipe_up", "name": "Wipe Up", "description": "Limpa de baixo para cima"},
        {"id": "wipe_down", "name": "Wipe Down", "description": "Limpa de cima para baixo"},
        {"id": "slide_left", "name": "Slide Left", "description": "Desliza para a esquerda"},
        {"id": "slide_right", "name": "Slide Right", "description": "Desliza para a direita"},
        {"id": "zoom_in", "name": "Zoom Squeeze", "description": "Efeito de zoom/squeeze vertical"},
        {"id": "none", "name": "Corte Seco", "description": "Sem transição - corte direto"},
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
