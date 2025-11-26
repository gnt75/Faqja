import { GoogleGenerativeAI, InlineDataPart } from "@google/generative-ai";
import { StoredFile } from "../types";
import { dbService } from "./dbService";

// ===============================
// INIT GEMINI CLIENT
// ===============================

const getAI = () => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    console.error("❌ Mungon VITE_API_KEY.");
    throw new Error("Konfigurimi i API key mungon.");
  }

  return new GoogleGenerativeAI(apiKey);
};

// ===============================
// PREPARE PDF PARTS FOR GEMINI
// ===============================

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
        } as InlineDataPart;
      }
    } catch (err) {
      console.error(`❌ Error preparing ${file.name}`, err);
    }
    return null;
  });

  const parts = await Promise.all(promises);
  return parts.filter((p): p is InlineDataPart => p !== null);
};

// ===============================
// SAFE TEXT EXTRACTOR
// ===============================

const extractText = (response: any): string | undefined => {
  try {
    if (!response) return;
    if (typeof response.text === "function") return response.text();
    return response.text;
  } catch {
    return undefined;
  }
};

// ===============================
// LIBRARIAN — SELECT RELEVANT PDFs
// ===============================

export const consultLibrarian = async (
  query: string,
  availableLaws: StoredFile[]
): Promise<string[]> => {
  if (availableLaws.length === 0) return [];

  const ai = getAI();
  const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

  const fileList = availableLaws.map((l) => `- ${l.id}`).join("\n");

  const prompt = `
    You are a Legal Librarian AI.
    User Query: "${query}"

    Available Documents:
    ${fileList}

    Task:
    - Choose up to 3 filenames relevant to the query.
    - Return ONLY a JSON array of strings.
    Example: ["Kodi Civil.pdf", "Ligji 123.pdf"]
  `;

  try {
    const result = await model.generateContent(prompt);

    let text = extractText(result);
    if (!text) return [];

    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) text = jsonMatch[0];

    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("📚 Librarian Error:", err);
    return [];
  }
};

// ===============================
// LAWYER — ANSWER USER QUESTION
// ===============================

export const consultLawyer = async (
  query: string,
  caseFiles: StoredFile[],
  relevantLaws: StoredFile[],
  chatHistory: string
): Promise<string> => {
  const ai = getAI();
  const model = ai.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: `
      Ti je "Juristi im", ekspert ligjor.

      - Përgjigju në Shqipe.
      - Cito nenet nga dokumentet PDF kur është e mundur.
      - Shpjego qartë, me pika, pa fjalë boshe.
      - Nëse dokumentet nuk mjaftojnë, thuaje hapur.
    `,
  });

  try {
    const caseParts = await filesToParts(caseFiles);
    const lawParts = await filesToParts(relevantLaws);

    const parts = [
      ...caseParts,
      ...lawParts,
      {
        text: `Konteksti:\n${chatHistory}\n\nPyetja: ${query}`,
      },
    ];

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      generationConfig: {
        temperature: 0.3,
      },
    });

    return extractText(result) || "Nuk u gjenerua përgjigje.";
  } catch (err) {
    console.error("⚖️ Lawyer Full Error:", err);
    return "Ndodhi një gabim gjatë analizimit. Mund të jetë dokument i madh, format i pasuportuar ose problem me serverin.";
  }
};
