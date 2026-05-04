CREATE OR REPLACE FUNCTION public.get_next_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  settings_id uuid;
  n int;
BEGIN
  SELECT id INTO settings_id
  FROM public.settings
  ORDER BY created_at ASC
  LIMIT 1;

  IF settings_id IS NULL THEN
    RAISE EXCEPTION 'Settings row not found';
  END IF;

  UPDATE public.settings
  SET next_invoice_number = COALESCE(next_invoice_number, 1001) + 1
  WHERE id = settings_id
  RETURNING next_invoice_number - 1 INTO n;

  RETURN 'INV-' || n;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_next_po_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  settings_id uuid;
  n int;
BEGIN
  SELECT id INTO settings_id
  FROM public.settings
  ORDER BY created_at ASC
  LIMIT 1;

  IF settings_id IS NULL THEN
    RAISE EXCEPTION 'Settings row not found';
  END IF;

  UPDATE public.settings
  SET next_po_number = COALESCE(next_po_number, 1001) + 1
  WHERE id = settings_id
  RETURNING next_po_number - 1 INTO n;

  RETURN 'PO-' || n;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_next_bill_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  settings_id uuid;
  n int;
BEGIN
  SELECT id INTO settings_id
  FROM public.settings
  ORDER BY created_at ASC
  LIMIT 1;

  IF settings_id IS NULL THEN
    RAISE EXCEPTION 'Settings row not found';
  END IF;

  UPDATE public.settings
  SET next_bill_number = COALESCE(next_bill_number, 1001) + 1
  WHERE id = settings_id
  RETURNING next_bill_number - 1 INTO n;

  RETURN 'BILL-' || n;
END;
$$;