/**
 * Local dev entry point — imports the Express app and starts listening.
 * For Vercel deployment, api/index.js imports server/app.js directly.
 */
import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 ScrapeIt server running on http://localhost:${PORT}`);
});
