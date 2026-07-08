import * as supabase from "./supabase.js?v=20260707-7";

const {
  addCartItem,
  captureAuthRedirect,
  createCampaign,
  createCoupon,
  createProduct,
  createWalletRequest,
  createSellerApplication,
  currentUser,
  deleteProduct,
  getAdminData,
  getCart,
  getFavorites,
  getOrders,
  getProducts,
  getProfile,
  getSellerApplication,
  getSellerDashboardData,
  getSellerProducts,
  getSellerOrders,
  initializeAuth,
  removeCartItem,
  resendConfirmation,
  resetPassword,
  reviewSeller,
  replyReview,
  sendSellerMessage,
  signIn,
  signOut,
  signUp,
  toggleFavorite,
  updateOrderStatus,
  updatePassword,
  updateProduct,
  updateSellerApplication,
  upsertStoreSettings,
  uploadProductImage,
} = supabase;

const SUPABASE_URL = "https://ootloyfutihvupfforrv.supabase.co";
const SUPABASE_KEY = "sb_publishable_ppRwsR2EfF1Xx4ZTiQsSCw__w7tOLkG";
const SESSION_KEY = "egshop_session";
const BANNER_VIDEO = "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/12ea4064-c75b-46f7-be42-a9242b61737e/banner-video-1782387703134.mp4";

const categories = [
  ["📱", "Elektronika"],
  ["👗", "Qadın geyimləri"],
  ["👔", "Kişi geyimləri"],
  ["👶", "Uşaq və körpə"],
  ["👟", "Ayaqqabı"],
  ["💄", "Gözəllik və baxım"],
  ["🏠", "Ev və mətbəx"],
  ["🛏️", "Ev tekstili"],
  ["🚗", "Avtomobil"],
  ["🔧", "Tikinti və təmir"],
  ["🌳", "Bağ və həyət"],
  ["⚽", "İdman və istirahət"],
  ["🐾", "Heyvan məhsulları"],
  ["📚", "Kitablar və ofis"],
  ["🛒", "Erzaq məhsulları"],
  ["💊", "Sağlamlıq"],
  ["🎁", "Hədiyyə və suvenir"],
  ["💍", "Zərgərlik və saatlar"],
  ["🎮", "Oyun və hobbi"],
  ["🧳", "Çantalar və aksesuarlar"],
  ["💼", "Ofis və biznes"],
  ["🏡", "Smart ev"],
  ["🚲", "Velosiped və skuter"],
  ["🍳", "Mətbəx texnikası"],
  ["🧺", "Məişət texnikası"],
  ["📸", "Foto və video"],
];

const subCategories = [
  "Smartfonlar",
  "Telefon aksesuarları",
  "Noutbuklar",
  "Planşetlər",
  "Stolüstü kompüterlər",
  "Monitorlar",
  "Klaviatura və mauslar",
  "Yaddaş və disklər",
  "Printerlər və skanerlər",
  "Televizorlar",
  "Audio sistemlər",
  "Ağıllı saatlar",
];

const categoryWords = {
  Elektronika: ["telefon", "redmi", "skuter", "elektrik", "portable", "xiaomi"],
  "Qadın geyimləri": ["qadın", "geyim"],
  "Kişi geyimləri": ["kişi", "geyim"],
  "Uşaq və körpə": ["uşaq", "körpə"],
  Ayaqqabı: ["ayaqqabı"],
  "Gözəllik və baxım": ["ətir", "gözəllik", "baxım"],
  "Ev və mətbəx": ["ev", "yataq", "mətbəx", "kofe"],
  "Ev tekstili": ["yataq", "tekstil"],
  Avtomobil: ["mopet", "skuter"],
  "Velosiped və skuter": ["skuter", "mopet"],
  Mebel: ["mebel", "italya"],
};

