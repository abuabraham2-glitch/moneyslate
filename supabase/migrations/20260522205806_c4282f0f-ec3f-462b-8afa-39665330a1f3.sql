
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END
$$;

REVOKE EXECUTE ON FUNCTION public.get_next_invoice_number() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_next_po_number() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_next_internal_po_number() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_next_invoice_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_po_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_internal_po_number() TO authenticated;
