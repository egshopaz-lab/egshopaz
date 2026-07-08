const SUPABASE_URL = "https://ootloyfutihvupfforrv.supabase.co";
const SUPABASE_KEY = "sb_publishable_ppRwsR2EfF1Xx4ZTiQsSCw__w7tOLkG";
const TOKEN_KEY = "egshop_session";

function session() {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) || "null");
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

function saveSession(value) {
  if (value?.access_token) localStorage.setItem(TOKEN_KEY, JSON.stringify(value));
}

function authError(data, status) {
  const message = data?.msg || data?.message || data?.error_description || data?.error || data?.hint;
  if (status === 400 && /invalid login credentials/i.test(message || "")) return "E-poçt və ya şifrə yanlışdır.";
  if (/email not confirmed/i.test(message || "")) return "Əvvəlcə e-poçt ünvanınızı təsdiqləyin.";
  if (/user already registered/i.test(message || "")) return "Bu e-poçtla artıq hesab yaradılıb.";
  if (/password/i.test(message || "") && /characters|length|weak/i.test(message || "")) return "Şifrə ən azı 8 simvoldan ibarət olmalıdır.";
  return message || "Əməliyyat baş tutmadı. Bir az sonra yenidən yoxlayın.";
}

async function request(path, options = {}) {
  const current = session();
  let response;
  try {
    response = await fetch(`${SUPABASE_URL}${path}`, {
      ...options,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${current?.access_token || SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: options.prefer || "",
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Serverlə əlaqə qurulmadı. İnternet bağlantınızı yoxlayın.");
  }

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/v1/")) localStorage.removeItem(TOKEN_KEY);
    throw new Error(authError(data, response.status));
  }
  return data;
}

export async function initializeAuth() {
  const current = session();
  if (!current?.refresh_token) return null;
  const expiresAt = Number(current.expires_at || 0) * 1000;
  if (expiresAt && expiresAt > Date.now() + 60000) return current;
  try {
    const refreshed = await request("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: current.refresh_token }),
    });
    saveSession(refreshed);
    return refreshed;
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

export async function signUp(email, password, fullName) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const name = String(fullName || "").trim();
  if (!name) throw new Error("Ad və soyadınızı daxil edin.");
  if (String(password || "").length < 8) throw new Error("Şifrə ən azı 8 simvoldan ibarət olmalıdır.");
  const data = await request("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({ email: normalizedEmail, password, data: { full_name: name } }),
  });
  saveSession(data);
  return data;
}

export async function signIn(email, password) {
  const data = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email: String(email || "").trim().toLowerCase(), password }),
  });
  saveSession(data);
  return data;
}

export async function resetPassword(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) throw new Error("E-poçt ünvanınızı daxil edin.");
  return request("/auth/v1/recover", {
    method: "POST",
    body: JSON.stringify({ email: normalizedEmail }),
  });
}