const fallbackProducts = [
  { id: "31d03601-5ff1-4b36-8825-5884c00d3332", name: "Ətir", price: 100, old: 110, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/d39654de-946a-4352-b1f1-77b7facd2705/986c0fbc-169b-49a9-b6f1-f4a79a844db9.jpg", rating: "4.8", reviews: 12, brand: "Brend", category: "Gözəllik və baxım" },
  { id: "118306a5-3867-42db-a025-170f52e786f7", name: "italya mebel", price: 1500, old: 1800, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/d39654de-946a-4352-b1f1-77b7facd2705/cbb4919c-9264-42fb-88cb-3351e81d812c.jpg", rating: "5.0", reviews: 2, brand: "avilla", category: "Ev və mətbəx" },
  { id: "e6635adc-e394-485f-b999-a7ee263760cd", name: "Mopet", price: 1000, old: null, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/d39654de-946a-4352-b1f1-77b7facd2705/721da7d9-71c3-43fb-9cc2-7e34fded753b.jpg", rating: "4.6", reviews: 7, brand: "Bmv", category: "Velosiped və skuter" },
  { id: "9dfcd652-cfd9-4e1e-8496-8a11934f4fb2", name: "Xiaomi", price: 800, old: null, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/d39654de-946a-4352-b1f1-77b7facd2705/b43b3238-5324-4b67-87e4-fa2ad6232ce7.jpg", rating: "4.9", reviews: 19, brand: "Redmi", category: "Elektronika" },
  { id: "af318359-3b26-4080-ac5b-67c4518d3ac8", name: "kofe", price: 100, old: null, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/d39654de-946a-4352-b1f1-77b7facd2705/d58b87e3-b1b5-4084-b21f-3545cc816552.jpg", rating: "4.5", reviews: 4, brand: "EG Shop", category: "Erzaq məhsulları" },
  { id: "69fbe1c2-af49-4b0e-a4f6-c6d4ec75fb57", name: "Portable", price: 30, old: null, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/ab3f5c02-b3d9-461c-ba4a-f3b22c627bfb/3a362ccf-4a19-4f86-8e4e-333ff846e46c.jpg", rating: "4.2", reviews: 5, brand: "Audio", category: "Elektronika" },
];

let products = fallbackProducts.slice();

function session() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}

function notify(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function setCartCount(count) {
  document.querySelectorAll("#cartCount,#mobileCartCount").forEach((item) => {
    item.textContent = String(count);
    item.classList.toggle("has-items", Number(count) > 0);
    item.setAttribute("aria-label", `${count} məhsul`);
  });
}

async function syncCartCount() {
  if (!currentUser()) return setCartCount(0);
  try {
    const items = await getCart();
    setCartCount(items.reduce((sum, item) => sum + Number(item.quantity || 0), 0));
  } catch {
    setCartCount(0);
  }
}

function money(value) {
  return `${Number(value || 0).toFixed(value % 1 ? 2 : 0)} AZN`;
}

function discount(product) {
  return product.old ? Math.round((1 - product.price / product.old) * 100) : 0;
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/É™/g, "e")
    .replace(/Ä±/g, "i")
    .replace(/Ă¶/g, "o")
    .replace(/ĂĽ/g, "u")
    .replace(/Äź/g, "g")
    .replace(/Ĺź/g, "s")
    .replace(/Ă§/g, "c");
}

function productSearchText(product) {
  return normalizeText([
    product.name,
    product.brand,
    product.category,
    product.description,
    product.seller_name,
  ].filter(Boolean).join(" "));
}

function productMatches(product, query = "", category = "") {
  const text = productSearchText(product);
  const q = normalizeText(query).trim();
  const c = normalizeText(category).trim();
  const categoryTerms = category ? [category, ...(categoryWords[category] || [])].map(normalizeText) : [];
  const categoryOk = !category || categoryTerms.some((term) => text.includes(term));
  const queryOk = !q || q.split(/\s+/).every((part) => text.includes(part));
  return categoryOk && queryOk;
}

function filteredProducts(query = "", category = "") {
  return products.filter((product) => productMatches(product, query, category));
}

function inferCategory(product) {
  if (product.category) return product.category;
  const found = categories.find(([, name]) => productMatches(product, "", name));
  return found?.[1] || "Digər";
}

function routeTo(path) {
  if (path === "/") {
    if (window.location.pathname !== "/") history.pushState({}, "", "/");
    window.location.reload();
    return;
  }
  if (window.location.pathname === path) return applyRouteView();
  history.pushState({}, "", path);
  applyRouteView();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function currentRoute() {
  return window.location.pathname.replace(/\/+$/, "") || "/";
}

function findProduct(id) {
  return products.find((product) => String(product.id) === String(id)) || products[0];
}

function pageTitle(path) {
  const titles = {
    "/catalog": "Kataloq",
    "/discover": "Kəşf et",
    "/shops": "Mağazalar",
    "/compare": "Müqayisə",
    "/map": "Xəritə",
    "/promotions": "Aksiyalar",
    "/bonus": "Bonuslar",
    "/support": "Dəstək",
    "/favorites": "Sevimlilər",
    "/cart": "Səbət",
    "/download": "Mobil tətbiq",
    "/auth": "Giriş / Qeydiyyat",
    "/giris-qeydiyyat": "Giriş / Qeydiyyat",
    "/giriş-qeydiyyat": "Giriş / Qeydiyyat",
    "/login": "Giriş",
    "/register": "Qeydiyyat",
    "/account": "Şəxsi kabinet",
    "/seller": "Satıcı paneli",
    "/contact": "Əlaqə",
  };
  return titles[path] || "EG Shop";
}

function setMeta(name, value, property = false) {
  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let tag = document.querySelector(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(property ? "property" : "name", name);
    document.head.append(tag);
  }
  tag.setAttribute("content", value);
}

function updateSeo(path) {
  const product = path.startsWith("/product/") ? findProduct(path.split("/").pop()) : null;
  const title = product ? `${product.name} | EG Shop` : (path === "/" ? "EG Shop - Marketplace" : `${pageTitle(path)} | EG Shop`);
  const description = product
    ? `${product.name} - ${money(product.price)}. EG Shop-da səbət, sifariş və onlayn ödəniş.`
    : "EG Shop marketplace: kateqoriyalar, axtarış, satıcı paneli, səbət, sifariş və onlayn ödəniş.";
  document.title = title;
  document.querySelector("link[rel='canonical']")?.setAttribute("href", `https://egshop.az${window.location.pathname}`);
  setMeta("description", description);
  setMeta("og:title", title, true);
  setMeta("og:description", description, true);
  setMeta("og:url", `https://egshop.az${window.location.pathname}`, true);
}

function productList(items = products, highlighted = false) {
  return items.map((product) => productCard(product, highlighted)).join("");
}

function routePage(path) {
  if (path.startsWith("/product/")) return productDetailPage(path.split("/").pop());
  if (path === "/catalog") return catalogPage();
  if (path === "/discover") return discoverPage();
  if (path === "/shops") return infoPage("Mağazalar", "Satıcılar və brend mağazalar", "Platformada aktiv mağazalar, reytinqlər və satıcı profilləri bir yerdə göstərilir.", ["Təsdiqli satıcı rozeti", "Satıcı məhsulları", "Əlaqə və təhvil məlumatları"]);
  if (path === "/compare") return comparePage();
  if (path === "/map") return infoPage("Xəritə", "Çatdırılma və PVZ nöqtələri", "Müştəri yaxın təhvil məntəqəsini seçmək və sifarişi xəritədə izləmək imkanına sahib olacaq.", ["PVZ məntəqələri", "Kuryer zonaları", "Canlı status"]);
  if (path === "/promotions") return promotionsPage();
  if (path === "/bonus") return infoPage("Bonuslar", "Xal qazan, endirim kimi istifadə et", "Hər sifariş bonus balansına çevrilir. Bonus sistemi alıcıları geri qaytarmaq üçün qurulur.", ["Sifariş bonusu", "Dostunu dəvət et", "VIP müştərilər"]);
  if (path === "/support") return supportPage();
  if (path === "/account") return accountPage();
  if (["/auth", "/giris-qeydiyyat", "/giriş-qeydiyyat", "/login", "/register"].includes(path)) return authPage(path);
  if (path === "/seller") return sellerDashboardPage();
  if (path === "/contact") return contactPage();
  if (path === "/download") return infoPage("EG Shop tətbiqi", "Sürətli alış-veriş cibində", "Mobil tətbiq bildirişləri, səbəti və kampaniyaları bir yerdə saxlayacaq.", ["Push bildirişlər", "Tez sifariş", "Özəl kuponlar"]);
  return "";
}

function displayNameFromUser(user) {
  const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name;
  if (metaName) return metaName;
  const email = user?.email || "";
  return email ? email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "EG Shop müştərisi";
}

function accountPage() {
  const user = currentUser();
  if (!user) return authPage("/auth");
  const name = displayNameFromUser(user);
  const initial = (name.trim()[0] || "E").toUpperCase();
  const email = user.email || "";
  return `
    <section class="account-page">
      <div class="account-tabs">
        <button class="active" type="button"><span>♙</span>Şəxsi kabinet</button>
        <button type="button" data-account-section="orders"><span>▧</span>Sifarişlərim</button>
        <button type="button" data-account-section="returns"><span>↩</span>Qaytarmalarım</button>
        <button type="button" data-action="favorites"><span>♡</span>Sevimlilər</button>
        <button type="button" data-action="cart"><span>🛒</span>Səbət</button>
      </div>

      <div class="account-profile-card">
        <div class="account-avatar">${initial}</div>
        <div>
          <h1>${name}</h1>
          <p>${email}</p>
        </div>
        <div class="account-profile-actions">
          <button type="button" data-account-section="profile">Profili düzəlt</button>
          <button type="button" data-account-logout>Çıxış</button>
        </div>
      </div>

      <div class="account-stat-grid">
        <article><span>▧</span><b id="accountOrderCount">0</b><small>Sifarişlərim</small></article>
        <article><span>♡</span><b id="accountFavoriteCount">0</b><small>Sevimlilər</small></article>
        <article><span>🛒</span><b id="accountCartCount">0</b><small>Səbət</small></article>
        <article><span>♢</span><b>0</b><small>Bildirişlər</small></article>
      </div>

      <section class="account-panel-card">
        <div class="account-panel-heading"><h2>Son sifarişlər</h2><button type="button" data-account-section="orders">Hamısı</button></div>
        <div id="accountRecentOrders" class="account-empty">Hələ sifariş yoxdur.</div>
      </section>

      <section class="account-menu-card">
        <button type="button" data-account-section="orders"><span>▧</span><b>Sifarişlərim</b><small>Sifariş statusu və izləmə</small><i>›</i></button>
        <button type="button" data-account-section="addresses"><span>⌖</span><b>Ünvanlarım</b><small>Çatdırılma məlumatları</small><i>›</i></button>
        <button type="button" data-account-section="payments"><span>▭</span><b>Ödəniş üsulları</b><small>Ödəniş məlumatları</small><i>›</i></button>
        <button type="button" data-account-section="messages"><span>○</span><b>Mesajlar</b><small>Satıcılarla yazışmalar</small><i>›</i></button>
        <button type="button" data-account-section="reviews"><span>☆</span><b>Rəylərim</b><small>Məhsul rəyləri</small><i>›</i></button>
      </section>
    </section>`;
}

function authPage(path = currentRoute()) {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") === "register" || path === "/register" ? "register" : "login";
  const register = mode === "register";
  return `
    <section class="auth-page-shell">
      <div class="auth-brand-panel">
        <img src="/assets/logo.png" alt="EG Shop">
        <span>EG SHOP</span>
        <h1>${register ? "Yeni hesab yaradın" : "Hesabınıza daxil olun"}</h1>
        <p>Müştəri, satıcı və admin axınları üçün tək EG Shop hesabı.</p>
        <div class="auth-benefits"><b>Sürətli səbət</b><b>Təhlükəsiz ödəniş</b><b>Satıcı paneli</b></div>
      </div>
      <form id="authRouteForm" class="auth-page-card" data-mode="${mode}" novalidate>
        <div class="auth-tabs">
          <button type="button" class="${!register ? "active" : ""}" data-route-auth-mode="login">Giriş</button>
          <button type="button" class="${register ? "active" : ""}" data-route-auth-mode="register">Qeydiyyat</button>
        </div>
        <div class="register-fields" ${register ? "" : "hidden"}>
          <label>Ad və soyad<input name="full_name" autocomplete="name" ${register ? "required" : ""}></label>
          <label>Telefon<input name="phone" autocomplete="tel" placeholder="+994 50 000 00 00" ${register ? "required" : ""}></label>
        </div>
        <label>E-poçt<input name="email" type="email" autocomplete="email" required></label>
        <label>Şifrə<span class="password-field"><input name="password" type="password" minlength="8" autocomplete="${register ? "new-password" : "current-password"}" required><button type="button" data-password-toggle>Göstər</button></span></label>
        <div class="register-fields" ${register ? "" : "hidden"}>
          <label>Şifrəni təkrarla<input name="password_confirm" type="password" minlength="8" ${register ? "required" : ""}></label>
          <label class="terms-check"><input name="terms" type="checkbox"> <span>İstifadə şərtlərini qəbul edirəm.</span></label>
        </div>
        <button class="auth-link" type="button" data-forgot-password ${register ? "hidden" : ""}>Şifrəmi unutdum</button>
        <button class="form-submit" type="button" data-auth-submit>${register ? "Qeydiyyatdan keç" : "Daxil ol"}</button>
        <p class="form-message" id="authMessage"></p>
      </form>
    </section>`;
}

function setAuthMode(form, mode) {
  const register = mode === "register";
  form.dataset.mode = mode;
  form.querySelectorAll("[data-route-auth-mode],[data-auth-mode]").forEach((button) => {
    button.classList.toggle("active", (button.dataset.routeAuthMode || button.dataset.authMode) === mode);
  });
  form.querySelectorAll(".register-fields").forEach((item) => { item.hidden = !register; });
  const title = form.closest(".auth-page-shell")?.querySelector(".auth-brand-panel h1") || document.querySelector("#authTitle");
  if (title) title.textContent = register ? "Yeni hesab yaradın" : "Hesabınıza daxil olun";
  const submit = form.querySelector(".form-submit");
  if (submit) submit.textContent = register ? "Qeydiyyatdan keç" : "Daxil ol";
  const forgot = form.querySelector("[data-forgot-password]");
  if (forgot) forgot.hidden = register;
  if (form.elements.full_name) form.elements.full_name.required = register;
  if (form.elements.phone) form.elements.phone.required = register;
  if (form.elements.password_confirm) form.elements.password_confirm.required = register;
  const message = form.querySelector(".form-message");
  if (message) message.textContent = "";
}

function sellerDashboardPage() {
  const user = currentUser();
  const email = user?.email || "seller@egshop.az";
  const storeName = "EG Shop Satıcı";
  const sellerProducts = products.slice(0, 8);
  const totalRevenue = sellerProducts.reduce((sum, product) => sum + Number(product.price || 0) * (Number(product.reviews || 1) + 1), 0);
  const nav = [
    ["dashboard", "Dashboard", "▣"], ["products", "Məhsullar", "▦"], ["categories", "Kateqoriyalar", "▤"],
    ["orders", "Sifarişlər", "▧"], ["customers", "Müştərilər", "◎"], ["analytics", "Analitika", "◌"],
    ["finance", "Maliyyə / Wallet", "▰"], ["coupons", "Kuponlar", "%"], ["campaigns", "Endirim kampaniyaları", "↯"],
    ["reviews", "Rəylər", "☆"], ["notifications", "Bildirişlər", "♢"], ["messages", "Mesajlar", "○"],
    ["settings", "Mağaza ayarları", "⚙"], ["profile", "Profil", "♙"], ["security", "Təhlükəsizlik", "盾"], ["logout", "Çıxış", "↪"],
  ];
  return `
    <section class="seller-pro-dashboard" data-theme="light">
      <aside class="seller-pro-sidebar">
        <div class="seller-pro-brand"><img src="/assets/logo.png" alt="EG Shop"><span><b>${storeName}</b><small>${email}</small></span></div>
        <nav>${nav.map(([id, label, icon]) => `<button type="button" class="${id === "dashboard" ? "active" : ""}" data-seller-section="${id}"><span>${icon}</span>${label}</button>`).join("")}</nav>
      </aside>
      <div class="seller-pro-main">
        <header class="seller-pro-header">
          <button type="button" class="seller-icon-btn" data-seller-collapse>☰</button>
          <div><small>Satıcı paneli</small><h1 id="sellerPageTitle">Dashboard</h1></div>
          <label class="seller-pro-search"><span>⌕</span><input data-seller-search placeholder="Məhsul, sifariş, müştəri axtar"></label>
          <button type="button" class="seller-icon-btn" data-seller-theme>☾</button>
          <button type="button" class="seller-icon-btn" data-seller-section="notifications">♢</button>
          <button type="button" class="seller-profile-chip" data-seller-section="profile"><span>${email[0]?.toUpperCase() || "S"}</span><b>${email}</b></button>
        </header>
        <div class="seller-breadcrumb"><span>EG Shop</span><i>›</i><b id="sellerBreadcrumb">Dashboard</b></div>
        <div class="seller-state-row"><div class="seller-skeleton"></div><div class="seller-empty">Məlumat yoxdur.</div><div class="seller-error">Məlumat yüklənmədi. Yenidən yoxlayın.</div></div>
        <main class="seller-pro-content">
          <section class="seller-section active" data-seller-view="dashboard">${sellerDashboardView(sellerProducts, totalRevenue)}</section>
          <section class="seller-section" data-seller-view="products">${sellerProductsView(sellerProducts)}</section>
          <section class="seller-section" data-seller-view="categories">${sellerCategoriesView()}</section>
          <section class="seller-section" data-seller-view="orders">${sellerOrdersView(sellerProducts)}</section>
          <section class="seller-section" data-seller-view="customers">${sellerCustomersView()}</section>
          <section class="seller-section" data-seller-view="analytics">${sellerAnalyticsView(sellerProducts, totalRevenue)}</section>
          <section class="seller-section" data-seller-view="finance">${sellerFinanceView(totalRevenue)}</section>
          <section class="seller-section" data-seller-view="coupons">${sellerCouponsView()}</section>
          <section class="seller-section" data-seller-view="campaigns">${sellerCampaignsView()}</section>
          <section class="seller-section" data-seller-view="reviews">${sellerReviewsView(sellerProducts)}</section>
          <section class="seller-section" data-seller-view="notifications">${sellerNotificationsView()}</section>
          <section class="seller-section" data-seller-view="messages">${sellerMessagesView()}</section>
          <section class="seller-section" data-seller-view="settings">${sellerSettingsView(storeName, email)}</section>
          <section class="seller-section" data-seller-view="profile">${sellerProfileView(email)}</section>
          <section class="seller-section" data-seller-view="security">${sellerSecurityView()}</section>
        </main>
      </div>
    </section>`;
}

function sellerDashboardView(items, totalRevenue) {
  const pending = 2;
  const completed = Math.max(1, Math.round(items.length / 2));
  return `
    <div class="seller-kpi-grid">
      ${[
        ["Ümumi satış", money(totalRevenue), "+12%"], ["Bugünkü satış", money(totalRevenue / 18), "+4%"],
        ["Bu ayın gəliri", money(totalRevenue / 3), "+18%"], ["Gözləyən sifarişlər", pending, "nəzarət"],
        ["Tamamlanan sifarişlər", completed, "stabil"], ["Məhsul sayı", items.length, "aktiv"],
        ["Müştəri sayı", 24, "+6"], ["Wallet balansı", money(totalRevenue * .72), "hazır"],
      ].map(([label, value, note]) => `<article><small>${label}</small><b>${value}</b><span>${note}</span></article>`).join("")}
    </div>
    <div class="seller-chart-grid">
      <article class="seller-card"><div class="seller-card-head"><h2>Satış qrafiki</h2><select><option>Gündəlik</option><option>Həftəlik</option><option>Aylıq</option></select></div><div class="seller-bars">${[35,55,42,68,80,58,92].map((h) => `<i style="height:${h}%"></i>`).join("")}</div></article>
      <article class="seller-card"><div class="seller-card-head"><h2>Gəlir qrafiki</h2><button type="button" data-seller-section="analytics">Detallı</button></div><div class="seller-line-chart"><span></span></div></article>
    </div>
    <div class="seller-two-col">
      <article class="seller-card"><div class="seller-card-head"><h2>Son sifarişlər</h2><button type="button" data-seller-section="orders">Hamısı</button></div>${sellerOrderRows(items.slice(0, 4))}</article>
      <article class="seller-card"><div class="seller-card-head"><h2>Ən çox satılan məhsullar</h2><button type="button" data-seller-section="products">Məhsullar</button></div>${items.slice(0, 4).map((p) => sellerMiniProduct(p)).join("")}</article>
    </div>
    <article class="seller-card"><div class="seller-card-head"><h2>Son bildirişlər</h2></div>${sellerNotificationsList()}</article>`;
}

function sellerProductsView(items) {
  return `
    <div class="seller-card">
      <div class="seller-card-head"><h2>Məhsul əlavə et</h2><button type="button" data-panel="seller">Geniş məhsul paneli</button></div>
      <form class="seller-form-grid" data-seller-save>
        <label>Məhsul adı<input name="name" required placeholder="Məhsul adı"></label><label>SKU<input name="sku" placeholder="SKU-001"></label>
        <label>Barkod<input name="barcode" placeholder="476..."></label><label>Brend<input name="brand" placeholder="Samsung, Zara..."></label>
        <label>Kateqoriya<select name="category">${categories.slice(0, 10).map((item) => `<option>${item[1]}</option>`).join("")}</select></label><label>Alt kateqoriya<input name="subcategory" placeholder="Alt kateqoriya"></label>
        <label>Qiymət<input name="price" type="number" min="0" step="0.01"></label><label>Endirim qiyməti<input name="sale_price" type="number" min="0" step="0.01"></label>
        <label>Stok<input name="stock" type="number" min="0"></label><label>Variantlar<input name="variants" placeholder="Rəng: qara, ağ; Ölçü: M, L"></label>
        <label>Etiketlər<input name="tags" placeholder="trend, yeni, premium"></label><label>SEO başlıq<input name="seo_title"></label>
        <label class="wide">SEO təsvir<textarea name="seo_description" rows="3"></textarea></label>
        <label class="wide">Çoxlu şəkil yüklə<input name="images" type="file" accept="image/*" multiple></label>
        <div class="seller-form-actions"><button class="form-secondary" type="button" data-seller-draft>Draft saxla</button><button class="form-submit" type="submit">Məhsulu yayımla</button></div>
      </form>
    </div>
    <div class="seller-card"><div class="seller-card-head"><h2>Məhsullar</h2><div><input class="seller-table-filter" data-table-filter placeholder="Axtarış"><button type="button">Filter</button></div></div><div class="seller-table">${sellerProductRows(items)}</div><div class="seller-pagination"><button>‹</button><b>1</b><button>›</button></div></div>`;
}

function sellerCategoriesView() {
  return `<div class="seller-card"><div class="seller-card-head"><h2>Kateqoriyalar</h2><button type="button" data-seller-save>Yeni kateqoriya</button></div><div class="seller-category-grid">${categories.slice(0, 12).map(([icon, name]) => `<article><span>${icon}</span><b>${name}</b><small>Alt kateqoriya və komissiya idarəsi</small><button type="button" data-seller-save>Redaktə et</button></article>`).join("")}</div></div>`;
}

function sellerOrdersView(items) {
  const tabs = ["Pending", "Confirmed", "Processing", "Ready to Ship", "Shipped", "Delivered", "Returned", "Refunded", "Cancelled"];
  return `<div class="seller-card"><div class="seller-card-head"><h2>Sifarişlər</h2><input class="seller-table-filter" data-table-filter placeholder="Sifariş axtar"></div><div class="seller-status-tabs">${tabs.map((tab, i) => `<button class="${i === 0 ? "active" : ""}" type="button">${tab}</button>`).join("")}</div><div class="seller-table">${sellerOrderRows(items, true)}</div></div>`;
}

function sellerCustomersView() {
  const customers = ["Elshad Namazov", "Aysel Məmmədova", "Nigar Aliyeva", "Murad Həsənli"];
  return `<div class="seller-card"><div class="seller-card-head"><h2>Müştərilər</h2><input class="seller-table-filter" data-table-filter placeholder="Müştəri axtar"></div><div class="seller-table">${customers.map((name, index) => `<div class="seller-table-row"><span class="seller-avatar">${name[0]}</span><span><b>${name}</b><small>${index + 1} sifariş · son sifariş ${index + 2} gün əvvəl</small></span><b>${money((index + 1) * 120)}</b><button type="button" data-seller-save>Profil</button></div>`).join("")}</div></div>`;
}

function sellerAnalyticsView(items, totalRevenue) {
  return `<div class="seller-chart-grid"><article class="seller-card"><div class="seller-card-head"><h2>Satış statistikası</h2><select><option>Gündəlik</option><option>Həftəlik</option><option>Aylıq</option><option>İllik</option></select></div><div class="seller-bars large">${[30,64,45,78,55,88,70,94,62,80,75,90].map((h) => `<i style="height:${h}%"></i>`).join("")}</div></article><article class="seller-card"><h2>Kateqoriyalar üzrə satış</h2><div class="seller-donut"><b>${money(totalRevenue)}</b><span></span></div></article></div><div class="seller-card"><div class="seller-card-head"><h2>Ən çox satılan məhsullar</h2></div>${items.slice(0, 6).map((p) => sellerMiniProduct(p)).join("")}</div>`;
}

function sellerFinanceView(totalRevenue) {
  return `<div class="seller-kpi-grid finance"><article><small>Cari balans</small><b>${money(totalRevenue * .72)}</b><span>çıxarışa hazır</span></article><article><small>Gözləyən balans</small><b>${money(totalRevenue * .18)}</b><span>təsdiqdə</span></article><article><small>Çıxarılan balans</small><b>${money(totalRevenue * .42)}</b><span>bu ay</span></article><article><small>Komissiyalar</small><b>${money(totalRevenue * .08)}</b><span>platforma payı</span></article></div><div class="seller-card"><div class="seller-card-head"><h2>Withdraw sorğusu</h2></div><form class="seller-form-grid" data-seller-save><label>Məbləğ<input name="amount" type="number" min="1" placeholder="100"></label><label>IBAN / Kart<input name="payout_account" placeholder="AZ..."></label><button class="form-submit wide">Sorğu göndər</button></form></div><div class="seller-card"><h2>Tranzaksiya tarixçəsi</h2>${["Payout", "Komissiya", "Sifariş ödənişi"].map((x, i) => `<div class="seller-table-row"><span>${x}</span><small>${new Date().toLocaleDateString("az-AZ")}</small><b>${money((i + 1) * 42)}</b></div>`).join("")}</div>`;
}

function sellerCouponsView() {
  return `<div class="seller-card"><div class="seller-card-head"><h2>Kupon yarat</h2></div><form class="seller-form-grid" data-seller-save><label>Kupon kodu<input name="code" value="EGSHOP10"></label><label>Endirim tipi<select name="discount_type"><option>Faiz endirimi</option><option>Sabit məbləğ endirimi</option></select></label><label>Dəyər<input name="discount_value" type="number" value="10"></label><label>İstifadə limiti<input name="usage_limit" type="number" value="100"></label><label>Bitmə tarixi<input name="expires_at" type="date"></label><button class="form-submit">Kuponu aktiv et</button></form></div>`;
}

function sellerCampaignsView() {
  return `<div class="seller-card"><div class="seller-card-head"><h2>Endirim kampaniyaları</h2><button type="button" data-seller-save>Yeni kampaniya</button></div><div class="seller-campaign-grid">${["Yay endirimi", "Həftə sonu", "Yeni məhsullar"].map((title) => `<article><b>${title}</b><small>Banner, kupon və məhsul seçimi ilə kampaniya</small><button type="button" data-seller-save>İdarə et</button></article>`).join("")}</div></div>`;
}

function sellerReviewsView(items) {
  return `<div class="seller-card"><div class="seller-card-head"><h2>Müştəri rəyləri</h2><button type="button">Filter</button></div>${items.slice(0, 4).map((p) => `<div class="seller-review"><b>${p.name}</b><span>★★★★★</span><p>Məhsul keyfiyyəti və çatdırılma təcrübəsi müsbətdir.</p><button type="button" data-seller-save>Cavab yaz</button><button type="button" data-seller-delete>Sil</button></div>`).join("")}</div>`;
}

function sellerNotificationsView() {
  return `<div class="seller-card"><div class="seller-card-head"><h2>Bildirişlər</h2></div>${sellerNotificationsList()}</div>`;
}

function sellerMessagesView() {
  return `<div class="seller-messages"><aside>${["Elshad", "Aysel", "Murad"].map((name, i) => `<button class="${i === 0 ? "active" : ""}" type="button"><b>${name}</b><small>${i + 1} oxunmamış mesaj</small></button>`).join("")}</aside><section><div class="seller-chat"><p>Salam, sifarişim nə vaxt göndəriləcək?</p><p class="me">Salam, sifariş bu gün hazırlanır.</p></div><form data-seller-save><input name="message" placeholder="Mesaj yaz"><button class="form-submit">Göndər</button><button type="button" class="form-secondary">Fayl</button></form></section></div>`;
}

function sellerSettingsView(storeName, email) {
  return `<div class="seller-card"><div class="seller-card-head"><h2>Mağaza ayarları</h2></div><form class="seller-form-grid" data-seller-save><label>Loqo<input type="file" accept="image/*"></label><label>Banner<input type="file" accept="image/*"></label><label>Mağaza adı<input name="store_name" value="${storeName}"></label><label>Email<input name="email" value="${email}"></label><label>Telefon<input name="phone" placeholder="+994 50 000 00 00"></label><label>Ünvan<input name="address" placeholder="Bakı"></label><label class="wide">Təsvir<textarea name="description" rows="3">EG Shop marketplace mağazası</textarea></label><label>Instagram<input name="instagram" placeholder="@egshop"></label><label>İş saatları<input name="working_hours" value="09:00 - 18:00"></label><label class="wide">Çatdırılma məlumatı<textarea name="delivery_info" rows="3"></textarea></label><label class="wide">Qaytarma siyasəti<textarea name="return_policy" rows="3"></textarea></label><button class="form-submit wide">Ayarları saxla</button></form></div>`;
}

function sellerProfileView(email) {
  return `<div class="seller-card"><div class="seller-card-head"><h2>Profil</h2></div><form class="seller-form-grid" data-seller-save><label>Profil şəkli<input type="file" accept="image/*"></label><label>Email<input value="${email}" disabled></label><label>Ad və soyad<input placeholder="Satıcı adı"></label><label>Telefon<input placeholder="+994 50 000 00 00"></label><label>Yeni şifrə<input type="password"></label><label>2FA<select><option>Aktiv deyil</option><option>SMS ilə aktiv et</option><option>Authenticator ilə aktiv et</option></select></label><button class="form-submit wide">Profili saxla</button></form></div>`;
}

function sellerSecurityView() {
  return `<div class="seller-card"><div class="seller-card-head"><h2>Təhlükəsizlik</h2></div><div class="seller-security-list"><article><b>Şifrə dəyiş</b><button type="button" data-seller-save>Yenilə</button></article><article><b>2FA dəstəyi</b><button type="button" data-seller-save>Aktiv et</button></article><article><b>Aktiv sessiyalar</b><button type="button" data-seller-save>Yoxla</button></article></div></div>`;
}

function sellerMiniProduct(product) {
  return `<div class="seller-mini-product"><img src="${product.image}" alt=""><span><b>${product.name}</b><small>${product.brand || "EG Shop"} · ${money(product.price)}</small></span><em>${product.rating || "5.0"}</em></div>`;
}

function sellerProductRows(items) {
  return items.map((p) => `<div class="seller-table-row" data-seller-product-id="${p.id || ""}" data-seller-active="${p.active === false ? "false" : "true"}"><img src="${p.image}" alt=""><span><b>${p.name}</b><small>${p.sku || `SKU-${String(p.id || "").slice(0, 6)}`} · ${p.category || "Kateqoriya"}</small></span><b>${money(p.price)}</b><small>Stok ${p.stock || 12}</small><button type="button" data-seller-edit>Redaktə et</button><button type="button" data-seller-toggle>${p.active === false ? "Passiv" : "Aktiv"}</button><button type="button" data-seller-delete>Sil</button></div>`).join("");
}

function sellerOrderRows(items, detailed = false) {
  return items.map((p, i) => `<div class="seller-table-row"><span><b>#${2033446 + i}</b><small>${p.name} · Müştəri ${i + 1}</small></span><b>${money(p.price)}</b><select><option>Pending</option><option>Confirmed</option><option>Processing</option><option>Ready to Ship</option><option>Shipped</option><option>Delivered</option><option>Returned</option><option>Refunded</option><option>Cancelled</option></select>${detailed ? `<button type="button" data-seller-save>Detallar</button><button type="button" data-seller-save>Faktura</button>` : ""}</div>`).join("");
}

function sellerNotificationsList() {
  return ["Yeni sifariş qəbul edildi", "Yeni rəy əlavə olundu", "Müştəridən mesaj gəldi", "Sistem komissiya hesabatını yenilədi"].map((text) => `<div class="seller-notification"><span>♢</span><b>${text}</b><small>${new Date().toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" })}</small></div>`).join("");
}

function contactPage() {
  return `<section class="contact-page"><h1>Əlaqə</h1><div class="contact-card"><p><b>@</b> info@egshop.az</p><p><b>T</b> +994 50 000 00 00</p><p><b>M</b> Bakı, Azərbaycan</p></div></section>`;
}

function catalogPage() {
  const params = new URLSearchParams(window.location.search);
  const query = params.get("q") || "";
  const category = params.get("category") || "";
  const items = filteredProducts(query, category);
  return `
    <section class="route-hero">
      <span>KATALOQ</span>
      <h1>Bütün kateqoriyalar və məhsullar</h1>
      <p>${category || query ? `${items.length} nəticə tapıldı.` : "EG Shop-da elektronika, ev, moda, hədiyyə və daha çox bölmə tək ekranda toplanır."}</p>
    </section>
    <section class="route-category-grid">
      ${categories.map(([icon, name]) => `<button type="button" class="${name === category ? "active" : ""}" data-category="${name}"><span>${icon}</span><b>${name}</b><small>${(categoryWords[name] || [name]).join(", ")}</small></button>`).join("")}
    </section>
    <section class="products-section route-products">
      <div class="section-title"><h2>${category || query ? "Filtr nəticələri" : "Kataloq məhsulları"}</h2><button type="button" data-show-all>Hamısı</button></div>
      <div class="product-grid">${productResults(items, false, query, category)}</div>
    </section>`;
}

function discoverPage() {
  const discounted = products.filter((product) => product.old).concat(products).slice(0, 8);
  return `
    <section class="route-hero discover">
      <span>KƏŞF ET</span>
      <h1>Trend, endirim və uduşlu seçimlər</h1>
      <p>Alış-verişi daha maraqlı etmək üçün populyar məhsullar, endirimlər və həftə hədiyyələri burada göstərilir.</p>
    </section>
    <section class="lv-product-section lv-sale route-block">
      <div class="lv-section-heading"><div><span class="lv-kicker">ENDİRİM</span><h2>Bugünün seçimi</h2></div></div>
      <div class="lv-products">${productList(discounted.slice(0, 4), true)}</div>
    </section>
    <section class="products-section route-products">
      <div class="section-title"><h2>Sizin üçün</h2></div>
      <div class="product-grid">${productList(products)}</div>
    </section>`;
}

function productDetailPage(id) {
  const product = findProduct(id);
  const related = products.filter((item) => item.id !== product.id).slice(0, 4);
  return `
    <section class="product-detail-page">
      <button class="route-back" type="button" data-route="/">‹ Ana səhifə</button>
      <div class="detail-media"><img src="${product.image}" alt="${product.name}"></div>
      <div class="detail-copy">
        <span>${product.brand || "EG Shop"}</span>
        <h1>${product.name}</h1>
        <div class="detail-price"><strong>${money(product.price)}</strong>${product.old ? `<del>${money(product.old)}</del><em>-${discount(product)}%</em>` : ""}</div>
        <p>Keyfiyyətli məhsul, rahat səbət, sevimlilər və sifariş axını ilə EG Shop marketplace təcrübəsi.</p>
        <div class="detail-actions">
          <button class="lv-cart" type="button" data-add="${product.id || ""}">Səbətə at</button>
          <button class="detail-favorite" type="button" data-favorite="${product.id || ""}">Sevimliyə əlavə et</button>
        </div>
        <ul>
          <li>Çatdırılma və PVZ seçimi dəstəklənir</li>
          <li>Satıcı paneli ilə məhsul idarəetməsi</li>
          <li>Təhlükəsiz hesab və sifariş tarixçəsi</li>
        </ul>
      </div>
    </section>
    <section class="products-section route-products">
      <div class="section-title"><h2>Oxşar məhsullar</h2></div>
      <div class="product-grid">${productList(related)}</div>
    </section>`;
}

function promotionsPage() {
  return `
    <section class="route-hero promo">
      <span>AKSİYALAR</span>
      <h1>Endirimlər, kuponlar və uduşlar</h1>
      <p>Həftə sonu endirimləri, uduşlu məhsullar və xüsusi kampaniyalar üçün ayrılmış bölmə.</p>
    </section>
    <section class="promo-grid">
      <article><b>70% endirim</b><p>Seçilmiş kolleksiyalarda böyük endirim blokları.</p></article>
      <article><b>Uduşlu sifariş</b><p>Hər tamamlanan sifariş həftə hədiyyəsinde iştirak edir.</p></article>
      <article><b>Yeni satıcı bonusu</b><p>Yeni mağazalar üçün komissiya və reklam dəstəkləri.</p></article>
    </section>`;
}

function comparePage() {
  return `
    <section class="route-hero">
      <span>MÜQAYİSƏ</span>
      <h1>Məhsulları yan-yana yoxla</h1>
      <p>Qiymət, endirim, reytinq və brend məlumatlarını bir ekranda müqayisə et.</p>
    </section>
    <section class="compare-grid">
      ${products.slice(0, 3).map((product) => `<article>${productCard(product, true)}<dl><dt>Qiymət</dt><dd>${money(product.price)}</dd><dt>Reytinq</dt><dd>${product.rating || "5.0"}</dd><dt>Brend</dt><dd>${product.brand || "EG Shop"}</dd></dl></article>`).join("")}
    </section>`;
}

function supportPage() {
  return `
    <section class="route-hero support">
      <span>DƏSTƏK</span>
      <h1>Alıcı, satıcı və PVZ dəstəyi</h1>
      <p>Sifariş, ödəniş, qaytarma və satıcı müraciətləri üçün mərkəz.</p>
    </section>
    <section class="support-grid">
      <button type="button" data-auth>Hesaba giriş</button>
      <button type="button" data-action="cart">Səbəti aç</button>
      <button type="button" data-action="seller-apply">Satıcı müraciəti</button>
      <a href="mailto:info@egshop.az">info@egshop.az</a>
    </section>`;
}

function infoPage(kicker, title, text, items) {
  return `
    <section class="route-hero">
      <span>${kicker}</span>
      <h1>${title}</h1>
      <p>${text}</p>
    </section>
    <section class="info-list">${items.map((item) => `<article><b>${item}</b><p>Bu modul marketplace inkişaf planına daxil edilib və əsas alış-veriş axını ilə birləşdirilir.</p></article>`).join("")}</section>`;
}

function productCard(product, highlighted = false) {
  const percent = discount(product);
  return `
    <article class="${highlighted ? "lv-card" : "product-card"}" data-product-id="${product.id || ""}" tabindex="0" role="link" aria-label="${product.name} məhsuluna bax">
      <div class="${highlighted ? "lv-card-media" : "product-image"}">
        ${highlighted && percent ? `<span class="lv-discount">-${percent}%</span>` : ""}
        ${highlighted ? `<button class="lv-heart" type="button" data-favorite="${product.id || ""}" aria-label="Sevimli">♡</button>` : `<button class="heart" type="button" data-favorite="${product.id || ""}" aria-label="Sevimli">♡</button>`}
        <img src="${product.image}" alt="${product.name}" loading="lazy">
      </div>
      <div class="${highlighted ? "lv-card-body" : "product-info"}">
        <div class="${highlighted ? "lv-price" : "price-row"}">
          <strong>${money(product.price)}</strong>
          ${product.old ? `<del>${money(product.old)}</del>` : ""}
        </div>
        ${highlighted ? `<small>${product.brand || ""}</small>` : ""}
        <h3>${product.name}</h3>
        <div class="rating"><span>*</span> ${product.rating || "5.0"} · ${product.reviews || 0}</div>
        <button class="${highlighted ? "lv-detail" : "detail-button"}" type="button" data-route="/product/${product.id || ""}">Detallı bax</button>
        <button class="${highlighted ? "lv-cart" : "cart-button"}" type="button" data-add="${product.id || ""}">Səbətə at</button>
      </div>
    </article>
  `;
}

function emptyProductsText(query = "", category = "") {
  const detail = [category, query].filter(Boolean).join(" / ");
  return `<div class="empty-products"><b>Məhsul tapılmadı</b><p>${detail ? `${detail} üçün` : "Bu bölmədə"} nəticə yoxdur. Başqa söz və ya kateqoriya yoxlayın.</p></div>`;
}

function productResults(items, highlighted = false, query = "", category = "") {
  return items.length ? productList(items, highlighted) : emptyProductsText(query, category);
}

function renderApp() {
  const userLabel = currentUser() ? "Hesab" : "Giriş";
  const accountRoute = currentUser() ? "/account" : "/auth";
  document.querySelector("#app").innerHTML = `
    <aside class="market-sidebar" aria-label="Əsas menyu">
      <a class="side-brand" href="/" data-route="/">
        <img src="/assets/logo.png" alt="EG Shop">
        <span><b>EG Shop</b><small>marketplace</small></span>
      </a>
      <p>Əsas menyu</p>
      <nav>
        <button type="button" data-route="/"><span>⌂</span>Ana səhifə</button>
        <button type="button" data-route="/catalog"><span>▦</span>Kataloq</button>
        <button type="button" data-route="/shops"><span>⌘</span>Mağazalar</button>
        <button type="button" data-route="/discover"><span>◎</span>Kəşf et</button>
        <button type="button" data-route="/compare"><span>⇄</span>Müqayisə</button>
        <button type="button" data-route="/map"><span>⌖</span>Xəritə</button>
        <button type="button" data-route="/promotions"><span>%</span>Aksiyalar</button>
        <button type="button" data-route="/bonus"><span>★</span>Bonuslar</button>
        <button type="button" data-route="/support"><span>?</span>Dəstək</button>
      </nav>
      <div class="side-help">
        <b>Marketplace</b>
        <small>Satıcı, alıcı və PVZ axınları tək yerdə.</small>
      </div>
    </aside>

    <div class="market-shell">
    <header class="site-header">
      <div class="header-inner">
        <button class="icon-button menu-button" aria-label="Menyu">=</button>
        <a class="logo" href="/" data-route="/"><img src="/assets/logo.png" alt="EG Shop"><span>EG SHOP</span></a>
        <div class="clock"><b id="clock">00:00</b><small id="date">2026-07-07</small></div>
        <label class="search">
          <span>Q</span>
          <input id="searchInput" type="search" placeholder="Məhsul, marka və ya kateqoriya axtar...">
          <button type="button" aria-label="Axtarış">O</button>
        </label>
        <nav class="header-actions" aria-label="İstifadəci menyusu">
          <button type="button" data-language><span>AZ</span><b>AZ</b></button>
          <button type="button" data-action="discover"><span>◎</span><b>Kəşf et</b></button>
          <button type="button" data-action="favorites"><span>♡</span><b>Sevimlilər</b></button>
          <button type="button" class="basket-action" data-action="cart"><span>🛒</span><b>Səbət</b><i id="cartCount">0</i></button>
          <button type="button" data-route="${accountRoute}"><span>⌾</span><b>${userLabel}</b></button>
        </nav>
      </div>
    </header>

    <main id="top">
      <section class="market-hero">
        <div>
          <span>EG Shop - Azərbaycanın onlayn marketi</span>
          <h1>Alış-veriş, mağazalar və çatdırılma tək platformada</h1>
          <p>Məhsul axtarışı, satıcı paneli, PVZ, səbət və bonus axınları mobildə də rahat istifadə üçün yenidən yığıldı.</p>
        </div>
        <div class="hero-stat"><b>${products.length}</b><small>aktiv məhsul</small></div>
      </section>

      <div class="quick-links role-links">
        <button type="button" data-route="/seller">Satıcı girişi</button>
        <button type="button" data-action="pvz">PVZ girişi</button>
        <button type="button" data-panel="admin">Admin</button>
        <button type="button" class="seller" data-route="/auth?mode=register">Satıcı ol</button>
      </div>

      <section class="lv-category-area">
        <div class="lv-scroll lv-categories">
          ${categories.map(([icon, name], index) => `<button type="button" class="${index === 0 ? "active" : ""}" data-category="${name}"><span>${icon}</span>${name}</button>`).join("")}
        </div>
        <div class="lv-section-heading lv-subheading"><h2>Önə çıxan kateqoriyalar</h2><button type="button" data-show-all>Hamısı</button></div>
        <div class="lv-scroll lv-subcategories">
          ${subCategories.map((name) => `<button type="button" data-subcategory="${name}"><span>+</span>${name}</button>`).join("")}
        </div>
      </section>

      <section class="lv-ad" data-route="/promotions" tabindex="0" role="link" aria-label="Aksiyalara bax">
        <video muted loop playsinline preload="none" poster="/assets/product-1.jpg" data-src="${BANNER_VIDEO}"></video>
        <span class="lv-ad-label">REKLAM</span>
        <strong>EG Shop</strong>
        <button class="lv-video-play" type="button" aria-label="Videonu oynat">></button>
      </section>

      <section class="lv-product-section lv-win">
        <div class="lv-section-heading"><div><span class="lv-kicker">HƏDİYYƏ</span><h2>Uduslu məhsullar</h2></div><button type="button" data-show-all>Hamısı</button></div>
        <div class="lv-products">${products.slice(0, 1).map((product) => productCard(product, true)).join("")}</div>
      </section>

      <section class="lv-product-section lv-sale">
        <div class="lv-section-heading"><div><span class="lv-kicker">ENDİRİM</span><h2>Endirimli qiymətlər</h2></div><button type="button" data-show-all>Hamısı</button></div>
        <div class="lv-products">${products.slice(0, 3).map((product) => productCard(product, true)).join("")}</div>
      </section>

      <section class="products-section">
        <div class="section-title"><h2>Sizin üçün</h2><button type="button" data-show-all>Hamısı</button></div>
        <div class="product-grid" id="productGrid">${products.map((product) => productCard(product, false)).join("")}</div>
      </section>

      <section class="gift-banner" data-route="/promotions">
        <span>UDUŞ</span>
        <div><small>Hər sifariş bir şansdır</small><h2>Həftəlik hədiyyələr qazan</h2></div>
        <button type="button" data-route="/promotions">Ətraflı bax</button>
      </section>
    </main>

    <nav class="mobile-nav" aria-label="Mobil menyu">
      <button type="button" data-mobile="home"><span>⌂</span>Ana səhifə</button>
      <button type="button" data-mobile="catalog"><span>▦</span>Kataloq</button>
      <button type="button" data-mobile="cart"><span>S</span>Səbət<i id="mobileCartCount">0</i></button>
      <button type="button" data-mobile="favorites"><span>♡</span>Sevimlilər</button>
      <button type="button" data-mobile="account"><span>⌾</span>${userLabel}</button>
    </nav>

    <dialog class="account-dialog" id="accountDialog">
      <button class="dialog-close" data-close="accountDialog">x</button>
      <div id="accountContent"></div>
    </dialog>

    <dialog class="panel-dialog" id="panelDialog">
      <button class="dialog-close" data-close="panelDialog">x</button>
      <div id="panelContent"></div>
    </dialog>

    <div class="toast" id="toast">Hazırdır</div>
    </div>
  `;
}

function applyRouteView() {
  const path = currentRoute();
  const routed = routePage(path);
  const main = document.querySelector("main#top");
  if (!main) return;
  if (!routed) {
    document.body.dataset.route = "home";
    updateSeo("/");
    return;
  }
  document.body.dataset.route = slug(pageTitle(path));
  main.innerHTML = routed;
  updateSeo(path);
  bindRouteInteractions(main);
  bindRoutedControls(main);
}

function bindRouteInteractions(root = document) {
  root.querySelectorAll("[data-route]").forEach((item) => {
    if (item.dataset.routeBound) return;
    item.dataset.routeBound = "true";
    item.addEventListener("click", (event) => {
      event.preventDefault();
      routeTo(item.dataset.route);
    });
  });
}

function bindProductCards(root = document) {
  root.querySelectorAll("[data-product-id]").forEach((card) => {
    if (card.dataset.cardBound) return;
    card.dataset.cardBound = "true";
    const open = () => {
      if (card.dataset.productId) routeTo(`/product/${card.dataset.productId}`);
    };
    card.addEventListener("click", (event) => {
      if (event.target.closest("button,a,input,select,textarea")) return;
      open();
    });
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter") open();
    });
  });
}

function bindRoutedControls(root = document) {
  bindProductCards(root);
  root.querySelectorAll("[data-panel]").forEach((button) => {
    if (button.dataset.controlBound) return;
    button.dataset.controlBound = "true";
    button.addEventListener("click", () => openPanel(button.dataset.panel));
  });
  root.querySelectorAll("[data-route-auth-mode]").forEach((button) => {
    if (button.dataset.controlBound) return;
    button.dataset.controlBound = "true";
    button.addEventListener("click", () => {
      const form = button.closest("#authRouteForm,#authForm");
      if (form) setAuthMode(form, button.dataset.routeAuthMode);
    });
  });
  root.querySelectorAll("[data-password-toggle]").forEach((button) => {
    if (button.dataset.controlBound) return;
    button.dataset.controlBound = "true";
    button.addEventListener("click", () => {
      const input = button.closest("label")?.querySelector("input");
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
      button.textContent = input.type === "password" ? "Göstər" : "Gizlət";
    });
  });
  const authRouteForm = root.querySelector("#authRouteForm");
  if (authRouteForm && !authRouteForm.dataset.controlBound) {
    authRouteForm.dataset.controlBound = "true";
    authRouteForm.addEventListener("submit", handleAuth);
    authRouteForm.querySelector(".form-submit")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleAuth({ preventDefault() {}, currentTarget: authRouteForm });
    });
  }
  root.querySelector("[data-forgot-password]")?.addEventListener("click", async () => {
    const form = root.querySelector("#authRouteForm");
    const message = root.querySelector("#authMessage");
    try {
      await resetPassword(form.elements.email.value);
      message.className = "form-message success";
      message.textContent = "Şifrə yeniləmə linki e-poçtunuza göndərildi.";
    } catch (error) {
      message.textContent = error.message;
    }
  });
  root.querySelectorAll("[data-auth]").forEach((button) => {
    if (button.dataset.controlBound) return;
    button.dataset.controlBound = "true";
    button.addEventListener("click", openAccountDialog);
  });
  root.querySelectorAll("[data-action]").forEach((button) => {
    if (button.dataset.controlBound) return;
    button.dataset.controlBound = "true";
    button.addEventListener("click", () => openFeature(button.dataset.action));
  });
  root.querySelectorAll("[data-category]").forEach((button) => {
    if (button.dataset.controlBound) return;
    button.dataset.controlBound = "true";
    button.addEventListener("click", () => filterProducts(button.dataset.category));
  });
  root.querySelectorAll("[data-show-all]").forEach((button) => {
    if (button.dataset.controlBound) return;
    button.dataset.controlBound = "true";
    button.addEventListener("click", () => {
      if (currentRoute() === "/catalog") return routeTo("/catalog");
      root.querySelectorAll(".product-card[hidden],.lv-card[hidden]").forEach((card) => { card.hidden = false; });
    });
  });
  root.querySelectorAll("[data-account-section]").forEach((button) => {
    if (button.dataset.controlBound) return;
    button.dataset.controlBound = "true";
    button.addEventListener("click", () => openAccountSection(button.dataset.accountSection));
  });
  root.querySelector("[data-account-logout]")?.addEventListener("click", async () => {
    await signOut();
    window.location.assign("/");
  });
  root.querySelectorAll("[data-add]").forEach((button) => {
    if (button.dataset.controlBound) return;
    button.dataset.controlBound = "true";
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (!currentUser()) return openAccountDialog();
      button.disabled = true;
      try {
        await addCartItem(button.dataset.add);
        await syncCartCount();
        notify("Məhsul səbətə əlavə edildi");
      } catch (error) {
        notify(error.message);
      } finally {
        button.disabled = false;
      }
    });
  });
  root.querySelectorAll("[data-favorite]").forEach((button) => {
    if (button.dataset.controlBound) return;
    button.dataset.controlBound = "true";
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (!button.dataset.favorite) return;
      if (!currentUser()) return openAccountDialog();
      try {
        const added = await toggleFavorite(button.dataset.favorite);
        button.textContent = added ? "♡" : "♧";
        notify(added ? "Sevimlilərə əlavə edildi" : "Sevimlilərdən silindi");
      } catch (error) {
        notify(error.message);
      }
    });
  });
  if (root.querySelector(".account-page")) hydrateAccountPage();
  if (root.querySelector(".seller-pro-dashboard")) bindSellerDashboard(root);
}

