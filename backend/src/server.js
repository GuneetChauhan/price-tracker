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
