
import { GoogleGenAI, Type } from "@google/genai";
import { AISuggestion } from "../types";

// Fix: Strictly following the initialization rule for GoogleGenAI - must use named parameter
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSchemaSuggestion = async (prompt: string): Promise<AISuggestion> => {
  // Fix: Use 'gemini-3-pro-preview' for complex reasoning tasks like database design
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Design a database schema for the following requirement: "${prompt}". Return as a structured JSON. Ensure you identify potential Unique constraints.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tables: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                columns: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      type: { type: Type.STRING },
                      isPK: { type: Type.BOOLEAN },
                      isFK: { type: Type.BOOLEAN },
                      isUnique: { type: Type.BOOLEAN },
                      isNullable: { type: Type.BOOLEAN }
                    },
                    required: ["id", "name", "type", "isPK", "isFK", "isUnique", "isNullable"]
                  }
                }
              },
              required: ["id", "name", "columns"]
            }
          },
          relations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sourceTableId: { type: Type.STRING },
                targetTableId: { type: Type.STRING },
                sourceColumnId: { type: Type.STRING },
                targetColumnId: { type: Type.STRING },
                type: { type: Type.STRING, description: "One of '1:1', '1:N', 'N:M'" }
              },
              required: ["sourceTableId", "targetTableId", "sourceColumnId", "targetColumnId", "type"]
            }
          }
        },
        required: ["tables", "relations"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}') as AISuggestion;
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return { tables: [], relations: [] };
  }
};

export const generateSQL = async (tables: any[], relations: any[]): Promise<string> => {
  const schemaStr = JSON.stringify({ tables, relations });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Generate standard PostgreSQL SQL DDL for the following schema definition: ${schemaStr}. Provide only the SQL code, no explanations. Make sure to include PRIMARY KEY, FOREIGN KEY, and UNIQUE constraints where specified.`,
  });

  return response.text || "-- No SQL generated";
};
