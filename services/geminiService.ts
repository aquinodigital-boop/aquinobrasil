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
// GERAR DO ZERO — Imagen 3 generateImages
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
//
// Etapa 1: Gemini ANALISA a foto do produto (texto)
//   → cria descricao ultra-detalhada do produto
//
// Etapa 2: Imagen 3 GERA a imagem nova
//   → usando a descricao do produto + cenario desejado
//
// Assim usamos apenas APIs que funcionam com API Key normal
// ============================================================

const ANALYSIS_PROMPT = `Voce e um especialista em descricao de produtos para fotografia profissional.

Analise esta imagem de produto e crie uma descricao EXTREMAMENTE detalhada e precisa, incluindo:

1. TIPO DE PRODUTO: o que e exatamente
2. FORMATO/FORMA: formato exato da embalagem ou objeto (cilindrico, retangular, garrafa, caixa, etc.)
3. DIMENSOES APARENTES: proporcoes relativas (largo, alto, fino, etc.)
4. CORES: todas as cores visíveis, com tons exatos (vermelho escarlate, azul marinho, branco perolado, etc.)
5. ROTULO/TEXTO: TODOS os textos visíveis no produto, marca, nome, descricoes
6. MATERIAIS: aparencia do material (plastico brilhante, vidro fosco, metal escovado, papelao, etc.)
7. DETALHES VISUAIS: logotipos, icones, padroes, texturas, acabamentos, selos, tampas, aberturas
8. POSICAO/ANGULO: como o produto esta posicionado na foto

A descricao deve ser tao detalhada que alguém conseguiria recriar visualmente o produto com total fidelidade apenas lendo o texto.

Responda APENAS com a descricao em portugues. Sem introducoes nem conclusoes.`;

const editWithReference = async (
  config: GenerationConfig
): Promise<GeneratedImage[]> => {
  const ai = getAI();
  const ref = config.referenceImage!;

  // Extrair base64 puro
  const rawBase64 = ref.base64Data.includes(",")
    ? ref.base64Data.split(",")[1]
    : ref.base64Data;
  const mimeType = ref.mimeType || "image/jpeg";

  // ── ETAPA 1: Gemini analisa a foto do produto ──
  let productDescription: string;

  try {
    const analysisResponse = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [
          { text: ANALYSIS_PROMPT },
          { inlineData: { mimeType, data: rawBase64 } },
        ],
      }],
    });

    productDescription = analysisResponse.text?.trim() || "";

    if (!productDescription) {
      throw new Error("Gemini nao conseguiu analisar a imagem.");
    }
  } catch (error: any) {
    console.error("Erro na analise:", error);

    // Tenta modelo alternativo
    try {
      const fallback = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{
          role: "user",
          parts: [
            { text: ANALYSIS_PROMPT },
            { inlineData: { mimeType, data: rawBase64 } },
          ],
        }],
      });
      productDescription = fallback.text?.trim() || "";
      if (!productDescription) throw new Error("Sem descricao");
    } catch {
      throw new Error(
        `Erro ao analisar a foto do produto: ${error.message || "Tente novamente."}`
      );
    }
  }

  // ── ETAPA 2: Imagen 3 gera a imagem com o produto no cenario ──
  const aspectHint = config.aspectRatio !== "1:1"
    ? ` Proporcao da imagem: ${config.aspectRatio}.`
    : "";

  const imagenPrompt = `Fotografia profissional fotorrealista de alta resolucao.

PRODUTO (deve aparecer com TOTAL FIDELIDADE a esta descricao):
${productDescription}

CENARIO DESEJADO:
${config.prompt}

INSTRUCOES:
- O produto descrito acima deve ser o elemento central da imagem, com todos os detalhes fielmente representados (cores, rotulos, textos, formato, materiais).
- O cenario ao redor deve ser "${config.prompt}" com iluminacao natural e profissional.
- Composicao fotografica premium, foco nitido no produto, profundidade de campo.
- Sombras e reflexos coerentes entre produto e cenario.${aspectHint}`;

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
    console.error("Erro Imagen 3:", error);
    if (error.message?.includes("SAFETY")) {
      throw new Error("Bloqueado pelo filtro de seguranca. Tente outro prompt.");
    }
    throw new Error(
      `Erro ao gerar: ${error.message || "Tente novamente."}`
    );
  }
};
