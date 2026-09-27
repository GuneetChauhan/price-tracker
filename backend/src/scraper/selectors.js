/**
 * SELECTOR CONFIG — the only file you should need to edit to match the real
 * DOM of https://demo.inelabteamdev.com/.
 *
 * Selectors were derived by inspecting the store's CSS bundle and JS bundle
 * at build time. Re-run `npx playwright codegen https://demo.inelabteamdev.com/`
 * if the store's markup ever changes.
 *
 * Key facts about this store:
 *  - Routes: / (catalogue) and /item/:id (product page)
 *  - Prices are lazy-loaded: the .price-value block is injected after the
 *    user hovers or interacts with the offer panel — the scraper triggers
 *    this by hovering over .offer-panel.
 *  - Prices are in Rs (Indian Rupees): "Rs.1234"
 *  - Stock is shown as .avail-yes / .avail-no pills on the product page.
 *  - Options (size, colour, pack) are rendered as .opt-chip buttons.
 */

module.exports = {
  baseUrl: process.env.STORE_BASE_URL || 'https://demo.inelabteamdev.com',

  search: {
    // The catalogue page has a single text input for filtering products.
    // It does not use type="search" or a placeholder containing "search".
    inputSelector: 'input',

    // Each product is a .card element in the shelf grid.
    resultItemSelector: '.card',

    // Product name and link inside each card.
    resultNameSelector: '.card-title',
    resultLinkSelector: 'a',
  },

  productPage: {
    // Wait for the offer panel to appear before trusting the page has loaded.
    // The price itself is lazy — it won't be visible until we hover .offer-panel.
    readySelector: '.offer-panel, .opt-picker, .card-title',

    // URL shape: https://demo.inelabteamdev.com/item/SKU123 → "SKU123"
    idFromUrlPattern: /\/item\/([A-Za-z0-9_-]+)/,

    // Options are rendered as .opt-chip buttons (colour, size, pack, etc.)
    optionListSelector: '.opt-chip',
    optionLabelSelector: null, // opt-chip text content IS the label

    // Price is in .price-value, but requires hovering .offer-panel first
    // to trigger the lazy load. The scraper hovers before reading.
    priceSelector: '.price-value',
    stockSelector: '.avail-yes, .avail-no, .avail-pill',

    // Structural canaries: at least one of these must exist on a healthy page.
    structuralCanaries: ['.offer-panel', '.opt-picker', '.card-title'],
  },

  timeouts: {
    navigationMs: 30000,
    readySelectorMs: 15000,
    perAttemptMs: 45000,
  },
};

function extractIdFromUrl(url, pattern) {
  const match = url.match(pattern);
  return match ? match[1] : null;
}

module.exports.extractIdFromUrl = extractIdFromUrl;
