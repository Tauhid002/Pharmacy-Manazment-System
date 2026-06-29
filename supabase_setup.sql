-- ====================================================================
-- SUPABASE DATABASE INITIALIZATION & PROCEDURES SCHEMA SCRIPT
-- ====================================================================
-- This script configures all tables, columns, relations, pre-seeded data,
-- and transactional PL/pgSQL stored procedures (RPCs) to run on your
-- Supabase database.
-- 
-- INSTRUCTIONS:
-- 1. Open your Supabase Dashboard (https://supabase.com).
-- 2. Select your project: 'hfgjcrtcmbtvvcwglnug'.
-- 3. In the left sidebar, click on "SQL Editor".
-- 4. Click "New Query" (+ icon).
-- 5. Paste this entire script into the editor.
-- 6. Click the "Run" button at the bottom right.
-- ====================================================================

-- Clean up any existing tables to avoid duplicate key or type mismatches
DROP TABLE IF EXISTS supplier_payments CASCADE;
DROP TABLE IF EXISTS supplier_purchases CASCADE;
DROP TABLE IF EXISTS due_ledger CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS stock_logs CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS medicines CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ====================================================================
-- 1. CREATE TABLES
-- ====================================================================

-- PROFILES (Users/Staff/Owner Account Manager)
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MEDICINE CATEGORIES
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- SUPPLIERS
CREATE TABLE suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  address TEXT,
  total_owed NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MEDICINES
CREATE TABLE medicines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  generic_name TEXT,
  company TEXT,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  purchase_price NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  batch_number TEXT,
  expiry_date DATE,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOMERS LEDGER
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT,
  total_due NUMERIC NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SALES INVOICES
CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  total_price NUMERIC NOT NULL DEFAULT 0,
  due_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  sold_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  sale_date TIMESTAMPTZ DEFAULT NOW()
);

-- SALE ITEMS (Products inside Invoice)
CREATE TABLE sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT REFERENCES sales(id) ON DELETE CASCADE,
  medicine_id TEXT REFERENCES medicines(id) ON DELETE CASCADE,
  medicine_name TEXT,
  customer_name TEXT,
  due_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL
);

