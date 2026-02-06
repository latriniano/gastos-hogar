-- =============================================
-- MIGRATION: 005_multiple_debtors
-- Support for multiple debtors per expense
-- =============================================

-- 1. Create table linking expenses to multiple contacts
CREATE TABLE IF NOT EXISTS expense_debtors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    amount NUMERIC(12,2), -- Optional specific amount. If NULL, logic calculates split.
    is_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(expense_id, contact_id)
);

-- 2. Enable RLS
ALTER TABLE expense_debtors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read expense_debtors" ON expense_debtors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert expense_debtors" ON expense_debtors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update expense_debtors" ON expense_debtors FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete expense_debtors" ON expense_debtors FOR DELETE TO authenticated USING (true);

-- 3. Data Migration: Move existing single-contact relationships to the new table
-- We insert into expense_debtors where contact_id is set in expenses
INSERT INTO expense_debtors (expense_id, contact_id)
SELECT id, contact_id
FROM expenses
WHERE contact_id IS NOT NULL;

-- 4. (Optional) We keep expenses.contact_id for now as "Primary Contact" or for query compatibility,
-- or we could drop it later. For now, we won't drop it to avoid breaking running code immediately,
-- but the App will prefer expense_debtors.
