import { GoogleGenAI } from "@google/genai";
import type { GenerationConfig, GeneratedImage } from "../types";

let _apiKey: string | null = null;

export const setApiKey = (key: string) => {
  _apiKey = key;
};

const getAI = (): GoogleGenAI => {
  const apiKey = _apiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key nao configurada.");
  return new GoogleGenAI({ apiKey });
};

// ============================================================
// ENTRADA PRINCIPAL
// ============================================================
export const generateImages = async (
  config: GenerationConfig
): Promise<GeneratedImage[]> => {
  if (config.referenceImage) {
    return editWithReference(config);
  }
  return generateWithImagen(config);
};

// ============================================================
// GERAR DO ZERO — Imagen 3
// ============================================================
const generateWithImagen = async (
  config: GenerationConfig
): Promise<GeneratedImage[]> => {
  const ai = getAI();

  const response = await ai.models.generateImages({
    model: "imagen-3.0-generate-002",
    prompt: config.prompt,
    config: {
      numberOfImages: config.numberOfImages,
      aspectRatio: config.aspectRatio,
    },
  });

  const images: GeneratedImage[] = [];
  if (response.generatedImages) {
    for (const img of response.generatedImages) {
      if (img.image?.imageBytes) {
        images.push({
          id: crypto.randomUUID(),
          base64Data: img.image.imageBytes,
          mimeType: "image/png",
          prompt: config.prompt,
          model: config.model,
          aspectRatio: config.aspectRatio,
          timestamp: Date.now(),
        });
      }
    }
  }

  if (images.length === 0) {
    throw new Error("Nenhuma imagem gerada. Tente reformular seu prompt.");
  }
  return images;
};

// ============================================================
// EDITAR COM REFERENCIA — 2 etapas
// Etapa 1: Gemini analisa a foto → descricao detalhada (texto)
// Etapa 2: Imagen 3 gera imagem com descricao + cenario
// ============================================================

const ANALYSIS_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro",
  "gemini-2.0-flash",
  "gemini-pro-vision",
];

const ANALYSIS_PROMPT = `Analise esta foto de produto e descreva com MAXIMO detalhe:
- Tipo de produto e categoria
- Formato exato (cilindrico, retangular, garrafa, etc)
- TODAS as cores com tons exatos
- TODOS os textos visiveis (marca, nome, descricoes)
- Material aparente (plastico, vidro, metal, papelao)
- Detalhes do rotulo, logotipo, icones, padroes
- Acabamento e texturas

Seja extremamente preciso. Responda APENAS com a descricao, sem introducao.`;

const editWithReference = async (
  config: GenerationConfig
): Promise<GeneratedImage[]> => {
  const ai = getAI();
  const ref = config.referenceImage!;

  const rawBase64 = ref.base64Data.includes(",")
    ? ref.base64Data.split(",")[1]
    : ref.base64Data;
  const mimeType = ref.mimeType || "image/jpeg";

  // ── ETAPA 1: Analisar produto ──
  let productDescription = "";
  let analysisError = "";

  for (const model of ANALYSIS_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{
          role: "user",
          parts: [
            { text: ANALYSIS_PROMPT },
            { inlineData: { mimeType, data: rawBase64 } },
          ],
        }],
      });

      const text = response.text?.trim();
      if (text && text.length > 20) {
        productDescription = text;
        break;
      }
    } catch (error: any) {
      analysisError = `${model}: ${error.message}`;
      console.warn(`Analise com ${model} falhou:`, error.message);
      continue;
    }
  }

  if (!productDescription) {
    throw new Error(
      `Nao foi possivel analisar a foto. Ultimo erro: ${analysisError}. Tente uma foto com melhor qualidade.`
    );
  }

  // ── ETAPA 2: Gerar com Imagen 3 ──
  // Manter prompt curto para evitar erros
  const imagenPrompt = `Fotografia profissional de produto em cenario. ${config.prompt}. O produto e: ${productDescription.substring(0, 800)}. Produto centralizado, iluminacao coerente, fotorrealista, alta resolucao.`;

  try {
    const response = await ai.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt: imagenPrompt,
      config: {
        numberOfImages: config.numberOfImages,
        aspectRatio: config.aspectRatio,
      },
    });

    const images: GeneratedImage[] = [];
    if (response.generatedImages) {
      for (const img of response.generatedImages) {
        if (img.image?.imageBytes) {
          images.push({
            id: crypto.randomUUID(),
            base64Data: img.image.imageBytes,
            mimeType: "image/png",
            prompt: config.prompt,
            model: config.model,
            aspectRatio: config.aspectRatio,
            timestamp: Date.now(),
          });
        }
      }
    }

    if (images.length === 0) {
      throw new Error("Imagen 3 nao gerou imagens. Tente outro cenario.");
    }
    return images;
  } catch (error: any) {
    if (error.message?.includes("SAFETY")) {
      throw new Error("Bloqueado pelo filtro de seguranca. Tente outro prompt ou foto.");
    }
    throw new Error(`Erro ao gerar imagem: ${error.message}`);
  }
};
