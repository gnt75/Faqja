import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { StoredFile } from "../types";
import { dbService } from "./dbService";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_API_KEY);

/* -------------------------------- HELPERS -------------------------------- */

const extractText = async (response: any): Promise<string> => {
  const out = await response.response.text();
  return out ?? "";
};

const fileToPart = async (file: StoredFile) => {
  try {
    let blob = await dbService.getFileContent(file.id);
    if (!blob) blob = await dbService.hydrateFile(file.id);
    if (!blob) return null;

    const b64 = await dbService.blobToBase64(blob);

    return {
      inlineData: { mimeType: file.type || "application/pdf", data: b64 },
    };
  } catch (e) {
    console.error("File conversion error:", e);
    return null;
  }
};

/* ------------------------------ LIBRARIAN AI ------------------------------ */

export const consultLibrarian = async (
  query: string,
  laws: StoredFile[]
): Promise<string[]> => {
  if (!laws.length) return [];

  const manifest = laws.map((l) => `- ${l.id}`).join("\n");

  const prompt = `
Ti je Arkivisti Kryesor i një Zyre Ligjore.
Pyetja e përdoruesit: "${query}"

Dokumentet në dispozicion:
${manifest}

Detyrë:
Zgjidh maksimumi 3 dokumente që DUHEN lexuar për të përgjigjur pyetjes.
Kthe vetëm një JSON array të tillë: ["Kodi Civil.pdf", "Ligji XXX.pdf"]
Nëse asnjë dokument nuk është relevant, kthe [].
`;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent(prompt);
  const txt = await extractText(result);

  try {
    const match = txt.match(/\[.*\]/s);
    return match ? JSON.parse(match[0]) : [];
  } catch {
    return [];
  }
};

/* ------------------------------ LAWYER AI -------------------------------- */

export const consultLawyer = async (
  query: string,
  caseFiles: StoredFile[],
  laws: StoredFile[],
  history: string
): Promise<string> => {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ],
  });

  const fileParts = (await Promise.all(caseFiles.map(fileToPart))).filter(Boolean);
  const lawParts = (await Promise.all(laws.map(fileToPart))).filter(Boolean);

  const finalPrompt = `
Ti je "Juristi Im" – një ekspert ligjor shqiptar.
Konteksti:
${history}

Pyetja: ${query}

Udhëzime:
- Përdor bazën ligjore nëse ekziston
- Cito nenet e ligjit
- Përdor tone profesionale
`;

  const response = await model.generateContent([
    { role: "user", parts: [...fileParts, ...lawParts, { text: finalPrompt }] },
  ]);

  return await extractText(response);
};
