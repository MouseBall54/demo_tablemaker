
import { GoogleGenAI } from "@google/genai";
import { TableData, ColumnType } from "../types";

/**
 * Uses Google Gemini API to generate professional PostgreSQL DDL SQL based on the schema and relations.
 */
export const generateSQL = async (tables: TableData[], relations: any[]): Promise<string> => {
  // Fix: Initializing GoogleGenAI with named parameter apiKey as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare schema context for the AI
  const schemaContext = tables.map(table => ({
    tableName: table.name,
    columns: table.columns.map(col => ({
      name: col.name,
      type: col.type,
      isPrimaryKey: col.isPK,
      isForeignKey: col.isFK,
      isUnique: col.isUnique,
      isNullable: col.isNullable
    })),
    relations: relations.filter(r => r.source === table.id || r.target === table.id)
  }));

  try {
    // Complex Text Task: SQL Generation using 'gemini-3-pro-preview'
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Generate a high-quality PostgreSQL DDL SQL script based on the following JSON schema representation:
      
      ${JSON.stringify(schemaContext, null, 2)}
      
      Guidelines:
      - Use double quotes for all identifiers (table and column names).
      - Include all constraints (PK, FK, Unique, Not Null).
      - Output ONLY the SQL script. Do not include markdown formatting or explanations.`,
    });

    // Extracting text output directly from response.text
    const result = response.text || "-- Error: Empty response from AI";
    return result.trim();
  } catch (error) {
    console.error("Gemini SQL Generation failed:", error);
    return `-- SQL Generation Error: ${error instanceof Error ? error.message : String(error)}`;
  }
};
