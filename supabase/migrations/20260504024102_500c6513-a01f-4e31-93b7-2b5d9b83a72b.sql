-- 1. Harden auto-numbering RPCs with SECURITY DEFINER so they reliably bump the counter
CREATE OR REPLACE FUNCTION public.get_next_invoice_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE public.settings SET next_invoice_number = next_invoice_number + 1 RETURNING next_invoice_number - 1 INTO n;
  RETURN 'INV-' || n;
END $$;

CREATE OR REPLACE FUNCTION public.get_next_po_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE public.settings SET next_po_number = next_po_number + 1 RETURNING next_po_number - 1 INTO n;
  RETURN 'PO-' || n;
END $$;

CREATE OR REPLACE FUNCTION public.get_next_bill_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE public.settings SET next_bill_number = next_bill_number + 1 RETURNING next_bill_number - 1 INTO n;
  RETURN 'BILL-' || n;
END $$;

-- 2. Products & Services catalog
DO $$ BEGIN
  CREATE TYPE public.product_service_type AS ENUM ('product', 'service');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.products_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  default_description text,
  default_price numeric,
  default_cost numeric,
  type public.product_service_type NOT NULL DEFAULT 'service',
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_all ON public.products_services;
CREATE POLICY auth_all ON public.products_services FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_products_services_updated_at ON public.products_services;
CREATE TRIGGER trg_products_services_updated_at BEFORE UPDATE ON public.products_services
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed common items (only if empty)
INSERT INTO public.products_services (name, type, sort_order)
SELECT v.name, 'service'::public.product_service_type, v.so
FROM (VALUES
  ('Print', 1), ('Setup Charge', 2), ('Film', 3), ('Screen', 4),
  ('Shipping', 5), ('Rush Fee', 6), ('Artwork Setup', 7), ('Color Match', 8)
) AS v(name, so)
WHERE NOT EXISTS (SELECT 1 FROM public.products_services);

-- Optional reference column on line items (no FK to keep deletes safe)
ALTER TABLE public.invoice_line_items ADD COLUMN IF NOT EXISTS product_service_id uuid;
ALTER TABLE public.po_line_items ADD COLUMN IF NOT EXISTS product_service_id uuid;
ALTER TABLE public.bill_line_items ADD COLUMN IF NOT EXISTS product_service_id uuid;