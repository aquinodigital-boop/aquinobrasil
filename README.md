# Nano Banana Pro - Gerador de Imagens IA

App mobile para gerar imagens a partir de prompts de texto, usando a API do Google Gemini.

## Funcionalidades

- **Modo PRO** - Usa o modelo Imagen 3 (`imagen-3.0-generate-002`) para gerar imagens de alta qualidade
- **Modo FLASH** - Usa o Gemini 2.0 Flash com geracao nativa de imagens para resultados rapidos
- **Configuracoes** - Escolha proporcao (1:1, 4:3, 3:4, 16:9, 9:16) e quantidade de imagens (1-4)
- **Interface Mobile** - UI otimizada para dispositivos moveis com design moderno e dark theme
- **Download e Compartilhamento** - Baixe ou compartilhe as imagens geradas diretamente
- **Galeria** - Historico de todas as geracoes na sessao

## Como Executar

**Pre-requisitos:** Node.js

1. Instale as dependencias:
   ```bash
   npm install
   ```

2. Configure a chave da API do Gemini no arquivo `.env.local`:
   ```
   GEMINI_API_KEY=sua_chave_aqui
   ```

3. Execute o app:
   ```bash
   npm run dev
   ```

4. Acesse `http://localhost:3000` no navegador

## Tecnologias

- React 19
- TypeScript
- Tailwind CSS
- Vite
- Google Gemini API (`@google/genai`)
