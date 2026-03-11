/**
 * Semantic Search Service
 * Uses Google's text-embedding REST API to embed scraped page content
 * and answer natural language queries by finding the most semantically similar pages.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const EMBED_MODEL = 'embedding-001'; // Available on v1beta REST endpoint
const API_KEY = process.env.GEMINI_API_KEY;

/**
 * Generate a text embedding vector via the Gemini REST API directly.
 * @param {string} text
 * @returns {Promise<number[]>} A 768-dimensional embedding vector
 */
export async function generateEmbedding(text) {
  if (!API_KEY) throw new Error('GEMINI_API_KEY is not configured.');

  const cleanText = text.replace(/\s+/g, ' ').trim().substring(0, 8000);

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${API_KEY}`,
      {
        content: { parts: [{ text: cleanText }] },
      },
      { timeout: 20000 }
    );
    return response.data.embedding.values;
  } catch (err) {
    // Re-throw with the full API error body so we can diagnose
    const apiErr = err.response?.data;
    const status = err.response?.status;
    if (apiErr) {
      throw new Error(`Gemini Embedding API ${status}: ${JSON.stringify(apiErr)}`);
    }
    throw err;
  }
}

/**
 * Compute cosine similarity between two embedding vectors.
 * @returns {number} Score between -1 and 1 (1 = identical)
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Build a text corpus from a scraped result row for embedding.
 */
function buildTextCorpus(result) {
  const parts = [];
  if (result.title) parts.push(result.title);
  if (result.metaDescription || result.meta_description) {
    parts.push(result.metaDescription || result.meta_description);
  }
  if (result.headings) {
    const h = result.headings;
    const headingTexts = Object.values(h).flat();
    parts.push(...headingTexts.slice(0, 20));
  }
  if (Array.isArray(result.paragraphs)) {
    parts.push(...result.paragraphs.slice(0, 30));
  }
  return parts.join(' ').substring(0, 8000);
}

/**
 * Run a semantic search over an array of scraped results.
 * Ranks pages by similarity to the user's query.
 *
 * @param {string} query - The user's natural language question
 * @param {Array} results - Array of scrapeResult rows
 * @param {object[]} embeddings - Pre-computed embeddings [{resultId, vector}]
 * @param {number} topK - How many results to return
 * @returns {Promise<Array>} Ranked results with similarity scores
 */
export async function semanticSearch(query, results, embeddings, topK = 5) {
  if (!API_KEY) throw new Error('GEMINI_API_KEY is not configured. Semantic search requires Gemini.');

  // Generate query embedding
  const queryVector = await generateEmbedding(query);

  // Build a lookup of embeddings by result id / pageUrl
  const embeddingMap = {};
  if (embeddings && Array.isArray(embeddings)) {
    for (const e of embeddings) {
      embeddingMap[e.resultId] = e.vector;
    }
  }

  // Score each result against the query
  const scored = results.map(r => {
    const vec = embeddingMap[r.id];
    const score = vec ? cosineSimilarity(queryVector, vec) : 0;
    return {
      id: r.id,
      pageUrl: r.pageUrl || r.page_url,
      title: r.title,
      metaDescription: r.metaDescription || r.meta_description,
      score,
      // Include a snippet of relevant text
      snippet: (Array.isArray(r.paragraphs) ? r.paragraphs.slice(0, 3).join(' ') : '').substring(0, 300),
    };
  });

  // Sort by similarity descending and return topK
  return scored
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Generate and index embeddings for all results in a job.
 * Returns an array of { resultId, vector } objects.
 *
 * @param {Array} results - Array of scrapeResult rows
 * @param {function} onProgress - Progress callback
 * @returns {Promise<Array>}
 */
export async function generateJobEmbeddings(results, onProgress = () => {}) {
  const embeddings = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    try {
      onProgress(`Embedding page ${i + 1}/${results.length}: ${r.pageUrl || r.page_url}`);
      const text = buildTextCorpus(r);
      if (!text.trim()) continue;
      const vector = await generateEmbedding(text);
      embeddings.push({ resultId: r.id, vector });
      // Small delay to respect rate limits
      if (i < results.length - 1) await new Promise(res => setTimeout(res, 200));
    } catch (err) {
      console.error(`Failed to embed result ${r.id}:`, err.message);
    }
  }
  onProgress(`✅ Embedded ${embeddings.length}/${results.length} pages successfully.`);
  return embeddings;
}

export const isConfigured = !!process.env.GEMINI_API_KEY;
