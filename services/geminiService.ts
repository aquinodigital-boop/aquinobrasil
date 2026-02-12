import {
  GoogleGenAI,
  SubjectReferenceImage,
  Modality,
  EditMode,
  SubjectReferenceType,
} from "@google/genai";
import type { GenerationConfig, GeneratedImage } from "../types";
import type { AuthConfig } from "../components/ApiKeyModal";

let _authConfig: AuthConfig | null = null;
let _aiInstance: GoogleGenAI | null = null;

export const setAuthConfig = (config: AuthConfig) => {
  _authConfig = config;
  _aiInstance = null; // reset instance to recreate
};

const getAI = (): GoogleGenAI => {
  if (_aiInstance) return _aiInstance;

  if (!_authConfig) {
    throw new Error("Credenciais nao configuradas.");
  }

  if (_authConfig.mode === "vertex-ai") {
    const opts: any = {
      vertexai: true,
      project: _authConfig.projectId,
      location: _authConfig.location || "us-central1",
    };
    if (_authConfig.accessToken) {
      opts.googleAuthOptions = { accessToken: _authConfig.accessToken };
    } else if (_authConfig.apiKey) {
      opts.googleAuthOptions = { apiKey: _authConfig.apiKey };
    }
    _aiInstance = new GoogleGenAI(opts);
  } else {
    // AI Studio mode
    const apiKey = _authConfig.apiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key nao configurada.");
    _aiInstance = new GoogleGenAI({ apiKey });
  }

  return _aiInstance;
};

export const isVertexAI = (): boolean => {
  return _authConfig?.mode === "vertex-ai";
};

// ============================================================
// MAIN ENTRY POINT
// ============================================================
export const generateImages = async (
  config: GenerationConfig
): Promise<GeneratedImage[]> => {
  if (config.referenceImage) {
    if (isVertexAI()) {
      // Vertex AI: usa Imagen 3 editImage (melhor qualidade)
      return editProductImageVertexAI(config);
    } else {
      // AI Studio: usa generateContent com Gemini
      return editProductImageAIStudio(config);
    }
  }
  return generateFromPrompt(config);
};

// ============================================================
// VERTEX AI: IMAGEN 3 editImage + EDIT_MODE_PRODUCT_IMAGE
// Usa SubjectReferenceImage com SUBJECT_TYPE_PRODUCT
// O produto e preservado com fidelidade total pelo Imagen 3
// ============================================================
const EDIT_MODELS = [
  "imagen-3.0-capability-001",
  "imagen-3.0-generate-002",
];

