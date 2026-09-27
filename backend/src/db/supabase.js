require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '[db] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set. Set them in .env before running the server or scraper.'
  );
}

// Always the service_role key on the backend (never expose this key to the
// frontend) — the frontend only ever talks to our own Express API.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = supabase;
