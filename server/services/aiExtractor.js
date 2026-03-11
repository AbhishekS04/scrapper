import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Service for extracting structured data from raw text using Google Gemini API
 */
class AIExtractor {
  constructor() {
    this.isConfigured = !!process.env.GEMINI_API_KEY;
    if (this.isConfigured) {
      this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      this.model = 'gemini-2.5-flash';
    } else {
      console.warn('GEMINI_API_KEY is not set. AI extraction features will be disabled.');
    }
  }

  /**
   * Retry helper with exponential backoff for transient Gemini errors (503, 429).
   */
  async _withRetry(fn, maxAttempts = 4) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        const status = err?.status ?? err?.code;
        const isTransient = status === 503 || status === 429 || status === 500;
        if (!isTransient || attempt === maxAttempts) throw err;

        const delayMs = Math.min(2000 * Math.pow(2, attempt - 1), 16000); // 2s, 4s, 8s, 16s
        console.warn(`Gemini API returned ${status}. Retrying in ${delayMs / 1000}s (attempt ${attempt}/${maxAttempts})...`);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
    throw lastError;
  }

  /**
   * Truncate text to avoid hitting token limits.
   */
  _prepareTextContext(text, maxLength = 80000) {
    if (!text || text.length <= maxLength) return text;
    const firstPart = text.substring(0, Math.floor(maxLength * 0.6));
    const lastPart = text.substring(text.length - Math.floor(maxLength * 0.4));
    return `${firstPart}\n\n...[content truncated for length]...\n\n${lastPart}`;
  }

  /**
   * Extracts data from the given text based on the user's prompt.
   * Forces the LLM to output valid JSON.
   *
   * @param {string} rawText The cleaned text content of the page
   * @param {string} prompt The user's custom extraction instruction
   * @returns {Promise<Object>} The structured JSON output
   */
  async extractData(rawText, prompt) {
    if (!this.isConfigured) {
      throw new Error('Gemini API is not configured (missing GEMINI_API_KEY)');
    }

    if (!rawText || !rawText.trim()) throw new Error('No text provided for AI extraction');
    if (!prompt || !prompt.trim()) throw new Error('No prompt provided for AI extraction');

    try {
      const startTime = Date.now();
      const contextText = this._prepareTextContext(rawText);

      const systemInstruction = `You are a highly capable data extraction AI. You will be provided with the text content of a webpage and a specific data extraction task.
Your goal is to accurately extract the requested information from the text.
IMPORTANT INSTRUCTIONS:
1. Only extract information that is present in or heavily implied by the provided text.
2. If the requested information cannot be found, omit it or set it to null/empty depending on the requested structure.
3. You MUST output your response ONLY as a valid, well-formed JSON object or array.
4. Do not include any markdown formatting blocks (like \`\`\`json) or any conversational text. The entire string you return must be parseable by JSON.parse().`;

      const userMessage = `TASK:\n${prompt}\n\nSOURCE WEBPAGE TEXT:\n${contextText}`;

      const response = await this._withRetry(() =>
        this.ai.models.generateContent({
          model: this.model,
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        })
      );

      const resultText = response.text;
      if (!resultText) throw new Error('LLM returned empty response');

      let parsedData;
      try {
        parsedData = JSON.parse(resultText);
      } catch (e) {
        console.error(`Failed to parse Gemini output as JSON: ${e.message}`);
        const cleanedStr = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        try {
          parsedData = JSON.parse(cleanedStr);
        } catch {
          parsedData = { extraction_error: 'Output was not valid JSON', raw_output: resultText };
        }
      }

      console.log(`AI Extraction completed in ${Date.now() - startTime}ms`);
      return parsedData;

    } catch (error) {
      console.error('Error during AI extraction:', error?.message || error);
      const detail = error?.status ? `[${error.status}] ${error?.message}` : error?.message;
      throw new Error(detail || 'AI extraction failed');
    }
  }
}

export default new AIExtractor();