const editProductImageVertexAI = async (
  config: GenerationConfig
): Promise<GeneratedImage[]> => {
  const ai = getAI();
  const ref = config.referenceImage!;

  const rawBase64 = ref.base64Data.includes(",")
    ? ref.base64Data.split(",")[1]
    : ref.base64Data;
  const mimeType = ref.mimeType || "image/jpeg";

  // SubjectReferenceImage com tipo PRODUCT
  const subjectRef = new SubjectReferenceImage();
  subjectRef.referenceImage = { imageBytes: rawBase64, mimeType };
  subjectRef.referenceId = 0;
  subjectRef.config = { subjectType: SubjectReferenceType.SUBJECT_TYPE_PRODUCT };

  const editPrompt = `${config.prompt}. Mantenha o produto exatamente como na foto de referencia com total fidelidade. Qualidade fotorrealista profissional, iluminacao coerente, alta resolucao.`;

  let lastError: any = null;

  for (const modelName of EDIT_MODELS) {
    try {
      const response = await ai.models.editImage({
        model: modelName,
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
      if (images.length > 0) return images;
    } catch (error: any) {
      lastError = error;
      console.warn(`editImage (${modelName}):`, error.message);
      if (error.message?.includes("not found") || error.message?.includes("NOT_FOUND")) continue;
      if (error.message?.includes("SAFETY")) {
        throw new Error("Bloqueado pelo filtro de seguranca. Tente outro prompt ou foto.");
      }
      if (error.message?.includes("401") || error.message?.includes("403") || error.message?.includes("UNAUTHENTICATED")) {
        throw new Error("Credenciais invalidas ou expiradas. Tente gerar um novo Access Token.");
      }
      continue;
    }
  }

  throw new Error(
    `Erro Imagen 3 editImage: ${lastError?.message || "Nenhum modelo respondeu"}. Verifique suas credenciais Vertex AI.`
  );
};

// ============================================================
// AI STUDIO: generateContent com Gemini (fallback sem Vertex)
// Envia a foto como inlineData + prompt de preservacao
// ============================================================
const GEMINI_MODELS = [
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash",
  "gemini-2.0-flash-latest",
  "gemini-2.5-flash-preview-04-17",
  "gemini-2.5-flash",
];

const PRODUCT_SYSTEM_PROMPT = `Voce e um editor de imagens de produtos profissional. Receba a foto de um produto e gere uma NOVA imagem onde o produto aparece em um novo cenario.

REGRAS: O produto deve aparecer IDENTICO a referencia - mesma forma, cores, rotulo, texto, proporcoes. NUNCA altere o produto. Apenas mude o cenario/fundo. Qualidade fotorrealista. Responda APENAS com a imagem.`;

const editProductImageAIStudio = async (
  config: GenerationConfig
): Promise<GeneratedImage[]> => {
  const ai = getAI();
  const ref = config.referenceImage!;

  const rawBase64 = ref.base64Data.includes(",")
    ? ref.base64Data.split(",")[1]
    : ref.base64Data;
  const mimeType = ref.mimeType || "image/jpeg";

  const images: GeneratedImage[] = [];
  let lastError: any = null;

  for (const modelName of GEMINI_MODELS) {
    try {
      for (let i = 0; i < config.numberOfImages; i++) {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{
            role: "user",
            parts: [
              { text: PRODUCT_SYSTEM_PROMPT },
              { inlineData: { mimeType, data: rawBase64 } },
              { text: `CENARIO: ${config.prompt}. Gere a imagem com o produto da referencia neste cenario.` },
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
      console.warn(`${modelName} (ref):`, msg);
      if (msg.includes("not found") || msg.includes("NOT_FOUND") || msg.includes("not supported")) continue;
      if (msg.includes("SAFETY")) throw new Error("Bloqueado pelo filtro de seguranca. Tente outro prompt.");
      if (msg.includes("401") || msg.includes("API_KEY_INVALID")) throw new Error("API Key invalida.");
      if (images.length > 0) return images;
      continue;
    }
  }

  throw new Error(
    `Erro ao editar: ${lastError?.message || "Nenhum modelo disponivel"}. Para melhor resultado, use Vertex AI.`
  );
};

// ============================================================
// GERAR IMAGEM SEM REFERENCIA (funciona em ambos os modos)
// Tenta Imagen 3 generateImages primeiro, fallback para Gemini
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
    if (images.length > 0) return images;
  } catch (error: any) {
    console.warn("Imagen 3 generateImages falhou:", error.message);
    if (error.message?.includes("SAFETY")) throw new Error("Prompt bloqueado. Tente reformular.");
    if (error.message?.includes("401") || error.message?.includes("API_KEY_INVALID") || error.message?.includes("UNAUTHENTICATED")) {
      throw new Error("Credenciais invalidas. Verifique e tente novamente.");
    }
  }

  // Fallback: Gemini generateContent
  return generateFromPromptGemini(config);
};

const generateFromPromptGemini = async (
  config: GenerationConfig
): Promise<GeneratedImage[]> => {
  const ai = getAI();
  const images: GeneratedImage[] = [];
  let lastError: any = null;

  const aspectHint = config.aspectRatio !== "1:1" ? ` Proporcao ${config.aspectRatio}.` : "";

  for (const modelName of GEMINI_MODELS) {
    try {
      for (let i = 0; i < config.numberOfImages; i++) {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `Gere uma imagem. Responda APENAS com a imagem.${aspectHint}\n\nPrompt: ${config.prompt}`,
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
      if (msg.includes("not found") || msg.includes("NOT_FOUND") || msg.includes("not supported")) continue;
      if (msg.includes("SAFETY")) throw new Error("Prompt bloqueado. Tente reformular.");
      if (images.length > 0) return images;
      continue;
    }
  }

  throw new Error(`Erro: ${lastError?.message || "Nenhum modelo gerou imagem"}. Tente outro prompt.`);
};
