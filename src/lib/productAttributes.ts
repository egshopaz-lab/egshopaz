export type ProductAttributeValue = string | number | boolean;

export interface ProductVariantValue {
  id?: string;
  attributes: Record<string, string>;
  sku?: string;
  barcode?: string;
  stock: number;
  price?: number;
  image_url?: string;
  is_active?: boolean;
  // Legacy fields are kept while old products are migrated in the UI.
  name?: string;
  value?: string;
}

export interface ProductAttributeDefinition {
  key: string;
  label: string;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  variant?: boolean;
}

export interface ProductAttributeTemplate {
  id: string;
  label: string;
  match: RegExp;
  specifications: ProductAttributeDefinition[];
  variantAxes: ProductAttributeDefinition[];
}

const COLORS = ["Qara", "AÄź", "Boz", "QÄ±rmÄ±zÄ±", "Mavi", "YaĹźÄ±l", "SarÄ±", "Ă‡É™hrayÄ±", "BÉ™nĂ¶vĹźÉ™yi", "Bej", "QÉ™hvÉ™yi", "NarÄ±ncÄ±"];
const CLOTHING_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];
const SHOE_SIZES = Array.from({ length: 17 }, (_, index) => String(index + 28));

const commonColor: ProductAttributeDefinition = {
  key: "color",
  label: "RÉ™ng",
  options: COLORS,
  variant: true,
};

