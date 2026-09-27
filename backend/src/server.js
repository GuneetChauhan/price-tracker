require('dotenv').config();
const express = require('express');
const cors = require('cors');

const searchRoutes = require('./routes/search');
const productRoutes = require('./routes/products');
const scrapeRoutes = require('./routes/scrape');
const exportRoutes = require('./routes/export');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/search', searchRoutes);
app.use('/api/products', productRoutes);
app.use('/api/scrape', scrapeRoutes);
app.use('/api/export', exportRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));

// Keep the process alive even if a route handler throws an uncaught error
// (e.g. Playwright failing to launch Chromium). Without this the whole
// server would restart, causing 502s until Render brings it back up.
process.on('uncaughtException', (err) => {
  console.error('[server] uncaughtException — keeping process alive:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandledRejection — keeping process alive:', reason);
});
