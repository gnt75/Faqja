import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Model bazë
const model: GenerativeModel = genAI.getGenerativeModel({ model: "gemini-pro" });

// START CHAT
export async function sendMessage(message: string) {
  try {
    const chat = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.3
      }
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    return response.text();
  } catch (err) {
    console.error("Gemini error:", err);
    return "Pata një problem gjatë përpunimit të kërkesës suaj. Ju lutem provoni përsëri.";
  }
}

// GENERATE TEXT DIRECT
export async function ask(text: string) {
  try {
    const result = await model.generateContent(text);
    return result.response.text();
  } catch (err) {
    console.error("Gemini error:", err);
    return "Kërkesa nuk u procesua.";
  }
}
