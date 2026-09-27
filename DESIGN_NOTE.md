# Design Note

> Fill in the bracketed sections after you've actually run this against the
> live store. The assignment explicitly requires you to understand your
> code and disclose real AI usage — don't submit this note unedited. See
> the "What you still need to do" section at the bottom.

## Reliability approach

The scraper treats every navigation as unreliable by default:

1. **Waiting, not sleeping.** The store loads some content asynchronously
   after a short delay. Instead of a fixed `sleep(n)`, the scraper does
   `page.waitForSelector(readySelector, { timeout })` on the element that
   actually holds the price, so it adapts to however long the page takes
   (up to a timeout), and fails loudly rather than reading stale/empty DOM.
2. **Retries with exponential backoff.** Up to 4 attempts per scrape, with
   1.5s/3s/6s backoff between them, to absorb the store's occasional slow
   or error responses without hammering it.
3. **A "structural canary" check.** Before trusting an empty-looking price
   field, the scraper checks whether *any* of several known price-container
   selectors exist at all. If none do, it assumes the page's markup changed
   rather than assuming the product has no price, and logs that attempt as
   a distinct failure (`Structural canary failed...`) instead of writing a
   blank price.
4. **Never store a guess.** On any failed attempt, `price` and `stock` are
   left `null` in `scrape_log` — the app never falls back to the last known
   value or a placeholder. The dashboard's "latest price" view only reads
   from successful attempts, so a run of failures is visible as gaps in the
   log, not silently smoothed over.
5. **Every attempt is logged, not just the outcome.** A scrape that
   succeeds on the 3rd try produces two `retried` rows and one `success`
   row in `scrape_log`, so the log is an honest record of what actually
   happened, not just a final summary.

## Trade-offs

- **Headless browser over lightweight HTTP fetching.** The store's markup
  is delivered almost entirely via client-side JavaScript (confirmed: the
  raw HTML response has no product content), so `fetch` + `cheerio` can't
  see prices at all here. Playwright costs more time/memory per scrape than
  a raw HTTP request would, but it's the only approach that can see the
  rendered DOM at all.
- **Sequential scraping, not parallel.** Tracked products are scraped one
  at a time in `runBatch()`. This is slower than running them concurrently,
  but keeps the failure/retry logic and the load on the mock store simple
  and easy to reason about for a 2-3 product dashboard. [If you add more
  products or need faster batches, note here whether you parallelized it
  and what changed.]
- **External cron over an in-process scheduler.** Render's free tier sleeps
  idle instances, so a `setInterval` loop inside the Express process would
  simply stop firing once the dyno spins down. An external cron hitting a
  real HTTP endpoint wakes the instance on each call.
- **[Add any trade-off you made once you've actually run this against real
  price fluctuations and error responses from the store — e.g. how many
  retries turned out to be enough in practice, or how you tuned the
  ready-selector timeout.]**

## AI tool usage disclosure

[Required by the assignment. Be specific and honest — this is exactly what
you'll be asked about in the live interview. A reasonable structure:]

- Which parts I used an AI assistant for: [e.g. initial scaffold of the
  Express routes and the Supabase schema, first draft of the retry logic]
- What I changed or rewrote myself: [e.g. the real CSS selectors — the AI
  had no way to see the live rendered page, so I found these myself with
  `playwright codegen`; also describe any bug you found in the AI's first
  draft]
- What the AI got wrong on the first attempt, and how I found/fixed it:
  [Concretely — e.g. "the first retry logic didn't back off between
  attempts and would hammer the store," or "the CSV export didn't leave
  price/stock empty on failed rows," or a selector that didn't match the
  real DOM at all.]
- What I understand well enough to modify live in an interview: [be
  honest — the parts you should genuinely walk through are the retry loop
  in `scraper.js`, the selector-isolation design in `selectors.js`, and the
  cron trigger endpoint.]

## What you still need to do

I (the AI assistant) do not have a JavaScript-executing browser, so I
could not see the mock store's actual rendered DOM, real CSS class names,
or its real error/slow-response behavior. Everything scraping-specific is
built around that gap deliberately — one isolated config file
(`backend/src/scraper/selectors.js`) holds every placeholder selector,
clearly marked `VERIFY`. Before this is a truthful submission:

1. Run `npx playwright codegen https://demo.inelabteamdev.com/` yourself,
   click through search → product → option selection, and copy the real
   selectors into `selectors.js`.
2. Run `npm run scrape:headed` and actually watch it work, including
   forcing or waiting for a slow/failing response, and confirm the retry
   and canary logic behave the way this note claims.
3. Track 2-3 real products, let the cron run unattended for a while so the
   history/log are real, and only then fill in this note and record the
   screen capture.
4. Rewrite the disclosure section above with what actually happened, not
   the placeholders.
