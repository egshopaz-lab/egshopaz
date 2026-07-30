import {
  Baby,
  Blocks,
  BriefcaseBusiness,
  Building2,
  Car,
  CarFront,
  Dumbbell,
  GraduationCap,
  Hospital,
  Hotel,
  PawPrint,
  Plane,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  Ticket,
  Truck,
  Utensils,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export interface BusinessModule {
  code: string;
  name_az: string;
  name_en: string;
  name_ru: string;
  description_az: string | null;
  description_en: string | null;
  description_ru: string | null;
  icon_key: string;
  sort_order: number;
  is_active: boolean;
  activation_fee?: number;
  monthly_fee?: number;
  commission_percent?: number | null;
  config?: Record<string, unknown>;
}

const moduleIcons: Record<string, LucideIcon> = {
  "shopping-bag": ShoppingBag,
  wrench: Wrench,
  utensils: Utensils,
  scissors: Scissors,
  car: Car,
  "building-2": Building2,
  "car-front": CarFront,
  "briefcase-business": BriefcaseBusiness,
  hospital: Hospital,
  hotel: Hotel,
  "graduation-cap": GraduationCap,
  plane: Plane,
  truck: Truck,
  "paw-print": PawPrint,
  ticket: Ticket,
  dumbbell: Dumbbell,
  baby: Baby,
  "shield-check": ShieldCheck,
  blocks: Blocks,
};

export function getBusinessModuleIcon(iconKey: string): LucideIcon {
  return moduleIcons[iconKey] ?? Blocks;
}

export function getBusinessModuleName(module: BusinessModule, language = "az"): string {
  if (language.startsWith("ru")) return module.name_ru || module.name_az;
  if (language.startsWith("en")) return module.name_en || module.name_az;
  return module.name_az;
}

export function getBusinessModuleDescription(module: BusinessModule, language = "az"): string {
  if (language.startsWith("ru")) return module.description_ru || module.description_az || "";
  if (language.startsWith("en")) return module.description_en || module.description_az || "";
  return module.description_az || "";
}
