const SUPABASE_URL = "https://ootloyfutihvupfforrv.supabase.co";
const SUPABASE_KEY = "sb_publishable_ppRwsR2EfF1Xx4ZTiQsSCw__w7tOLkG";
const TOKEN_KEY = "egshop_session";

function session() {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) || "null");
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const current = session();
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${current?.access_token || SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "",
      ...options.headers,
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.error_description || data?.hint || "Əməliyyat baş tutmadı");
  return data;
}

export async function signUp(email, password, fullName) {
  return request("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, data: { full_name: fullName } }),
  });
}

export async function signIn(email, password) {
  const data = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem(TOKEN_KEY, JSON.stringify(data));
  return data;
}

export function signOut() {
  localStorage.removeItem(TOKEN_KEY);
}

export function currentUser() {
  return session()?.user || null;
}

export async function getProfile() {
  const user = currentUser();
  if (!user) return null;
  const rows = await request(`/rest/v1/profiles?id=eq.${user.id}&select=*`);
  return rows[0] || null;
}

export async function getProducts() {
  return request("/rest/v1/products?active=eq.true&select=*&order=created_at.desc");
}

export async function getCart() {
  const user = currentUser();
  if (!user) return [];
  return request(`/rest/v1/cart_items?user_id=eq.${user.id}&select=*,products(*)`);
}

export async function addCartItem(productId) {
  const user = currentUser();
  if (!user) throw new Error("Səbəti saxlamaq üçün giriş edin");
  return request("/rest/v1/cart_items?on_conflict=user_id,product_id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify({ user_id: user.id, product_id: productId, quantity: 1 }),
  });
}

export async function createProduct(product) {
  const user = currentUser();
  return request("/rest/v1/products", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({ ...product, seller_id: user.id }),
  });
}

export async function getSellerProducts() {
  const user = currentUser();
  return request(`/rest/v1/products?seller_id=eq.${user.id}&select=*&order=created_at.desc`);
}

