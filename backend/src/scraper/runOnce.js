require('dotenv').config();
const { runBatch } = require('./runBatch');

// Usage:
//   npm run scrape:once            -> headless, for real scheduled runs
//   npm run scrape:headed          -> headed (visible browser), for the
//                                      screen recording deliverable
const headless = process.env.HEADLESS !== 'false';

runBatch({ headless })
  .then((results) => {
    console.log('\n[runOnce] done:', JSON.stringify(results, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error('[runOnce] fatal error:', err);
    process.exit(1);
  });