export async function signOut() {
  const current = session();
  try {
    if (current?.access_token) await request("/auth/v1/logout", { method: "POST" });
  } finally {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function currentUser() { return session()?.user || null; }

export async function getProfile() {
  const user = currentUser();
  if (!user) return null;
  const rows = await request(`/rest/v1/profiles?id=eq.${user.id}&select=*`);
  return rows[0] || null;
}

export async function getProducts() { return request("/rest/v1/products?active=eq.true&select=*&order=created_at.desc"); }
export async function getCart() {
  const user = currentUser();
  if (!user) return [];
  return request(`/rest/v1/cart_items?user_id=eq.${user.id}&select=*,products(*)`);
}
export async function addCartItem(productId) {
  const user = currentUser();
  if (!user) throw new Error("Səbəti saxlamaq üçün giriş edin");
  return request("/rest/v1/cart_items?on_conflict=user_id,product_id", { method: "POST", prefer: "resolution=merge-duplicates,return=representation", body: JSON.stringify({ user_id: user.id, product_id: productId, quantity: 1 }) });
}
export async function removeCartItem(id) { return request(`/rest/v1/cart_items?id=eq.${id}`, { method: "DELETE" }); }
export async function getFavorites() {
  const user = currentUser();
  if (!user) return [];
  return request(`/rest/v1/favorites?user_id=eq.${user.id}&select=*,products(*)`);
}
export async function toggleFavorite(productId) {
  const user = currentUser();
  if (!user) throw new Error("Sevimlilər üçün giriş edin");
  const existing = await request(`/rest/v1/favorites?user_id=eq.${user.id}&product_id=eq.${productId}&select=id`);
  if (existing[0]) { await request(`/rest/v1/favorites?id=eq.${existing[0].id}`, { method: "DELETE" }); return false; }
  await request("/rest/v1/favorites", { method: "POST", body: JSON.stringify({ user_id: user.id, product_id: productId }) });
  return true;
}
export async function createOrder({ address, phone, items }) {
  const user = currentUser();
  if (!user) throw new Error("Sifariş üçün giriş edin.");
  const total = items.reduce((sum, item) => sum + Number(item.products.price) * item.quantity, 0);
  const orders = await request("/rest/v1/orders", { method: "POST", prefer: "return=representation", body: JSON.stringify({ user_id: user.id, total, delivery_address: address, phone }) });
  const order = orders[0];
  await request("/rest/v1/order_items", { method: "POST", body: JSON.stringify(items.map((item) => ({ order_id: order.id, product_id: item.products.id, seller_id: item.products.seller_id, product_name: item.products.name, price: item.products.price, quantity: item.quantity }))) });
  await request(`/rest/v1/cart_items?user_id=eq.${user.id}`, { method: "DELETE" });
  return order;
}
export async function createSellerApplication(application) {
  const user = currentUser();
  if (!user) throw new Error("Satici muracieti ucun giris edin.");
  return request("/rest/v1/seller_applications?on_conflict=user_id", { method: "POST", prefer: "resolution=merge-duplicates,return=representation", body: JSON.stringify({ ...application, user_id: user.id, status: "pending" }) });
}
export async function getSellerApplication() {
  const user = currentUser();
  if (!user) return null;
  const rows = await request(`/rest/v1/seller_applications?user_id=eq.${user.id}&select=*&limit=1`);
  return rows[0] || null;
}
export async function updateSellerApplication(application) {
  const user = currentUser();
  if (!user) throw new Error("Satici profilini yenilemek ucun giris edin.");
  return request(`/rest/v1/seller_applications?user_id=eq.${user.id}`, { method: "PATCH", prefer: "return=representation", body: JSON.stringify(application) });
}
export async function getOrders() {
  const user = currentUser();
  return request(`/rest/v1/orders?user_id=eq.${user.id}&select=*,order_items(*)&order=created_at.desc`);
}
export async function createProduct(product) {
  const user = currentUser();
  if (!user) throw new Error("Mehsul yuklemek ucun giris edin.");
  return request("/rest/v1/products", { method: "POST", prefer: "return=representation", body: JSON.stringify({ ...product, seller_id: user.id }) });
}
export async function updateProduct(productId, product) {
  const user = currentUser();
  if (!user) throw new Error("Mehsulu yenilemek ucun giris edin.");
  return request(`/rest/v1/products?id=eq.${productId}&seller_id=eq.${user.id}`, { method: "PATCH", prefer: "return=representation", body: JSON.stringify(product) });
}
export async function deleteProduct(productId) {
  const user = currentUser();
  if (!user) throw new Error("Mehsulu silmek ucun giris edin.");
  return request(`/rest/v1/products?id=eq.${productId}&seller_id=eq.${user.id}`, { method: "DELETE" });
}
export async function getSellerProducts() {
  const user = currentUser();
  return request(`/rest/v1/products?seller_id=eq.${user.id}&select=*&order=created_at.desc`);
}
export async function getSellerOrders() {
  const user = currentUser();
  if (!user) return [];
  return request(`/rest/v1/order_items?seller_id=eq.${user.id}&select=*,orders(*),products(name,image_url)&order=created_at.desc`);
}
export async function uploadProductImage(file) {
  const user = currentUser();
  const current = session();
  if (!user || !current?.access_token) throw new Error("Sekil yuklemek ucun giris edin.");
  if (!file) return null;
  if (!/^image\//i.test(file.type || "")) throw new Error("Yalniz sekil fayli yukleyin.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Sekil 5 MB-dan boyuk olmamalidir.");
  const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const objectPath = `${user.id}/${id}.${extension}`;
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/product-images/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${current.access_token}`,
      "Content-Type": file.type || "image/jpeg",
      "x-upsert": "false",
    },
    body: file,
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
  if (!response.ok) throw new Error(authError(data, response.status));
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${objectPath}`;
}
export async function getAdminData() {
  const [profiles, applications, orders, allProducts] = await Promise.all([
    request("/rest/v1/profiles?select=*&order=created_at.desc"), request("/rest/v1/seller_applications?select=*,profiles(full_name)&order=created_at.desc"), request("/rest/v1/orders?select=*,profiles(full_name)&order=created_at.desc"), request("/rest/v1/products?select=*&order=created_at.desc"),
  ]);
  return { profiles, applications, orders, products: allProducts };
}
export async function reviewSeller(applicationId, approve) { return request("/rest/v1/rpc/admin_review_seller", { method: "POST", body: JSON.stringify({ _application_id: applicationId, _approve: approve }) }); }
export async function updateOrderStatus(orderId, status) { return request(`/rest/v1/orders?id=eq.${orderId}`, { method: "PATCH", body: JSON.stringify({ status }) }); }

export async function getSellerDashboardData() {
  const user = currentUser();
  if (!user) throw new Error("Satıcı paneli üçün giriş edin.");
  const [sellerProducts, sellerOrders, store, coupons, campaigns, wallet, notifications, messages, reviews, ads, boosts, adStats, adPayments] = await Promise.all([
    getSellerProducts().catch(() => []),
    getSellerOrders().catch(() => []),
    request(`/rest/v1/seller_store_settings?seller_id=eq.${user.id}&select=*&limit=1`).catch(() => []),
    request(`/rest/v1/seller_coupons?seller_id=eq.${user.id}&select=*&order=created_at.desc`).catch(() => []),
    request(`/rest/v1/seller_campaigns?seller_id=eq.${user.id}&select=*&order=created_at.desc`).catch(() => []),
    request(`/rest/v1/seller_wallet_transactions?seller_id=eq.${user.id}&select=*&order=created_at.desc`).catch(() => []),
    request(`/rest/v1/seller_notifications?seller_id=eq.${user.id}&select=*&order=created_at.desc`).catch(() => []),
    request(`/rest/v1/seller_messages?seller_id=eq.${user.id}&select=*,profiles!seller_messages_customer_id_fkey(full_name)&order=created_at.desc`).catch(() => []),
    request(`/rest/v1/product_reviews?seller_id=eq.${user.id}&select=*,products(name,image_url)&order=created_at.desc`).catch(() => []),
    request(`/rest/v1/seller_ads?seller_id=eq.${user.id}&select=*,products(name,image_url,price)&order=created_at.desc`).catch(() => []),
    request(`/rest/v1/seller_product_boosts?seller_id=eq.${user.id}&select=*,products(name,image_url,price)&order=created_at.desc`).catch(() => []),
    request(`/rest/v1/seller_ad_stats?seller_id=eq.${user.id}&select=*&order=stat_date.desc`).catch(() => []),
    request(`/rest/v1/seller_ad_payments?seller_id=eq.${user.id}&select=*&order=created_at.desc`).catch(() => []),
  ]);
  return { sellerProducts, sellerOrders, store: store[0] || null, coupons, campaigns, wallet, notifications, messages, reviews, ads, boosts, adStats, adPayments };
}

export async function upsertStoreSettings(settings) {
  const user = currentUser();
  if (!user) throw new Error("Magaza ayarlari ucun giris edin.");
  return request("/rest/v1/seller_store_settings?on_conflict=seller_id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify({ ...settings, seller_id: user.id }),
  });
}

export async function createCoupon(coupon) {
  const user = currentUser();
  if (!user) throw new Error("Kupon ucun giris edin.");
  return request("/rest/v1/seller_coupons", { method: "POST", prefer: "return=representation", body: JSON.stringify({ ...coupon, seller_id: user.id }) });
}

export async function createCampaign(campaign) {
  const user = currentUser();
  if (!user) throw new Error("Kampaniya ucun giris edin.");
  return request("/rest/v1/seller_campaigns", { method: "POST", prefer: "return=representation", body: JSON.stringify({ ...campaign, seller_id: user.id }) });
}

export async function createSponsoredAd(ad) {
  const user = currentUser();
  if (!user) throw new Error("Reklam ucun giris edin.");
  return request("/rest/v1/seller_ads", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({ ...ad, seller_id: user.id, status: ad.status || "pending" }),
  });
}

export async function createProductBoost(boost) {
  const user = currentUser();
  if (!user) throw new Error("Boost ucun giris edin.");
  return request("/rest/v1/seller_product_boosts", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({ ...boost, seller_id: user.id, status: boost.status || "pending" }),
  });
}

