import { GoogleGenerativeAI } from "@google/generative-ai";
import { StoredFile } from "../types";
import { dbService } from "./dbService";

const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("❌ Mungon VITE_GEMINI_API_KEY");
  return new GoogleGenerativeAI(apiKey);
};

const extractText = (resp: any): string => {
  if (!resp) return "";
  if (typeof resp.text === "function") return resp.text();
  return resp.text ?? "";
};

const filesToParts = async (files: StoredFile[]) => {
  const out: any[] = [];
  for (const f of files) {
    let blob = await dbService.getFileContent(f.id);
    if (!blob) blob = await dbService.hydrateFile(f.id);
    if (!blob) continue;
    const base64 = await dbService.blobToBase64(blob);
    out.push({
      inlineData: { mimeType: f.type || "application/pdf", data: base64 },
    });
  }
  return out;
};

/* ==========  1) CONSULT LIBRARIAN  ========== */
export const consultLibrarian = async (query: string, laws: StoredFile[]) => {
  if (!laws.length) return [];
  const ai = getAI();
  const prompt = `
    You are a legal librarian.
    User question: "${query}"
    Files available:
    ${laws.map(l => l.id).join("\n")}
    Return a JSON array of max 3 filenames that are relevant.
  `;

  const result = await ai.run({
    model: "gemini-1.5-flash",
    prompt,
    responseMimeType: "application/json"
  });

  const txt = extractText(result);
  try {
    const arr = JSON.parse(txt);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

/* ==========  2) CONSULT LAWYER  ========== */
export const consultLawyer = async (
  query: string,
  caseFiles: StoredFile[],
  laws: StoredFile[],
  history: string
) => {
  const ai = getAI();
  const caseParts = await filesToParts(caseFiles);
  const lawParts = await filesToParts(laws);

  const response = await ai.run({
    model: "gemini-1.5-flash-latest",
    systemInstruction: `
      Ti je një jurist AI.
      Përgjigju shqip, qartë dhe me referenca ligjore kur të jetë e mundur.
    `,
    input: [
      ...caseParts,
      ...lawParts,
      { text: `Historik:\n${history}\nPyetja: ${query}` }
    ],
    temperature: 0.3
  });

  return extractText(response) || "Nuk u gjenerua përgjigje.";
};

/* ==========  3) Wrapper për App.tsx  ========== */
export const askGemini = consultLawyer;
