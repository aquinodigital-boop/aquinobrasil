# VideoComposer - Composição de Vídeos Curtos

Aplicativo web que combina múltiplos vídeos curtos (5-10s) em um único vídeo final (25-30s) com transições profissionais. **100% processado no navegador** - seus vídeos nunca saem do seu dispositivo.

## Funcionalidades

- **Upload drag-and-drop**: Arraste ou selecione até 10 vídeos
- **Timeline interativa**: Reordene clipes arrastando
- **10+ transições**: Fade, dissolve, wipe, slide, zoom e mais
- **Formatos otimizados**: Reels, TikTok, Stories, Feed Instagram, YouTube Shorts
- **100% privado**: Todo processamento acontece no browser via WebAssembly
- **Preview integrado**: Assista ao resultado antes de baixar
- **Download direto**: Baixe o vídeo final em MP4

## Como Funciona

O app usa **FFmpeg.wasm** - uma versão do FFmpeg compilada para WebAssembly que roda diretamente no navegador. Não há necessidade de backend, servidor ou instalação de software.

1. Selecione seus vídeos curtos
2. Organize a ordem na timeline
3. Escolha o tipo de transição e configurações
4. Clique em "Compor Vídeo"
5. Baixe o resultado

## Tecnologias

- **React 19** + TypeScript + Vite
- **Tailwind CSS** para estilização
- **FFmpeg.wasm** para processamento de vídeo no browser
- **Canvas API** para geração de thumbnails
- **HTMLVideoElement** para metadados de vídeo

## Instalação e Execução

```bash
npm install
npm run dev
```

O app estará disponível em `http://localhost:3000`.

Para build de produção:

```bash
npm run build
npm run preview
```

## Estrutura do Projeto

```
├── App.tsx                          # Componente principal com fluxo de 5 etapas
├── types.ts                         # Tipos TypeScript
├── index.html                       # HTML de entrada
├── index.css                        # Estilos globais
├── services/
│   └── videoProcessor.ts            # Processamento FFmpeg.wasm no browser
├── components/
│   ├── VideoUploader.tsx            # Upload drag-and-drop
│   ├── VideoTimeline.tsx            # Timeline de organização
│   ├── TransitionSelector.tsx       # Seletor de transições
│   ├── CompositionConfig.tsx        # Configurações de saída
│   ├── ProcessingView.tsx           # Indicador de progresso
│   ├── ResultView.tsx               # Player e download
│   ├── StepIndicator.tsx            # Navegação por etapas
│   └── icons/                       # Ícones SVG
├── vite.config.ts                   # Configuração Vite com headers COOP/COEP
├── tsconfig.json                    # Configuração TypeScript
└── package.json                     # Dependências
```

## Transições Disponíveis

| Transição | Descrição |
|-----------|-----------|
| Fade | Transição suave com fade in/out |
| Dissolve | Dissolução gradual entre clipes |
| Wipe Left/Right/Up/Down | Limpa em uma direção |
| Slide Left/Right | Desliza para o lado |
| Zoom Squeeze | Efeito de squeeze vertical |
| Corte Seco | Sem transição |

## Requisitos do Browser

- Chrome 94+, Edge 94+, Firefox 103+, Safari 16.4+
- Suporte a SharedArrayBuffer (habilitado via headers COOP/COEP)
- Recomendado: 4GB+ RAM disponível para processamento

## Notas Importantes

- **Privacidade**: Nenhum vídeo é enviado para servidores. Tudo é processado localmente.
- **Performance**: O tempo de processamento depende do hardware do dispositivo e do tamanho dos vídeos.
- **Limite**: Para melhor performance no browser, a resolução de saída é limitada a 720p.
