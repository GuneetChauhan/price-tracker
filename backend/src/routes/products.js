const express = require('express');
const supabase = require('../db/supabase');

const router = express.Router();

// POST /api/products  — start tracking a product/option
// body: { storeProductId, productName, optionLabel, productUrl, scrapeIntervalMinutes? }
router.post('/', async (req, res) => {
  const { storeProductId, productName, optionLabel, productUrl, scrapeIntervalMinutes } = req.body;
  if (!storeProductId || !productName || !optionLabel || !productUrl) {
    return res.status(400).json({ error: 'storeProductId, productName, optionLabel, productUrl are required' });
  }

  const { data, error } = await supabase
    .from('tracked_products')
    .insert({
      store_product_id: storeProductId,
      product_name: productName,
      option_label: optionLabel,
      product_url: productUrl,
      scrape_interval_minutes: scrapeIntervalMinutes || 120,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// GET /api/products — list tracked products with their latest reading
router.get('/', async (req, res) => {
  const { data: products, error } = await supabase
    .from('tracked_products')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const { data: latest, error: latestErr } = await supabase.from('latest_price').select('*');
  if (latestErr) return res.status(500).json({ error: latestErr.message });

  const latestById = Object.fromEntries(latest.map((row) => [row.tracked_product_id, row]));
  const enriched = products.map((p) => ({ ...p, latest: latestById[p.id] || null }));
  res.json(enriched);
});

// DELETE /api/products/:id — stop tracking (soft delete, keeps history)
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('tracked_products')
    .update({ is_active: false })
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// GET /api/products/:id/history — price/stock history for the chart
router.get('/:id/history', async (req, res) => {
  const { data, error } = await supabase
    .from('scrape_log')
    .select('attempted_at, price, stock, outcome')
    .eq('tracked_product_id', req.params.id)
    .eq('outcome', 'success')
    .order('attempted_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/products/:id/log — full scrape attempt log, including failures
router.get('/:id/log', async (req, res) => {
  const { data, error } = await supabase
    .from('scrape_log')
    .select('*')
    .eq('tracked_product_id', req.params.id)
    .order('attempted_at', { ascending: false })
    .limit(200);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
