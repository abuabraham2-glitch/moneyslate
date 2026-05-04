export type EditableLineItem = {
  id?: string;
  product_service_id?: string | null;
  description: string;
  quantity: number;
  unit_price?: number;
  unit_cost?: number;
  line_total: number;
  sort_order?: number;
};

export type LineItemPriceField = "unit_price" | "unit_cost";
export type LineItemEditedField = "quantity" | LineItemPriceField | "line_total" | "init";

const roundTo = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export function createEmptyLineItem(priceField: LineItemPriceField): EditableLineItem {
  return {
    description: "",
    quantity: 1,
    [priceField]: 0,
    line_total: 0,
  } as EditableLineItem;
}

export function calculateLineItem(
  item: EditableLineItem,
  priceField: LineItemPriceField,
  source: LineItemEditedField = "init",
): EditableLineItem {
  const quantity = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0;
  const currentPrice = Number.isFinite(Number(item[priceField] ?? 0)) ? Number(item[priceField] ?? 0) : 0;
  const currentTotal = Number.isFinite(Number(item.line_total ?? 0)) ? Number(item.line_total ?? 0) : 0;

  let nextPrice = currentPrice;
  let nextTotal = currentTotal;

  if (source === "line_total") {
    nextTotal = roundTo(currentTotal, 2);
    if (quantity > 0) nextPrice = roundTo(nextTotal / quantity, 4);
  } else {
    nextTotal = roundTo(quantity * currentPrice, 2);
  }

  return {
    ...item,
    quantity,
    [priceField]: nextPrice,
    line_total: nextTotal,
  } as EditableLineItem;
}

export function isMeaningfulLineItem(item: EditableLineItem, priceField: LineItemPriceField) {
  return Boolean(
    item.product_service_id ||
    item.description.trim() ||
    Number(item[priceField] ?? 0) !== 0 ||
    Number(item.line_total ?? 0) !== 0,
  );
}

export function normalizeLineItemsForEditor(items: EditableLineItem[], priceField: LineItemPriceField) {
  const cleaned = items
    .filter((item) => isMeaningfulLineItem(item, priceField))
    .map((item) => calculateLineItem(item, priceField));

  return cleaned.length ? cleaned : [createEmptyLineItem(priceField)];
}

export function sanitizeLineItemsForSave(items: EditableLineItem[], priceField: LineItemPriceField) {
  return items
    .filter((item) => isMeaningfulLineItem(item, priceField))
    .map((item, index) => ({ ...calculateLineItem(item, priceField), sort_order: index }));
}