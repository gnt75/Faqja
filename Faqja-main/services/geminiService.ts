import { GoogleGenerativeAI } from "@google/generative-ai";
import { StoredFile } from "../types";
import { dbService } from "./dbService";

// INIT Gemini
const getAI = () => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) throw new Error("❌ Mungon VITE_API_KEY");

  return new GoogleGenerativeAI(apiKey);
};

// Convert files to inline parts for Gemini
const filesToParts = async (files: StoredFile[]) => {
  const parts: any[] = [];

  for (const file of files) {
    try {
      let blob = await dbService.getFileContent(file.id);
      if (!blob) blob = await dbService.hydrateFile(file.id);
      if (!blob) continue;

      const base64 = await dbService.blobToBase64(blob);
      parts.push({
        inlineData: {
          mimeType: file.type || "application/pdf",
          data: base64,
        },
      });
    } catch (err) {
      console.error("File prep failed:", err);
    }
  }

  return parts;
};

// Extract parsed text from Gemini
const extractText = async (resp: any) => {
  if (!resp) return "";
  if (typeof resp.response?.text === "function") return resp.response.text();
  if (typeof resp.text === "function") return resp.text();
  return resp.text || "";
};

/** 📚 LIBRARIAN — Identifies relevant laws */
export const consultLibrarian = async (
  query: string,
  laws: StoredFile[]
): Promise<string[]> => {
  if (!laws.length) return [];

  const ai = getAI();
  const model = ai.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const manifest = laws.map((l) => `- ${l.id}`).join("\n");

  const prompt = `
  You are a Legal Document Selector.
  User query: "${query}"
  Available documents:
  ${manifest}

  Return ONLY a JSON array of up to 3 IDs.
  Example: ["Kodi Civil.pdf"]
  `;

  try {
    const response = await model.generateContent(prompt);
    let text = await extractText(response);

    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const match = text.match(/\[.*\]/s);
    if (match) text = match[0];
    const arr = JSON.parse(text);

    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

/** ⚖️ LAWYER — Full legal answer */
export const consultLawyer = async (
  query: string,
  caseFiles: StoredFile[],
  relevantLaws: StoredFile[],
  chat: string
): Promise<string> => {
  try {
    const ai = getAI();
    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { temperature: 0.3 },
      systemInstruction: `
        Ti je "Juristi im", një ekspert ligjor shqiptar.
        - Përdor referenca nga dokumentet kur është e mundur.
        - Përgjigju në shqip.
        - Përdor Markdown.
      `,
    });

    const parts = [
      ...(await filesToParts(caseFiles)),
      ...(await filesToParts(relevantLaws)),
      { text: `Historia e chatit:\n${chat}\n\nPyetja:\n${query}` },
    ];

    const response = await model.generateContent({ contents: parts });
    return (await extractText(response)) || "Nuk gjeta përgjigje.";
  } catch (e) {
    console.error("⚠️ Lawyer Error:", e);
    return "Ndodhi një gabim gjatë analizimit.";
  }
};
