ALTER TABLE public.invoice_line_items ALTER COLUMN unit_price TYPE numeric(18,8);
ALTER TABLE public.po_line_items ALTER COLUMN unit_cost TYPE numeric(18,8);
ALTER TABLE public.bill_line_items ALTER COLUMN unit_cost TYPE numeric(18,8);