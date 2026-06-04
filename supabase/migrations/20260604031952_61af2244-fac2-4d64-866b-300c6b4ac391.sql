ALTER TABLE public.invoices ADD COLUMN reconciled_at timestamptz DEFAULT NULL;
ALTER TABLE public.bills ADD COLUMN reconciled_at timestamptz DEFAULT NULL;
ALTER TABLE public.expenses ADD COLUMN reconciled_at timestamptz DEFAULT NULL;
ALTER TABLE public.reconciliation_matches ADD COLUMN bank_reference text DEFAULT NULL;