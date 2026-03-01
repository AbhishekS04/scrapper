import { pgTable, text, timestamp, integer, jsonb, uuid, pgEnum } from 'drizzle-orm/pg-core';

export const jobStatusEnum = pgEnum('job_status', ['pending', 'running', 'completed', 'failed']);

export const scrapeJobs = pgTable('scrape_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  url: text('url').notNull(),
  status: jobStatusEnum('status').default('pending').notNull(),
  options: jsonb('options').default({}),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  pagesScraped: integer('pages_scraped').default(0),
  totalLinksFound: integer('total_links_found').default(0),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const scrapeResults = pgTable('scrape_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').references(() => scrapeJobs.id, { onDelete: 'cascade' }).notNull(),
  pageUrl: text('page_url').notNull(),
  title: text('title'),
  metaDescription: text('meta_description'),
  headings: jsonb('headings').default({}),
  paragraphs: jsonb('paragraphs').default([]),
  linksInternal: jsonb('links_internal').default([]),
  linksExternal: jsonb('links_external').default([]),
  images: jsonb('images').default([]),
  emails: jsonb('emails').default([]),
  phones: jsonb('phones').default([]),
  socialLinks: jsonb('social_links').default([]),
  metadata: jsonb('metadata').default({}),
  techStack: jsonb('tech_stack').default({}),
  tablesData: jsonb('tables_data').default([]),
  formsData: jsonb('forms_data').default([]),
  wordCount: integer('word_count').default(0),
  loadTimeMs: integer('load_time_ms').default(0),
  // ─── Advanced extraction fields ───
  scripts: jsonb('scripts').default([]),
  stylesheets: jsonb('stylesheets').default([]),
  comments: jsonb('comments').default([]),
  leakedData: jsonb('leaked_data').default({}),
  securityInfo: jsonb('security_info').default({}),
  hiddenFields: jsonb('hidden_fields').default([]),
  iframes: jsonb('iframes').default([]),
  downloads: jsonb('downloads').default([]),
  videos: jsonb('videos').default([]),
  suggestions: jsonb('suggestions').default([]),
  scrapedAt: timestamp('scraped_at').defaultNow().notNull(),
});
