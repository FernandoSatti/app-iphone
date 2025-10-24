-- Update the check constraint to include all transaction types used in the application
ALTER TABLE account_transactions DROP CONSTRAINT IF EXISTS account_transactions_type_check;

ALTER TABLE account_transactions ADD CONSTRAINT account_transactions_type_check 
  CHECK (type IN ('sale', 'payment', 'debt', 'manual_debt', 'purchase', 'payment_to_provider'));
