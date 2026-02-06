-- =============================================
-- TABLA: users
-- Perfil de cada miembro del hogar
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLA: categories
-- Categorias de gastos con split default
-- =============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  default_split_percentage NUMERIC(5,2) DEFAULT 50.00,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLA: expenses
-- Cada gasto individual registrado
-- =============================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS',
  exchange_rate NUMERIC(10,2) DEFAULT 1.00,
  category_id UUID NOT NULL REFERENCES categories(id),
  paid_by UUID NOT NULL REFERENCES users(id),
  split_percentage NUMERIC(5,2),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLA: recurring_expenses
-- Reglas para generar gastos automaticos
-- =============================================
CREATE TABLE recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS',
  category_id UUID NOT NULL REFERENCES categories(id),
  paid_by UUID NOT NULL REFERENCES users(id),
  split_percentage NUMERIC(5,2),
  frequency TEXT DEFAULT 'monthly',
  start_date DATE NOT NULL,
  next_due_date DATE NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLA: settlements
-- Pagos/liquidaciones entre las personas
-- =============================================
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paid_by UUID NOT NULL REFERENCES users(id),
  paid_to UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDICES
-- =============================================
CREATE INDEX idx_expenses_date ON expenses(date DESC);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_paid_by ON expenses(paid_by);
CREATE INDEX idx_settlements_date ON settlements(date DESC);

-- =============================================
-- SEED: Categorias Predefinidas
-- =============================================
INSERT INTO categories (name, icon, default_split_percentage) VALUES
  ('Supermercado / Comida',     'shopping-cart',  50.00),
  ('Alquiler',                  'home',           50.00),
  ('Servicios (luz, gas, agua)','zap',            50.00),
  ('Internet / Telefono',       'wifi',           50.00),
  ('Limpieza / Hogar',          'sparkles',       50.00),
  ('Salud',                     'heart-pulse',    50.00),
  ('Transporte',                'car',            50.00),
  ('Entretenimiento / Salidas', 'party-popper',   50.00),
  ('Ropa',                      'shirt',          50.00),
  ('Mascotas',                  'paw-print',      50.00),
  ('Otros',                     'package',        50.00);

-- =============================================
-- RLS (Row Level Security)
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Politicas: todos los usuarios autenticados pueden leer y escribir
-- (app de 2 personas, ambos necesitan acceso total)
CREATE POLICY "Authenticated users can read users" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert users" ON users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update users" ON users FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert categories" ON categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update categories" ON categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete categories" ON categories FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read expenses" ON expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert expenses" ON expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update expenses" ON expenses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete expenses" ON expenses FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read recurring_expenses" ON recurring_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert recurring_expenses" ON recurring_expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update recurring_expenses" ON recurring_expenses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete recurring_expenses" ON recurring_expenses FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read settlements" ON settlements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert settlements" ON settlements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update settlements" ON settlements FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete settlements" ON settlements FOR DELETE TO authenticated USING (true);
