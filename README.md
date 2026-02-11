# VideoComposer - Composição de Vídeos Curtos

Aplicativo para combinar múltiplos vídeos curtos (5-10s) em um único vídeo final (25-30s) com transições profissionais, otimizado para redes sociais.

## Funcionalidades

- **Upload múltiplo**: Arraste ou selecione até 10 vídeos de uma vez
- **Timeline interativa**: Reordene clipes por drag-and-drop
- **10+ transições**: Fade, dissolve, wipe, slide, zoom e mais
- **Formatos otimizados**: Reels, TikTok, Stories, Feed Instagram, YouTube Shorts
- **Processamento eficiente**: Backend com FFmpeg para composição rápida
- **Preview integrado**: Assista ao resultado diretamente no browser
- **Download direto**: Baixe o vídeo final em MP4

## Arquitetura

```
├── backend/                 # API Python (FastAPI + FFmpeg)
│   ├── main.py             # Endpoints da API
│   ├── video_processor.py  # Lógica de processamento de vídeo
│   └── requirements.txt    # Dependências Python
├── components/             # Componentes React
│   ├── VideoUploader.tsx   # Upload com drag-and-drop
│   ├── VideoTimeline.tsx   # Timeline de organização
│   ├── TransitionSelector.tsx  # Seletor de transições
│   ├── CompositionConfig.tsx   # Configurações de saída
│   ├── ProcessingView.tsx  # Indicador de progresso
│   ├── ResultView.tsx      # Player e download
│   └── StepIndicator.tsx   # Navegação por etapas
├── services/
│   └── apiService.ts       # Comunicação com a API
├── App.tsx                 # Componente principal
├── types.ts                # Tipos TypeScript
└── index.html              # Entrada HTML
```

## Requisitos

- **Node.js** 18+
- **Python** 3.10+
- **FFmpeg** 5+ (com suporte a libx264)

## Instalação e Execução

### 1. Backend (Python/FastAPI)

```bash
cd backend
pip install -r requirements.txt
python main.py
```

O backend estará disponível em `http://localhost:8000`.

### 2. Frontend (React/Vite)

```bash
npm install
npm run dev
```

O frontend estará disponível em `http://localhost:3000`.

### Comando rápido

```bash
# Instalar tudo
npm install && cd backend && pip install -r requirements.txt && cd ..

# Rodar backend (em um terminal)
cd backend && python main.py

# Rodar frontend (em outro terminal)
npm run dev
```

## API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/health` | Status do servidor |
| POST | `/api/videos/upload` | Upload de vídeos (multipart) |
| GET | `/api/thumbnails/{filename}` | Thumbnail de um vídeo |
| POST | `/api/compose` | Iniciar composição |
| GET | `/api/jobs/{job_id}` | Status de um job |
| GET | `/api/videos/download/{job_id}` | Download do vídeo final |
| GET | `/api/videos/preview/{job_id}` | Preview do vídeo final |
| DELETE | `/api/videos/{video_id}` | Remover vídeo |
| GET | `/api/transitions` | Lista de transições |

## Transições Disponíveis

| ID | Nome | Descrição |
|----|------|-----------|
| fade | Fade | Transição suave com fade in/out |
| dissolve | Dissolve | Dissolução gradual entre clipes |
| wipe_left | Wipe Left | Limpa da direita para a esquerda |
| wipe_right | Wipe Right | Limpa da esquerda para a direita |
| wipe_up | Wipe Up | Limpa de baixo para cima |
| wipe_down | Wipe Down | Limpa de cima para baixo |
| slide_left | Slide Left | Desliza para a esquerda |
| slide_right | Slide Right | Desliza para a direita |
| zoom_in | Zoom Squeeze | Efeito de zoom/squeeze |
| none | Corte Seco | Sem transição |

## Stack Tecnológica

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Python 3.12 + FastAPI + FFmpeg
- **Processamento**: FFmpeg com filtros xfade para transições
- **Formato de saída**: MP4 (H.264, yuv420p)
