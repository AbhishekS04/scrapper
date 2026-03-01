# 🕷️ WEBSCRAPE

A full-stack, production-ready web scraper application with a stunning dark-themed interface and NeonDB (PostgreSQL) storage.

![Tech Stack](https://img.shields.io/badge/React-19-blue) ![Node.js](https://img.shields.io/badge/Node.js-Express-green) ![Playwright](https://img.shields.io/badge/Playwright-Scraping-orange) ![NeonDB](https://img.shields.io/badge/NeonDB-PostgreSQL-purple)

## Features

- **Smart Scraping Engine** — Uses Axios+Cheerio for static pages, Playwright for JS-rendered sites (auto-detected)
- **Deep Crawling** — Follow internal links up to 5 levels deep
- **Complete Data Extraction** — Links, images, metadata, emails, phones, social links, tech stack, tables, forms
- **Real-time Progress** — Server-Sent Events (SSE) for live scrape progress
- **NeonDB Storage** — All jobs and results persisted in PostgreSQL
- **Export** — Download results as JSON or CSV
- **History** — Browse and re-view all past scrape jobs
- **Dark Terminal UI** — Professional dark theme with neon accents

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TailwindCSS |
| Backend | Node.js + Express.js |
| Scraping | Playwright + Cheerio + Axios |
| Database | NeonDB (PostgreSQL) |
| ORM | Drizzle ORM |
| Export | JSON + CSV |

## Project Structure

```
├── client/                     React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── URLInput.jsx        URL input with options
│   │   │   ├── ProgressPanel.jsx   Live progress display
│   │   │   ├── ResultsTabs.jsx     Tabbed results dashboard
│   │   │   ├── HistoryTable.jsx    Past jobs list
│   │   │   └── ExportBar.jsx       Export buttons
│   │   ├── pages/
│   │   │   ├── Home.jsx            Main scraper page
│   │   │   └── History.jsx         History browser
│   │   ├── hooks/
│   │   │   └── useScrapeJob.js     SSE + API hook
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/                     Express backend
│   ├── routes/
│   │   ├── scrape.js               POST /api/scrape, GET /api/stream/:id
│   │   ├── jobs.js                 GET /api/jobs, GET/DELETE /api/job/:id
│   │   └── export.js               GET /api/export/:id/json|csv
│   ├── services/
│   │   ├── scraper.js              Main scrape engine
│   │   ├── extractor.js            HTML data extraction
│   │   ├── techDetector.js         Tech stack detection
│   │   └── db.js                   NeonDB connection
│   ├── db/
│   │   ├── schema.js               Drizzle schema
│   │   └── migrate.js              DB migration script
│   └── index.js
├── .env.example
├── .gitignore
└── README.md
```

## Prerequisites

- **Node.js** v18+
- **NeonDB account** (free tier available at [neon.tech](https://neon.tech))

## Getting Started

### 1. Clone the repository

```bash
cd webscrape
```

### 2. Get a NeonDB Connection String

1. Go to [neon.tech](https://neon.tech) and sign up (free)
2. Create a new project
3. Go to **Dashboard → Connection Details**
4. Copy the connection string (looks like: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`)

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and paste your NeonDB connection string:

```
DATABASE_URL=postgresql://your-user:your-pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### 4. Install Dependencies

```bash
# Install all dependencies (root + client + server)
cd server && npm install
cd ../client && npm install
cd ..
```

### 5. Install Playwright Browsers (optional, for JS-rendered pages)

```bash
cd server && npx playwright install chromium
cd ..
```

> **Note:** Playwright is optional. The scraper will use Axios+Cheerio for static pages. If Playwright browsers aren't installed, it gracefully falls back to Axios.

### 6. Run Database Migration

```bash
cd server && node db/migrate.js
```

This creates the `scrape_jobs` and `scrape_results` tables in your NeonDB.

### 7. Start the Application

```bash
# Terminal 1: Start the backend
cd server && npm run dev

# Terminal 2: Start the frontend
cd client && npm run dev
```

Or from the root:
```bash
npm run dev
```

The app will be available at **http://localhost:5173**

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/scrape` | Start a new scrape job |
| `GET` | `/api/stream/:id` | SSE stream for live progress |
| `GET` | `/api/job/:id` | Get job status + results |
| `GET` | `/api/jobs` | List all past jobs |
| `DELETE`| `/api/job/:id` | Delete a job |
| `GET` | `/api/export/:id/json` | Download results as JSON |
| `GET` | `/api/export/:id/csv` | Download results as CSV |

### POST /api/scrape — Request Body

```json
{
  "url": "https://example.com",
  "options": {
    "deepScan": false,
    "followLinks": true,
    "extractImages": true,
    "extractEmailsOpt": true,
    "depth": 2
  }
}
```

## What Gets Extracted

- **Page Data**: Title, description, canonical URL, headings (H1-H6), paragraphs, word count, reading time, load time
- **Links**: Internal/external with anchor text, domain resolution
- **Media**: Images (src, alt, dimensions), videos, downloadable files
- **Metadata**: Meta tags, Open Graph, Twitter Card, JSON-LD, favicon, language
- **Contacts**: Emails, phone numbers, social media links
- **Tech Stack**: CMS, frameworks, analytics, CDN, server info
- **Tables**: All HTML tables parsed as structured data
- **Forms**: Actions, methods, field names and types

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | NeonDB PostgreSQL connection string |
| `PORT` | `3000` | Backend server port |
| `MAX_PAGES_PER_JOB` | `100` | Max pages to scrape per job |
| `DEFAULT_DEPTH` | `2` | Default crawl depth |
| `REQUEST_DELAY_MS` | `1000` | Delay between requests (anti-bot) |
| `CLIENT_URL` | `http://localhost:5173` | Frontend URL for CORS |

## License

MIT
