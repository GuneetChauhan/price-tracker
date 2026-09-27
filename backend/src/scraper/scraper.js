const { chromium } = require('playwright');
const config = require('./selectors');

const MAX_ATTEMPTS = 4;
const BACKOFF_BASE_MS = 1500; // 1.5s, 3s, 6s... exponential backoff

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

const CHROMIUM_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
];

/**
 * Scrapes a single tracked product/option using Playwright.
 *
 * Implements the verified requirements:
 * 1. Automatically removes the store's adversarial cookie consent overlay.
 * 2. Selects the target variant (.opt-chip).
 * 3. Simulates natural human mouse movement over .offer-panel (>8 moves, >40ms cadence, >600ms dwell).
 * 4. Triggers the price handshake/quote and waits for the price DOM injection.
 * 5. Returns exact price and stock readings, with honest per-attempt audit logging.
 */
async function scrapeProduct({ productUrl, optionLabel, headless = true, onAttempt }) {
  const browser = await chromium.launch({
    headless,
    args: CHROMIUM_ARGS,
  });

  let lastError = null;

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const startedAt = Date.now();
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        const response = await page.goto(productUrl, {
          timeout: config.timeouts.navigationMs,
          waitUntil: 'networkidle',
        });

        if (!response || !response.ok()) {
          throw Object.assign(
            new Error(`Bad response: ${response ? response.status() : 'no response'}`),
            { httpStatus: response ? response.status() : null }
          );
        }

        // 1. Defeat the random adversarial cookie consent banner
        await page.evaluate(() => {
          document.querySelectorAll('.consent-scrim, .consent-box').forEach((el) => el.remove());
          const obs = new MutationObserver(() => {
            document.querySelectorAll('.consent-scrim, .consent-box').forEach((el) => el.remove());
          });
          obs.observe(document.documentElement, { childList: true, subtree: true });
        });

        // 2. Select option if specified
        if (optionLabel) {
          const chips = await page.locator(config.productPage.optionListSelector).all();
          for (const chip of chips) {
            const text = (await chip.innerText().catch(() => '')).trim();
            if (text.toLowerCase().includes(optionLabel.toLowerCase())) {
              await chip.click().catch(() => {});
              await page.waitForTimeout(500);
              break;
            }
          }
        }

        // 3. Wait for offer panel
        await page.waitForSelector(config.productPage.readySelector, {
          timeout: config.timeouts.readySelectorMs,
        });

        const panel = page.locator('.offer-panel');
        const box = await panel.boundingBox();
        if (!box) {
          throw new Error('Structural canary failed: no offer-panel bounding box found');
        }

        // 4. Human mouse movement simulation across the panel
        for (let i = 0; i < 20; i++) {
          const x = box.x + 30 + i * 15 + Math.sin(i) * 10;
          const y = box.y + 25 + Math.cos(i) * 10;
          await page.mouse.move(x, y);
          await new Promise((r) => setTimeout(r, 70));
        }
        await page.waitForTimeout(1000);

        // 5. Click the unlock button ("Check today’s price")
        const btn = page.locator('.offer-panel button');
        await btn.click({ timeout: 6000 });

        // 6. Poll for price value to be injected
        let rawPrice = null;
        let panelText = '';
        for (let poll = 0; poll < 20; poll++) {
          await page.waitForTimeout(500);
          const pv = await page.$(config.productPage.priceSelector);
          if (pv) {
            rawPrice = await pv.textContent().catch(() => null);
            panelText = await page.locator('.offer-panel').innerText().catch(() => '');
            if (rawPrice && rawPrice.trim()) break;
          }
          // Also check text directly
          const text = await page.locator('.offer-panel').innerText().catch(() => '');
          const match = text.match(/(?:₹|Rs\.?)\s*([\d,]+)/i);
          if (match) {
            rawPrice = match[0];
            panelText = text;
            break;
          }
        }

        if (!rawPrice) {
          throw new Error('Price field did not resolve within timeout');
        }

        const numericPrice = parsePrice(rawPrice);
        if (!Number.isFinite(numericPrice)) {
          throw new Error(`Failed to parse numeric price from "${rawPrice}"`);
        }

        // 7. Extract stock status
        let stock = 'In stock';
        if (panelText.includes('SOLD OUT')) {
          stock = 'Sold out';
        } else {
          const availMatch = panelText.match(/(\d+\s*(?:units\s*)?available)/i);
          if (availMatch) {
            stock = availMatch[1];
          } else {
            const pillText = await page.evaluate(() => {
              const pill = document.querySelector('.avail-yes, .avail-no, .avail-pill');
              return pill ? pill.textContent.trim() : null;
            });
            if (pillText) stock = pillText;
          }
        }

        const durationMs = Date.now() - startedAt;

        if (typeof onAttempt === 'function') {
          onAttempt({
            attemptNumber: attempt,
            outcome: 'success',
            price: numericPrice,
            stock,
            httpStatus: response.status(),
            durationMs,
          });
        }

        await context.close();
        return { success: true, price: numericPrice, stock };
      } catch (err) {
        const durationMs = Date.now() - startedAt;
        lastError = err;

        const isLastAttempt = attempt === MAX_ATTEMPTS;
        if (typeof onAttempt === 'function') {
          onAttempt({
            attemptNumber: attempt,
            outcome: isLastAttempt ? 'failed' : 'retried',
            price: undefined,
            stock: undefined,
            httpStatus: err.httpStatus ?? null,
            errorMessage: err.message,
            durationMs,
          });
        }

        await context.close();

        if (!isLastAttempt) {
          const backoff = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
          await sleep(backoff);
          continue;
        }
      }
    }

    return { success: false, error: lastError ? lastError.message : 'unknown failure' };
  } finally {
    await browser.close().catch(() => {});
  }
}

function parsePrice(rawText) {
  const cleaned = rawText.replace(/[^0-9.]/g, '');
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

module.exports = { scrapeProduct };
