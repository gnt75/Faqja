import { GoogleGenerativeAI } from "@google/generative-ai";
import { StoredFile } from "../types";
import { dbService } from "./dbService";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_API_KEY);

export const askGemini = async (question: string): Promise<string> => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(question);
  return result.response.text();
};

const fileToPart = async (file: StoredFile) => {
  const blob = await dbService.hydrateFile(file.id);
  const base64 = await dbService.blobToBase64(blob);
  return {
    inlineData: {
      mimeType: file.type,
      data: base64,
    },
  };
};

export const consultLibrarian = async (
  query: string,
  availableLaws: StoredFile[]
): Promise<string[]> => {
  if (!availableLaws.length) return [];

  const prompt = `
  You are a legal librarian AI. Select up to 3 relevant documents from:
  ${availableLaws.map((l) => l.id).join("\n")}
  Return ONLY a JSON array of filenames, e.g. ["Kodi Penal.pdf"]
  Query: ${query}`;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  try {
    return JSON.parse(text.match(/\[.*\]/s)?.[0] || "[]");
  } catch {
    return [];
  }
};

export const consultLawyer = async (
  question: string,
  caseFiles: StoredFile[],
  laws: StoredFile[],
  history: string
): Promise<string> => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const caseParts = await Promise.all(caseFiles.map(fileToPart));
  const lawParts = await Promise.all(laws.map(fileToPart));

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          ...caseParts,
          ...lawParts,
          { text: `History:\n${history}\nQuestion:\n${question}` },
        ],
      },
    ],
    generationConfig: { temperature: 0.3 },
  });

  return result.response.text();
};
