ALTER TABLE public.expenses DROP COLUMN category;
ALTER TABLE public.expenses ADD COLUMN category_id uuid NOT NULL REFERENCES public.expense_categories(id);
CREATE INDEX idx_expenses_category_id ON public.expenses(category_id);