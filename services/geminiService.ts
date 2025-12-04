import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface ImageAnalysisResult {
  title: string;
  prompt: string;
  color: string;
}

/**
 * Analyzes an image to generate a poetic title, a nostalgic prompt, and a color code.
 */
export const analyzeImageForBead = async (base64Image: string, mimeType: string = 'image/jpeg'): Promise<ImageAnalysisResult> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: `Analyze this image to create a "memory bead". 
            1. Provide a short, poetic, abstract title (max 3 words) in the style of a distinct memory (e.g., "Summer Rain", "Lost Key", "Grandma's Chair").
            2. Create a gentle, nostalgic question/prompt asking the user to expand on the story behind this object.
            3. Extract a single hex color code that represents the "mood" of the object (soft, pastel preferred).
            Return JSON.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            prompt: { type: Type.STRING },
            color: { type: Type.STRING },
          },
          required: ["title", "prompt", "color"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as ImageAnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Fallback if AI fails
    return {
      title: "Untitled Fragment",
      prompt: "What does this object remind you of?",
      color: "#a3b1c6"
    };
  }
};

/**
 * Generates reflective follow-up questions based on an existing story.
 */
export const generateReflectionQuestions = async (story: string, context: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `The user has a memory bead titled "${context}". Their story is: "${story}".
      Generate 3 distinct, short, deep, and evocative questions to help them recall more sensory details or emotional context. 
      Examples: "What was the weather like?", "Who was standing next to you?", "Did this change how you see yourself?".
      Max 15 words per question. Return as a JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Gemini Reflection Error:", error);
    return [
      "What details are you forgetting?",
      "How did you feel in that exact moment?",
      "Who else was there with you?"
    ];
  }
};