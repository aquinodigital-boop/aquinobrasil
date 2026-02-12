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
  if (config.model === "PRO") {
    return generateWithImagen(config);
  } else {
    return generateWithFlash(config);
  }
};

/**
 * PRO mode - Uses Imagen 3 (imagen-3.0-generate-002)
 * Higher quality, supports multiple images and aspect ratios natively
 */
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

/**
 * FLASH mode - Uses Gemini 2.0 Flash with native image generation
 * Faster, generates one image at a time via content generation
 * Tries multiple model names for compatibility
 */
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

      // If we got images, return them
      if (images.length > 0) {
        return images;
      }
    } catch (error: any) {
      lastError = error;
      console.warn(`Modelo ${modelName} falhou:`, error.message);
      // If it's a model-not-found error, try the next model
      if (error.message?.includes("not found") || error.message?.includes("NOT_FOUND") || error.message?.includes("404")) {
        continue;
      }
      // For other errors (safety, auth), throw immediately
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
      // If we got some images before the error, return them
      if (images.length > 0) {
        return images;
      }
      throw new Error(
        error.message || "Erro ao gerar imagem com Gemini Flash. Tente novamente."
      );
    }
  }

  // All models failed
  console.error("Todos os modelos Flash falharam:", lastError);
  throw new Error(
    lastError?.message || "Nenhum modelo Flash disponivel. Tente o modo PRO."
  );
};
