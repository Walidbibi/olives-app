import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // ← ajoute le path

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY 
});

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",  // ← remplace gemini-2.0-flash par ça
  contents: "Quand faut-il récolter les olives en Tunisie ?",
});

console.log(response.text);