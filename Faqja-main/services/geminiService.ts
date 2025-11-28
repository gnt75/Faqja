import { GoogleGenerativeAI } from "@google/generative-ai";
import { StoredFile } from "../types";
import { dbService } from "./dbService";

const getAI = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error("❌ Mungon VITE_GEMINI_API_KEY");
  return new GoogleGenerativeAI(key);
};

// ===== Helper për file =====
const filesToParts = async (files: StoredFile[]) => {
  const result = [];
  for (const f of files) {
    let blob = await dbService.getFileContent(f.id);
    if (!blob) blob = await dbService.hydrateFile(f.id);
    if (!blob) continue;

    const base64 = await dbService.blobToBase64(blob);
    result.push({
      inlineData: {
        mimeType: f.type || "application/pdf",
        data: base64,
      },
    });
  }
  return result;
};

// ===== Librarian =====
export const consultLibrarian = async (
  query: string,
  availableLaws: StoredFile[]
): Promise<string[]> => {
  if (!availableLaws.length) return [];

  const ai = getAI();
  const manifest = availableLaws.map(l => `- ${l.id}`).join("\n");

  const prompt = `
  You are a Legal Librarian.
  User query: "${query}"
  Available documents:
  ${manifest}
  Return a JSON list of filenames (max 3) or [] if none match.
  `;

  const res = await ai.generateContent({
    model: "gemini-1.5-flash",
    contents: [{ parts: [{ text: prompt }] }],
  });

  const text = res.response.text().trim();
  const match = text.match(/\[.*\]/s);
  return match ? JSON.parse(match[0]) : [];
};

// ===== Lawyer =====
export const consultLawyer = async (
  query: string,
  caseFiles: StoredFile[],
  laws: StoredFile[],
  history: string
): Promise<string> => {
  const ai = getAI();

  const caseParts = await filesToParts(caseFiles);
  const lawsParts = await filesToParts(laws);

  const intro = `
  Ti je "Juristi im".
  Pyetja: ${query}
  Historia:
  ${history}
  `;

  const res = await ai.generateContent({
    model: "gemini-1.5-flash",
    contents: [
      {
        parts: [
          { text: intro },
          ...caseParts.map(p => ({ inlineData: p.inlineData })),
          ...lawsParts.map(p => ({ inlineData: p.inlineData })),
        ],
      },
    ],
    generationConfig: { temperature: 0.3 },
  });

  return res.response.text();
};
