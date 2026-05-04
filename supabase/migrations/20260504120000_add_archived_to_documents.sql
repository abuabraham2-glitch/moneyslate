ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
