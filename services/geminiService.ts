import { GoogleGenAI } from "@google/genai";
import type { GenerationConfig, GeneratedImage } from '../types';

let _dynamicApiKey: string | null = null;

export const setApiKey = (key: string) => {
  _dynamicApiKey = key;
};

const getAI = (): GoogleGenAI => {
  const apiKey = _dynamicApiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "API Key do Gemini nao configurada."
    );
  }
  return new GoogleGenAI({ apiKey });
};

export const generateImages = async (
  config: GenerationConfig
): Promise<GeneratedImage[]> => {
  // If there's a reference image, always use multimodal generation (generateContent)
  if (config.referenceImage) {
    return generateWithReference(config);
  }
  // No reference image: use standard generation
  if (config.model === "PRO") {
    return generateWithImagen(config);
  } else {
    return generateWithFlash(config);
  }
};

// ============================================================
// SYSTEM PROMPT for reference image editing
// Strong instructions to NEVER modify the main product/object
// ============================================================
const REFERENCE_SYSTEM_PROMPT = `Voce e um editor de imagens profissional especializado em composicao e edicao de cenarios.

REGRAS ABSOLUTAS E INVIOLAVEIS:
1. O OBJETO/PRODUTO PRINCIPAL da imagem de referencia NUNCA deve ser alterado, modificado, distorcido, recortado ou removido. Ele deve permanecer IDENTICO - mesma forma, cores, rotulos, textos, proporcoes, detalhes e posicao relativa.
2. O produto/objeto principal DEVE aparecer na imagem final com fidelidade TOTAL a referencia original.
3. Voce pode APENAS alterar: fundo, cenario, iluminacao, atmosfera, elementos decorativos ao redor, e contexto visual.
4. Se o prompt do usuario pedir para alterar o produto em si, IGNORE essa parte e mantenha o produto intacto.
5. A imagem final deve ter qualidade profissional, fotorrealista, com iluminacao coerente entre o produto e o novo cenario.
6. O produto deve estar perfeitamente integrado ao novo cenario com sombras e reflexos naturais.

RESUMO: Produto = INTOCAVEL. Cenario/Fundo = pode ser alterado conforme o prompt.`;

// ============================================================
// Reference image editing (both PRO and FLASH modes)
// Uses generateContent with multimodal input + image output
// ============================================================
const MODELS_WITH_IMAGE_GEN = [
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash",
  "gemini-2.0-flash-latest",
];

const generateWithReference = async (
  config: GenerationConfig
): Promise<GeneratedImage[]> => {
  const ai = getAI();
  const images: GeneratedImage[] = [];
  const ref = config.referenceImage!;

  // Extract raw base64 from data URL
  const rawBase64 = ref.base64Data.includes(',')
    ? ref.base64Data.split(',')[1]
    : ref.base64Data;

  const mimeType = ref.mimeType || 'image/jpeg';

  const aspectRatioHint =
    config.aspectRatio !== "1:1"
      ? `\nA imagem final deve ter proporcao ${config.aspectRatio}.`
      : "";

  const userPrompt = `INSTRUCAO DO USUARIO: ${config.prompt}

LEMBRETE CRITICO: O produto/objeto principal desta imagem de referencia NAO pode ser alterado de forma alguma. Mantenha-o IDENTICO. Aplique as mudancas APENAS no cenario, fundo e elementos ao redor.${aspectRatioHint}

Gere a imagem editada. Responda com a imagem.`;

  let lastError: any = null;

  for (const modelName of MODELS_WITH_IMAGE_GEN) {
    try {
      for (let i = 0; i < config.numberOfImages; i++) {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [
                { text: REFERENCE_SYSTEM_PROMPT },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: rawBase64,
                  },
                },
                { text: userPrompt },
              ],
            },
          ],
          config: {
            responseModalities: ["TEXT", "IMAGE"],
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

      if (images.length > 0) {
        return images;
      }
    } catch (error: any) {
      lastError = error;
      console.warn(`Modelo ${modelName} (referencia) falhou:`, error.message);
      if (error.message?.includes("not found") || error.message?.includes("NOT_FOUND") || error.message?.includes("404")) {
        continue;
      }
      if (error.message?.includes("SAFETY")) {
        throw new Error(
          "O prompt ou a imagem foram bloqueados pelo filtro de seguranca. Tente reformular."
        );
      }
      if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("401")) {
        throw new Error(
          "API Key invalida. Verifique sua chave e tente novamente."
        );
      }
      if (images.length > 0) return images;
      throw new Error(
        error.message || "Erro ao editar imagem. Tente novamente."
      );
    }
  }

  console.error("Todos os modelos falharam para edicao com referencia:", lastError);
  throw new Error(
    lastError?.message || "Nenhum modelo disponivel para edicao. Tente novamente."
  );
};

