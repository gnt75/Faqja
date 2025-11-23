import { GoogleGenAI, Type } from "@google/genai";
import { StoredFile } from "../types";
import { dbService } from "./dbService";

const getAI = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Helper to convert stored blobs to Gemini parts
const filesToParts = async (files: StoredFile[]) => {
  const parts = [];
  for (const file of files) {
    // IMPORTANT: Check if content exists, if not, hydrate (download) it
    let blob = await dbService.getFileContent(file.id);
    
    if (!blob) {
        // If it's a known law from our static list (id matches name), try to download it now
        blob = await dbService.hydrateFile(file.id);
    }

    if (blob) {
      const base64 = await dbService.blobToBase64(blob);
      parts.push({
        inlineData: {
          mimeType: file.type || 'application/pdf',
          data: base64
        }
      });
    }
  }
  return parts;
};

export const consultLibrarian = async (
  query: string, 
  availableLaws: StoredFile[]
): Promise<string[]> => {
  if (availableLaws.length === 0) return [];

  const ai = getAI();
  
  // Send only names to save tokens and be fast
  const libraryManifest = availableLaws.map(l => `- ID: ${l.id}`).join('\n');

  const prompt = `
    You are the Head Librarian of a Law Firm.
    User Query: "${query}"
    
    Available Legal Documents (Filenames):
    ${libraryManifest}
    
    Task: Identify exactly which documents from the list are strictly necessary to answer the query.
    Return ONLY a JSON array of the file IDs (filenames). 
    If the query is general greeting, return empty array.
    Select max 3 most relevant documents.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Librarian Error:", error);
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

  // 1. Prepare Case Files
  const caseFileParts = await filesToParts(caseFiles);

  // 2. Prepare Law Files (This triggers download if missing)
  const lawFileParts = await filesToParts(relevantLaws);

  // 3. Construct System Instruction
  const systemInstruction = `
    Ti je "Juristi im", një Konsulent i Lartë Ligjor AI ekspert.
    
    Konteksti:
    1. Ti ke akses në "Dosjet e Çështjes" specifike të ofruara nga përdoruesi.
    2. Ti ke akses në një "Bazë Ligjore" (ligje, kode) që janë gjetur si relevante për këtë kërkesë.

    Udhëzime:
    - Përgjigju profesionalisht në GJUHËN SHQIPE.
    - Cito nenet specifike nga Baza Ligjore.
    - Përdor formatim Markdown të pasur.
    - Mos shpik ligje. Nëse dokumentet nuk mjaftojnë, kërko më shumë informacion.
  `;

  const contents = [
    ...caseFileParts, 
    ...lawFileParts,  
    { text: `Konteksti i Bisedës:\n${chatHistory}\n\nPyetja Aktuale: ${query}` }
  ];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: contents.flatMap(c => (c.inlineData ? [c] : [{ text: (c as any).text }]))
      },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
      }
    });

    return response.text || "Nuk munda të gjeneroj përgjigje.";
  } catch (error) {
    console.error("Lawyer Error:", error);
    return "Ndodhi një gabim gjatë analizimit. Sigurohuni që dokumentet janë të lexueshme.";
  }
};