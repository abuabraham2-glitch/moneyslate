
-- Enums
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid');
CREATE TYPE po_status AS ENUM ('draft', 'sent', 'received', 'billed');
CREATE TYPE bill_status AS ENUM ('unpaid', 'paid');
CREATE TYPE bank_txn_type AS ENUM ('credit', 'debit');
CREATE TYPE bank_match_status AS ENUM ('unmatched', 'matched', 'ignored');

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- CLIENTS
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text, contact_email text, contact_phone text,
  billing_street text, billing_city text, billing_state text, billing_zip text,
  shipping_street text, shipping_city text, shipping_state text, shipping_zip text,
  ap_contact_name text, ap_contact_email text, ap_contact_phone text,
  payment_terms text DEFAULT 'Net 30',
  notes text,
  external_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- VENDORS
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text, email text, phone text,
  street text, city text, state text, zip text,
  payment_terms text DEFAULT 'Net 30',
  notes text,
  external_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_vendors_updated BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- INVOICES
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE RESTRICT,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  client_po_number text,
  payment_terms text,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  status invoice_status NOT NULL DEFAULT 'draft',
  date_sent timestamptz,
  date_paid date,
  payment_method text,
  payment_notes text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_invoices_client ON public.invoices(client_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);

CREATE TABLE public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text,
  quantity numeric(14,4) NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  line_total numeric(14,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0
);
CREATE INDEX idx_invoice_lines_invoice ON public.invoice_line_items(invoice_id);

-- PURCHASE ORDERS
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE NOT NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE RESTRICT,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  internal_po_number text,
  ship_to_name text,
  ship_to_street text, ship_to_city text, ship_to_state text, ship_to_zip text,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  status po_status NOT NULL DEFAULT 'draft',
  date_sent timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_pos_updated BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_pos_vendor ON public.purchase_orders(vendor_id);

CREATE TABLE public.po_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  description text,
  quantity numeric(14,4) NOT NULL DEFAULT 1,
  unit_cost numeric(14,2) NOT NULL DEFAULT 0,
  line_total numeric(14,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0
);
CREATE INDEX idx_po_lines_po ON public.po_line_items(po_id);

-- BILLS
CREATE TABLE public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number text NOT NULL,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE RESTRICT,
  linked_po_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  bill_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  total numeric(14,2) NOT NULL DEFAULT 0,
  status bill_status NOT NULL DEFAULT 'unpaid',
  date_paid date,
  payment_method text,
  payment_notes text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_bills_updated BEFORE UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_bills_vendor ON public.bills(vendor_id);

CREATE TABLE public.bill_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  description text,
  quantity numeric(14,4) NOT NULL DEFAULT 1,
  unit_cost numeric(14,2) NOT NULL DEFAULT 0,
  line_total numeric(14,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0
);
CREATE INDEX idx_bill_lines_bill ON public.bill_line_items(bill_id);

-- EXPENSES
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  vendor_name text,
  category text,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  payment_method text,
  receipt_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX idx_expenses_category ON public.expenses(category);

-- BANK TRANSACTIONS
CREATE TABLE public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name text,
  txn_date date NOT NULL,
  description text,
  amount numeric(14,2) NOT NULL,
  txn_type bank_txn_type NOT NULL,
  match_status bank_match_status NOT NULL DEFAULT 'unmatched',
  matched_to_type text,
  matched_to_id uuid,
  imported_batch_id uuid,
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_bank_txns_updated BEFORE UPDATE ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_bank_txns_status ON public.bank_transactions(match_status);
CREATE INDEX idx_bank_txns_date ON public.bank_transactions(txn_date);

-- SETTINGS (single row)
CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text DEFAULT 'My Company',
  company_logo_url text,
  company_address text,
  company_phone text,
  company_email text,
  default_payment_terms text DEFAULT 'Net 30',
  default_tax_rate numeric(6,4) DEFAULT 0,
  next_invoice_number int DEFAULT 1001,
  next_po_number int DEFAULT 1001,
  next_bill_number int DEFAULT 1001,
  email_webhook_url text,
  command_center_api_key text DEFAULT encode(gen_random_bytes(24),'hex'),
  theme text DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.settings (company_name) VALUES ('My Company');

-- EXPENSE CATEGORIES
CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  sort_order int DEFAULT 0
);
INSERT INTO public.expense_categories (name, sort_order) VALUES
('Advertising',1),('Car & Truck Expenses',2),('Commissions & Fees',3),('Contract Labor',4),
('Insurance',5),('Legal & Professional',6),('Office Expense',7),('Rent or Lease',8),
('Repairs & Maintenance',9),('Supplies',10),('Taxes & Licenses',11),('Travel',12),
('Meals',13),('Utilities',14),('Software & Subscriptions',15),('Bank Fees',16),('Other',99);

-- ACTIVITY LOG
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_created ON public.activity_log(created_at DESC);

-- CSV MAPPINGS
CREATE TABLE public.csv_column_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mapping jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- AUTO-NUMBERING FUNCTIONS
CREATE OR REPLACE FUNCTION public.get_next_invoice_number()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  UPDATE public.settings SET next_invoice_number = next_invoice_number + 1 RETURNING next_invoice_number - 1 INTO n;
  RETURN 'INV-' || n;
END $$;

CREATE OR REPLACE FUNCTION public.get_next_po_number()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  UPDATE public.settings SET next_po_number = next_po_number + 1 RETURNING next_po_number - 1 INTO n;
  RETURN 'PO-' || n;
END $$;

CREATE OR REPLACE FUNCTION public.get_next_bill_number()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  UPDATE public.settings SET next_bill_number = next_bill_number + 1 RETURNING next_bill_number - 1 INTO n;
  RETURN 'BILL-' || n;
END $$;

-- RLS: enable on all, allow all authenticated users (single-user app)
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['clients','vendors','invoices','invoice_line_items','purchase_orders','po_line_items','bills','bill_line_items','expenses','bank_transactions','settings','expense_categories','activity_log','csv_column_mappings'])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('CREATE POLICY "auth_all" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t);
  END LOOP;
END $$;

-- STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts','receipts', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('outbound-pdfs','outbound-pdfs', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('logos','logos', true) ON CONFLICT DO NOTHING;

CREATE POLICY "auth receipts all" ON storage.objects FOR ALL TO authenticated USING (bucket_id='receipts') WITH CHECK (bucket_id='receipts');
CREATE POLICY "auth pdfs all" ON storage.objects FOR ALL TO authenticated USING (bucket_id='outbound-pdfs') WITH CHECK (bucket_id='outbound-pdfs');
CREATE POLICY "public pdfs read" ON storage.objects FOR SELECT TO public USING (bucket_id='outbound-pdfs');
CREATE POLICY "auth logos all" ON storage.objects FOR ALL TO authenticated USING (bucket_id='logos') WITH CHECK (bucket_id='logos');
CREATE POLICY "public logos read" ON storage.objects FOR SELECT TO public USING (bucket_id='logos');
