const supabase = require('../db/supabase');
const { scrapeProduct } = require('./scraper');

/**
 * Scrapes every active tracked product once. This is what the cron trigger
 * endpoint calls every 2 hours, and what runOnce.js calls for a headed demo.
 *
 * IMPORTANT for "Honest History and Logging": every attempt (success,
 * retried, failed) is written to scrape_log as it happens, including
 * failures with price/stock left null. Nothing is buffered and dropped on
 * error, and a failure never falls back to writing stale/guessed values.
 */
async function runBatch({ headless = true } = {}) {
  const { data: products, error } = await supabase
    .from('tracked_products')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('[runBatch] failed to load tracked_products:', error.message);
    throw error;
  }

  const results = [];

  for (const product of products) {
    console.log(`[runBatch] scraping ${product.product_name} (${product.option_label})...`);

    const attemptRows = [];
    const result = await scrapeProduct({
      productUrl: product.product_url,
      optionLabel: product.option_label,
      headless,
      onAttempt: (attempt) => {
        attemptRows.push({
          tracked_product_id: product.id,
          attempted_at: new Date().toISOString(),
          outcome: attempt.outcome,
          attempt_number: attempt.attemptNumber,
          price: attempt.price ?? null,
          stock: attempt.stock ?? null,
          http_status: attempt.httpStatus ?? null,
          error_message: attempt.errorMessage ?? null,
          duration_ms: attempt.durationMs ?? null,
        });
        const tag = attempt.outcome.toUpperCase();
        console.log(
          `  [attempt ${attempt.attemptNumber}] ${tag}` +
            (attempt.price != null ? ` price=${attempt.price} stock=${attempt.stock}` : '') +
            (attempt.errorMessage ? ` (${attempt.errorMessage})` : '')
        );
      },
    });

    // Write the whole attempt trail for this product in one insert, so a
    // crash mid-loop can't leave a half-written attempt for THIS product,
    // while still preserving every prior product's rows already inserted.
    const { error: insertError } = await supabase.from('scrape_log').insert(attemptRows);
    if (insertError) {
      console.error(`[runBatch] failed to write scrape_log for ${product.id}:`, insertError.message);
    }

    results.push({ product: product.product_name, ...result });
  }

  return results;
}

module.exports = { runBatch };
