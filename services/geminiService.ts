import { GoogleGenAI, RawReferenceImage, Modality } from "@google/genai";
import type { GenerationConfig, GeneratedImage } from '../types';

let _dynamicApiKey: string | null = null;

export const setApiKey = (key: string) => {
  _dynamicApiKey = key;
};

const getAI = (): GoogleGenAI => {
  const apiKey = _dynamicApiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key do Gemini nao configurada.");
  }
  return new GoogleGenAI({ apiKey });
};

// ============================================================
// Main entry point
// ============================================================
export const generateImages = async (
  config: GenerationConfig
): Promise<GeneratedImage[]> => {
  if (config.referenceImage) {
    // WITH reference image: use Imagen editImage API
    return generateWithReferenceImage(config);
  }
  // WITHOUT reference image
  if (config.model === "PRO") {
    return generateWithImagen(config);
  } else {
    return generateWithFlash(config);
  }
};

// ============================================================
// REFERENCE IMAGE EDITING
// Uses Imagen editImage API with RawReferenceImage
// The product/object is PRESERVED, only background/context changes
// ============================================================
const EDIT_MODELS = [
  "imagen-3.0-capability-001",
  "imagen-3.0-generate-002",
];

const generateWithReferenceImage = async (
  config: GenerationConfig
): Promise<GeneratedImage[]> => {
  const ai = getAI();
  const ref = config.referenceImage!;

  // Extract raw base64 from data URL
  const rawBase64 = ref.base64Data.includes(',')
    ? ref.base64Data.split(',')[1]
    : ref.base64Data;
  const mimeType = ref.mimeType || 'image/jpeg';

  // Build the reference image object
  const rawRef = new RawReferenceImage();
  rawRef.referenceImage = {
    imageBytes: rawBase64,
    mimeType: mimeType,
  };
  rawRef.referenceId = 0;

  // Build prompt with strong preservation instructions
  const editPrompt = `${config.prompt}. IMPORTANTE: O produto/objeto principal da imagem de referencia deve permanecer IDENTICO e INTOCAVEL - mesma forma, cores, rotulo, texto, proporcoes e detalhes. Altere APENAS o cenario, fundo e contexto visual. Qualidade profissional, fotorrealista.`;

  let lastError: any = null;

  // Try editImage API first (best for product preservation)
  for (const modelName of EDIT_MODELS) {
    try {
      const response = await ai.models.editImage({
        model: modelName,
        prompt: editPrompt,
        referenceImages: [rawRef],
        config: {
          numberOfImages: config.numberOfImages,
          editMode: "EDIT_MODE_PRODUCT_IMAGE" as any,
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
      if (images.length > 0) return images;
    } catch (error: any) {
      lastError = error;
      console.warn(`editImage (${modelName}) falhou:`, error.message);
      if (error.message?.includes("SAFETY")) {
        throw new Error("Imagem ou prompt bloqueado pelo filtro de seguranca. Tente reformular.");
      }
      if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("401")) {
        throw new Error("API Key invalida. Verifique sua chave e tente novamente.");
      }
      // Try next model or fall through to generateContent
      continue;
    }
  }

  // Fallback: try generateContent with image input + image output
  console.log("editImage falhou, tentando generateContent com referencia...");
  return generateWithReferenceViaContent(config, rawBase64, mimeType, lastError);
};

// Fallback: use generateContent for reference-based editing
const generateWithReferenceViaContent = async (
  config: GenerationConfig,
  rawBase64: string,
  mimeType: string,
  previousError: any
): Promise<GeneratedImage[]> => {
  const ai = getAI();
  const images: GeneratedImage[] = [];

  const CONTENT_MODELS = [
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash",
  ];

  const userPrompt = `Voce e um editor de imagens profissional.

REGRA ABSOLUTA: O produto/objeto principal da imagem de referencia NUNCA deve ser alterado. Ele deve permanecer IDENTICO - mesma forma, cores, rotulos, textos, proporcoes e detalhes.

INSTRUCAO: ${config.prompt}

Aplique as mudancas APENAS no cenario, fundo e elementos ao redor. Mantenha o produto INTOCAVEL. Gere a imagem editada.`;

  let lastError: any = previousError;

  for (const modelName of CONTENT_MODELS) {
    try {
      for (let i = 0; i < config.numberOfImages; i++) {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [
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
      console.warn(`generateContent ref (${modelName}) falhou:`, error.message);
      if (error.message?.includes("not found") || error.message?.includes("NOT_FOUND")) continue;
      if (error.message?.includes("SAFETY")) {
        throw new Error("Imagem ou prompt bloqueado pelo filtro de seguranca. Tente reformular.");
      }
      if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("401")) {
        throw new Error("API Key invalida.");
      }
      if (images.length > 0) return images;
    }
  }

  throw new Error(
    `Erro ao editar imagem: ${lastError?.message || 'Nenhum modelo disponivel'}. Tente outro prompt ou remova a foto de referencia.`
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
      throw new Error("Prompt bloqueado pelo filtro de seguranca. Tente reformular.");
    }
    if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("401")) {
      throw new Error("API Key invalida. Verifique sua chave e tente novamente.");
    }
    throw new Error(error.message || "Erro ao gerar imagem (PRO). Tente novamente.");
  }
};

// ============================================================
// FLASH mode - Gemini Flash (sem imagem de referencia)
// Tenta generateContent com output de imagem;
// se falhar, faz fallback para Imagen
// ============================================================
const FLASH_CONTENT_MODELS = [
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash",
];

const generateWithFlash = async (
  config: GenerationConfig
): Promise<GeneratedImage[]> => {
  const ai = getAI();
  const images: GeneratedImage[] = [];

  const aspectHint = config.aspectRatio !== "1:1"
    ? ` A imagem deve ter proporcao ${config.aspectRatio}.`
    : "";

  let lastError: any = null;

  // Try Gemini generateContent with image output
  for (const modelName of FLASH_CONTENT_MODELS) {
    try {
      for (let i = 0; i < config.numberOfImages; i++) {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `Gere uma imagem com base neste prompt. Responda APENAS com a imagem, sem texto.${aspectHint}\n\nPrompt: ${config.prompt}`,
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
                model: "FLASH",
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
      console.warn(`Flash generateContent (${modelName}) falhou:`, error.message);
      if (error.message?.includes("not found") || error.message?.includes("NOT_FOUND")) continue;
      if (error.message?.includes("SAFETY")) {
        throw new Error("Prompt bloqueado pelo filtro de seguranca. Tente reformular.");
      }
      if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("401")) {
        throw new Error("API Key invalida.");
      }
      if (images.length > 0) return images;
    }
  }

  // Fallback: use Imagen for FLASH too
  console.log("Gemini Flash nao gerou imagem, usando Imagen como fallback...");
  try {
    return await generateWithImagen({ ...config, model: "FLASH" as any });
  } catch (imagenError: any) {
    // If Imagen also fails, show the original Flash error + Imagen error
    throw new Error(
      `Flash: ${lastError?.message || 'sem resposta'}. Imagen fallback: ${imagenError?.message || 'falhou'}. Tente outro prompt.`
    );
  }
};
