import aiExtractor from './services/aiExtractor.js';
import { generateEmbedding } from './services/semanticSearch.js';
import { extractPageData } from './services/extractor.js';
import { db } from './services/db.js';
import { scrapeResults, scrapeJobs } from './db/schema.js';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testGrok() {
  console.log('--- Testing Data Extraction ---');
  try {
    const html = '<html><body><h1>Hello</h1><p>The capital of France is Paris. Paris is cool.</p></body></html>';
    const pageData = extractPageData(html, 'http://example.com');
    console.log('Extracted Raw Text:', pageData.rawText);
    
    console.log('\n--- Testing Database Connectivity ---');
    // Test a simple query
    const results = await db.select().from(scrapeJobs).limit(1);
    console.log('Successfully queried scrape_jobs. Count:', results.length);
    
    console.log('\n--- Testing AI Extraction ---');
    const prompt = 'Extract the capital as JSON.';
    const aiResult = await aiExtractor.extractData(pageData.rawText, prompt);
    console.log('AI Extraction Result:', JSON.stringify(aiResult, null, 2));

  } catch (err) {
    console.error('Test Failed:', err.message);
    if (err.stack) console.error(err.stack);
  } finally {
    process.exit(0);
  }
}

testGrok();
