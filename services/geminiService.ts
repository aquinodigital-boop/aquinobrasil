import {
  GoogleGenAI,
  SubjectReferenceImage,
  RawReferenceImage,
  Modality,
  EditMode,
  SubjectReferenceType,
} from "@google/genai";
import type { GenerationConfig, GeneratedImage } from "../types";

let _dynamicApiKey: string | null = null;

export const setApiKey = (key: string) => {
  _dynamicApiKey = key;
};

const getAI = (): GoogleGenAI => {
  const apiKey =
    _dynamicApiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key do Gemini nao configurada.");
  }
  return new GoogleGenAI({ apiKey });
};

// ============================================================
// MAIN ENTRY POINT
// ============================================================
export const generateImages = async (
  config: GenerationConfig
): Promise<GeneratedImage[]> => {
  if (config.referenceImage) {
    return editProductImage(config);
  }
  return generateFromPrompt(config);
};

// ============================================================
// IMAGEN 3.0 - EDIT PRODUCT IMAGE (funcionalidade principal)
// Usa editImage com SubjectReferenceImage + EDIT_MODE_PRODUCT_IMAGE
// O produto NUNCA e alterado, apenas o cenario/fundo muda
// ============================================================
const editProductImage = async (
  config: GenerationConfig
): Promise<GeneratedImage[]> => {
  const ai = getAI();
  const ref = config.referenceImage!;

  // Extrair base64 puro do data URL
  const rawBase64 = ref.base64Data.includes(",")
    ? ref.base64Data.split(",")[1]
    : ref.base64Data;
  const mimeType = ref.mimeType || "image/jpeg";

  // SubjectReferenceImage com tipo PRODUCT - diz ao Imagen
  // que esta imagem contem um PRODUTO que deve ser preservado
  const subjectRef = new SubjectReferenceImage();
  subjectRef.referenceImage = {
    imageBytes: rawBase64,
    mimeType: mimeType,
  };
  subjectRef.referenceId = 0;
  subjectRef.config = { subjectType: SubjectReferenceType.SUBJECT_TYPE_PRODUCT };

  // Prompt reforçando preservação do produto
  const editPrompt = `${config.prompt}. Mantenha o produto/objeto principal exatamente como na foto de referencia, com total fidelidade. Qualidade fotorrealista profissional, iluminacao coerente, alta resolucao.`;

  try {
    const response = await ai.models.editImage({
      model: "imagen-3.0-capability-001",
      prompt: editPrompt,
      referenceImages: [subjectRef],
      config: {
        numberOfImages: config.numberOfImages,
        editMode: EditMode.EDIT_MODE_PRODUCT_IMAGE,
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
      throw new Error(
        "Imagen 3 nao retornou imagens. Tente reformular o prompt."
      );
    }
    return images;
  } catch (error: any) {
    console.error("Erro editImage Imagen 3:", error);

    if (error.message?.includes("SAFETY")) {
      throw new Error(
        "Bloqueado pelo filtro de seguranca. Tente outro prompt ou outra foto."
      );
    }
    if (
      error.message?.includes("API_KEY_INVALID") ||
      error.message?.includes("401")
    ) {
      throw new Error(
        "API Key invalida. Verifique sua chave e tente novamente."
      );
    }

    // Se o modelo capability nao existir, tenta com generate
    if (
      error.message?.includes("not found") ||
      error.message?.includes("NOT_FOUND")
    ) {
      console.log("capability-001 nao encontrado, tentando com generate-002...");
      return editProductImageFallback(config, subjectRef, editPrompt);
    }

    throw new Error(
      `Erro ao editar com Imagen 3: ${error.message || "Tente novamente."}`
    );
  }
};

// Fallback: tenta com modelo imagen-3.0-generate-002
const editProductImageFallback = async (
  config: GenerationConfig,
  subjectRef: SubjectReferenceImage,
  editPrompt: string
): Promise<GeneratedImage[]> => {
  const ai = getAI();

  try {
    const response = await ai.models.editImage({
      model: "imagen-3.0-generate-002",
      prompt: editPrompt,
      referenceImages: [subjectRef],
      config: {
        numberOfImages: config.numberOfImages,
        editMode: EditMode.EDIT_MODE_PRODUCT_IMAGE,
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
      throw new Error(
        "Imagen 3 nao retornou imagens. Tente reformular o prompt."
      );
    }
    return images;
  } catch (error: any) {
    console.error("Erro editImage fallback:", error);
    if (error.message?.includes("SAFETY")) {
      throw new Error(
        "Bloqueado pelo filtro de seguranca. Tente outro prompt ou outra foto."
      );
    }
    throw new Error(
      `Erro Imagen 3: ${error.message || "Tente novamente."}`
    );
  }
};

// ============================================================
// IMAGEN 3.0 - GENERATE FROM PROMPT (sem referencia)
// ============================================================
const generateFromPrompt = async (
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
            model: config.model,
            aspectRatio: config.aspectRatio,
            timestamp: Date.now(),
          });
        }
      }
    }

    if (images.length === 0) {
      throw new Error(
        "Nenhuma imagem gerada. Tente reformular seu prompt."
      );
    }
    return images;
  } catch (error: any) {
    console.error("Erro generateImages Imagen 3:", error);
    if (error.message?.includes("SAFETY")) {
      throw new Error(
        "Prompt bloqueado pelo filtro de seguranca. Tente reformular."
      );
    }
    if (
      error.message?.includes("API_KEY_INVALID") ||
      error.message?.includes("401")
    ) {
      throw new Error(
        "API Key invalida. Verifique sua chave e tente novamente."
      );
    }
    throw new Error(
      `Erro Imagen 3: ${error.message || "Tente novamente."}`
    );
  }
};
