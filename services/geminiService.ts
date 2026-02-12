import { GoogleGenAI, Modality } from "@google/genai";
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
// Modelos Gemini que suportam geracao nativa de imagens
// via generateContent com responseModalities IMAGE
// Tenta em ordem ate encontrar um que funcione
// ============================================================
const IMAGE_GEN_MODELS = [
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash",
  "gemini-2.0-flash-latest",
  "gemini-2.5-flash-preview-04-17",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
];

// ============================================================
// EDITAR PRODUTO COM FOTO DE REFERENCIA
// Usa generateContent com a imagem do produto como input
// + prompt descrevendo o cenario desejado
// O Gemini gera uma nova imagem preservando o produto
// ============================================================
const PRODUCT_EDIT_SYSTEM = `Voce e um especialista em edicao e composicao de imagens de produtos para e-commerce.

SUA MISSAO: Receber a foto de um produto e gerar uma NOVA imagem onde o produto aparece em um NOVO cenario/contexto, conforme descrito pelo usuario.

REGRAS OBRIGATORIAS:
1. O PRODUTO/OBJETO da foto de referencia deve aparecer na imagem gerada com TOTAL FIDELIDADE - mesma forma, cores, rotulo, texto, proporcoes, detalhes, angulo e aparencia.
2. NUNCA altere, distorca, recorte, modifique ou reinterprete o produto. Ele deve ser uma REPLICA EXATA.
3. Voce pode APENAS criar/alterar: o fundo, cenario, iluminacao, superficie, contexto visual e elementos decorativos ao redor.
4. A integracao entre produto e cenario deve ser NATURAL - sombras coerentes, iluminacao consistente, perspectiva correta.
5. Qualidade: fotografia profissional, fotorrealista, alta resolucao, foco nitido no produto.

Responda APENAS com a imagem gerada. Nao inclua texto.`;

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

  const aspectHint =
    config.aspectRatio !== "1:1"
      ? ` A imagem final deve ter proporcao ${config.aspectRatio}.`
      : "";

  const userPrompt = `CENARIO DESEJADO: ${config.prompt}${aspectHint}

Gere a imagem com o produto da foto de referencia neste cenario. O produto deve ser IDENTICO a referencia.`;

  const images: GeneratedImage[] = [];
  let lastError: any = null;

  for (const modelName of IMAGE_GEN_MODELS) {
    try {
      for (let i = 0; i < config.numberOfImages; i++) {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [
                { text: PRODUCT_EDIT_SYSTEM },
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

      // Model responded but no image - try next model
      console.warn(`${modelName}: respondeu sem imagem, tentando proximo...`);
    } catch (error: any) {
      lastError = error;
      const msg = error.message || "";
      console.warn(`${modelName} falhou:`, msg);

      // Model not found - try next
      if (msg.includes("not found") || msg.includes("NOT_FOUND") || msg.includes("404")) {
        continue;
      }
      // Not supported - try next
      if (msg.includes("not supported") || msg.includes("INVALID_ARGUMENT")) {
        continue;
      }
      // Safety block - throw immediately
      if (msg.includes("SAFETY") || msg.includes("blocked")) {
        throw new Error("Bloqueado pelo filtro de seguranca. Tente outro prompt ou outra foto.");
      }
      // Auth error - throw immediately
      if (msg.includes("API_KEY_INVALID") || msg.includes("401") || msg.includes("403")) {
        throw new Error("API Key invalida. Verifique sua chave e tente novamente.");
      }
      // Return partial results if any
      if (images.length > 0) return images;
      // Other error - try next model
      continue;
    }
  }

  // All models failed
  const errorDetail = lastError?.message || "Nenhum modelo disponivel";
  throw new Error(
    `Nao foi possivel editar a imagem. ${errorDetail}. Verifique se sua API Key tem acesso a geracao de imagens.`
  );
};

// ============================================================
// GERAR IMAGEM SEM REFERENCIA
// Usa Imagen 3 generateImages (funciona na API gratuita)
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
      throw new Error("Nenhuma imagem gerada. Tente reformular seu prompt.");
    }
    return images;
  } catch (error: any) {
    console.error("Erro generateImages:", error);
    const msg = error.message || "";

    if (msg.includes("SAFETY")) {
      throw new Error("Prompt bloqueado pelo filtro de seguranca. Tente reformular.");
    }
    if (msg.includes("API_KEY_INVALID") || msg.includes("401")) {
      throw new Error("API Key invalida. Verifique sua chave e tente novamente.");
    }

    // Fallback: try generateContent with Gemini if Imagen fails
    console.log("Imagen falhou, tentando Gemini generateContent...");
    return generateFromPromptFallback(config);
  }
};

// Fallback: use Gemini generateContent for text-to-image
const generateFromPromptFallback = async (
  config: GenerationConfig
): Promise<GeneratedImage[]> => {
  const ai = getAI();
  const images: GeneratedImage[] = [];

  const aspectHint =
    config.aspectRatio !== "1:1"
      ? ` A imagem deve ter proporcao ${config.aspectRatio}.`
      : "";

  let lastError: any = null;

  for (const modelName of IMAGE_GEN_MODELS) {
    try {
      for (let i = 0; i < config.numberOfImages; i++) {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `Gere uma imagem com base neste prompt. Responda APENAS com a imagem.${aspectHint}\n\nPrompt: ${config.prompt}`,
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
      if (msg.includes("API_KEY_INVALID") || msg.includes("401")) throw new Error("API Key invalida.");
      if (images.length > 0) return images;
      continue;
    }
  }

  throw new Error(
    `Erro ao gerar imagem: ${lastError?.message || "Nenhum modelo disponivel"}. Tente outro prompt.`
  );
};
