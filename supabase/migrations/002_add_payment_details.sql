-- =============================================
-- MIGRATION: 002_add_payment_details
-- Add support for payment method and installments
-- =============================================

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS installments INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';

-- Update existing records to have defaults (optional, but good for consistency if ALTER didn't do it)
UPDATE expenses SET installments = 1 WHERE installments IS NULL;
UPDATE expenses SET payment_method = 'cash' WHERE payment_method IS NULL;
