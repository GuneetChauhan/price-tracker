const express = require('express');
const { chromium } = require('playwright');
const config = require('../scraper/selectors');

const router = express.Router();

// GET /api/search?q=partial+name
// Returns [{ name, url, storeProductId }] for products matching the query,
// scraped live from the store's own search/listing page.
router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'query param "q" is required' });

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto(config.baseUrl, { timeout: config.timeouts.navigationMs, waitUntil: 'domcontentloaded' });
    await page.waitForSelector(config.search.inputSelector, { timeout: config.timeouts.readySelectorMs });
    await page.fill(config.search.inputSelector, q);
    await page.waitForTimeout(600); // let client-side filtering / debounce settle

    const cards = await page.$$(config.search.resultItemSelector);
    const items = [];
    for (const card of cards) {
      const name = (await card.$eval(config.search.resultNameSelector, (el) => el.textContent).catch(() => null))?.trim();
      const href = await card.$eval(config.search.resultLinkSelector, (el) => el.getAttribute('href')).catch(() => null);
      if (!name || !href) continue;
      const url = new URL(href, config.baseUrl).toString();
      const storeProductId = config.extractIdFromUrl(url, config.productPage.idFromUrlPattern);
      items.push({ name, url, storeProductId });
    }

    res.json({ query: q, results: items });
  } catch (err) {
    console.error('[search] error:', err.message);
    res.status(502).json({ error: 'Failed to search the store', detail: err.message });
  } finally {
    await browser.close();
  }
});

module.exports = router;
