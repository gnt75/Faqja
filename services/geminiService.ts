import { GoogleGenerativeAI } from "@google/generative-ai";
import { StoredFile } from "../types";
import { dbService } from "./dbService";

/* ---------------------------------------------------
   INITIALIZATION
---------------------------------------------------- */
const getAI = () => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    console.error("❌ Mungon VITE_API_KEY në environment.");
    throw new Error("Mungon konfigurimi i Gemini API key.");
  }
  return new GoogleGenerativeAI(apiKey);
};

/* ---------------------------------------------------
   CONVERT FILES → GEMINI PARTS
---------------------------------------------------- */
const filesToParts = async (files: StoredFile[]) => {
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
        };
      } catch (err) {
        console.error(`❌ Failed to load file ${file.name}`, err);
        return null;
      }
    })
  );

  return results.filter((x): x is any => x !== null);
};

/* ---------------------------------------------------
   LIBRARIAN (Select Top Relevant Laws)
---------------------------------------------------- */
export const consultLibrarian = async (
  query: string,
  availableLaws: StoredFile[]
): Promise<string[]> => {
  if (availableLaws.length === 0) return [];

  const ai = getAI();
  const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

  const manifest = availableLaws.map((l) => `- ${l.id}`).join("\n");

  const prompt = `
Head Librarian Mode.
User Question: "${query}"

Available PDFs:
${manifest}

Pick MAX 3 filenames that are required to answer the query.
Return ONLY a JSON array of exact filenames.
Example: ["Kodi Civil.pdf"]
If none match, return [].
`;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text();

    text = text.replace(/```json|```/gi, "").trim();
    const match = text.match(/\[.*\]/s);
    if (match) text = match[0];

    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("📚 Librarian Error:", err);
    return [];
  }
};

/* ---------------------------------------------------
   LAWYER — Full Legal Reasoning
---------------------------------------------------- */
export const consultLawyer = async (
  query: string,
  caseFiles: StoredFile[],
  relevantLaws: StoredFile[],
  chatHistory: string
): Promise<string> => {
  const ai = getAI();
  const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const caseParts = await filesToParts(caseFiles);
    const lawParts = await filesToParts(relevantLaws);

    const systemInstruction = `
Ti je "Juristi im", një avokat AI shumë i aftë.
Përdor dokumentet, cito nenet, dhe përgjigju vetëm në shqip.
`;

    const userParts = [
      ...caseParts,
      ...lawParts,
      {
        text: `CHAT HISTORY:\n${chatHistory}\n\nPYETJA: ${query}`,
      },
    ];

    const result = await model.generateContent({
      contents: [{ role: "user", parts: userParts }],
      systemInstruction,
      generationConfig: { temperature: 0.3 },
    });

    return result.response.text() || "Nuk ka përgjigje.";
  } catch (err) {
    console.error("⚖️ Lawyer Error:", err);
    return "Ndodhi një gabim gjatë analizimit.";
  }
};
