-- =============================================
-- MIGRATION: 003_personal_finance_schema
-- Transition to Personal Finance & Debt Manager
-- =============================================

-- 1. Create CONTACTS table
-- To track people/entities we owe money to or who owe us
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'person', -- 'person', 'business', etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) -- Optional: if we want to link contacts to the logged-in user private list
);

-- Enable RLS for contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read contacts" ON contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert contacts" ON contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update contacts" ON contacts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete contacts" ON contacts FOR DELETE TO authenticated USING (true);


-- 2. Modify EXPENSES table for Installments & Debts
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS installment_number INTEGER DEFAULT NULL,      -- e.g. 1
ADD COLUMN IF NOT EXISTS installments_total INTEGER DEFAULT NULL,       -- e.g. 12
ADD COLUMN IF NOT EXISTS group_id UUID DEFAULT NULL,                    -- Common ID to link all monthly records of the same purchase
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id),       -- Link to a contact if this is a loan/debt
ADD COLUMN IF NOT EXISTS is_debt_settlement BOOLEAN DEFAULT FALSE;      -- True if this payment pays off a debt

-- Index for querying installments
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_contact_id ON expenses(contact_id);
