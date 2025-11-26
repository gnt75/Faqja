import { GoogleGenerativeAI } from "@google/generative-ai";
import { StoredFile } from "../types";
import { dbService } from "./dbService";

const getAI = () => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    console.error("❌ Mungon VITE_API_KEY në environment.");
    throw new Error("Mungon konfigurimi i Gemini API key.");
  }

  return new GoogleGenerativeAI(apiKey);
};

// Convert files to Gemini inline parts
const filesToParts = async (files: StoredFile[]) => {
  const parts = await Promise.all(files.map(async (file) => {
    try {
      let blob = await dbService.getFileContent(file.id);
      if (!blob) blob = await dbService.hydrateFile(file.id);
      if (!blob) return null;

      const base64 = await dbService.blobToBase64(blob);
      return {
        inlineData: {
          mimeType: file.type || "application/pdf",
          data: base64,
        },
      };
    } catch (err) {
      console.error("❌ File conversion error:", file.id, err);
      return null;
    }
  }));

  return parts.filter((p) => p !== null) as any[];
};

// Safe extractor for Gemini responses
const extractText = (res: any): string | undefined => {
  try {
    return typeof res.text === "function" ? res.text() : res.text;
  } catch {
    return undefined;
  }
};

// -----------------------------------------------
// LIBRARIAN
// -----------------------------------------------
export const consultLibrarian = async (
  query: string,
  availableLaws: StoredFile[]
): Promise<string[]> => {
  if (availableLaws.length === 0) return [];

  const ai = getAI();
  const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

  const manifest = availableLaws.map((l) => `- ${l.id}`).join("\n");

  const prompt = `
    You are a Legal Librarian AI.
    User query: "${query}"

    Documents:
    ${manifest}

    Return ONLY a JSON array of filenames.
  `;

  try {
    const result = await model.generateContent(prompt);
    let text = extractText(result);

    if (!text) return [];

    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const match = text.match(/\[.*\]/s);
    if (match) text = match[0];

    return JSON.parse(text);
  } catch (err) {
    console.error("📚 Librarian error:", err);
    return [];
  }
};

// -----------------------------------------------
// LAWYER
// -----------------------------------------------
export const consultLawyer = async (
  query: string,
  caseFiles: StoredFile[],
  relevantLaws: StoredFile[],
  chatHistory: string
): Promise<string> => {
  const ai = getAI();
  const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const caseParts = await filesToParts(caseFiles);
    const lawParts = await filesToParts(relevantLaws);

    const systemInstruction = `
      Ti je "Juristi im", ekspert ligjor AI.
      - Përgjigju në shqip.
      - Cito nenet kur është e mundur.
      - Përdor Markdown.
    `;

    const contents = [
      ...caseParts,
      ...lawParts,
      {
        text: `Chat History:\n${chatHistory}\n\nPyetja: ${query}`,
      },
    ];

    const result = await model.generateContent({
      contents,
      systemInstruction,
      temperature: 0.3,
    });

    return extractText(result) || "Nuk munda të gjeneroj përgjigje.";
  } catch (err) {
    console.error("⚖️ Lawyer Error:", err);
    return "Ndodhi një gabim gjatë analizimit.";
  }
};
