-- Redefine the block_ledger_mutation function to allow status updates from QUARANTINE
CREATE OR REPLACE FUNCTION block_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status = 'QUARANTINE') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Financial Ledger is immutable. UPDATE and DELETE actions are strictly forbidden.';
END;
$$ LANGUAGE plpgsql;