function bindSellerDashboard(root = document) {
  const shell = root.querySelector(".seller-pro-dashboard");
  if (!shell || shell.dataset.bound) return;
  shell.dataset.bound = "true";
  shell.querySelectorAll("[data-seller-section]").forEach((button) => {
    button.addEventListener("click", async () => {
      const section = button.dataset.sellerSection;
      if (section === "logout") {
        await signOut();
        window.location.assign("/");
        return;
      }
      shell.querySelectorAll("[data-seller-section]").forEach((item) => item.classList.toggle("active", item.dataset.sellerSection === section));
      shell.querySelectorAll("[data-seller-view]").forEach((view) => view.classList.toggle("active", view.dataset.sellerView === section));
      const title = button.textContent.trim();
      shell.querySelector("#sellerPageTitle") && (shell.querySelector("#sellerPageTitle").textContent = title);
      shell.querySelector("#sellerBreadcrumb") && (shell.querySelector("#sellerBreadcrumb").textContent = title);
    });
  });
  shell.querySelector("[data-seller-theme]")?.addEventListener("click", () => {
    shell.dataset.theme = shell.dataset.theme === "dark" ? "light" : "dark";
  });
  shell.querySelector("[data-seller-collapse]")?.addEventListener("click", () => shell.classList.toggle("collapsed"));
  shell.querySelectorAll("[data-table-filter]").forEach((input) => input.addEventListener("input", () => {
    const value = normalizeText(input.value);
    input.closest(".seller-card")?.querySelectorAll(".seller-table-row").forEach((row) => {
      row.hidden = value && !normalizeText(row.textContent).includes(value);
    });
  }));
  shell.querySelectorAll("[data-seller-save]").forEach((item) => {
    const eventName = item.tagName === "FORM" ? "submit" : "click";
    item.addEventListener(eventName, (event) => {
      event.preventDefault();
      notify("Məlumat saxlanıldı");
    });
  });
  shell.querySelectorAll(".seller-form-grid, .seller-messages form").forEach((form) => {
    form.addEventListener("submit", (event) => submitSellerForm(event, shell));
  });
  shell.querySelectorAll("[data-seller-draft]").forEach((button) => button.addEventListener("click", () => notify("Draft saxlanıldı")));
  shell.querySelectorAll("[data-seller-toggle]").forEach((button) => button.addEventListener("click", async () => {
    const row = button.closest("[data-seller-product-id]");
    const productId = row?.dataset.sellerProductId;
    if (!productId) return notify("Məhsul ID tapılmadı");
    const nextActive = button.textContent !== "Aktiv";
    try {
      await updateProduct(productId, { active: nextActive });
      button.textContent = nextActive ? "Aktiv" : "Passiv";
      row.dataset.sellerActive = String(nextActive);
      notify(`Məhsul ${nextActive ? "aktiv" : "passiv"} edildi`);
    } catch (error) {
      notify(error.message);
    }
  }));
  shell.querySelectorAll("[data-seller-delete]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm("Silmək istədiyinizə əminsiniz?")) return;
    const row = button.closest("[data-seller-product-id]");
    const productId = row?.dataset.sellerProductId;
    try {
      if (productId) await deleteProduct(productId);
      button.closest(".seller-table-row,.seller-review")?.remove();
      notify("Silindi");
    } catch (error) {
      notify(error.message);
    }
  }));
}

