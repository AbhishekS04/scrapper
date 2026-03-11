import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
console.log("Loaded ENV length:", Object.keys(process.env).length);
console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);
console.log("DATABASE_URL start:", process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) : "null");

import { neon } from '@neondatabase/serverless';

async function test() {
  console.log("Connecting to:", process.env.DATABASE_URL ? "URL defined" : "URL missing");
  const sql = neon(process.env.DATABASE_URL);
  console.log("Executing query...");
  const result = await sql`SELECT 1`;
  console.log("Result:", result);
}
test().catch(console.error);
