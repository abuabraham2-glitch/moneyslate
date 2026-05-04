ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS next_internal_po_number integer DEFAULT 1001;

CREATE OR REPLACE FUNCTION public.get_next_internal_po_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  settings_id uuid;
  n int;
BEGIN
  SELECT id INTO settings_id FROM public.settings ORDER BY created_at ASC LIMIT 1;
  IF settings_id IS NULL THEN RAISE EXCEPTION 'Settings row not found'; END IF;
  UPDATE public.settings
  SET next_internal_po_number = COALESCE(next_internal_po_number, 1001) + 1
  WHERE id = settings_id
  RETURNING next_internal_po_number - 1 INTO n;
  RETURN n::text;
END;
$function$;