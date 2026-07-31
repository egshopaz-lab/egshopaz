export type ProductAttributeValue = string | number | boolean;

export interface ProductVariantValue {
  id?: string;
  attributes: Record<string, string>;
  sku?: string;
  barcode?: string;
  stock: number;
  min_stock?: number;
  price?: number;
  old_price?: number;
  image_url?: string;
  is_active?: boolean;
  // Legacy fields remain readable while old products are projected.
  name?: string;
  value?: string;
}

export function normalizeProductVariants(raw: unknown, basePrice = 0): ProductVariantValue[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const value = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const attributes = value.attributes && typeof value.attributes === "object" && !Array.isArray(value.attributes)
      ? Object.fromEntries(Object.entries(value.attributes as Record<string, unknown>).map(([key, attribute]) => [key, String(attribute ?? "")]))
      : value.name || value.value
        ? { [String(value.name || "variant").toLocaleLowerCase("az")]: String(value.value ?? "") }
        : {};
    return {
      id: typeof value.id === "string" ? value.id : `legacy-${index}`,
      attributes,
      sku: typeof value.sku === "string" ? value.sku : "",
      barcode: typeof value.barcode === "string" ? value.barcode : "",
      stock: Math.max(0, Number(value.stock ?? 0) || 0),
      min_stock: Math.max(0, Number(value.min_stock ?? 0) || 0),
      price: Math.max(0, Number(value.price ?? basePrice) || basePrice),
      old_price: value.old_price == null ? undefined : Math.max(0, Number(value.old_price) || 0),
      image_url: typeof value.image_url === "string" ? value.image_url : "",
      is_active: value.is_active !== false,
    };
  });
}

export function makeVariantId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `variant-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