export const PRODUCT_ATTRIBUTE_TEMPLATES: ProductAttributeTemplate[] = [
  {
    id: "clothing",
    label: "Geyim",
    match: /geyim|paltar|don|kĂ¶ynÉ™k|Ĺźalvar|kostyum|alt paltarÄ±|clothing|apparel|fashion/i,
    specifications: [
      { key: "gender", label: "Cins", options: ["QadÄ±n", "KiĹźi", "Uniseks", "UĹźaq"], required: true },
      { key: "material", label: "Material", placeholder: "MÉ™sÉ™lÉ™n: 95% pambÄ±q, 5% elastan", required: true },
      { key: "season", label: "MĂ¶vsĂĽm", options: ["Yaz", "Yay", "PayÄ±z", "QÄ±Ĺź", "BĂĽtĂĽn mĂ¶vsĂĽmlÉ™r"] },
      { key: "fit", label: "KÉ™sim", options: ["Slim fit", "Regular fit", "Oversize", "Loose fit"] },
      { key: "origin", label: "Ä°stehsal Ă¶lkÉ™si", placeholder: "AzÉ™rbaycan" },
      { key: "care", label: "Qulluq qaydasÄ±", placeholder: "30Â°C-dÉ™ yuma" },
    ],
    variantAxes: [commonColor, { key: "size", label: "Ă–lĂ§ĂĽ", options: CLOTHING_SIZES, variant: true }],
  },
  {
    id: "shoes",
    label: "AyaqqabÄ±",
    match: /ayaqqabÄ±|Ă§É™kmÉ™|sandal|krossovka|shoe|sneaker|boots/i,
    specifications: [
      { key: "gender", label: "Cins", options: ["QadÄ±n", "KiĹźi", "Uniseks", "UĹźaq"], required: true },
      { key: "upper_material", label: "Ăśst material", placeholder: "DÉ™ri, tekstil vÉ™ s." },
      { key: "sole_material", label: "AltlÄ±q materialÄ±", placeholder: "Rezin" },
      { key: "season", label: "MĂ¶vsĂĽm", options: ["Yaz", "Yay", "PayÄ±z", "QÄ±Ĺź", "BĂĽtĂĽn mĂ¶vsĂĽmlÉ™r"] },
    ],
    variantAxes: [commonColor, { key: "size", label: "Ă–lĂ§ĂĽ", options: SHOE_SIZES, variant: true }],
  },
  {
    id: "electronics",
    label: "Elektronika",
    match: /elektron|telefon|smartfon|kompĂĽter|noutbuk|planĹźet|televizor|qulaqcÄ±q|electronics|phone|laptop/i,
    specifications: [
      { key: "model", label: "Model", required: true },
      { key: "warranty", label: "ZÉ™manÉ™t", options: ["ZÉ™manÉ™tsiz", "3 ay", "6 ay", "12 ay", "24 ay"] },
      { key: "operating_system", label: "ĆŹmÉ™liyyat sistemi" },
      { key: "screen", label: "Ekran", placeholder: "6.7 dĂĽym, AMOLED" },
      { key: "battery", label: "Batareya", placeholder: "5000 mAh" },
      { key: "origin", label: "Ä°stehsal Ă¶lkÉ™si" },
    ],
    variantAxes: [
      commonColor,
      { key: "storage", label: "YaddaĹź", options: ["32 GB", "64 GB", "128 GB", "256 GB", "512 GB", "1 TB", "2 TB"], variant: true },
      { key: "ram", label: "RAM", options: ["4 GB", "6 GB", "8 GB", "12 GB", "16 GB", "32 GB", "64 GB"], variant: true },
    ],
  },
  {
    id: "beauty",
    label: "GĂ¶zÉ™llik vÉ™ baxÄ±m",
    match: /gĂ¶zÉ™llik|kosmetik|makiyaj|É™tir|parfĂĽm|Ĺźampun|beauty|cosmetic|perfume/i,
    specifications: [
      { key: "brand_line", label: "MÉ™hsul seriyasÄ±" },
      { key: "skin_type", label: "DÉ™ri tipi", options: ["BĂĽtĂĽn dÉ™ri tiplÉ™ri", "Quru", "YaÄźlÄ±", "QarÄ±ĹźÄ±q", "HÉ™ssas"] },
      { key: "expiry", label: "YararlÄ±lÄ±q mĂĽddÉ™ti", placeholder: "AĂ§Ä±ldÄ±qdan sonra 12 ay" },
      { key: "origin", label: "Ä°stehsal Ă¶lkÉ™si" },
    ],
    variantAxes: [
      { key: "shade", label: "Ton / Ă§alar", variant: true },
      { key: "volume", label: "HÉ™cm", options: ["15 ml", "30 ml", "50 ml", "75 ml", "100 ml", "150 ml", "200 ml", "500 ml"], variant: true },
    ],
  },
  {
    id: "home",
    label: "Ev vÉ™ mebel",
    match: /ev vÉ™|mebel|mÉ™tbÉ™x|tekstil|yataq|divan|stol|home|furniture|kitchen/i,
    specifications: [
      { key: "material", label: "Material", required: true },
      { key: "dimensions", label: "Ă–lĂ§ĂĽlÉ™r", placeholder: "En Ă— hĂĽndĂĽrlĂĽk Ă— dÉ™rinlik" },
      { key: "assembly", label: "QuraĹźdÄ±rma", options: ["TÉ™lÉ™b olunmur", "MĂĽĹźtÉ™ri quraĹźdÄ±rÄ±r", "SatÄ±cÄ± quraĹźdÄ±rÄ±r"] },
      { key: "origin", label: "Ä°stehsal Ă¶lkÉ™si" },
    ],
    variantAxes: [commonColor, { key: "size", label: "Ă–lĂ§ĂĽ", placeholder: "90Ă—200 sm", variant: true }],
  },
  {
    id: "kids",
    label: "UĹźaq mÉ™hsullarÄ±",
    match: /uĹźaq|kĂ¶rpÉ™|oyuncaq|kids|baby|toy/i,
    specifications: [
      { key: "age_group", label: "YaĹź qrupu", options: ["0â€“3 ay", "3â€“6 ay", "6â€“12 ay", "1â€“2 yaĹź", "3â€“5 yaĹź", "6â€“9 yaĹź", "10+ yaĹź"], required: true },
      { key: "material", label: "Material" },
      { key: "safety", label: "TÉ™hlĂĽkÉ™sizlik sertifikatÄ±" },
    ],
    variantAxes: [commonColor, { key: "size", label: "Ă–lĂ§ĂĽ", variant: true }],
  },
  {
    id: "automotive",
    label: "Avtomobil mÉ™hsullarÄ±",
    match: /avtomobil|ehtiyat hiss|Ĺźin|yaÄź|aksesuar|automotive|car part|tyre/i,
    specifications: [
      { key: "part_number", label: "Detal nĂ¶mrÉ™si / OEM", required: true },
      { key: "compatibility", label: "UyÄźun avtomobil", placeholder: "Marka, model vÉ™ buraxÄ±lÄ±Ĺź ili", required: true },
      { key: "condition", label: "VÉ™ziyyÉ™t", options: ["Yeni", "Ä°ĹźlÉ™nmiĹź", "BÉ™rpa edilmiĹź"] },
      { key: "warranty", label: "ZÉ™manÉ™t" },
    ],
    variantAxes: [{ key: "configuration", label: "Konfiqurasiya", placeholder: "Sol / saÄź, Ă¶n / arxa", variant: true }],
  },
  {
    id: "food",
    label: "Qida mÉ™hsullarÄ±",
    match: /qida|É™rzaq|iĂ§ki|Ĺźirniyyat|food|grocery|drink/i,
    specifications: [
      { key: "ingredients", label: "TÉ™rkib", required: true },
      { key: "expiry_date", label: "Son istifadÉ™ tarixi", required: true },
      { key: "storage_conditions", label: "Saxlama ĹźÉ™raiti" },
      { key: "origin", label: "Ä°stehsal Ă¶lkÉ™si" },
    ],
    variantAxes: [
      { key: "weight_volume", label: "Ă‡É™ki / hÉ™cm", options: ["100 q", "250 q", "500 q", "1 kq", "250 ml", "500 ml", "1 l"], variant: true },
      { key: "flavor", label: "Dad", variant: true },
    ],
  },
  {
    id: "generic",
    label: "Ăśmumi mÉ™hsul",
    match: /.*/,
    specifications: [
      { key: "material", label: "Material" },
      { key: "model", label: "Model" },
      { key: "origin", label: "Ä°stehsal Ă¶lkÉ™si" },
      { key: "warranty", label: "ZÉ™manÉ™t" },
    ],
    variantAxes: [commonColor, { key: "size", label: "Ă–lĂ§ĂĽ", variant: true }],
  },
];

export function getProductAttributeTemplate(categoryContext: string) {
  return PRODUCT_ATTRIBUTE_TEMPLATES.find((template) => template.match.test(categoryContext))
    ?? PRODUCT_ATTRIBUTE_TEMPLATES[PRODUCT_ATTRIBUTE_TEMPLATES.length - 1];
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
      price: Math.max(0, Number(value.price ?? basePrice) || basePrice),
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

