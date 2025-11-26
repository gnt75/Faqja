import { GoogleGenAI } from "@google/genai";
import { StoredFile } from "../types";
import { dbService } from "./dbService";

const getAI = () => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    console.error("❌ Mungon VITE_API_KEY!");
    throw new Error("Mungon Gemini API Key.");
  }
  return new GoogleGenAI({ apiKey });
};

// Convert Blob -> Base64 -> Gemini part
const filesToParts = async (files: StoredFile[]) => {
  const jobs = files.map(async (file) => {
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
      console.error("Blob prepare error:", err);
      return null;
    }
  });

  const result = await Promise.all(jobs);
  return result.filter((x) => x !== null);
};

const extractText = (response: any): string | undefined => {
  if (!response) return;
  if (typeof response.text === "function") return response.text();
  return response.text;
};

// -------------------------------------------------------------
// LIBRARIAN
// -------------------------------------------------------------
export const consultLibrarian = async (
  query: string,
  availableLaws: StoredFile[]
): Promise<string[]> => {
  if (availableLaws.length === 0) return [];

  const ai = getAI();

  const manifest = availableLaws.map((l) => `- ${l.id}`).join("\n");

  const prompt = `
You are a legal librarian AI.
User question: "${query}"

Available PDFs:
${manifest}

Return ONLY a JSON array with up to 3 filenames that best match the query.
Example: ["Kodi Civil.pdf"].
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ text: prompt }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    let text = extractText(response);
    if (!text) return [];

    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const arrMatch = text.match(/\[.*\]/s);
    if (arrMatch) text = arrMatch[0];

    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Librarian error:", err);
    return [];
  }
};

// -------------------------------------------------------------
// LAWYER
// -------------------------------------------------------------
export const consultLawyer = async (
  query: string,
  caseFiles: StoredFile[],
  relevantLaws: StoredFile[],
  chatHistory: string
): Promise<string> => {
  const ai = getAI();

  try {
    const caseParts = await filesToParts(caseFiles);
    const lawParts = await filesToParts(relevantLaws);

    const systemInstruction = `
Ti je "Juristi im", ekspert i avancuar ligjor.
Pëgjigju në shqip, qartë, me referenca ku ka.
`;

    const parts = [
      ...caseParts,
      ...lawParts,
      { text: `Historia:\n${chatHistory}\n\nPyetja: ${query}` },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    return extractText(response) || "Nuk munda të gjeneroj përgjigje.";
  } catch (err) {
    console.error("Lawyer error:", err);
    return "Ndodhi një gabim gjatë analizimit.";
  }
};
