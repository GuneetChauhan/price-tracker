/**
 * SELECTOR CONFIG — the only file you should need to edit to match the real
 * DOM of https://demo.inelabteamdev.com/.
 *
 * Why this is separate: the assignment's own grading criterion is "change
 * detection that flags when the store's page structure changes" (bonus) and
 * "correctness under difficulty" (core). Keeping every CSS selector in one
 * place means (a) a structure change only breaks one file, (b) the scraper
 * can validate that these selectors still resolve before trusting the data
 * they return, and (c) you can update this after running Playwright's own
 * inspector against the live site, without touching the retry/logging logic.
 *
 * HOW TO FILL THIS IN (2 minutes, one-time):
 *   cd backend
 *   npx playwright install chromium   # first time only
 *   npx playwright codegen https://demo.inelabteamdev.com/
 * Playwright opens a real browser + an inspector. Click through: search a
 * product, open its page, pick an option. Codegen prints the selectors it
 * used for each click — copy the ones that match the fields below.
 *
 * Every selector below is a best-effort placeholder based on how sites like
 * this are conventionally structured. They are marked so grep can find them.
 */

module.exports = {
  baseUrl: process.env.STORE_BASE_URL || 'https://demo.inelabteamdev.com',

  search: {
    // Input the user types a product name into on the store's search/listing page.
    inputSelector: 'input[type="search"], input[placeholder*="search" i]', // VERIFY
    resultItemSelector: '[data-testid="product-card"], .product-card, li.product', // VERIFY
    resultNameSelector: '.product-card__name, [data-testid="product-name"], h3', // VERIFY
    resultLinkSelector: 'a', // relative to resultItemSelector, VERIFY
  },

  productPage: {
    // Anything the scraper waits for before it trusts the page has finished
    // its async load. This is the single most important selector: the
    // assignment says "some content loads asynchronously after a short
    // delay" — waiting on a fixed sleep() is what makes scrapers flaky.
    readySelector: '[data-testid="price"], .price, .product-price', // VERIFY

    // The store-assigned product ID, as it appears in the product page URL,
    // e.g. https://demo.inelabteamdev.com/products/SKU12345 -> "SKU12345".
    // extractIdFromUrl() below does the actual parsing; adjust the regex
    // if the real URL shape differs (e.g. a query param instead of a path segment).
    idFromUrlPattern: /\/products?\/([A-Za-z0-9_-]+)/,

    // Option picker, e.g. a storage-size or pack-size selector/dropdown/buttons.
    optionListSelector: '[data-testid="option"], .option-select button, select.options option', // VERIFY
    optionLabelSelector: null, // if options are <select><option>, the option text IS the label; else set a selector relative to optionListSelector

    priceSelector: '[data-testid="price"], .price, .product-price', // VERIFY
    stockSelector: '[data-testid="stock"], .stock, .availability', // VERIFY

    // Text fragments that should NEVER simultaneously be absent on a healthy
    // page. If none of these resolve, we assume the page structure changed
    // rather than assuming the product is simply out of stock or priceless.
    structuralCanaries: ['[data-testid="price"]', '.price', '.product-price'],
  },

  timeouts: {
    navigationMs: 20000,
    readySelectorMs: 12000, // generous, since content "loads asynchronously after a short delay"
    perAttemptMs: 30000,
  },
};

function extractIdFromUrl(url, pattern) {
  const match = url.match(pattern);
  return match ? match[1] : null;
}

module.exports.extractIdFromUrl = extractIdFromUrl;
