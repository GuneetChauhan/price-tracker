const express = require('express');
const { runBatch } = require('../scraper/runBatch');

const router = express.Router();

// POST /api/scrape/run?token=...
// This is the endpoint the external cron service (cron-job.org) hits every
// 2 hours. It's a real HTTP call rather than an in-process setInterval loop
// specifically because Render's free tier sleeps the instance — an
// always-on timer would just stop firing once the dyno spins down.
//
// A shared-secret token guards it so random internet traffic can't trigger
// scrapes (and burn through the store's rate limits) on your behalf.
router.post('/run', async (req, res) => {
  const token = req.query.token || req.headers['x-cron-token'];
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'invalid or missing cron token' });
  }

  // Respond immediately so cron-job.org doesn't time out waiting on a run
  // that scrapes several products with retries; the run continues in the
  // background and its results land in scrape_log as usual.
  res.status(202).json({ status: 'scrape started' });

  try {
    await runBatch({ headless: true });
  } catch (err) {
    console.error('[scrape/run] batch failed:', err.message);
  }
});

module.exports = router;
