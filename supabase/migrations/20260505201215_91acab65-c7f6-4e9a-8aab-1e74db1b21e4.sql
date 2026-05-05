-- Migrate any existing 'received' POs to 'sent' before reshaping enum
UPDATE public.purchase_orders SET status = 'sent' WHERE status::text = 'received';

-- Recreate po_status enum to be exactly: draft, sent, completed, cancelled
ALTER TYPE public.po_status RENAME TO po_status_old;

CREATE TYPE public.po_status AS ENUM ('draft', 'sent', 'completed', 'cancelled');

ALTER TABLE public.purchase_orders
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public.po_status USING status::text::public.po_status,
  ALTER COLUMN status SET DEFAULT 'draft'::public.po_status;

DROP TYPE public.po_status_old;