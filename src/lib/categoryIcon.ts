interface CategoryIconSource {
  icon?: string | null;
  slug?: string | null;
  name?: string | null;
}

const ICON_RULES: Array<[RegExp, string]> = [
  [/smartfon|telefon|mobile|iphone|android/, "📱"],
  [/noutbuk|laptop|notebook|komputer|computer|pc/, "💻"],
  [/planset|tablet|ipad/, "📲"],
  [/monitor|ekran|display|televizor|tv/, "🖥️"],
  [/printer|skaner|scanner|copier/, "🖨️"],
  [/kamera|camera|foto|video/, "📷"],
  [/qulaqciq|headphone|earphone/, "🎧"],
  [/audio|dinamik|speaker|mikrofon/, "🔊"],
  [/saat|watch|clock/, "⌚"],
  [/oyun|gaming|game|konsol/, "🎮"],
  [/kabel|cable|adapter|charger|sarj|enerji|power/, "🔌"],
  [/geyim|paltar|shirt|dress|fashion|koynek|don/, "👕"],
  [/ayaqqabi|shoes|sneaker|bot|sandal/, "👟"],
  [/canta|handbag|backpack|camadan/, "👜"],
  [/zinət|zinet|jewelry|bijuteriya|aksesuar/, "💍"],
  [/gozellik|beauty|kosmetik|makiyaj|parfum/, "💄"],
  [/usaq|korpə|korpe|baby|oyuncaq|toy/, "🧸"],
  [/ev|home|mebel|interyer|dekor/, "🏠"],
  [/metbex|mətbəx|kitchen|qab|cook/, "🍳"],
  [/(^|[-\s])bag($|[-\s])|bagca|garden|bitki|gul|flower/, "🌿"],
  [/avto|auto|car|motosiklet|neqliyyat/, "🚗"],
  [/alet|alət|tool|temir|tikinti/, "🔧"],
  [/idman|sport|fitness|futbol/, "⚽"],
  [/heyvan|pet|pisik|it-ucun|zoo/, "🐾"],
  [/kitab|book|dəftər|defter|ofis|school/, "📚"],
  [/qida|food|market|erzaq|ərzaq|icki|içki/, "🛒"],
  [/saglam|sağlam|health|tibbi|medical|aptek/, "💊"],
  [/hediyye|hədiyyə|gift|suvenir/, "🎁"],
];

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("az")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i");

/** Returns a stable category-specific icon without inheriting a parent icon. */
export function categoryIcon(category: CategoryIconSource): string {
  const ownIcon = category.icon?.trim();
  if (ownIcon && ownIcon !== "➕") return ownIcon;

  const searchable = normalize(`${category.slug ?? ""} ${category.name ?? ""}`);
  return ICON_RULES.find(([pattern]) => pattern.test(searchable))?.[1] ?? "🛍️";
}
