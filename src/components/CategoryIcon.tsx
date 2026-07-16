import type { LucideIcon } from "lucide-react";
import {
  Baby,
  Bath,
  Bike,
  BookOpen,
  BriefcaseBusiness,
  Camera,
  Car,
  ChefHat,
  CircuitBoard,
  Clock3,
  Dumbbell,
  Gamepad2,
  Gift,
  Hammer,
  Headphones,
  HeartPulse,
  Home,
  HousePlug,
  Laptop,
  LayoutGrid,
  Leaf,
  Luggage,
  Monitor,
  Music2,
  Package,
  Palette,
  PawPrint,
  PlugZap,
  Printer,
  Refrigerator,
  Router,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Tablet,
  Watch,
  Wind,
  Wrench,
} from "lucide-react";

export interface CategoryIconSource {
  slug?: string | null;
  name?: string | null;
}

const ICON_RULES: Array<[RegExp, LucideIcon]> = [
  [/smartfon|telefon|mobile|iphone|android/, Smartphone],
  [/noutbuk|laptop|notebook|komputer|computer|pc/, Laptop],
  [/planset|tablet|ipad/, Tablet],
  [/monitor|ekran|display|televizor|tv/, Monitor],
  [/printer|skaner|scanner|copier/, Printer],
  [/kamera|camera|foto|video|dron/, Camera],
  [/qulaqciq|headphone|earphone|audio|dinamik|speaker|mikrofon/, Headphones],
  [/saat|watch|clock/, Watch],
  [/oyun|gaming|game|konsol|geymer/, Gamepad2],
  [/sebeke|network|router|modem/, Router],
  [/kabel|cable|adapter|charger|sarj|enerji|power/, PlugZap],
  [/geyim|paltar|shirt|dress|fashion|koynek|don/, Shirt],
  [/ayaqqabi|shoes|sneaker|bot|sandal/, ShoppingBag],
  [/canta|handbag|backpack|camadan/, Luggage],
  [/zinet|jewelry|bijuteriya|aksesuar/, Sparkles],
  [/gozellik|beauty|kosmetik|makiyaj|parfum/, Bath],
  [/usaq|korpe|baby|oyuncaq|toy/, Baby],
  [/smart-ev|smart home/, HousePlug],
  [/ev|home|mebel|interyer|dekor|tekstil/, Home],
  [/metbex|kitchen|qab|cook/, ChefHat],
  [/meiset|refrigerator|soyuducu/, Refrigerator],
  [/iqlim|kondisioner|climate/, Wind],
  [/bag|bagca|garden|bitki|gul|flower/, Leaf],
  [/velosiped|bike|skuter/, Bike],
  [/avto|auto|car|motosiklet|neqliyyat/, Car],
  [/alet|tool|temir|tikinti/, Wrench],
  [/idman|sport|fitness|futbol/, Dumbbell],
  [/heyvan|pet|pisik|it-ucun|zoo/, PawPrint],
  [/kitab|book|defter|school/, BookOpen],
  [/ofis|business|biznes/, BriefcaseBusiness],
  [/qida|food|market|erzaq|icki/, ShoppingBasket],
  [/saglam|health|tibbi|medical|aptek/, HeartPulse],
  [/hediyye|gift|suvenir/, Gift],
  [/musiqi|music|gitara|piano/, Music2],
  [/seyahet|travel|turizm/, Luggage],
  [/tiki|el-isi|handmade/, Wrench],
  [/senet|ressam|resm|art/, Palette],
  [/elektronika|electronic|texnika/, CircuitBoard],
  [/paket|package/, Package],
  [/saat|time/, Clock3],
  [/tikinti|construction/, Hammer],
];

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("az")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i");

export function CategoryIcon({ category, className = "h-5 w-5" }: { category?: CategoryIconSource | null; className?: string }) {
  const searchable = normalize(`${category?.slug ?? ""} ${category?.name ?? ""}`);
  const Icon = ICON_RULES.find(([pattern]) => pattern.test(searchable))?.[1] ?? LayoutGrid;
  return <Icon className={className} aria-hidden="true" strokeWidth={1.8} />;
}
