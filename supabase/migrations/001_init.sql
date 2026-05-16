-- ============================================================
-- COD Command Center — Phase 1 Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PRODUCTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_name  TEXT NOT NULL,
  sku           TEXT,
  country       TEXT,
  currency      TEXT,
  selling_price NUMERIC(10, 2),
  product_cost  NUMERIC(10, 2),
  shipping_cost NUMERIC(10, 2),
  return_cost   NUMERIC(10, 2),
  call_center_cost NUMERIC(10, 2),
  status        TEXT NOT NULL DEFAULT 'Testing'
                CHECK (status IN ('Testing', 'Scaling', 'Winner', 'Killed', 'Paused')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LANDING PAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS landing_pages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  page_name   TEXT NOT NULL,
  live_url    TEXT,
  market      TEXT,
  language    TEXT,
  offer_name  TEXT,
  api_key     TEXT NOT NULL UNIQUE DEFAULT uuid_generate_v4()::TEXT,
  status      TEXT NOT NULL DEFAULT 'Active'
              CHECK (status IN ('Active', 'Paused', 'Archived')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast API key lookups (used on every order submission)
CREATE INDEX IF NOT EXISTS idx_landing_pages_api_key ON landing_pages(api_key);

-- ============================================================
-- ORDERS SEQUENCE for order_number COD-XXXXXX
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- ============================================================
-- ORDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number     TEXT NOT NULL UNIQUE DEFAULT 'COD-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 6, '0'),
  product_id       UUID REFERENCES products(id) ON DELETE SET NULL,
  landing_page_id  UUID REFERENCES landing_pages(id) ON DELETE SET NULL,

  -- Customer info
  customer_name    TEXT NOT NULL,
  phone            TEXT NOT NULL,
  city             TEXT NOT NULL,
  address          TEXT NOT NULL,
  package_name     TEXT,
  quantity         INTEGER NOT NULL DEFAULT 1,
  order_value      NUMERIC(10, 2) NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'USD',

  -- Status & notes
  status           TEXT NOT NULL DEFAULT 'New'
                   CHECK (status IN ('New', 'Confirmed', 'No Answer', 'Wrong Number',
                                     'Cancelled', 'Shipped', 'Delivered', 'Returned', 'Paid')),
  notes            TEXT,

  -- UTM & tracking
  utm_source       TEXT,
  utm_medium       TEXT,
  utm_campaign     TEXT,
  utm_content      TEXT,
  utm_term         TEXT,
  campaign_id      TEXT,
  adset_id         TEXT,
  ad_id            TEXT,
  platform         TEXT,
  device           TEXT,
  browser          TEXT,
  user_agent       TEXT,
  ip_address       TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common filter queries
CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_product_id    ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_lp_id         ON orders(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at    ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_phone         ON orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);

-- ============================================================
-- ORDER EVENTS TABLE (prepared for future analytics/tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS order_events (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landing_page_id  UUID REFERENCES landing_pages(id) ON DELETE SET NULL,
  product_id       UUID REFERENCES products(id) ON DELETE SET NULL,
  order_id         UUID REFERENCES orders(id) ON DELETE SET NULL, -- nullable
  event_type       TEXT NOT NULL,
  event_data       JSONB NOT NULL DEFAULT '{}',
  session_id       TEXT,
  visitor_id       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_events_order_id      ON order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_lp_id         ON order_events(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_order_events_event_type    ON order_events(event_type);
CREATE INDEX IF NOT EXISTS idx_order_events_created_at    ON order_events(created_at DESC);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_landing_pages_updated_at
  BEFORE UPDATE ON landing_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- All tables are protected — only authenticated users can read/write
-- The public order API uses the service role key (bypasses RLS)
-- ============================================================

ALTER TABLE products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events  ENABLE ROW LEVEL SECURITY;

-- Authenticated users can do everything
CREATE POLICY "authenticated_all_products"
  ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_landing_pages"
  ON landing_pages FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_orders"
  ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_order_events"
  ON order_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
