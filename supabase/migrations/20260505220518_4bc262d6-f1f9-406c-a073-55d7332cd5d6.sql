ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS memo text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS memo text;