// ============================================================
// PRO mode - Imagen 3 (sem imagem de referencia)
// ============================================================
const generateWithImagen = async (
  config: GenerationConfig
): Promise<GeneratedImage[]> => {
  const ai = getAI();

  try {
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
            model: "PRO",
            aspectRatio: config.aspectRatio,
            timestamp: Date.now(),
          });
        }
      }
    }

    if (images.length === 0) {
      throw new Error("Nenhuma imagem foi gerada. Tente reformular seu prompt.");
    }

    return images;
  } catch (error: any) {
    console.error("Erro Imagen 3 (PRO):", error);
    if (error.message?.includes("SAFETY")) {
      throw new Error(
        "O prompt foi bloqueado pelo filtro de seguranca. Tente reformular."
      );
    }
    if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("401")) {
      throw new Error(
        "API Key invalida. Verifique sua chave e tente novamente."
      );
    }
    throw new Error(
      error.message || "Erro ao gerar imagem com Imagen 3 (PRO). Tente novamente."
    );
  }
};

// ============================================================
// FLASH mode - Gemini Flash (sem imagem de referencia)
// ============================================================
const FLASH_MODELS = [
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash",
  "gemini-2.0-flash-latest",
];

const generateWithFlash = async (
  config: GenerationConfig
): Promise<GeneratedImage[]> => {
  const ai = getAI();
  const images: GeneratedImage[] = [];

  const aspectRatioHint =
    config.aspectRatio !== "1:1"
      ? ` A imagem deve ter proporcao ${config.aspectRatio}.`
      : "";

  let lastError: any = null;

  for (const modelName of FLASH_MODELS) {
    try {
      for (let i = 0; i < config.numberOfImages; i++) {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `Gere uma imagem com base neste prompt. Responda APENAS com a imagem, sem texto.${aspectRatioHint}\n\nPrompt: ${config.prompt}`,
          config: {
            responseModalities: ["TEXT", "IMAGE"],
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
                model: "FLASH",
                aspectRatio: config.aspectRatio,
                timestamp: Date.now(),
              });
            }
          }
        }
      }

      if (images.length > 0) {
        return images;
      }
    } catch (error: any) {
      lastError = error;
      console.warn(`Modelo ${modelName} falhou:`, error.message);
      if (error.message?.includes("not found") || error.message?.includes("NOT_FOUND") || error.message?.includes("404")) {
        continue;
      }
      if (error.message?.includes("SAFETY")) {
        throw new Error(
          "O prompt foi bloqueado pelo filtro de seguranca. Tente reformular."
        );
      }
      if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("401")) {
        throw new Error(
          "API Key invalida. Verifique sua chave e tente novamente."
        );
      }
      if (images.length > 0) return images;
      throw new Error(
        error.message || "Erro ao gerar imagem com Gemini Flash. Tente novamente."
      );
    }
  }

  console.error("Todos os modelos Flash falharam:", lastError);
  throw new Error(
    lastError?.message || "Nenhum modelo Flash disponivel. Tente o modo PRO."
  );
};
