import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('🔄 Running database migrations...');

  try {
    // Create enum type
    await sql`
      DO $$ BEGIN
        CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    // Create scrape_jobs table
    await sql`
      CREATE TABLE IF NOT EXISTS scrape_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL DEFAULT 'anonymous',
        url TEXT NOT NULL,
        status job_status NOT NULL DEFAULT 'pending',
        options JSONB DEFAULT '{}',
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        pages_scraped INTEGER DEFAULT 0,
        total_links_found INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    // Create scrape_results table
    await sql`
      CREATE TABLE IF NOT EXISTS scrape_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
        page_url TEXT NOT NULL,
        title TEXT,
        meta_description TEXT,
        headings JSONB DEFAULT '{}',
        paragraphs JSONB DEFAULT '[]',
        links_internal JSONB DEFAULT '[]',
        links_external JSONB DEFAULT '[]',
        images JSONB DEFAULT '[]',
        emails JSONB DEFAULT '[]',
        phones JSONB DEFAULT '[]',
        social_links JSONB DEFAULT '[]',
        metadata JSONB DEFAULT '{}',
        tech_stack JSONB DEFAULT '{}',
        tables_data JSONB DEFAULT '[]',
        forms_data JSONB DEFAULT '[]',
        word_count INTEGER DEFAULT 0,
        load_time_ms INTEGER DEFAULT 0,
        scraped_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_scrape_results_job_id ON scrape_results(job_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_scrape_jobs_created_at ON scrape_jobs(created_at);`;

    // Add user_id column if it doesn't exist (for existing databases)
    await sql`ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'anonymous';`;

    await sql`CREATE INDEX IF NOT EXISTS idx_scrape_jobs_user_id ON scrape_jobs(user_id);`;

    // Add advanced columns if they don't exist
    const advancedCols = [
      'scripts', 'stylesheets', 'comments', 'leaked_data', 'security_info',
      'hidden_fields', 'iframes', 'downloads', 'videos', 'suggestions', 'contact_info', 'seo_score',
      'performance_metrics', 'accessibility_score', 'content_quality'
    ];
    for (const col of advancedCols) {
      const defaultVal = ['leaked_data', 'security_info', 'contact_info', 'seo_score', 'performance_metrics', 'accessibility_score', 'content_quality'].includes(col) ? "'{}'" : "'[]'";
      await sql`SELECT 1 FROM information_schema.columns WHERE table_name='scrape_results' AND column_name=${col}`.then(async rows => {
        if (rows.length === 0) {
          await sql(`ALTER TABLE scrape_results ADD COLUMN ${col} JSONB DEFAULT ${defaultVal}`);
        }
      });
    }

    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
