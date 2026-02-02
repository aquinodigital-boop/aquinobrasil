import { GoogleGenAI } from "@google/genai";
import type { PhotoAgentData } from '../types';

// Definindo tipo localmente para evitar problemas de importação
interface Part {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

const fileToGenerativePart = (base64Data: string, defaultMimeType: string): Part => {
  const match = base64Data.match(/data:(image\/[a-zA-Z]+);base64,/);
  const mimeType = match ? match[1] : defaultMimeType;
  const data = base64Data.split(',')[1];
  return {
    inlineData: {
      mimeType,
      data,
    },
  };
};

export const generatePrompts = async (data: PhotoAgentData & { productName: string }): Promise<string[]> => {
    if (!process.env.API_KEY) {
      throw new Error("A variável de ambiente API_KEY não está definida.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const parts: Part[] = [
      fileToGenerativePart(data.productImage, 'image/jpeg'),
      { text: "Imagem de referência do produto. A embalagem gerada DEVE ser idêntica a esta." },
    ];

    if (data.logoImage) {
      parts.push(fileToGenerativePart(data.logoImage, 'image/png'));
      parts.push({ text: "Logo da loja para marca d'água." });
    }
    
    const logoInstruction = data.logoImage 
      ? `- Logo da Loja para Marca d'água: Fornecido. Instrução: Aplicar o logo fornecido como uma marca d'água sutil e transparente (ex: 50% de opacidade) no canto inferior direito de todas as imagens geradas.`
      : `- Logo da Loja para Marca d'água: Não fornecido.`;
    
    const colorInstruction = data.hexColor
      ? `- Cor do Conteúdo do Produto: ${data.hexColor}. Instrução: ESSENCIAL - Os prompts devem gerar imagens que mostrem o conteúdo do produto (tinta, líquido, pó, etc.) com essa cor exata em destaque. A cor da embalagem NÃO deve ser alterada. O foco é na cor do conteúdo sendo demonstrado (ex: um pincel com a tinta, um tecido tingido, ou o produto sendo aplicado).`
      : `- Cor do Conteúdo do Produto: Não especificada.`;

    // Verificação segura da marca
    const brandName = data.productBrandName || "";
    const isChamaroma = brandName.toUpperCase().includes("CHAMAROMA");
    
    let brandSpecificInstructions = "";
    
    if (isChamaroma) {
      brandSpecificInstructions = `
      🚨 DIRETRIZES OBRIGATÓRIAS PARA A MARCA "CHAMAROMA" (ALTA PRIORIDADE) 🚨
      
      Você DEVE seguir estas regras estritas para manter a identidade da marca:

      1. **ESTÉTICA E ATMOSFERA:**
         - A estética deve ser "RAW", AUTÊNTICA, ORGÂNICA e ter PERSONALIDADE.
         - PROIBIDO ABSOLUTAMENTE criar cenas "clean", assépticas, minimalistas ao extremo, fundos brancos vazios ou estúdios perfeitos demais.
         - Busque texturas reais (imperfeições são bem-vindas), iluminação dramática ou luz natural complexa, sombras e profundidade. A imagem deve parecer uma foto real tirada em um ambiente vivido, não um render 3D clínico.

      2. **LISTA NEGRA DE ELEMENTOS (PROIBIDO UTILIZAR SOB QUALQUER CIRCUNSTÂNCIA):**
         - ❌ LIVROS
         - ❌ XÍCARAS (café, chá, etc.)
         - ❌ CANECAS
         - ❌ ÓCULOS (de grau ou sol)
         - ❌ ITENS DE ESCRITÓRIO (laptops, canetas, cadernos)
         - ❌ PLANTAS GENÉRICAS DE PLÁSTICO (use elementos naturais reais se necessário, como madeira seca, pedras, etc.)

      3. **CENÁRIOS E CONTEXTO:**
         - Evite composições que pareçam "banco de imagens" ou clichês de marketing.
         - Use superfícies com textura rica: madeira de demolição, cimento queimado, pedra bruta, tecidos de linho amassados, metal envelhecido.
         - O ambiente deve complementar o produto de forma visceral e tátil.
      `;
    }

    const ultimatePrompt = `Fotografia de produto profissional e ultrarrealista do produto "${data.productName}", perfeitamente centralizado em um fundo infinito totalmente branco (#ffffff). **É crucial que a embalagem, incluindo rótulo, formato e cores, seja uma réplica exata da imagem de referência fornecida.** Iluminação de estúdio cinematográfica, suave e difusa para destacar os detalhes sem criar sombras duras. Foco nítido, textura impecável, qualidade 8k. A imagem deve ser limpa, premium e ideal para a capa de um anúncio no Mercado Livre.`;

    const basePrompt = `
      Você é um diretor de arte e especialista em marketing visual para e-commerce.
      Sua missão é criar 5 prompts de imagem para o produto "${data.productName}", que sejam visualmente impactantes, criativos e que contem uma história, aumentando o desejo de compra. Estes prompts são para as imagens secundárias do anúncio.

      INFORMAÇÕES FORNECIDAS:
      - Marca do Produto: ${brandName}
      ${colorInstruction}
      - Imagem de referência do produto: A embalagem nas imagens geradas deve ser 100% idêntica à da referência.
      ${logoInstruction}

      ${brandSpecificInstructions}

      DIRETRIZES CRIATIVAS ESTRATÉGICAS:
      1.  **FIDELIDADE ABSOLUTA AO PRODUTO:** Esta é a regra mais importante. A embalagem do produto (formato, rótulo, cores, proporções) nas imagens geradas deve ser uma réplica exata da imagem de referência. A criatividade deve estar no cenário, iluminação e contexto, NUNCA na aparência do produto.
      2.  **STORYTELLING VISUAL:** Crie cenas que demonstrem um benefício ou um contexto de uso.
      3.  **ILUMINAÇÃO E ATMOSFERA:** Use descrições de iluminação que criem impacto.
      4.  **COMPOSIÇÃO DINÂMICA:** Sugira ângulos e composições que fujam do comum.
      5.  **CENÁRIOS REALISTAS E IMPACTANTES:** Os cenários devem ser relevantes e visualmente ricos.

      REGRAS DE FORMATAÇÃO:
      - Gere EXATAMENTE 5 prompts.
      - Cada prompt deve ser apenas o texto descritivo para gerar a imagem, um por linha.
      - NÃO adicione numeração, títulos como "Prompt 1:", ou qualquer texto introdutório/conclusivo.
      - O tom deve ser profissional e evocar alta qualidade (use termos como "resolução 8k", "fotorrealista", "detalhes nítidos", "lentes de cinema").
      - Responda TUDO em português do Brasil.
    `;

    parts.push({ text: basePrompt });
    
    try {
      const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: { parts: parts as any },
      });
      
      const resultText = response.text;
      const creativePrompts = resultText ? resultText.split('\n').map(p => p.trim()).filter(p => p !== '') : [];

      return [ultimatePrompt, ...creativePrompts];

    } catch (error) {
      console.error("Erro ao chamar a API Gemini:", error);
      throw new Error("Ocorreu um erro ao gerar os prompts. Por favor, verifique o console e tente novamente.");
    }
};

export const generateSellerAdPrompt = async (context: string): Promise<string> => {
    if (!process.env.API_KEY) {
      throw new Error("A variável de ambiente API_KEY não está definida.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      Você é um diretor de arte sênior e estrategista de marca, especialista em criar conceitos visuais que geram confiança e autoridade.
      Sua missão é criar um único prompt de imagem, extremamente detalhado e evocativo, para ser usado em uma ferramenta de geração de imagem por IA.
      
      **CONTEXTO DO VENDEDOR:**
      ${context}

      **REGRAS:**
      - Gere APENAS o texto do prompt em português.
      - Foco em transmitir confiança, profissionalismo e autenticidade.
      - Evite clichês de banco de imagens.
      - Prompt único, sem introduções.
    `;

    try {
      const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: prompt,
      });
      
      return response.text?.trim() || "";

    } catch (error) {
      console.error("Erro ao chamar a API Gemini para o anúncio de credibilidade:", error);
      throw new Error("Ocorreu um erro ao gerar o prompt do anúncio. Por favor, verifique o console e tente novamente.");
    }
};