-- CUSTOMER DUES LEDGER (Tally Khata / Payments Received)
CREATE TABLE due_ledger (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
  sale_id TEXT REFERENCES sales(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('due_added', 'payment_received')),
  amount NUMERIC NOT NULL,
  note TEXT,
  created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STOCK RESTOCK LOGS
CREATE TABLE stock_logs (
  id TEXT PRIMARY KEY,
  medicine_id TEXT REFERENCES medicines(id) ON DELETE CASCADE,
  quantity_added INTEGER NOT NULL,
  note TEXT,
  created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SUPPLIER PURCHASES (Due Added to Supplier)
CREATE TABLE supplier_purchases (
  id TEXT PRIMARY KEY,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE CASCADE,
  description TEXT,
  amount NUMERIC NOT NULL,
  purchase_date DATE NOT NULL,
  created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SUPPLIER PAYMENTS (Cash Paid to Supplier)
CREATE TABLE supplier_payments (
  id TEXT PRIMARY KEY,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 2. PRE-SEED ALL INITIAL DATA (Beautiful Demo Data to start instantly!)
-- ====================================================================

-- Pre-seed profiles
INSERT INTO profiles (id, full_name, role, phone, email, is_active, created_at) VALUES
('user-owner', 'Owner Admin', 'owner', '01700000001', 'owner@pharma.com', true, '2026-06-20T10:00:00Z'),
('user-staff1', 'Kamal Uddin', 'staff', '01700000002', 'kamal@pharma.com', true, '2026-06-20T10:00:00Z'),
('user-staff2', 'Rahima Begum', 'staff', '01700000003', 'rahima@pharma.com', true, '2026-06-20T10:00:00Z');

-- Pre-seed categories
INSERT INTO categories (id, name) VALUES
('cat-1', 'Tablets'),
('cat-2', 'Capsules'),
('cat-3', 'Syrups'),
('cat-4', 'Inhalers'),
('cat-5', 'Ointments');

-- Pre-seed suppliers
INSERT INTO suppliers (id, name, contact_person, phone, address, total_owed, created_at) VALUES
('sup-1', 'Beximco Pharmaceuticals Ltd.', 'Rashedul Karim', '01711223344', 'Dhaka, Bangladesh', 2500, '2026-06-20T10:00:00Z'),
('sup-2', 'Square Pharmaceuticals PLC', 'Mustafizur Rahman', '01811223344', 'Pabna, Bangladesh', 4200, '2026-06-20T10:00:00Z'),
('sup-3', 'Incepta Pharmaceuticals Ltd.', 'Sohail Tanveer', '01911223344', 'Savar, Dhaka', 0, '2026-06-20T10:00:00Z');

-- Pre-seed medicines
INSERT INTO medicines (id, name, generic_name, company, category_id, purchase_price, selling_price, stock, low_stock_threshold, batch_number, expiry_date, supplier_id, created_by, created_at) VALUES
('med-1', 'Napa', 'Paracetamol', 'Beximco', 'cat-1', 8, 10, 120, 10, 'N-449', '2026-12-15', 'sup-1', 'user-owner', '2026-06-20T10:00:00Z'),
('med-2', 'Napa Extra', 'Paracetamol + Caffeine', 'Beximco', 'cat-1', 11, 15, 8, 15, 'NE-102', '2026-11-20', 'sup-1', 'user-owner', '2026-06-20T10:00:00Z'),
('med-3', 'Sergel 20', 'Esomeprazole', 'Healthcare', 'cat-2', 5, 7, 45, 10, 'SR-88', '2026-07-12', 'sup-2', 'user-owner', '2026-06-20T10:00:00Z'),
('med-4', 'Alatrol', 'Cetirizine Hydrochloride', 'Square', 'cat-1', 2.2, 3.0, 250, 20, 'AL-309', '2027-04-05', 'sup-2', 'user-owner', '2026-06-20T10:00:00Z'),
('med-5', 'Monas 10', 'Montelukast Sodium', 'Acme', 'cat-1', 12.5, 16.0, 2, 10, 'M10-44', '2026-09-12', 'sup-3', 'user-owner', '2026-06-20T10:00:00Z'),
('med-6', 'Tufnil', 'Tolfenamic Acid', 'Incepta', 'cat-1', 9.5, 12.0, 40, 5, 'TF-20', '2026-07-18', 'sup-3', 'user-owner', '2026-06-20T10:00:00Z'),
('med-7', 'Seclo 20', 'Omeprazole', 'Square', 'cat-2', 4.5, 6.0, 0, 15, 'SC-12', '2027-01-30', 'sup-2', 'user-owner', '2026-06-20T10:00:00Z');

-- Pre-seed customers
INSERT INTO customers (id, name, mobile, total_due, created_by, created_at) VALUES
('cust-1', 'Palok Mahamud', '01712345678', 450, 'user-owner', '2026-06-20T10:00:00Z'),
('cust-2', 'Anika Rahman', '01811223344', 0, 'user-owner', '2026-06-20T10:00:00Z'),
('cust-3', 'Sabbir Ahmed', '01511223344', 1200, 'user-owner', '2026-06-20T10:00:00Z');

-- Pre-seed sales
INSERT INTO sales (id, customer_id, total_price, due_amount, paid_amount, sold_by, sale_date) VALUES
('sale-1', 'cust-1', 850, 450, 400, 'user-staff1', '2026-06-23T14:30:00Z'),
('sale-2', 'cust-2', 240, 0, 240, 'user-staff2', '2026-06-24T10:15:00Z'),
('sale-3', 'cust-3', 1500, 1200, 300, 'user-owner', '2026-06-25T02:00:00Z');

-- Pre-seed sale items
INSERT INTO sale_items (id, sale_id, medicine_id, quantity, unit_price, subtotal) VALUES
('item-1', 'sale-1', 'med-1', 20, 10, 200),
('item-2', 'sale-1', 'med-2', 10, 15, 150),
('item-3', 'sale-1', 'med-3', 71, 7, 497),
('item-4', 'sale-2', 'med-4', 80, 3, 240),
('item-5', 'sale-3', 'med-1', 50, 10, 500),
('item-6', 'sale-3', 'med-5', 50, 16, 800),
('item-7', 'sale-3', 'med-6', 16, 12, 192);

-- Pre-seed due ledger tally entries
INSERT INTO due_ledger (id, customer_id, sale_id, type, amount, note, created_by, created_at) VALUES
('due-1', 'cust-1', 'sale-1', 'due_added', 450, 'Sale #sale-1', 'user-staff1', '2026-06-23T14:30:00Z'),
('due-2', 'cust-3', 'sale-3', 'due_added', 1200, 'Sale #sale-3', 'user-owner', '2026-06-25T02:00:00Z');

-- Pre-seed stock logs
INSERT INTO stock_logs (id, medicine_id, quantity_added, note, created_by, created_at) VALUES
('log-1', 'med-1', 100, 'Initial Stocking', 'user-owner', '2026-06-20T10:00:00Z'),
('log-2', 'med-2', 50, 'Supplier Beximco restock', 'user-staff1', '2026-06-22T09:00:00Z');

-- Pre-seed supplier purchases
INSERT INTO supplier_purchases (id, supplier_id, description, amount, purchase_date, created_by, created_at) VALUES
('pur-1', 'sup-1', 'Bought 200 Napa, 50 Napa Extra', 2150, '2026-06-21', 'user-owner', '2026-06-21T11:00:00Z'),
('pur-2', 'sup-2', 'Bought 300 Sergel, 500 Alatrol', 2600, '2026-06-22', 'user-owner', '2026-06-22T14:00:00Z');

-- Pre-seed supplier payments
INSERT INTO supplier_payments (id, supplier_id, amount, payment_date, created_by, created_at) VALUES
('pay-1', 'sup-1', 1000, '2026-06-21', 'user-owner', '2026-06-21T12:00:00Z'),
('pay-2', 'sup-2', 500, '2026-06-23', 'user-staff1', '2026-06-23T15:00:00Z');


-- ====================================================================
-- 3. PL/PGSQL TRANSACTIONAL STORED PROCEDURES (RPCs)
-- ====================================================================

-- RPC 1: RESTOCK MEDICINE
CREATE OR REPLACE FUNCTION restock_medicine(
  p_medicine_id TEXT,
  p_quantity INTEGER,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_user_id TEXT;
BEGIN
  -- Auto-authenticate user
  v_user_id := COALESCE(auth.uid()::TEXT, 'user-owner');

  -- 1. Increase medicine stock count
  UPDATE medicines
  SET stock = stock + p_quantity,
      updated_at = NOW()
  WHERE id = p_medicine_id;

  -- 2. Record this action in stock_logs
  INSERT INTO stock_logs (id, medicine_id, quantity_added, note, created_by, created_at)
  VALUES (
    'log-' || extract(epoch from clock_timestamp())::TEXT || '-' || floor(random() * 1000)::TEXT,
    p_medicine_id,
    p_quantity,
    p_note,
    v_user_id,
    NOW()
  );
END;
$$ LANGUAGE plpgsql;


-- RPC 2: RECORD DUE PAYMENT
CREATE OR REPLACE FUNCTION record_due_payment(
  p_customer_id TEXT,
  p_amount NUMERIC,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_user_id TEXT;
  v_ledger_id TEXT;
BEGIN
  -- Auto-authenticate user
  v_user_id := COALESCE(auth.uid()::TEXT, 'user-owner');
  v_ledger_id := 'due-' || extract(epoch from clock_timestamp())::TEXT || '-' || floor(random() * 1000)::TEXT;

  -- 1. Deduct amount from customer's total due ledger
  UPDATE customers
  SET total_due = GREATEST(0, total_due - p_amount)
  WHERE id = p_customer_id;

  -- 2. Record the payment in customer ledger
  INSERT INTO due_ledger (id, customer_id, type, amount, note, created_by, created_at)
  VALUES (v_ledger_id, p_customer_id, 'payment_received', p_amount, COALESCE(p_note, 'Due Payment'), v_user_id, NOW());
END;
$$ LANGUAGE plpgsql;


-- RPC 3: CREATE SALE (CHECKOUT INVOICES)
CREATE OR REPLACE FUNCTION create_sale(
  p_customer_id TEXT,
  p_due_amount NUMERIC,
  p_items JSONB
)
RETURNS TEXT AS $$
DECLARE
  v_sale_id TEXT;
  v_user_id TEXT;
  v_total_price NUMERIC := 0;
  v_paid_amount NUMERIC;
  v_item RECORD;
  v_med_id TEXT;
  v_qty INTEGER;
  v_price NUMERIC;
  v_subtotal NUMERIC;
  v_current_stock INTEGER;
  v_med_name TEXT;
  v_customer_name TEXT := 'Walk-in Cash Customer';
BEGIN
  -- Auto-authenticate user
  v_user_id := COALESCE(auth.uid()::TEXT, 'user-owner');
  v_sale_id := 'sale-' || extract(epoch from clock_timestamp())::TEXT || '-' || floor(random() * 1000)::TEXT;

  -- 0. Retrieve customer name if customer is linked
  IF p_customer_id IS NOT NULL THEN
    SELECT name INTO v_customer_name FROM customers WHERE id = p_customer_id;
  END IF;

  -- 1. Validate medicine stocks and calculate the total sale price first
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(medicine_id TEXT, quantity INTEGER, unit_price NUMERIC) LOOP
    v_med_id := v_item.medicine_id;
    v_qty := v_item.quantity;
    v_price := v_item.unit_price;
    v_subtotal := v_qty * v_price;
    v_total_price := v_total_price + v_subtotal;

    -- Retrieve current medicine stock and name
    SELECT stock, name INTO v_current_stock, v_med_name 
    FROM medicines 
    WHERE id = v_med_id;

    IF v_current_stock IS NULL THEN
      RAISE EXCEPTION 'Medicine with ID % not found', v_med_id;
    END IF;

    IF v_current_stock < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for medicine "%" (Requested %, Current Stock %)', v_med_name, v_qty, v_current_stock;
    END IF;
  END LOOP;

  v_paid_amount := v_total_price - p_due_amount;

  -- 2. Save parent sales invoice
  INSERT INTO sales (id, customer_id, total_price, due_amount, paid_amount, sold_by, sale_date)
  VALUES (v_sale_id, p_customer_id, v_total_price, p_due_amount, v_paid_amount, v_user_id, NOW());

  -- 3. Subtract stock and save individual purchase items with audit details
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(medicine_id TEXT, quantity INTEGER, unit_price NUMERIC) LOOP
    v_med_id := v_item.medicine_id;
    v_qty := v_item.quantity;
    v_price := v_item.unit_price;
    v_subtotal := v_qty * v_price;

    -- Retrieve medicine name specifically
    SELECT name INTO v_med_name FROM medicines WHERE id = v_med_id;

    -- Decrement stock
    UPDATE medicines
    SET stock = stock - v_qty,
        updated_at = NOW()
    WHERE id = v_med_id;

    -- Insert item record with detailed direct attributes
    INSERT INTO sale_items (id, sale_id, medicine_id, medicine_name, customer_name, due_amount, total_amount, quantity, unit_price, subtotal)
    VALUES (
      'sitem-' || extract(epoch from clock_timestamp())::TEXT || '-' || floor(random() * 1000)::TEXT, 
      v_sale_id, 
      v_med_id, 
      v_med_name,
      v_customer_name,
      p_due_amount,
      v_total_price,
      v_qty, 
      v_price, 
      v_subtotal
    );
  END LOOP;

  -- 4. Adjust customer due ledger accounts if this invoice has outstanding due
  IF p_due_amount > 0 AND p_customer_id IS NOT NULL THEN
    -- Increment customer total dues
    UPDATE customers
    SET total_due = total_due + p_due_amount
    WHERE id = p_customer_id;

    -- Record in due ledger list
    INSERT INTO due_ledger (id, customer_id, sale_id, type, amount, note, created_by, created_at)
    VALUES (
      'due-' || extract(epoch from clock_timestamp())::TEXT || '-' || floor(random() * 1000)::TEXT, 
      p_customer_id, 
      v_sale_id, 
      'due_added', 
      p_due_amount, 
      'Sale #' || v_sale_id, 
      v_user_id, 
      NOW()
    );
  END IF;

  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 4. ROW LEVEL SECURITY (RLS) & SECURITY POLICIES
-- ====================================================================
-- By default, Supabase may enable Row Level Security (RLS) on new tables,
-- which blocks insert/select operations from client-side code unless explicitly permitted.
-- 
-- Option A: Disable RLS for all tables (Recommended for simple setup & development)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE medicines DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE due_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments DISABLE ROW LEVEL SECURITY;

-- Option B: Alternatively, if you want RLS enabled, run the following permissive policies:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable read access for all" ON profiles FOR SELECT USING (true);
-- CREATE POLICY "Enable insert for all" ON profiles FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Enable update for all" ON profiles FOR UPDATE USING (true);
-- (Apply similar policies to other tables if keeping RLS enabled)