export async function createAdPayment(payment) {
  const user = currentUser();
  if (!user) throw new Error("Reklam odenisi ucun giris edin.");
  return request("/rest/v1/seller_ad_payments", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({ ...payment, seller_id: user.id, status: payment.status || "pending" }),
  });
}

export async function createWalletRequest(amount, payoutAccount) {
  const user = currentUser();
  if (!user) throw new Error("Withdraw ucun giris edin.");
  return request("/rest/v1/seller_wallet_transactions", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({ seller_id: user.id, amount: -Math.abs(Number(amount || 0)), kind: "withdraw", status: "pending", note: payoutAccount || "" }),
  });
}

export async function sendSellerMessage(body, customerId = null, attachmentUrl = null) {
  const user = currentUser();
  if (!user) throw new Error("Mesaj ucun giris edin.");
  return request("/rest/v1/seller_messages", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({ seller_id: user.id, sender_id: user.id, customer_id: customerId, body, attachment_url: attachmentUrl }),
  });
}

export async function replyReview(reviewId, reply) {
  return request(`/rest/v1/product_reviews?id=eq.${reviewId}`, { method: "PATCH", prefer: "return=representation", body: JSON.stringify({ reply }) });
}

export function captureAuthRedirect() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  const type = hash.get("type") || query.get("type") || (query.get("recovery") ? "recovery" : "");

  if (accessToken) {
    const expiresIn = Number(hash.get("expires_in") || 3600);
    saveSession({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn,
      token_type: hash.get("token_type") || "bearer",
      user: session()?.user || null
    });
  }

  if (window.location.hash) {
    history.replaceState({}, "", window.location.pathname);
  }

  return type;
}

export async function updatePassword(password) {
  if (String(password || "").length < 8) throw new Error("Sifre en azi 8 simvoldan ibaret olmalidir.");
  return request("/auth/v1/user", {
    method: "PUT",
    body: JSON.stringify({ password })
  });
}

export async function resendConfirmation(email) {
  return request("/auth/v1/resend", {
    method: "POST",
    body: JSON.stringify({
      type: "signup",
      email: String(email || "").trim().toLowerCase()
    })
  });
}
