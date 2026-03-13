import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Service for extracting structured data from raw text using xAI Grok API
 * Uses OpenAI-compatible SDK
 */
class AIExtractor {
  constructor() {
    this.isConfigured = !!process.env.GROQ_API_KEY;
    if (this.isConfigured) {
      this.openai = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
      });
      this.model = 'llama-3.3-70b-versatile'; // Or your preferred Groq model
    } else {
      console.warn('GROQ_API_KEY is not set. AI extraction features will be disabled.');
    }
  }

  /**
   * Retry helper for transient errors.
   */
  async _withRetry(fn, maxAttempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        // OpenAI SDK handles many retries, but we add a custom layer for 429/500/503
        const status = err?.status;
        const isTransient = status === 429 || status === 500 || status === 503;
        if (!isTransient || attempt === maxAttempts) throw err;

        const delayMs = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
        console.warn(`Groq API returned ${status}. Retrying in ${delayMs / 1000}s (attempt ${attempt}/${maxAttempts})...`);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
    throw lastError;
  }

  /**
   * Truncate text to avoid hitting token limits.
   */
  _prepareTextContext(text, maxLength = 60000) {
    if (!text || text.length <= maxLength) return text;
    const firstPart = text.substring(0, Math.floor(maxLength * 0.6));
    const lastPart = text.substring(text.length - Math.floor(maxLength * 0.4));
    return `${firstPart}\n\n...[content truncated]...\n\n${lastPart}`;
  }

  /**
   * Extracts data from the given text using Groq.
   *
   * @param {string} rawText The cleaned text content of the page
   * @param {string} prompt The user's custom extraction instruction
   * @returns {Promise<Object>} The structured JSON output
   */
  async extractData(rawText, prompt) {
    if (!this.isConfigured) {
      throw new Error('Groq API is not configured (missing GROQ_API_KEY)');
    }

    if (!rawText || !rawText.trim()) throw new Error('No text provided for AI extraction');
    if (!prompt || !prompt.trim()) throw new Error('No prompt provided for AI extraction');

    try {
      const startTime = Date.now();
      const contextText = this._prepareTextContext(rawText);

      const systemInstruction = `You are a highly capable data extraction AI. You will be provided with webpage text and a task.
Extract the requested information accurately. 
IMPORTANT:
1. Only use provided text.
2. Return ONLY a valid JSON object or array. 
3. No markdown formatting or extra text.`;

      const userMessage = `TASK:\n${prompt}\n\nSOURCE WEBPAGE TEXT:\n${contextText}`;

      const response = await this._withRetry(() =>
        this.openai.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userMessage },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        })
      );

      const resultText = response.choices[0]?.message?.content;
      if (!resultText) throw new Error('Groq returned empty response');

      let parsedData;
      try {
        parsedData = JSON.parse(resultText);
      } catch (e) {
        console.error(`Failed to parse Groq output as JSON: ${e.message}`);
        // Fallback cleaning
        const cleanedStr = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        try {
          parsedData = JSON.parse(cleanedStr);
        } catch {
          parsedData = { extraction_error: 'Output was not valid JSON', raw_output: resultText };
        }
      }

      console.log(`Groq AI Extraction completed in ${Date.now() - startTime}ms`);
      return parsedData;

    } catch (error) {
      console.error('Error during Groq extraction:', error?.message || error);
      throw error;
    }
  }
}

export default new AIExtractor();


