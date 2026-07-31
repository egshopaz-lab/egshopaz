export interface GuestCartItem {
  productId: string;
  quantity: number;
  variantId?: string | null;
  selectedAttributes?: Record<string, string>;
  unitPrice?: number | null;
}

const STORAGE_KEY = "egshop_guest_cart";
const CHANGE_EVENT = "egshop:guest-cart-change";

export function readGuestCart(): GuestCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is GuestCartItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as GuestCartItem).productId === "string" &&
        Number.isInteger((item as GuestCartItem).quantity) &&
        (item as GuestCartItem).quantity > 0,
      )
      .slice(0, 100);
  } catch {
    return [];
  }
}

function writeGuestCart(items: GuestCartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function addGuestCartItem(productId: string, quantity = 1, variant?: { id: string; attributes: Record<string, string>; price: number }) {
  const items = readGuestCart();
  const variantId = variant?.id ?? null;
  const existing = items.find((item) => item.productId === productId && (item.variantId ?? null) === variantId);
  if (existing) existing.quantity = Math.min(99, existing.quantity + quantity);
  else items.push({
    productId,
    quantity: Math.min(99, Math.max(1, quantity)),
    variantId,
    selectedAttributes: variant?.attributes ?? {},
    unitPrice: variant?.price ?? null,
  });
  writeGuestCart(items);
}

export function updateGuestCartItem(productId: string, quantity: number, variantId?: string | null) {
  const items = readGuestCart();
  const item = items.find((entry) => entry.productId === productId && (variantId === undefined || (entry.variantId ?? null) === variantId));
  if (!item) return;
  item.quantity = Math.min(99, Math.max(1, quantity));
  writeGuestCart(items);
}

export function removeGuestCartItem(productId: string, variantId?: string | null) {
  writeGuestCart(readGuestCart().filter((item) => item.productId !== productId || (variantId !== undefined && (item.variantId ?? null) !== variantId)));
}

export function clearGuestCart() {
  writeGuestCart([]);
}

export const guestCartChangeEvent = CHANGE_EVENT;
