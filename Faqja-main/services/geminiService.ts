import { GoogleGenerativeAI } from "@google/generative-ai";
import dbService from "./dbService";

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

class GeminiService {
  async askQuestion(question: string) {
    if (!question || question.trim().length < 3) {
      return "Pyetja nuk është e vlefshme.";
    }

    const result = await model.generateContent(question);
    return result.response.text();
  }

  async askWithFile(question: string, fileId: string) {
    const file = await dbService.getFileById(fileId);
    if (!file) return "Skedari nuk u gjet.";

    const prompt = `${question}\n\nReferoju këtij dokumenti:\n${file.text}`;
    const result = await model.generateContent(prompt);

    return result.response.text();
  }
}

export default new GeminiService();
