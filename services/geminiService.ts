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

// --------------------------
// Convert PDFs → inlineData
// --------------------------
const filesToParts = async (files: StoredFile[]) => {
  const tasks = files.map(async (file) => {
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
    } catch (err) {
      console.error(`❌ Error preparing file ${file.name}:`, err);
    }
    return null;
  });

  return (await Promise.all(tasks)).filter(Boolean) as any[];
};

const extractText = (res: any): string => {
  if (!res) return "";
  if (typeof res.text === "function") return res.text();
  return res.text ?? "";
};

// ----------------------------------------
//  LIBRARIAN → zgjedh 3 dokumente
// ----------------------------------------
export const consultLibrarian = async (
  query: string,
  availableLaws: StoredFile[]
): Promise<string[]> => {
  if (availableLaws.length === 0) return [];

  const ai = getAI();

  const manifest = availableLaws.map((l) => `- ${l.id}`).join("\n");

  const prompt = `
    You are the Head Librarian of a Law Firm.
    User Query: "${query}"

    Available Documents:
    ${manifest}

    Return ONLY a JSON array with filenames.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-pro-latest",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    let text = extractText(response);

    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

    const match = text.match(/\[.*\]/s);
    if (match) text = match[0];

    return JSON.parse(text);
  } catch (err) {
    console.error("📚 Librarian Error:", err);
    return [];
  }
};

// ----------------------------------------
//  LAWYER → analizon pyetjen + dokumentet
// ----------------------------------------
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

    const instruction = `
      Ti je "Juristi im", ekspert ligjor shqiptar.
      Përdor dokumentet e ngarkuara kur është e mundur.
      Përgjigju vetëm në shqip, me citime të sakta.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-pro-latest",
      contents: [
        {
          role: "user",
          parts: [
            ...caseParts,
            ...lawParts,
            { text: `Biseda:\n${chatHistory}\n\nPyetja: ${query}` },
          ],
        },
      ],
      config: {
        systemInstruction: instruction,
        temperature: 0.3,
      },
    });

    return extractText(response);
  } catch (err) {
    console.error("⚖️ Lawyer Error:", err);
    return "Ndodhi një gabim gjatë analizimit.";
  }
};
