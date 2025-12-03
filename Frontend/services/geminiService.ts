import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

// Helper to check if API key is present (soft check for UI)
export const hasApiKey = !!API_KEY;

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateItemContent = async (categoryName: string, promptContext: string): Promise<{ title: string, content: string, footer: string }> => {
  if (!hasApiKey) {
    throw new Error("API Key missing");
  }

  const model = "gemini-2.5-flash";
  
  const prompt = `
    You are assisting a user to create content for a kiosk button item.
    The category is: "${categoryName}".
    The user context/instruction is: "${promptContext}".
    
    Please generate a creative Title, a Main Content body (can be a menu list, a fortune text, or a ticket description), and a short Footer text.
    Return JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            footer: { type: Type.STRING },
          },
          required: ["title", "content", "footer"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini generation error:", error);
    throw error;
  }
};