async function submitSellerForm(event, shell) {
  event.preventDefault();
  const form = event.currentTarget;
  const view = form.closest("[data-seller-view]")?.dataset.sellerView || "";
  const data = Object.fromEntries(new FormData(form));
  const submit = form.querySelector(".form-submit");
  if (submit) submit.disabled = true;
  try {
    if (view === "products") {
      const images = form.elements.images?.files || [];
      const uploaded = [];
      for (const file of Array.from(images).slice(0, 6)) uploaded.push(await uploadProductImage(file));
      await createProduct({
        name: String(data.name || "").trim(),
        sku: String(data.sku || "").trim() || null,
        barcode: String(data.barcode || "").trim() || null,
        brand: String(data.brand || "").trim() || null,
        subcategory: String(data.subcategory || "").trim() || null,
        category: String(data.category || "").trim() || null,
        price: Number(data.price || 0),
        old_price: data.sale_price ? Number(data.sale_price) : null,
        stock: Number(data.stock || 0),
        tags: String(data.tags || "").split(",").map((item) => item.trim()).filter(Boolean),
        seo_title: String(data.seo_title || "").trim() || null,
        seo_description: String(data.seo_description || "").trim() || null,
        variant_options: parseVariants(data.variants),
        gallery_urls: uploaded.filter(Boolean),
        image_url: uploaded[0] || null,
        active: true,
        draft: false,
      });
    } else if (view === "finance") {
      await createWalletRequest(data.amount, data.payout_account || data["IBAN / Kart"]);
    } else if (view === "coupons") {
      await createCoupon({
        code: String(data.code || "EGSHOP10").trim().toUpperCase(),
        discount_type: String(data.discount_type || "").includes("Sabit") ? "fixed" : "percent",
        discount_value: Number(data.discount_value || data.value || 10),
        usage_limit: data.usage_limit ? Number(data.usage_limit) : null,
        expires_at: data.expires_at || null,
        active: true,
      });
    } else if (view === "settings") {
      await upsertStoreSettings({
        store_name: data.store_name || data["Mağaza adı"] || "EG Shop mağazası",
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        description: data.description || null,
        socials: { instagram: data.instagram || "" },
        working_hours: data.working_hours || null,
        delivery_info: data.delivery_info || null,
        return_policy: data.return_policy || null,
      });
    } else if (view === "messages") {
      await sendSellerMessage(data.message || data.body || form.querySelector("input")?.value || "");
    } else if (view === "campaigns") {
      await createCampaign({ title: data.title || "Yeni kampaniya", description: data.description || "", discount_percent: Number(data.discount_percent || 10), active: true });
    } else {
      notify("Məlumat saxlanıldı");
      return;
    }
    notify("Məlumat Supabase-də saxlanıldı");
    form.reset();
  } catch (error) {
    notify(error.message);
  } finally {
    if (submit) submit.disabled = false;
  }
}

