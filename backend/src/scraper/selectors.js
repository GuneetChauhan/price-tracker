/**
 * SELECTOR CONFIG — matches the real DOM of https://demo.inelabteamdev.com/.
 */

module.exports = {
  baseUrl: process.env.STORE_BASE_URL || 'https://demo.inelabteamdev.com',

  productPage: {
    readySelector: '.offer-panel',
    idFromUrlPattern: /\/item\/([A-Za-z0-9_-]+)/,
    optionListSelector: '.opt-chip',
    priceSelector: '.price-value',
    stockSelector: '.avail-yes, .avail-no, .avail-pill',
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
