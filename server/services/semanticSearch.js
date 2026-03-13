/**
 * Semantic Search Service
 * Uses xAI's embedding API to embed scraped page content
 * and answer natural language queries.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const EMBED_MODEL = null; // Groq does not currently support embeddings
const API_KEY = null;

/**
 * Generate a text embedding vector via the Grok REST API directly.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function generateEmbedding(text) {
  if (!API_KEY) throw new Error('Semantic search is currently disabled (Groq does not support public embeddings).');

  const cleanText = text.replace(/\s+/g, ' ').trim().substring(0, 8000);

  try {
    const response = await axios.post(
      'https://api.x.ai/v1/embeddings',
      {
        input: cleanText,
        model: 'grok-beta', // Replace with specific embedding model if Grok has one, or use grok-beta if it supports it
      },
      { 
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000 
      }
    );
    return response.data.data[0].embedding;
  } catch (err) {
    const apiErr = err.response?.data;
    const status = err.response?.status;
    if (apiErr) {
      throw new Error(`Embedding API ${status}: ${JSON.stringify(apiErr)}`);
    }
    throw err;
  }
}

/**
 * Compute cosine similarity between two embedding vectors.
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

export async function semanticSearch(query, results, embeddings, topK = 5) {
  if (!API_KEY) throw new Error('Semantic search is currently disabled (Groq does not support public embeddings).');

  const queryVector = await generateEmbedding(query);

  const embeddingMap = {};
  if (embeddings && Array.isArray(embeddings)) {
    for (const e of embeddings) {
      embeddingMap[e.resultId] = e.vector;
    }
  }

  const scored = results.map(r => {
    const vec = embeddingMap[r.id];
    const score = vec ? cosineSimilarity(queryVector, vec) : 0;
    return {
      id: r.id,
      pageUrl: r.pageUrl || r.page_url,
      title: r.title,
      metaDescription: r.metaDescription || r.meta_description,
      score,
      snippet: (Array.isArray(r.paragraphs) ? r.paragraphs.slice(0, 3).join(' ') : '').substring(0, 300),
    };
  });

  return scored
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

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
      if (i < results.length - 1) await new Promise(res => setTimeout(res, 200));
    } catch (err) {
      console.error(`Failed to embed result ${r.id}:`, err.message);
    }
  }
  onProgress(`✅ Embedded ${embeddings.length}/${results.length} pages successfully.`);
  return embeddings;
}

export const isConfigured = false;

