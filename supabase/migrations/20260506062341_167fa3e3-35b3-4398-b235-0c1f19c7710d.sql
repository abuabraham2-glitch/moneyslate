-- Migrate existing bills: copy vendor_bill_number to bill_number where present, otherwise keep existing bill_number as fallback
UPDATE public.bills SET bill_number = vendor_bill_number WHERE vendor_bill_number IS NOT NULL AND vendor_bill_number <> '';

-- Drop the auto-numbering RPC and counter column; bills are no longer system-numbered
DROP FUNCTION IF EXISTS public.get_next_bill_number();
ALTER TABLE public.settings DROP COLUMN IF EXISTS next_bill_number;

-- Drop the now-redundant vendor_bill_number column (the user's value lives in bill_number)
ALTER TABLE public.bills DROP COLUMN IF EXISTS vendor_bill_number;