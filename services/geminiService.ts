import { GoogleGenAI } from "@google/genai";
import { GradeParams } from "../types";

const getApiKey = (): string | undefined => {
  return process.env.API_KEY;
};

const cleanBase64 = (dataUrl: string) => {
  return dataUrl.split(',')[1] || dataUrl;
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async <T>(fn: () => Promise<T>, retries = 4, delay = 4000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error.status === 429 || 
                        error.code === 429 || 
                        error.message?.includes('429') || 
                        error.message?.includes('RESOURCE_EXHAUSTED');
    
    if (retries > 0 && isRateLimit) {
      console.warn(`Rate limit exceeded. Retrying in ${delay}ms...`);
      await wait(delay);
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const checkApiKey = async (): Promise<boolean> => {
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        return await window.aistudio.hasSelectedApiKey();
    }
    return false;
};

export const requestApiKey = async (): Promise<void> => {
    if (window.aistudio && window.aistudio.openSelectKey) {
        await window.aistudio.openSelectKey();
    }
};

export const analyzeImage = async (base64Image: string, promptType: 'technical' | 'artistic' = 'technical'): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });
  const prompt = promptType === 'technical' 
    ? "Analyze this film frame technically. Describe exposure, dynamic range, and color palette. 50 words max."
    : "Describe the artistic mood and color palette of this image in 1 sentence.";

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: cleanBase64(base64Image) } }
        ]
      }
    });
    return response.text || "Analysis failed.";
  });
};

/**
 * Generates numerical parameters for the WebGL engine instead of an image.
 */
export const generateGradingParams = async (description: string): Promise<Partial<GradeParams>> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });
  
  const systemPrompt = `You are a professional colorist. Translate the user's mood description into a JSON object of Color Decision List (CDL) values.
  
  Return valid JSON ONLY.
  Schema:
  {
    "lift": [r, g, b], // Shadows (-0.2 to 0.2)
    "gamma": [r, g, b], // Midtones (0.5 to 1.5)
    "gain": [r, g, b], // Highlights (0.5 to 1.5)
    "saturation": float, // 0.0 to 2.0
    "temperature": float, // -0.2 (cool) to 0.2 (warm)
    "tint": float // -0.1 (green) to 0.1 (magenta)
  }
  Default values: lift [0,0,0], gamma [1,1,1], gain [1,1,1], sat 1, temp 0, tint 0.`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: description,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json"
      }
    });
    
    try {
        const text = response.text || "{}";
        return JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse params", e);
        return {};
    }
  });
};