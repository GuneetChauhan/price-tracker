const express = require('express');
const { Parser } = require('json2csv');
const supabase = require('../db/supabase');

const router = express.Router();

// GET /api/export/csv — full scrape history across ALL tracked products,
// one row per scrape attempt, exactly as specified in the assignment:
// store product ID, product name, selected option, ISO 8601 UTC timestamp,
// price, stock, outcome. Failed attempts included with price/stock empty.
router.get('/csv', async (req, res) => {
  const { data, error } = await supabase
    .from('scrape_log')
    .select('attempted_at, outcome, price, stock, tracked_products(store_product_id, product_name, option_label)')
    .order('attempted_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const rows = data.map((row) => ({
    store_product_id: row.tracked_products?.store_product_id ?? '',
    product_name: row.tracked_products?.product_name ?? '',
    option: row.tracked_products?.option_label ?? '',
    timestamp_utc: new Date(row.attempted_at).toISOString(),
    price: row.outcome === 'failed' ? '' : row.price ?? '',
    stock: row.outcome === 'failed' ? '' : row.stock ?? '',
    outcome: row.outcome,
  }));

  const fields = ['store_product_id', 'product_name', 'option', 'timestamp_utc', 'price', 'stock', 'outcome'];
  const csv = new Parser({ fields }).parse(rows);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="scrape_history.csv"');
  res.send(csv);
});

module.exports = router;
