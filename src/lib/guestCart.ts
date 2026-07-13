export interface GuestCartItem {
  productId: string;
  quantity: number;
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

export function addGuestCartItem(productId: string, quantity = 1) {
  const items = readGuestCart();
  const existing = items.find((item) => item.productId === productId);
  if (existing) existing.quantity = Math.min(99, existing.quantity + quantity);
  else items.push({ productId, quantity: Math.min(99, Math.max(1, quantity)) });
  writeGuestCart(items);
}

export function updateGuestCartItem(productId: string, quantity: number) {
  const items = readGuestCart();
  const item = items.find((entry) => entry.productId === productId);
  if (!item) return;
  item.quantity = Math.min(99, Math.max(1, quantity));
  writeGuestCart(items);
}

export function removeGuestCartItem(productId: string) {
  writeGuestCart(readGuestCart().filter((item) => item.productId !== productId));
}

export function clearGuestCart() {
  writeGuestCart([]);
}

export const guestCartChangeEvent = CHANGE_EVENT;
