const express = require('express');
const { chromium } = require('playwright');
const config = require('../scraper/selectors');

const router = express.Router();

const CHROMIUM_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-zygote',
  '--single-process',
];

// Hard limit: kill browser and respond with error after this many ms.
const SEARCH_TIMEOUT_MS = 45_000;

// GET /api/search?q=partial+name
// Returns [{ name, url, storeProductId }] for products matching the query,
// scraped live from the store's own search/listing page.
router.get('/', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'query param "q" is required' });

  let browser;
  let timer;

  // Race the whole Playwright operation against a hard timeout so the
  // request never hangs forever (browser.close() itself can block on a
  // crashed Chromium process).
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Search timed out after 45s')), SEARCH_TIMEOUT_MS);
  });

  const search = async () => {
    browser = await chromium.launch({ headless: true, args: CHROMIUM_ARGS });
    const page = await browser.newPage();
    await page.goto(config.baseUrl, { timeout: 30000, waitUntil: 'domcontentloaded' });
    await page.waitForSelector(config.search.inputSelector, { timeout: 15000 });
    await page.fill(config.search.inputSelector, q);
    await page.waitForTimeout(800);

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
    return items;
  };

  try {
    const items = await Promise.race([search(), timeout]);
    clearTimeout(timer);
    res.json({ query: q, results: items });
  } catch (err) {
    clearTimeout(timer);
    console.error('[search] error:', err.message);
    res.status(502).json({ error: 'Failed to search the store', detail: err.message });
  } finally {
    // Force-close the browser without awaiting, so a hung browser process
    // doesn't block the response from being sent.
    if (browser) browser.close().catch(() => {});
  }
});

module.exports = router;
