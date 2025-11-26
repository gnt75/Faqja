import { GoogleGenAI } from "@google/genai";
import { StoredFile } from "../types";
import { dbService } from "./dbService";

const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.error("❌ Mungon VITE_GEMINI_API_KEY në environment.");
    throw new Error("Mungon konfigurimi i Gemini API key.");
  }

  return new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
};

// Helper to convert stored blobs to Gemini parts
const filesToParts = async (files: StoredFile[]) => {
  const promises = files.map(async (file) => {
    try {
      // 1) provo ta marrësh nga IndexedDB
      let blob = await dbService.getFileContent(file.id);

      // 2) nëse mungon, shkarko nga /ligje (hydrateFile)
      if (!blob) {
        blob = await dbService.hydrateFile(file.id);
      }

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
      console.error(`❌ Failed to prepare file ${file.name} for AI:`, e);
    }
    return null;
  });

  const results = await Promise.all(promises);
  return results.filter(
    (part): part is { inlineData: { mimeType: string; data: string } } =>
      part !== null
  );
};

const extractText = (response: any): string | undefined => {
  if (!response) return;
  if (typeof response.text === "function") {
    return response.text();
  }
  return response.text;
};

export const consultLibrarian = async (
  query: string,
  availableLaws: StoredFile[]
): Promise<string[]> => {
  if (availableLaws.length === 0) return [];

  const ai = getAI();

  const libraryManifest = availableLaws.map((l) => `- ID: ${l.id}`).join("\n");

  const prompt = `
    You are the Head Librarian of a Law Firm.
    User Query: "${query}"

    Available Legal Documents (Filenames):
    ${libraryManifest}

    Task: Identify exactly which documents from the list are strictly necessary to answer the query.
    Return ONLY a JSON array of the file IDs (filenames) strings.
    Example: ["Kodi Civil.pdf", "Ligji nr 123.pdf"]
    Select max 3 most relevant documents.
    If no document matches, return empty array [].
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash-latest",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    let text = extractText(response);
    if (!text) return [];

    // 1) hiq ```json ... ```
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

    // 2) nxirr vetëm array-n nëse ka tekst shtesë
    const match = text.match(/\[.*\]/s);
    if (match) {
      text = match[0];
    }

    const result = JSON.parse(text);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("📚 Librarian Error:", error);
    return [];
  }
};

export const consultLawyer = async (
  query: string,
  caseFiles: StoredFile[],
  relevantLaws: StoredFile[],
  chatHistory: string
): Promise<string> => {
  const ai = getAI();

  try {
    const caseFileParts = await filesToParts(caseFiles);
    const lawFileParts = await filesToParts(relevantLaws);

    const systemInstruction = `
      Ti je "Juristi im", një Konsulent i Lartë Ligjor AI ekspert.

      Konteksti:
      1. Ti ke akses në "Dosjet e Çështjes" (nëse ka).
      2. Ti ke akses në "Bazën Ligjore" (${relevantLaws.length} dokumente) që janë zgjedhur për këtë pyetje.

      Udhëzime:
      - Përgjigju profesionalisht në GJUHËN SHQIPE.
      - Cito nenet specifike nga Baza Ligjore kur është e mundur.
      - Përdor formatim Markdown (bold, lista).
      - Nëse dokumentet nuk mjaftojnë, përgjigju bazuar në njohuritë e tua të përgjithshme ligjore dhe theksoje këtë.
    `;

    const userParts = [
      ...caseFileParts,
      ...lawFileParts,
      {
        text: `Konteksti i Bisedës:\n${chatHistory}\n\nPyetja Aktuale: ${query}`,
      },
    ].map((c) =>
      "inlineData" in c
        ? c
        : {
            text: (c as any).text,
          }
    );

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash-latest",
      contents: [
        {
          role: "user",
          parts: userParts,
        },
      ],
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    const text = extractText(response);
    return text || "Nuk munda të gjeneroj përgjigje.";
  } catch (error) {
    console.error("⚖️ Lawyer Error Full Details:", error);
    return "Ndodhi një gabim gjatë analizimit. Kjo mund të ndodhë nëse dokumentet janë shumë të mëdha, formati nuk mbështetet ose ka problem me lidhjen me shërbimin AI. Provoni të pyesni sërish ose kontaktoni suportin.";
  }
};
