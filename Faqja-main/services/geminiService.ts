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

// KONVERTON FILET NË PARTS PËR GEMINI
const filesToParts = async (files: StoredFile[]) => {
  const out: any[] = [];
  for (const file of files) {
    let blob = await dbService.getFileContent(file.id);
    if (!blob) blob = await dbService.hydrateFile(file.id);
    if (!blob) continue;

    const base64 = await dbService.blobToBase64(blob);
    out.push({
      inlineData: {
        mimeType: file.type || "application/pdf",
        data: base64,
      }
    });
  }
  return out;
};

// NXJERR TEKSTIN NGA PËRGJIGJA
const extractText = async (response: any): Promise<string> => {
  try {
    return (await response.response.text()) ?? "";
  } catch {
    return "";
  }
};

// ------------------ LIBRARIAN ------------------
export const consultLibrarian = async (
  query: string,
  availableLaws: StoredFile[]
): Promise<string[]> => {
  if (!availableLaws.length) return [];

  const ai = getAI();
  const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

  const manifest = availableLaws.map(l => `- ${l.id}`).join("\n");

  const prompt = `
  You are the Head Librarian of a Law Firm.
  Query: "${query}"
  Available documents:
  ${manifest}
  Return a JSON array of up to 3 filenames relevant to the query.
  If none, return [].
  `;

  try {
    const result = await model.generateContent(prompt);
    const raw = await extractText(result);

    const match = raw.match(/\[.*\]/s);
    return match ? JSON.parse(match[0]) : [];
  } catch (e) {
    console.error("📚 Librarian Error:", e);
    return [];
  }
};

// ------------------ LAWYER ------------------
export const consultLawyer = async (
  query: string,
  caseFiles: StoredFile[],
  relevantLaws: StoredFile[],
  history: string
): Promise<string> => {
  const ai = getAI();
  const model = ai.getGenerativeModel({ model: "gemini-1.5-pro" });

  try {
    const parts = [
      ...await filesToParts(caseFiles),
      ...await filesToParts(relevantLaws),
      { text: `Konteksti: ${history}\nPyetja: ${query}` }
    ];

    const response = await model.generateContent({
      contents: [{ role: "user", parts }],
    });

    const out = await extractText(response);
    return out || "Nuk munda të gjeneroj një përgjigje.";
  } catch (e) {
    console.error("⚖️ Lawyer Error:", e);
    return "Ndodhi një gabim gjatë analizimit. Provoni sërish.";
  }
};