function parseVariants(value) {
  return String(value || "").split(";").reduce((acc, group) => {
    const [key, raw] = group.split(":");
    if (key && raw) acc[key.trim()] = raw.split(",").map((item) => item.trim()).filter(Boolean);
    return acc;
  }, {});
}

function addFooter() {
  if (document.querySelector(".site-footer")) return;
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = '<b>EG SHOP</b><nav><a href="/about.html">Haqqımızda</a><a href="/contact.html">Əlaqə</a><a href="/privacy.html">Məxfilik siyasəti</a></nav><small>© 2026 EG Shop</small>';
  document.querySelector("main")?.after(footer);
}

function startClock() {
  const update = () => {
    const now = new Date();
    const clock = document.querySelector("#clock");
    const date = document.querySelector("#date");
    if (clock) clock.textContent = now.toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" });
    if (date) date.textContent = now.toLocaleDateString("az-AZ");
  };
  update();
  setInterval(update, 30000);
}

function createDrawer() {
  if (document.querySelector("#drawerBackdrop")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "drawer-backdrop";
  backdrop.id = "drawerBackdrop";
  backdrop.innerHTML = `
    <aside class="main-drawer" id="mainDrawer">
      <div class="drawer-head">
        <a href="#top" class="drawer-brand"><img src="/assets/logo.png" alt=""><span><b>EG SHOP</b><small>Marketplace</small></span></a>
        <button type="button" data-drawer-close>x</button>
      </div>
      <nav class="drawer-links">
        <button type="button" data-drawer-target="#top"><span>⌂</span><b>Ana səhifə</b></button>
        <button type="button" data-route="/catalog"><span>▦</span><b>Kataloq</b></button>
        <button type="button" data-drawer-target=".products-section"><span>⌘</span><b>Məhsullar</b></button>
        <button type="button" data-route="/shops"><span>S</span><b>Mağazalar</b></button>
        <button type="button" data-route="/compare"><span>⇄</span><b>Müqayisə</b></button>
        <button type="button" data-route="/promotions"><span>%</span><b>Aksiyalar</b></button>
        <button type="button" data-route="/bonus"><span>★</span><b>Bonuslar</b></button>
        <button type="button" data-route="/support"><span>?</span><b>Dəstək</b></button>
        <button type="button" data-drawer-seller><span>S</span><b>Satıcı ol</b></button>
      </nav>
      <div class="drawer-support"><small>Dəstək</small><b>Hər gün yanınızdayıq</b><a href="mailto:info@egshop.az">info@egshop.az</a></div>
    </aside>`;
  document.body.append(backdrop);
  bindRouteInteractions(backdrop);
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeDrawer(); });
  backdrop.querySelector("[data-drawer-close]").addEventListener("click", closeDrawer);
  backdrop.querySelectorAll("[data-drawer-target]").forEach((button) => {
    button.addEventListener("click", () => {
      closeDrawer();
      document.querySelector(button.dataset.drawerTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  backdrop.querySelector("[data-drawer-seller]").addEventListener("click", () => {
    closeDrawer();
    openSellerApplication();
  });
}

function openDrawer() {
  createDrawer();
  document.querySelector("#drawerBackdrop")?.classList.add("open");
  document.body.classList.add("drawer-open");
}

function closeDrawer() {
  document.querySelector("#drawerBackdrop")?.classList.remove("open");
  document.body.classList.remove("drawer-open");
}

function filterProducts(label) {
  if (currentRoute() === "/catalog") {
    const params = new URLSearchParams(window.location.search);
    params.set("category", label);
    routeTo(`/catalog?${params.toString()}`);
    return;
  }
  let visible = applyProductFilter(document.querySelector("#searchInput")?.value || "", label);
  notify(visible ? `${label}: ${visible} məhsul tapıldı` : `${label} üçün hele məhsul yoxdur`);
  document.querySelector(".products-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function applyProductFilter(query = "", category = "") {
  let visible = 0;
  document.querySelectorAll(".product-card,.lv-card").forEach((card) => {
    const product = findProduct(card.dataset.productId);
    const matches = product && productMatches(product, query, category);
    card.hidden = !matches;
    if (matches) visible += 1;
  });
  document.querySelectorAll("[data-category]").forEach((item) => {
    item.classList.toggle("active", Boolean(category) && item.dataset.category === category);
  });
  return visible;
}

function submitSearch(query) {
  const value = String(query || "").trim();
  if (!value) {
    applyProductFilter();
    return;
  }
  routeTo(`/catalog?q=${encodeURIComponent(value)}`);
}

function showInfo(title, html) {
  const dialog = document.querySelector("#panelDialog");
  const content = document.querySelector("#panelContent");
  if (!dialog || !content) return;
  content.innerHTML = `<span class="dialog-kicker">EG Shop</span><h2>${title}</h2>${html}`;
  dialog.showModal();
}

async function callAdvanced(payload) {
  const token = session()?.access_token;
  if (!token) throw new Error("Sifariş üçün yenidən giriş edin.");
  const response = await fetch(`${SUPABASE_URL}/functions/v1/epoint-advanced`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.message || "Emeliyyat bas tutmadi.");
  return result;
}

async function startPayment(address, phone, method) {
  const token = session()?.access_token;
  if (!token) throw new Error("Sifariş üçün yenidən giriş edin.");
  let result;
  if (method === "card") {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/epoint-create`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ address, phone }),
    });
    result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.message || "Ödəniş başladılmadı.");
  } else if (method.startsWith("saved:")) {
    result = await callAdvanced({ action: "saved-card-pay", card_id: method.slice(6), address, phone });
  } else if (method.startsWith("wallet:")) {
    result = await callAdvanced({ action: "wallet-pay", wallet_id: method.slice(7), address, phone });
  } else {
    const actions = { split: "split-pay", preauth: "preauth", widget: "payment-widget" };
    result = await callAdvanced({ action: actions[method], address, phone });
  }
  const destination = result?.redirect_url || result?.widget_url;
  if (!destination) throw new Error(result?.message || "Ödəniş səhifəsi yaradılamadı.");
  window.location.assign(destination);
}

async function openFavorites() {
  try {
    const favorites = await getFavorites();
    showInfo("Sevimlilər", favorites.length ? `<div class="drawer-products">${favorites.map((item) => drawerProduct(item.products)).join("")}</div>` : "<p>Sevimli məhsulunuz yoxdur.</p>");
  } catch (error) {
    notify(error.message);
  }
}

function drawerProduct(product, extra = "") {
  return `<div class="drawer-product"><img src="${product.image_url || product.image || "/assets/product-1.jpg"}" alt=""><span><b>${product.name}</b><small>${money(product.price)}</small></span>${extra}</div>`;
}

function renderCheckoutForm(items, total) {
  return `
    <div class="drawer-products">${items.map((item) => drawerProduct(item.products, `<button type="button" data-remove-cart="${item.id}">Sil</button>`)).join("")}</div>
    <div class="cart-total"><span>Cəmi</span><b>${money(total)}</b></div>
    <form id="checkoutForm" class="product-form">
      <p class="flow-hint">Sifariş təsdiqlənəndə sistem məhsulları satıcılara bağlayır və Epoint ödəniş səhifəsinə yönləndirir.</p>
      <label>Çatdırılma ünvanı<input name="address" required minlength="8" placeholder="Şəhər, küçə, bina, mənzil"></label>
      <label>Telefon<input name="phone" required inputmode="tel" placeholder="+994 50 000 00 00"></label>
      <label>Ödəniş üsulu
        <select name="payment_method">
          <option value="card">Bank kartı</option>
        </select>
      </label>
      <label>Çatdırılma qeydi<textarea name="note" rows="3" placeholder="Kuryer üçün qeyd varsa yazin"></textarea></label>
      <label class="terms-check"><input name="terms" type="checkbox" required><span>Sifariş və ödəniş şərtlərini qəbul edirəm</span></label>
      <button class="form-submit" type="submit">Kartla ödə</button>
    </form>`;
}

async function hydratePaymentOptions(form) {
  if (!form || form.dataset.paymentReady) return;
  form.dataset.paymentReady = "true";
  const select = form.elements.payment_method;
  try {
    const [{ cards = [] }, walletResult] = await Promise.all([
      callAdvanced({ action: "cards" }),
      callAdvanced({ action: "wallets" }).catch(() => ({})),
    ]);
    cards.forEach((card) => select.add(new Option(`Yadda saxlanmis kart ${card.card_mask || ""}`, `saved:${card.id}`)));
    const wallets = walletResult.wallets || walletResult.data || [];
    if (Array.isArray(wallets)) wallets.forEach((wallet) => select.add(new Option(wallet.name || wallet.title || "Wallet", `wallet:${wallet.id}`)));
  } catch {}
}

async function openCart() {
  try {
    const items = await getCart();
    if (!items.length) return showInfo("Səbət", "<p>Səbətiniz boşdur.</p>");
    const total = items.reduce((sum, item) => sum + Number(item.products.price) * item.quantity, 0);
    showInfo("Səbət", renderCheckoutForm(items, total));
    document.querySelectorAll("[data-remove-cart]").forEach((button) => button.addEventListener("click", async () => {
      await removeCartItem(button.dataset.removeCart);
      await openCart();
      syncCartCount();
    }));
  } catch (error) {
    notify(error.message);
  }
}

function openSellerApplication() {
  if (!currentUser()) return openAccountDialog();
  showInfo("Satıcı ol", `
    <p>Mağazanızı EG Shop platformasında acmaq üçün müraciət göndərin.</p>
    <form id="sellerApplicationForm" class="product-form">
      <p class="flow-hint">Müraciət admin tərəfindən təsdiqlənəndən sonra məhsul yükləmə paneli açılacaq.</p>
      <label>Mağaza adı<input name="store_name" required placeholder="Məsələn: EG Elektronika"></label>
      <label>Telefon<input name="phone" required placeholder="+994 50 000 00 00"></label>
      <label>Kateqoriya
        <select name="category" required>
          <option value="">Seçin</option>
          <option>Elektronika</option>
          <option>Geyim və aksesuar</option>
          <option>Ev və mətbəx</option>
          <option>Gözəllik və baxım</option>
          <option>Market və gündəlik</option>
          <option>Digər</option>
        </select>
      </label>
      <label>Şəhər<input name="city" required placeholder="Bakı"></label>
      <label>Ünvan<input name="address" required placeholder="Mağaza/ofis ünvanı"></label>
      <label>VOEN<input name="tax_id" required inputmode="numeric" pattern="[0-9]{10}" placeholder="10 rəqəmli VOEN"></label>
      <label>Ödəniş hesabı<input name="payout_account" required placeholder="IBAN və ya kart hesabı"></label>
      <label>Çatdırılma imkanı
        <select name="delivery_type" required>
          <option>Öz kuryerim var</option>
          <option>Platforma çatdırılmasi istəyirəm</option>
          <option>Mağazadan götürmə</option>
        </select>
      </label>
      <label>Qeyd<textarea name="note" rows="4" placeholder="Satacağınız məhsullar, brendlər və iş modeliniz haqqında qısa məlumat"></textarea></label>
      <label class="terms-check"><input name="terms" type="checkbox" required><span>Satıcı qaydalarını qəbul edirəm</span></label>
      <button class="form-submit" type="submit">Müraciət göndər</button>
    </form>`);
  document.querySelector("#sellerApplicationForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await createSellerApplication(Object.fromEntries(new FormData(event.currentTarget)));
      notify("Müraciət qəbul edildi");
      document.querySelector("#panelDialog")?.close();
    } catch (error) {
      notify(error.message);
    }
  });
}

async function openPanel(type) {
  if (!currentUser()) return openAccountDialog();
  const dialog = document.querySelector("#panelDialog");
  const content = document.querySelector("#panelContent");
  content.innerHTML = "<p>Məlumatlar yüklənir...</p>";
  dialog.showModal();
  try {
    const profile = await getProfile();
    const allowed = type === "admin" ? profile?.role === "admin" : ["seller", "admin"].includes(profile?.role);
    if (!allowed) {
      content.innerHTML = `<span class="dialog-kicker">Giriş məhduddur</span><h2>${type === "admin" ? "Admin" : "Satıcı"} paneli</h2><p>Bu hesab üçün uyğun rol təyin edilməyib.</p>`;
      return;
    }
    if (type === "admin") {
      const admin = await getAdminData();
      content.innerHTML = `
        <span class="dialog-kicker">Admin paneli</span>
        <h2>Platforma idarəetməsi</h2>
        <div class="panel-stats">
          <div><b>${admin.profiles.length}</b><span>İstifadəci</span></div>
          <div><b>${admin.products.length}</b><span>Məhsul</span></div>
          <div><b>${admin.orders.length}</b><span>Sifariş</span></div>
          <div><b>${admin.applications.filter((item) => item.status === "pending").length}</b><span>Gözləyən satıcı</span></div>
        </div>
        <h3>Satıcı müraciətləri</h3>
        <div class="management-list">
          ${admin.applications.length ? admin.applications.map((item) => `<div><span><b>${item.store_name}</b><small>${item.phone} · ${item.status}</small></span>${item.status === "pending" ? `<span><button type="button" data-review="${item.id}" data-approve="true">Təsdiq</button><button type="button" data-review="${item.id}" data-approve="false">Redd</button></span>` : ""}</div>`).join("") : "<p>Müraciət yoxdur.</p>"}
        </div>
        <h3>Sifarişlər</h3>
        <div class="management-list">
          ${admin.orders.length ? admin.orders.map((order) => `<div><span><b>${money(order.total)}</b><small>${new Date(order.created_at).toLocaleDateString("az-AZ")}</small></span><select data-order="${order.id}">${["pending", "confirmed", "shipped", "delivered", "cancelled"].map((status) => `<option ${status === order.status ? "selected" : ""}>${status}</option>`).join("")}</select></div>`).join("") : "<p>Sifariş yoxdur.</p>"}
        </div>`;
      content.querySelectorAll("[data-review]").forEach((button) => button.addEventListener("click", async () => {
        await reviewSeller(button.dataset.review, button.dataset.approve === "true");
        notify("Müraciət yeniləndi");
        dialog.close();
      }));
      content.querySelectorAll("[data-order]").forEach((select) => select.addEventListener("change", async () => {
        await updateOrderStatus(select.dataset.order, select.value);
        notify("Sifariş statusu yeniləndi");
      }));
      return;
    }
    const [sellerProducts, sellerOrders, sellerApplication] = await Promise.all([
      getSellerProducts(),
      getSellerOrders().catch(() => []),
      getSellerApplication().catch(() => null),
    ]);
    const activeProducts = sellerProducts.filter((item) => item.active !== false).length;
    const sellerRevenue = sellerOrders.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
    content.innerHTML = `
      <span class="dialog-kicker">Satıcı paneli</span>
      <h2>Mağaza idarəetməsi</h2>
      <div class="panel-stats">
        <div><b>${sellerProducts.length}</b><span>Məhsul</span></div>
        <div><b>${activeProducts}</b><span>Aktiv vitrin</span></div>
        <div><b>${sellerProducts.reduce((sum, item) => sum + Number(item.stock || 0), 0)}</b><span>Stok</span></div>
        <div><b>${money(sellerRevenue)}</b><span>Satış dövriyyəsi</span></div>
      </div>
      <div class="seller-panel-grid">
        <section>
          <h3>Yeni məhsul yüklə</h3>
      <form id="productForm" class="product-form">
        <p class="flow-hint">Məhsulu şəkil faylı ilə yükləyin və ya hazır şəkil URL-i daxil edin.</p>
        <label>Məhsul adı<input name="name" required></label>
        <label>Kateqoriya
          <select name="category" required>
            ${categories.map((item) => `<option>${item[1]}</option>`).join("")}
          </select>
        </label>
        <label>Qiymət<input name="price" type="number" min="0" step="0.01" required></label>
        <label>Köhnə qiymət<input name="old_price" type="number" min="0" step="0.01" placeholder="Endirim varsa"></label>
        <label>Stok<input name="stock" type="number" min="0" required></label>
        <label>Brend<input name="brand" placeholder="Samsung, Apple, Zara..."></label>
        <label>Təsvir<textarea name="description" rows="3" placeholder="Məhsul haqqında qısa məlumat"></textarea></label>
        <label>Məhsul şəkli<input name="image_file" type="file" accept="image/*"></label>
        <label>Şəkil URL<input name="image_url" type="url"></label>
        <label class="terms-check"><input name="active" type="checkbox" checked><span>Məhsul vitrində aktiv görünsün</span></label>
        <button class="form-submit" type="submit">Məhsul əlavə et</button>
      </form>
        </section>
        <section>
          <h3>Satıcı profili</h3>
          <form id="sellerProfileForm" class="product-form compact-form">
            <p class="flow-hint">Bu məlumatlar admin yoxlaması, müştəri etibarı və payout üçün istifadə olunur.</p>
            <label>Mağaza adı<input name="store_name" value="${sellerApplication?.store_name || ""}" required></label>
            <label>Telefon<input name="phone" value="${sellerApplication?.phone || ""}" required></label>
            <label>Şəhər<input name="city" value="${sellerApplication?.city || ""}" placeholder="Bakı"></label>
            <label>Ünvan<input name="address" value="${sellerApplication?.address || ""}" placeholder="Mağaza/ofis ünvanı"></label>
            <label>Ödəniş hesabı<input name="payout_account" value="${sellerApplication?.payout_account || ""}" placeholder="IBAN və ya kart hesabı"></label>
            <label>Mağaza qeydi<textarea name="note" rows="3">${sellerApplication?.note || ""}</textarea></label>
            <button class="form-secondary" type="submit">Profili yenilə</button>
          </form>
          <h3>Məhsullarım</h3>
          <div class="management-list seller-products-list">
            ${sellerProducts.length ? sellerProducts.slice(0, 8).map((item) => `<div><span><b>${item.name}</b><small>${money(item.price)} - stok ${item.stock || 0} - ${item.active === false ? "passiv" : "aktiv"}</small></span><img src="${item.image_url || "/assets/product-1.jpg"}" alt=""></div>`).join("") : "<p>Hələ məhsul yüklənməyib.</p>"}
          </div>
          <h3>Sifarişlərim</h3>
          <div class="management-list">
            ${sellerOrders.length ? sellerOrders.slice(0, 8).map((item) => `<div><span><b>${item.product_name || item.products?.name || "Məhsul"}</b><small>${item.quantity || 1} ədəd - ${money(Number(item.price || 0) * Number(item.quantity || 1))} - ${item.orders?.status || "pending"}</small></span></div>`).join("") : "<p>Bu satıcı üçün hele sifariş yoxdur.</p>"}
          </div>
          <h3>Ödəniş hesabı</h3>
          <p class="flow-hint">Kart ödənişləri Epoint üzərindən qəbul olunur. Balans, komissiya və payout məlumatları maliyyə bölməsində idarə edilir.</p>
        </section>
      </div>`;
    content.querySelector("#sellerProfileForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = event.currentTarget.querySelector("button");
      submit.disabled = true;
      submit.textContent = "Yenilənir...";
      try {
        await updateSellerApplication(Object.fromEntries(new FormData(event.currentTarget)));
        notify("Satıcı profili yeniləndi");
      } catch (error) {
        notify(error.message);
      } finally {
        submit.disabled = false;
        submit.textContent = "Profili yenilə";
      }
    });
    content.querySelector("#productForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = event.currentTarget.querySelector(".form-submit");
      submit.disabled = true;
      submit.textContent = "Məhsul yüklənir...";
      try {
        const data = Object.fromEntries(new FormData(event.currentTarget));
        const imageFile = event.currentTarget.elements.image_file?.files?.[0];
        const uploadedImage = imageFile ? await uploadProductImage(imageFile) : null;
        await createProduct({
          name: String(data.name || "").trim(),
          description: String(data.description || "").trim() || null,
          category: String(data.category || "").trim() || null,
          brand: String(data.brand || "").trim() || null,
          price: Number(data.price),
          old_price: data.old_price ? Number(data.old_price) : null,
          stock: Number(data.stock || 0),
          image_url: uploadedImage || String(data.image_url || "").trim() || null,
          active: Boolean(data.active),
        });
        notify("Məhsul əlavə edildi");
        dialog.close();
        await bootstrap();
      } catch (error) {
        notify(error.message);
      } finally {
        submit.disabled = false;
        submit.textContent = "Məhsul əlavə et";
      }
    });
  } catch (error) {
    content.innerHTML = `<h2>Bağlantı xətası</h2><p>${error.message}</p>`;
  }
}

function openAccountDialog() {
  const dialog = document.querySelector("#accountDialog");
  const content = document.querySelector("#accountContent");
  const user = currentUser();
  if (!dialog || !content) return;
  if (user) {
    content.innerHTML = `
      <span class="dialog-kicker">Hesabım</span>
      <h2>${user.email}</h2>
      <p>EG Shop hesabınız aktivdir.</p>
      <button class="form-secondary" type="button" id="ordersButton">Sifarişlərim</button>
      <button class="form-submit" type="button" id="logoutButton">Çıxış et</button>`;
    content.querySelector("#ordersButton")?.addEventListener("click", showOrders);
    content.querySelector("#logoutButton")?.addEventListener("click", async () => {
      await signOut();
      window.location.reload();
    });
  } else {
    content.innerHTML = `
      <span class="dialog-kicker">EG Shop</span>
      <h2 id="authTitle">Hesabınıza daxil olun</h2>
      <div class="auth-tabs" role="tablist">
        <button type="button" class="active" data-auth-mode="login">Giriş</button>
        <button type="button" data-auth-mode="register">Qeydiyyat</button>
      </div>
      <form id="authForm" data-mode="login" novalidate>
        <div class="register-fields" hidden>
          <label>Ad və soyad<input name="full_name" autocomplete="name" maxlength="100"></label>
          <label>Telefon<input name="phone" type="tel" autocomplete="tel" placeholder="+994 50 000 00 00"></label>
        </div>
        <label>E-poçt<input name="email" type="email" autocomplete="email" required></label>
        <label>Şifrə
          <span class="password-field"><input name="password" type="password" minlength="8" autocomplete="current-password" required><button type="button" data-password-toggle>Göstər</button></span>
        </label>
        <div class="register-fields" hidden>
          <label>Şifrəni təkrarla<input name="password_confirm" type="password" minlength="8" autocomplete="new-password"></label>
          <label class="terms-check"><input name="terms" type="checkbox"> <span>İstifadə şərtlərini qəbul edirəm.</span></label>
        </div>
        <button class="auth-link" type="button" data-forgot-password>Şifrəni unutdum</button>
        <button class="form-submit" type="button" data-auth-submit>Daxil ol</button>
        <p class="form-message" id="authMessage"></p>
      </form>`;
    const authForm = content.querySelector("#authForm");
    content.querySelectorAll("[data-auth-mode]").forEach((button) => button.addEventListener("click", () => {
      setAuthMode(authForm, button.dataset.authMode);
    }));
    content.querySelector("[data-password-toggle]").addEventListener("click", (event) => {
      const input = authForm.elements.password;
      input.type = input.type === "password" ? "text" : "password";
      event.currentTarget.textContent = input.type === "password" ? "Göstər" : "Gizlət";
    });
    content.querySelector("[data-forgot-password]").addEventListener("click", async () => {
      const message = content.querySelector("#authMessage");
      try {
        await resetPassword(authForm.elements.email.value);
        message.className = "form-message success";
        message.textContent = "Şifrə yeniləmə linki e-poçtunuza göndərildi.";
      } catch (error) {
        message.textContent = error.message;
      }
    });
    authForm.addEventListener("submit", handleAuth);
    authForm.querySelector(".form-submit")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleAuth({ preventDefault() {}, currentTarget: authForm });
    });
  }
  dialog.showModal();
}

async function handleAuth(event) {
  event.preventDefault();
  const target = event.currentTarget;
  const form = new FormData(target);
  const mode = target.dataset.mode;
  const message = target.querySelector(".form-message") || document.querySelector("#authMessage");
  const submit = target.querySelector(".form-submit");
  if (!target.reportValidity()) return;
  message.className = "form-message";
  message.textContent = "Gözləyin...";
  submit.disabled = true;
  try {
    if (mode === "register") {
      if (form.get("password") !== form.get("password_confirm")) throw new Error("Şifrələr eyni deyil.");
      if (!form.get("terms")) throw new Error("İstifadə şərtlərini qəbul edin.");
      await signUp(form.get("email"), form.get("password"), form.get("full_name"), form.get("phone"));
      message.className = "form-message success";
      message.textContent = "Qeydiyyat tamamlandı. E-poçtunuzu təsdiqləyin.";
      const resend = document.createElement("button");
      resend.type = "button";
      resend.className = "auth-link";
      resend.textContent = "Təsdiq məktubunu yenidən göndər";
      resend.addEventListener("click", async () => {
        await resendConfirmation(form.get("email"));
        message.textContent = "Təsdiq məktubu yenidən göndərildi.";
      });
      message.after(resend);
    } else {
      const result = await signIn(form.get("email"), form.get("password"));
      if (!result?.access_token) throw new Error("Giriş alınmadı. E-poçt və şifrəni yenidən yoxlayın.");
      message.className = "form-message success";
      message.textContent = "Giriş uğurludur. Ana səhifə açılır...";
      setTimeout(() => window.location.assign("/"), 700);
    }
  } catch (error) {
    message.className = "form-message";
    message.textContent = error?.message || "Giriş alınmadı. E-poçt və şifrəni yenidən yoxlayın.";
  } finally {
    submit.disabled = false;
  }
}

async function showOrders() {
  const panel = document.querySelector("#panelDialog");
  const content = document.querySelector("#panelContent");
  document.querySelector("#accountDialog")?.close();
  content.innerHTML = "<h2>Sifarişlərim</h2>";
  try {
    const orders = await getOrders();
    if (!orders.length) {
      content.innerHTML += "<p>Hələ sifarişiniz yoxdur.</p>";
    } else {
      content.innerHTML += orders.map((order) => `<div class="drawer-product"><span><b>${money(order.total)} · ${order.status}</b><small>${new Date(order.created_at).toLocaleString("az-AZ")}</small></span></div>`).join("");
    }
  } catch (error) {
    content.innerHTML += `<p>${error.message}</p>`;
  }
  panel.showModal();
}

function openAccountSection(section) {
  if (section === "orders") return showOrders();
  const user = currentUser();
  const name = displayNameFromUser(user);
  const email = user?.email || "";
  const titles = {
    returns: "Qaytarmalarım",
    profile: "Profili düzəlt",
    addresses: "Ünvanlarım",
    payments: "Ödəniş üsulları",
    messages: "Mesajlar",
    reviews: "Rəylərim",
  };
  const panels = {
    profile: `
      <div class="account-action-panel">
        <form class="account-form-grid" data-account-demo-form>
          <label>Ad və soyad<input name="full_name" value="${name}" autocomplete="name"></label>
          <label>E-poçt<input value="${email}" disabled></label>
          <label>Telefon<input name="phone" placeholder="+994 50 000 00 00" autocomplete="tel"></label>
          <label>Doğum tarixi<input name="birthday" type="date"></label>
          <button class="form-submit" type="submit">Yadda saxla</button>
        </form>
      </div>`,
    addresses: `
      <div class="account-action-panel">
        <form class="account-form-grid" data-account-demo-form>
          <label>Şəhər<input name="city" placeholder="Bakı"></label>
          <label>Ünvan adı<input name="title" placeholder="Ev, ofis və ya mağaza"></label>
          <label class="wide">Tam ünvan<textarea name="address" rows="3" placeholder="Küçə, bina, blok, mənzil"></textarea></label>
          <label>Əlaqə telefonu<input name="phone" placeholder="+994 50 000 00 00"></label>
          <button class="form-submit" type="submit">Ünvanı saxla</button>
        </form>
        <div class="account-mini-list"><article><b>Əsas ünvan</b><small>Yeni ünvan əlavə etdikdən sonra burada görünəcək.</small></article></div>
      </div>`,
    payments: `
      <div class="account-action-panel">
        <div class="payment-method-card"><span>▭</span><div><b>Bank kartı</b><small>Ödəniş zamanı Epoint təhlükəsiz səhifəsinə yönləndirilirsiniz.</small></div></div>
        <div class="payment-method-card"><span>✓</span><div><b>Nağdsız ödəniş aktivdir</b><small>Səbətdə “Kartla ödə” seçimi ilə sifariş tamamlana bilər.</small></div></div>
      </div>`,
    messages: `
      <div class="account-action-panel">
        <div class="account-empty compact">Satıcı ilə yazışma sifariş yaradıldıqdan sonra avtomatik açılır.</div>
        <form class="account-form-grid" data-account-demo-form>
          <label class="wide">Dəstəyə mesaj<textarea name="message" rows="4" placeholder="Sualınızı yazın"></textarea></label>
          <button class="form-submit" type="submit">Mesaj göndər</button>
        </form>
      </div>`,
    reviews: `
      <div class="account-action-panel">
        <div class="account-mini-list">
          <article><b>Rəy gözləyən məhsul yoxdur</b><small>Sifariş tamamlandıqdan sonra məhsula rəy yaza biləcəksiniz.</small></article>
        </div>
      </div>`,
    returns: `
      <div class="account-action-panel">
        <form class="account-form-grid" data-account-demo-form>
          <label>Sifariş nömrəsi<input name="order" placeholder="Məsələn: 2033446"></label>
          <label>Səbəb<select name="reason"><option>Məhsul uyğun deyil</option><option>Zədəli məhsul</option><option>Yanlış məhsul</option><option>Digər</option></select></label>
          <label class="wide">Əlavə qeyd<textarea name="note" rows="3" placeholder="Qaytarma səbəbini qısa izah edin"></textarea></label>
          <button class="form-submit" type="submit">Qaytarma müraciəti yarat</button>
        </form>
      </div>`,
  };
  showInfo(titles[section] || "Şəxsi kabinet", panels[section] || `<div class="account-action-panel"><div class="account-empty compact">Bölmə açıldı.</div></div>`);
  document.querySelectorAll("[data-account-demo-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      notify("Məlumat saxlanıldı");
      document.querySelector("#panelDialog")?.close();
    });
  });
}

async function hydrateAccountPage() {
  if (!currentUser()) return;
  try {
    const [orders, favorites, cart] = await Promise.all([
      getOrders().catch(() => []),
      getFavorites().catch(() => []),
      getCart().catch(() => []),
    ]);
    const orderCount = document.querySelector("#accountOrderCount");
    const favoriteCount = document.querySelector("#accountFavoriteCount");
    const cartCount = document.querySelector("#accountCartCount");
    if (orderCount) orderCount.textContent = String(orders.length);
    if (favoriteCount) favoriteCount.textContent = String(favorites.length);
    if (cartCount) cartCount.textContent = String(cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0));
    const recent = document.querySelector("#accountRecentOrders");
    if (recent && orders.length) {
      recent.className = "account-recent-list";
      recent.innerHTML = orders.slice(0, 3).map((order) => `<article><span><b>${money(order.total)}</b><small>${new Date(order.created_at).toLocaleDateString("az-AZ")} · ${order.status || "pending"}</small></span><i>›</i></article>`).join("");
    }
  } catch (error) {
    notify(error.message);
  }
}

function bindCoreInteractions() {
  bindRouteInteractions();
  bindProductCards();
  if (!document.body.dataset.authDelegateBound) {
    document.body.dataset.authDelegateBound = "true";
    document.addEventListener("click", (event) => {
      const submit = event.target.closest("[data-auth-submit]");
      const form = submit?.closest("#authRouteForm,#authForm");
      if (!form) return;
      event.preventDefault();
      handleAuth({ preventDefault() {}, currentTarget: form });
    });
    document.addEventListener("submit", (event) => {
      if (!event.target.matches("#authRouteForm,#authForm")) return;
      handleAuth(event);
    });
  }
  document.querySelector(".menu-button")?.addEventListener("click", openDrawer);
  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => document.querySelector(`#${button.dataset.close}`)?.close());
  });
  document.querySelectorAll("[data-auth]").forEach((button) => button.addEventListener("click", openAccountDialog));
  document.querySelectorAll("[data-panel]").forEach((button) => button.addEventListener("click", () => openPanel(button.dataset.panel)));
  document.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => openFeature(button.dataset.action)));
  document.querySelectorAll("[data-category]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-category]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    filterProducts(button.dataset.category);
  }));
  document.querySelectorAll("[data-subcategory]").forEach((button) => button.addEventListener("click", () => filterProducts(button.dataset.subcategory)));
  document.querySelectorAll("[data-show-all]").forEach((button) => button.addEventListener("click", () => {
    document.querySelector("#searchInput")?.value && (document.querySelector("#searchInput").value = "");
    document.querySelectorAll(".product-card[hidden],.lv-card[hidden]").forEach((card) => { card.hidden = false; });
    document.querySelectorAll("[data-category]").forEach((item) => item.classList.remove("active"));
    document.querySelector(".products-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  document.querySelector("[data-language]")?.addEventListener("click", () => showInfo("Dil seçimi", "<p>Hazırda sayt Azərbaycan dilindədir. Rus və ingilis dili sonra əlavə olunacaq.</p>"));
  document.querySelector("[data-action='campaign']")?.addEventListener("click", () => showInfo("Kampaniya", "<p>Aktiv kampaniya dövründə tamamlanan hər sifariş həftəlik uduşda iştirak edir.</p>"));
  const searchInput = document.querySelector("#searchInput");
  searchInput?.addEventListener("input", (event) => {
    applyProductFilter(event.target.value);
  });
  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") submitSearch(event.currentTarget.value);
  });
  document.querySelector(".search button")?.addEventListener("click", () => submitSearch(searchInput?.value || ""));
  document.querySelectorAll("[data-add]").forEach((button) => button.addEventListener("click", async (event) => {
    event.stopPropagation();
    if (!currentUser()) return openAccountDialog();
    button.disabled = true;
    try {
      await addCartItem(button.dataset.add);
      await syncCartCount();
      notify("Məhsul səbətə əlavə edildi");
    } catch (error) {
      notify(error.message);
    } finally {
      button.disabled = false;
    }
  }));
  document.querySelectorAll("[data-favorite]").forEach((button) => button.addEventListener("click", async (event) => {
    event.stopPropagation();
    if (!button.dataset.favorite) return;
    if (!currentUser()) return openAccountDialog();
    try {
      const added = await toggleFavorite(button.dataset.favorite);
      button.textContent = added ? "♥" : "♡";
      notify(added ? "Sevimlilərə əlavə edildi" : "Sevimlilərdən silindi");
    } catch (error) {
      notify(error.message);
    }
  }));
  document.querySelectorAll("[data-mobile]").forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.mobile;
    if (action === "home") routeTo("/");
    if (action === "catalog") routeTo("/catalog");
    if (action === "cart") openCart();
    if (action === "favorites") openFavorites();
    if (action === "account") routeTo(currentUser() ? "/account" : "/auth");
  }));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeDrawer(); });
}

