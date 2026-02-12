import { GoogleGenAI, Modality } from "@google/genai";
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
  return generateFromPrompt(config);
};

// ============================================================
// GERAR DO ZERO (sem referencia) — Imagen 3
// Usa generateImages com imagen-3.0-generate-002
// ============================================================
const generateFromPrompt = async (
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
// EDITAR COM FOTO DE REFERENCIA — Gemini generateContent
// Envia a foto do produto + prompt descrevendo cenario
// O modelo gera uma nova imagem preservando o produto
// ============================================================
const SYSTEM_PROMPT = `Voce e um editor profissional de fotos de produto para e-commerce.

Sua tarefa: receber a foto de um produto e gerar uma NOVA IMAGEM com o produto em um cenario diferente.

REGRAS OBRIGATORIAS:
1. O PRODUTO da foto DEVE aparecer na imagem gerada com TOTAL FIDELIDADE — mesma forma, cores, rotulo, texto, proporcoes e todos os detalhes.
2. NUNCA altere, distorca ou reinterprete o produto. Ele deve ser uma REPLICA EXATA.
3. APENAS altere: fundo, cenario, superficie, iluminacao, elementos decorativos ao redor.
4. A integracao produto+cenario deve ser NATURAL — sombras coerentes, iluminacao consistente.
5. Qualidade: fotografia profissional, fotorrealista, alta resolucao, foco no produto.

Responda APENAS com a imagem. Sem texto.`;

const MODELS = [
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash",
];

const editWithReference = async (
  config: GenerationConfig
): Promise<GeneratedImage[]> => {
  const ai = getAI();
  const ref = config.referenceImage!;

  const rawBase64 = ref.base64Data.includes(",")
    ? ref.base64Data.split(",")[1]
    : ref.base64Data;
  const mimeType = ref.mimeType || "image/jpeg";

  const aspectHint = config.aspectRatio !== "1:1"
    ? ` Proporcao da imagem final: ${config.aspectRatio}.`
    : "";

  const images: GeneratedImage[] = [];
  let lastError: any = null;

  for (const model of MODELS) {
    try {
      for (let i = 0; i < config.numberOfImages; i++) {
        const response = await ai.models.generateContent({
          model,
          contents: [{
            role: "user",
            parts: [
              { text: SYSTEM_PROMPT },
              { inlineData: { mimeType, data: rawBase64 } },
              { text: `CENARIO DESEJADO: ${config.prompt}${aspectHint}\n\nGere a imagem agora.` },
            ],
          }],
          config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
          },
        });

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              images.push({
                id: crypto.randomUUID(),
                base64Data: part.inlineData.data || "",
                mimeType: part.inlineData.mimeType || "image/png",
                prompt: config.prompt,
                model: config.model,
                aspectRatio: config.aspectRatio,
                timestamp: Date.now(),
              });
            }
          }
        }
      }

      if (images.length > 0) return images;
    } catch (error: any) {
      lastError = error;
      const msg = error.message || "";
      console.warn(`${model}:`, msg);

      // Model not found — try next
      if (msg.includes("not found") || msg.includes("NOT_FOUND") || msg.includes("not supported")) {
        continue;
      }
      // Safety — throw
      if (msg.includes("SAFETY") || msg.includes("blocked")) {
        throw new Error("Bloqueado pelo filtro de seguranca. Tente outro prompt ou foto.");
      }
      // Auth — throw
      if (msg.includes("API_KEY_INVALID") || msg.includes("401")) {
        throw new Error("API Key invalida.");
      }
      // Other — try next
      if (images.length > 0) return images;
      continue;
    }
  }

  throw new Error(
    `Erro na edicao: ${lastError?.message || "Nenhum modelo gerou imagem"}. Tente outro prompt.`
  );
};
