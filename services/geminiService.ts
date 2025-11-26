import { GoogleGenAI } from "@google/genai";
import { StoredFile } from "../types";
import { dbService } from "./dbService";

const getAI = () => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    console.error("❌ Mungon VITE_API_KEY në environment.");
    throw new Error("Mungon konfigurimi i Gemini API key.");
  }
  return new GoogleGenAI({ apiKey });
};

// -------------------------------------------
// Convert Files to Gemini Inline Parts
// -------------------------------------------
const filesToParts = async (files: StoredFile[]) => {
  const promises = files.map(async (file) => {
    try {
      let blob = await dbService.getFileContent(file.id);
      if (!blob) blob = await dbService.hydrateFile(file.id);

      if (blob) {
        const base64 = await dbService.blobToBase64(blob);
        return {
          inlineData: {
            mimeType: file.type || "application/pdf",
            data: base64,
          },
        };
      }
    } catch (e) {
      console.error(`❌ Failed to prepare file ${file.name}:`, e);
    }
    return null;
  });

  const results = await Promise.all(promises);
  return results.filter((x): x is { inlineData: any } => x !== null);
};

const extractText = (response: any): string | undefined => {
  if (!response) return;
  if (typeof response.text === "function") return response.text();
  return response.text;
};

// -------------------------------------------
// LIBRARIAN — Finds the correct law files
// -------------------------------------------
export const consultLibrarian = async (
  query: string,
  availableLaws: StoredFile[]
): Promise<string[]> => {
  if (availableLaws.length === 0) return [];

  const ai = getAI();

  const manifest = availableLaws.map((l) => `- ID: ${l.id}`).join("\n");
  const prompt = `
    You are the Head Librarian of a Law Firm.
    User Query: "${query}"

    Available Legal Documents:
    ${manifest}

    Return ONLY a JSON array of up to 3 filenames.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    let text = extractText(response) || "";
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

    const match = text.match(/\[.*\]/s);
    if (match) text = match[0];

    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("📚 Librarian Error:", error);
    return [];
  }
};

// -------------------------------------------
// LAWYER — Reads user files + law files
// -------------------------------------------
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
      Ti je "Juristi im", një Konsulent i Lartë Ligjor AI.

      - Përgjigju vetëm në GJUHËN SHQIPE.
      - Cito nenet specifike.
      - Përdor Markdown (bold, lista).
    `;

    const contentParts = [
      ...caseParts,
      ...lawParts,
      { text: `Biseda:\n${chatHistory}\n\nPyetja: ${query}` },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts: contentParts }],
      config: { systemInstruction, temperature: 0.3 },
    });

    return extractText(response) || "Nuk munda të gjeneroj përgjigje.";
  } catch (error) {
    console.error("⚖️ Lawyer Error Full Details:", error);
    return "Ndodhi një gabim gjatë analizimit.";
  }
};
