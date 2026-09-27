const express = require('express');
const config = require('../scraper/selectors');

const router = express.Router();

let catalogCache = null;
let cacheTime = 0;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Fetches the entire 960-item catalog from the store API in parallel batches.
 * Caches in memory so subsequent searches are instant (< 5ms).
 */
async function getCatalog() {
  const now = Date.now();
  if (catalogCache && now - cacheTime < CACHE_TTL_MS) {
    return catalogCache;
  }

  const all = [];
  const totalPages = 16;
  const batchSize = 4;

  for (let p = 1; p <= totalPages; p += batchSize) {
    const pageNums = Array.from({ length: batchSize }, (_, i) => p + i).filter((n) => n <= totalPages);
    const pageResults = await Promise.all(
      pageNums.map((num) =>
        fetch(`${config.baseUrl}/api/v2/listings?page=${num}&limit=60`)
          .then((r) => (r.ok ? r.json() : { results: [] }))
          .catch(() => ({ results: [] }))
      )
    );
    for (const res of pageResults) {
      if (res && Array.isArray(res.results)) {
        all.push(...res.results);
      }
    }
  }

  if (all.length > 0) {
    catalogCache = all;
    cacheTime = now;
  }
  return catalogCache || [];
}

// GET /api/search?q=partial+name
// Searches live against the store catalogue instantly (< 50ms) without heavy browser overhead.
router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'query param "q" is required' });

  try {
    // Check if query is a direct item URL (e.g. https://demo.inelabteamdev.com/item/2323)
    const directIdMatch = q.match(/\/item\/([A-Za-z0-9_-]+)/) || q.match(/^(\d+)$/);
    if (directIdMatch) {
      const id = directIdMatch[1];
      const itemRes = await fetch(`${config.baseUrl}/api/v2/items/${id}`).catch(() => null);
      if (itemRes && itemRes.ok) {
        const item = await itemRes.json();
        return res.json({
          query: q,
          results: [
            {
              name: item.name,
              url: `${config.baseUrl}/item/${item.id}`,
              storeProductId: String(item.id),
              options: (item.options || []).map((o) => o.label),
            },
          ],
        });
      }
    }

    const items = await getCatalog();
    const lower = q.toLowerCase();

    const matches = items.filter((p) => {
      const nameMatch = p.name && p.name.toLowerCase().includes(lower);
      const brandMatch = p.brand && p.brand.toLowerCase().includes(lower);
      const catMatch = p.category && p.category.toLowerCase().includes(lower);
      const skuMatch = p.sku && p.sku.toLowerCase().includes(lower);
      const idMatch = String(p.id) === q;
      return nameMatch || brandMatch || catMatch || skuMatch || idMatch;
    });

    const results = matches.slice(0, 25).map((p) => ({
      name: p.name,
      url: `${config.baseUrl}/item/${p.id}`,
      storeProductId: String(p.id),
      category: p.category,
      brand: p.brand,
    }));

    res.json({ query: q, results });
  } catch (err) {
    console.error('[search] error:', err.message);
    res.status(502).json({ error: 'Failed to search the store', detail: err.message });
  }
});

module.exports = router;
