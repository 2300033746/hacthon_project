/*
# Create inventory items table (single-tenant, no auth)

1. New Tables
- `inventory_items`
  - `id` (uuid, primary key)
  - `name` (text, not null) — the product name, e.g. "Coffee Beans"
  - `sku` (text, unique) — stock keeping unit / barcode identifier
  - `category` (text) — optional grouping, e.g. "Beverages"
  - `quantity` (integer, not null, default 0) — current stock count
  - `unit` (text, default 'units') — measurement unit, e.g. "boxes", "kg"
  - `low_stock_threshold` (integer, default 10) — when quantity drops to/below this, a smart alert fires
  - `price` (numeric, default 0) — unit price for reference
  - `last_updated` (timestamptz) — automatically set on every stock change
  - `notes` (text) — optional free-form notes
  - `created_at` (timestamptz)

2. Security
- Enable RLS on `inventory_items`.
- Allow anon + authenticated CRUD because this is a single-tenant app with no sign-in screen.

3. Notes
- The `low_stock_threshold` column powers the Smart Alerts feature — any item whose
  `quantity <= low_stock_threshold` is flagged as a low-stock alert, and any item with
  `quantity = 0` is flagged as out-of-stock.
- `last_updated` is updated via a trigger on every INSERT and UPDATE so the UI can show
  when stock was last changed.
*/

CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text UNIQUE,
  category text DEFAULT 'General',
  quantity integer NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'units',
  low_stock_threshold integer NOT NULL DEFAULT 10,
  price numeric(10,2) NOT NULL DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_inventory" ON inventory_items;
CREATE POLICY "anon_select_inventory" ON inventory_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_inventory" ON inventory_items;
CREATE POLICY "anon_insert_inventory" ON inventory_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_inventory" ON inventory_items;
CREATE POLICY "anon_update_inventory" ON inventory_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_inventory" ON inventory_items;
CREATE POLICY "anon_delete_inventory" ON inventory_items FOR DELETE
  TO anon, authenticated USING (true);

-- Trigger to keep last_updated fresh on every row change
CREATE OR REPLACE FUNCTION update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_last_updated ON inventory_items;
CREATE TRIGGER trg_inventory_last_updated
  BEFORE INSERT OR UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_last_updated();

-- Seed a few sample items so the app isn't empty on first load
INSERT INTO inventory_items (name, sku, category, quantity, unit, low_stock_threshold, price, notes)
VALUES
  ('Coffee Beans', 'CB-001', 'Beverages', 45, 'kg', 10, 18.50, 'Arabica blend'),
  ('Paper Cups 12oz', 'PC-120', 'Supplies', 8, 'boxes', 15, 22.00, 'Falling low — reorder soon'),
  ('Sugar Packets', 'SP-200', 'Beverages', 0, 'boxes', 20, 5.50, 'OUT OF STOCK'),
  ('Milk Cartons 1L', 'MC-001', 'Dairy', 30, 'units', 12, 3.20, ''),
  ('Tea Bags', 'TB-300', 'Beverages', 60, 'boxes', 10, 7.00, 'Earl Grey')
ON CONFLICT (sku) DO NOTHING;
