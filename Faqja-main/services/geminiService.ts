import { GoogleGenerativeAI } from "@google/generative-ai";
import { StoredFile } from "../types";
import { dbService } from "./dbService";

const apiKey = import.meta.env.VITE_API_KEY;
if (!apiKey) throw new Error("❌ Mungon VITE_API_KEY në Vercel.");

const genAI = new GoogleGenerativeAI(apiKey);
const flash = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const pro = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

// Convert files to Gemini inline parts
const filesToParts = async (files: StoredFile[]) => {
  const parts = await Promise.all(files.map(async f => {
    const blob = await dbService.getFileContent(f.id) ?? await dbService.hydrateFile(f.id);
    if (!blob) return null;

    const data = await dbService.blobToBase64(blob);
    return { inlineData: { mimeType: f.type ?? "application/pdf", data } };
  }));

  return parts.filter(Boolean) as { inlineData: { mimeType: string; data: string } }[];
};

// Extract text safely
const extract = async (res: any) => (typeof res.text === "function" ? await res.text() : res.text);

export const consultLibrarian = async (query: string, laws: StoredFile[]): Promise<string[]> => {
  if (laws.length === 0) return [];

  const manifest = laws.map(l => `- ${l.id}`).join("\n");
  const prompt = `
Ti je Arkivisti Ligjor.
Kerkesa: "${query}"

Dokumentet në dispozicion:
${manifest}

Kthe vetëm një JSON array
p.sh. ["Kodi Penal.pdf", "Ligji 8438.pdf"]
`;

  const res = await flash.generateContent(prompt);
  const text = (await extract(res)).replace(/```json|```/g, "").trim();
  try {
    const arr = JSON.parse(text.match(/\[.*\]/s)?.[0] ?? "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

export const consultLawyer = async (
  query: string,
  caseFiles: StoredFile[],
  laws: StoredFile[],
  history: string
): Promise<string> => {
  const caseParts = await filesToParts(caseFiles);
  const lawParts = await filesToParts(laws);

  const prompt = `
Ti je "Juristi im".
Historia: ${history}
Pyetja: ${query}
`;

  const res = await pro.generateContent({
    contents: [
      { text: prompt },
      ...caseParts,
      ...lawParts
    ]
  });

  return (await extract(res)) ?? "Nuk gjeta dot përgjigje.";
};