async function openFeature(action) {
  if (action === "discover") return routeTo("/discover");
  if (action === "pvz") return routeTo("/map");
  if (!currentUser()) return openAccountDialog();
  if (action === "favorites") return openFavorites();
  if (action === "cart") return openCart();
  if (action === "seller-apply") return openSellerApplication();
}

function enhanceBannerVideo() {
  const banner = document.querySelector(".lv-ad");
  const video = banner?.querySelector("video");
  const button = banner?.querySelector(".lv-video-play");
  if (!banner || !video || !button || video.dataset.optimized) return;
  video.dataset.optimized = "true";
  button.addEventListener("click", async (event) => {
    event.stopPropagation();
    if (!video.src) video.src = video.dataset.src;
    try {
      await video.play();
      button.hidden = true;
    } catch {
      notify("Video başladılmadı");
    }
  }, { once: true });
}

function handleRecovery() {
  const dialog = document.querySelector("#accountDialog");
  const content = document.querySelector("#accountContent");
  content.innerHTML = `
    <span class="dialog-kicker">Hesab təhlükəsizliyi</span>
    <h2>Yeni şifrə yaradın</h2>
    <form id="passwordUpdateForm">
      <label>Yeni şifrə<input name="password" type="password" minlength="8" autocomplete="new-password" required></label>
      <label>Şifrəni təkrarla<input name="confirm" type="password" minlength="8" autocomplete="new-password" required></label>
      <button class="form-submit">Şifrəni yenilə</button>
      <p class="form-message"></p>
    </form>`;
  content.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = event.currentTarget.querySelector(".form-message");
    try {
      if (event.currentTarget.elements.password.value !== event.currentTarget.elements.confirm.value) {
        throw new Error("Şifrələr eyni deyil.");
      }
      await updatePassword(event.currentTarget.elements.password.value);
      message.className = "form-message success";
      message.textContent = "Şifrəniz yeniləndi.";
    } catch (error) {
      message.textContent = error.message;
    }
  });
  dialog.showModal();
}

