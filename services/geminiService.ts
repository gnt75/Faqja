import { GoogleGenerativeAI, GenerativeModel, Part } from "@google/generative-ai";
import { StoredFile } from "../types";
import { dbService } from "./dbService";

// -------------------------------
// INITIALIZE AI
// -------------------------------
const getAI = (): GenerativeModel => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    console.error("❌ Mungon VITE_API_KEY në environment.");
    throw new Error("Mungon konfigurimi i Gemini API key.");
  }

  const client = new GoogleGenerativeAI(apiKey);
  return client.getGenerativeModel({ model: "gemini-1.5-flash" });
};

// -------------------------------
// LOAD PDFs AND CONVERT TO PARTS
// -------------------------------
const filesToParts = async (files: StoredFile[]): Promise<Part[]> => {
  const results = await Promise.all(
    files.map(async (file) => {
      try {
        let blob = await dbService.getFileContent(file.id);
        if (!blob) blob = await dbService.hydrateFile(file.id);
        if (!blob) return null;

        const base64 = await dbService.blobToBase64(blob);
        return {
          inlineData: {
            mimeType: file.type || "application/pdf",
            data: base64,
          },
        } as Part;
      } catch (err) {
        console.error(`❌ Failed file: ${file.name}`, err);
        return null;
      }
    })
  );

  return results.filter((p): p is Part => p !== null);
};

// -------------------------------
// EXTRACT TEXT FROM GEMINI RESPONSE
// -------------------------------
const extractText = (response: any): string | undefined => {
  if (!response) return;
  if (typeof response.text === "function") return response.text();
  return response.text;
};

// -------------------------------
// LIBRARIAN (JSON ONLY RESPONSE)
// -------------------------------
export const consultLibrarian = async (
  query: string,
  availableLaws: StoredFile[]
): Promise<string[]> => {
  if (availableLaws.length === 0) return [];

  const model = getAI();

  const manifest = availableLaws.map((l) => `- ${l.id}`).join("\n");

  const prompt = `
    You are a Legal Document Classifier.
    User Query: "${query}"
    Files:
    ${manifest}

    Task:
    Return ONLY a JSON array of file IDs needed to answer the query.
    Example: ["Kodi Civil.pdf"]
  `;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    let text = extractText(result);
    if (!text) return [];

    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const match = text.match(/\[.*\]/s);
    if (match) text = match[0];

    const json = JSON.parse(text);
    return Array.isArray(json) ? json : [];
  } catch (err) {
    console.error("📚 Librarian Error:", err);
    return [];
  }
};

// -------------------------------
// LAWYER (FULL CONTEXT ANSWER)
// -------------------------------
export const consultLawyer = async (
  query: string,
  caseFiles: StoredFile[],
  relevantLaws: StoredFile[],
  chatHistory: string
): Promise<string> => {
  const model = getAI();

  try {
    const caseParts = await filesToParts(caseFiles);
    const lawParts = await filesToParts(relevantLaws);

    const systemInstruction = `
      Ti je "Juristi im", një ekspert ligjor AI.
      Duhet të përgjigjesh qartë, profesionalisht dhe në shqip.
      Përdor citime nga dokumentet PDF që të kam dërguar nëse është e mundur.
    `;

    const userPrompt = `
      Konteksti i bisedës:
      ${chatHistory}

      Pyetja: ${query}
    `;

    const result = await model.generateContent({
      contents: [
        { role: "system", parts: [{ text: systemInstruction }] },
        { role: "user", parts: [...caseParts, ...lawParts, { text: userPrompt }] },
      ],
    });

    return extractText(result) || "Nuk munda të gjeneroj përgjigje.";
  } catch (err) {
    console.error("⚖️ Lawyer Error:", err);
    return "Ndodhi një gabim gjatë analizimit. Ju lutem provoni përsëri.";
  }
};
