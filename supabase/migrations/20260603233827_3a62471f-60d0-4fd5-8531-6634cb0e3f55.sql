CREATE TABLE public.reconciliation_matches (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_txn_id uuid NOT NULL REFERENCES public.bank_transactions(id) ON DELETE CASCADE,
    record_type text NOT NULL,
    record_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_reconciliation_matches_bank_txn_id ON public.reconciliation_matches(bank_txn_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reconciliation_matches TO authenticated;
GRANT ALL ON public.reconciliation_matches TO service_role;

ALTER TABLE public.reconciliation_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON public.reconciliation_matches FOR ALL TO authenticated USING (true) WITH CHECK (true);