function handlePaymentForm() {
  document.addEventListener("submit", async (event) => {
    if (event.target.id !== "checkoutForm") return;
    event.preventDefault();
    const button = event.target.querySelector(".form-submit");
    if (button) {
      button.disabled = true;
      button.textContent = "Epoint açılır...";
    }
    try {
      await startPayment(
        event.target.elements.address.value.trim(),
        event.target.elements.phone.value.trim(),
        event.target.elements.payment_method?.value || "card",
      );
    } catch (error) {
      notify(error.message || "Ödəniş başladılmadı.");
      if (button) {
        button.disabled = false;
        button.textContent = "Kartla ödə";
      }
    }
  });
}

function handlePaymentResult() {
  const url = new URL(window.location.href);
  const payment = url.searchParams.get("payment");
  if (!payment) return;
  history.replaceState({}, "", `${url.pathname}${url.hash}`);
  setTimeout(() => {
    notify(payment === "success" ? "Ödəniş qəbul edildi. Sifariş statusu yenilənir." : "Ödəniş tamamlanmadı.");
  }, 400);
}

async function bootstrap() {
  const redirectType = captureAuthRedirect();
  await initializeAuth();
  try {
    const liveProducts = await getProducts();
    if (liveProducts.length) {
      products = liveProducts.map((item) => {
        const product = {
          ...item,
        old: item.old_price || null,
        image: item.image_url || "/assets/product-1.jpg",
        rating: "5.0",
        reviews: 0,
        brand: item.brand || "",
        };
        product.category = inferCategory(product);
        return product;
      });
    }
  } catch {}
  renderApp();
  applyRouteView();
  addFooter();
  createDrawer();
  startClock();
  bindCoreInteractions();
  enhanceBannerVideo();
  handlePaymentResult();
  await syncCartCount();
  if (redirectType === "recovery") handleRecovery();
}

handlePaymentForm();
window.addEventListener("popstate", applyRouteView);
bootstrap();











