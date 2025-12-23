
import { GoogleGenAI, Type } from "@google/genai";

export const generateBaseTexture = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Menggunakan gemini-3-pro-image-preview untuk hasil yang jauh lebih realistis dan detail
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [
        {
          text: `Ultra-realistic, professional PBR material scan of: ${prompt}. 
          Requirements: 8k resolution details, perfectly seamless tiling, flat global illumination, 
          macro photography style, high contrast surface details, top-down orthographic view, 
          no shadows, no perspective distortion. Industry standard for high-end game development.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "2K" // Mengaktifkan resolusi 2K untuk kualitas HD
      }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("Failed to generate HD texture image.");
};

export const analyzeTextureMetadata = async (imageUrl: string): Promise<{
  suggestedRoughness: number;
  suggestedMetalness: number;
}> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: imageUrl.split(',')[1],
            mimeType: 'image/png'
          }
        },
        {
          text: "Analyze this high-resolution texture. Output JSON with suggestedRoughness and suggestedMetalness."
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedRoughness: {
            type: Type.NUMBER,
            description: "Suggested roughness value (0.0 to 1.0)"
          },
          suggestedMetalness: {
            type: Type.NUMBER,
            description: "Suggested metalness value (0.0 to 1.0)"
          },
        },
        required: ["suggestedRoughness", "suggestedMetalness"],
      }
    }
  });

  try {
    const text = response.text;
    const data = JSON.parse(text || '{}');
    return {
      suggestedRoughness: typeof data.suggestedRoughness === 'number' ? data.suggestedRoughness : 0.6,
      suggestedMetalness: typeof data.suggestedMetalness === 'number' ? data.suggestedMetalness : 0.0
    };
  } catch (e) {
    return { suggestedRoughness: 0.6, suggestedMetalness: 0.0 };
  }
};
