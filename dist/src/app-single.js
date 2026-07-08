import * as supabase from "./supabase.js?v=20260707-7";

const {
  addCartItem,
  captureAuthRedirect,
  createProduct,
  createSellerApplication,
  currentUser,
  getAdminData,
  getCart,
  getFavorites,
  getOrders,
  getProducts,
  getProfile,
  getSellerApplication,
  getSellerProducts,
  getSellerOrders,
  initializeAuth,
  removeCartItem,
  resendConfirmation,
  resetPassword,
  reviewSeller,
  signIn,
  signOut,
  signUp,
  toggleFavorite,
  updateOrderStatus,
  updatePassword,
  updateSellerApplication,
  uploadProductImage,
} = supabase;

const SUPABASE_URL = "https://ootloyfutihvupfforrv.supabase.co";
const SUPABASE_KEY = "sb_publishable_ppRwsR2EfF1Xx4ZTiQsSCw__w7tOLkG";
const SESSION_KEY = "egshop_session";
const BANNER_VIDEO = "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/12ea4064-c75b-46f7-be42-a9242b61737e/banner-video-1782387703134.mp4";

const categories = [
  ["📱", "Elektronika"],
  ["👗", "Qadin geyimleri"],
  ["👔", "Kisi geyimleri"],
  ["👶", "Usaq ve korpe"],
  ["👟", "Ayaqqabi"],
  ["💄", "Gozellik ve baxim"],
  ["🏠", "Ev ve metbex"],
  ["🛏️", "Ev tekstili"],
  ["🚗", "Avtomobil"],
  ["🔧", "Tikinti ve temir"],
  ["🌳", "Bag ve heyet"],
  ["⚽", "Idman ve istirahet"],
  ["🐾", "Heyvan mehsullari"],
  ["📚", "Kitablar ve ofis"],
  ["🛒", "Erzaq mehsullari"],
  ["💊", "Saglamliq"],
  ["🎁", "Hediyye ve suvenir"],
  ["💍", "Zergerlik ve saatlar"],
  ["🎮", "Oyun ve hobbi"],
  ["🧳", "Cantalar ve aksesuarlar"],
  ["💼", "Ofis ve biznes"],
  ["🏡", "Smart ev"],
  ["🚲", "Velosiped ve skuter"],
  ["🍳", "Metbex texnikasi"],
  ["🧺", "Meiset texnikasi"],
  ["📸", "Foto ve video"],
];

const subCategories = [
  "Smartfonlar",
  "Telefon aksesuarlari",
  "Noutbuklar",
  "Plansetler",
  "Stolustu komputerler",
  "Monitorlar",
  "Klaviatura ve mauslar",
  "Yaddas ve diskler",
  "Printerler ve skanerler",
  "Televizorlar",
  "Audio sistemler",
  "Agilli saatlar",
];

const categoryWords = {
  Elektronika: ["telefon", "redmi", "skuter", "elektrik", "portable", "xiaomi"],
  "Qadin geyimleri": ["qadin", "geyim"],
  "Kisi geyimleri": ["kisi", "geyim"],
  "Usaq ve korpe": ["usaq", "korpe"],
  Ayaqqabi: ["ayaqqabi"],
  "Gozellik ve baxim": ["etir", "gozellik", "baxim"],
  "Ev ve metbex": ["ev", "yataq", "metbex", "kofe"],
  "Ev tekstili": ["yataq", "tekstil"],
  Avtomobil: ["mopet", "skuter"],
  "Velosiped ve skuter": ["skuter", "mopet"],
  Mebel: ["mebel", "italya"],
};

const fallbackProducts = [
  { id: "31d03601-5ff1-4b36-8825-5884c00d3332", name: "Etir", price: 100, old: 110, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/d39654de-946a-4352-b1f1-77b7facd2705/986c0fbc-169b-49a9-b6f1-f4a79a844db9.jpg", rating: "4.8", reviews: 12, brand: "Brend", category: "Gozellik ve baxim" },
  { id: "118306a5-3867-42db-a025-170f52e786f7", name: "italya mebel", price: 1500, old: 1800, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/d39654de-946a-4352-b1f1-77b7facd2705/cbb4919c-9264-42fb-88cb-3351e81d812c.jpg", rating: "5.0", reviews: 2, brand: "avilla", category: "Ev ve metbex" },
  { id: "e6635adc-e394-485f-b999-a7ee263760cd", name: "Mopet", price: 1000, old: null, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/d39654de-946a-4352-b1f1-77b7facd2705/721da7d9-71c3-43fb-9cc2-7e34fded753b.jpg", rating: "4.6", reviews: 7, brand: "Bmv", category: "Velosiped ve skuter" },
  { id: "9dfcd652-cfd9-4e1e-8496-8a11934f4fb2", name: "Xiaomi", price: 800, old: null, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/d39654de-946a-4352-b1f1-77b7facd2705/b43b3238-5324-4b67-87e4-fa2ad6232ce7.jpg", rating: "4.9", reviews: 19, brand: "Redmi", category: "Elektronika" },
  { id: "af318359-3b26-4080-ac5b-67c4518d3ac8", name: "kofe", price: 100, old: null, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/d39654de-946a-4352-b1f1-77b7facd2705/d58b87e3-b1b5-4084-b21f-3545cc816552.jpg", rating: "4.5", reviews: 4, brand: "EG Shop", category: "Erzaq mehsullari" },
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
    item.setAttribute("aria-label", `${count} mehsul`);
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
  return found?.[1] || "Diger";
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
    "/discover": "Kesf et",
    "/shops": "Magazalar",
    "/compare": "Muqayise",
    "/map": "Xerite",
    "/promotions": "Aksiyalar",
    "/bonus": "Bonuslar",
    "/support": "Destek",
    "/favorites": "Sevimliler",
    "/cart": "Sebet",
    "/download": "Mobil tetbiq",
    "/auth": "Giris / Qeydiyyat",
    "/seller": "Satici paneli",
    "/contact": "Elaqe",
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
    ? `${product.name} - ${money(product.price)}. EG Shop-da sebet, sifaris ve onlayn odenis.`
    : "EG Shop marketplace: kateqoriyalar, axtaris, satici paneli, sebet, sifaris ve onlayn odenis.";
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
  if (path === "/shops") return infoPage("Magazalar", "Saticilar ve brend magazalar", "Platformada aktiv magazalar, reytinqlər ve satici profilleri burada toplanacaq.", ["Tesdiqli satici rozeti", "Satici mehsullari", "Elaqe ve teslimat melumatlari"]);
  if (path === "/compare") return comparePage();
  if (path === "/map") return infoPage("Xerite", "Catdirilma ve PVZ noqte leri", "Musteri yaxin teshvil menteqesini secmek ve sifarisi xəritədə izləmək imkanina sahib olacaq.", ["PVZ menteqeleri", "Kuryer zonalari", "Canli status"]);
  if (path === "/promotions") return promotionsPage();
  if (path === "/bonus") return infoPage("Bonuslar", "Xal qazan, endirim kimi istifade et", "Her sifaris bonus balansina cevrilir. Bonus sistemi alicilari geri qaytarmaq ucun qurulur.", ["Sifaris bonusu", "Dostunu devet et", "VIP musteriler"]);
  if (path === "/support") return supportPage();
  if (path === "/auth") return authPage();
  if (path === "/seller") return sellerDashboardPage();
  if (path === "/contact") return contactPage();
  if (path === "/download") return infoPage("EG Shop tetbiqi", "Surətli alis-veris cibinde", "Mobil tetbiq bildirisleri, sebeti ve kampaniyalari bir yerde saxlayacaq.", ["Push bildirisler", "Tez sifaris", "Ozel kuponlar"]);
  return "";
}

function authPage() {
  const mode = new URLSearchParams(window.location.search).get("mode") === "register" ? "register" : "login";
  const register = mode === "register";
  return `
    <section class="auth-page-shell">
      <div class="auth-brand-panel">
        <img src="/assets/logo.png" alt="EG Shop">
        <span>EG SHOP</span>
        <h1>${register ? "Yeni hesab yaradin" : "Hesabiniza daxil olun"}</h1>
        <p>Musteri, satici ve admin axinlari ucun tek EG Shop hesabi.</p>
        <div class="auth-benefits"><b>Suretli sebet</b><b>Tehlukesiz odenis</b><b>Satici paneli</b></div>
      </div>
      <form id="authRouteForm" class="auth-page-card" data-mode="${mode}" novalidate>
        <div class="auth-tabs">
          <button type="button" class="${!register ? "active" : ""}" data-route-auth-mode="login">Giris</button>
          <button type="button" class="${register ? "active" : ""}" data-route-auth-mode="register">Qeydiyyat</button>
        </div>
        <div class="register-fields" ${register ? "" : "hidden"}>
          <label>Ad ve soyad<input name="full_name" autocomplete="name" ${register ? "required" : ""}></label>
          <label>Telefon<input name="phone" autocomplete="tel" placeholder="+994 50 000 00 00" ${register ? "required" : ""}></label>
        </div>
        <label>E-poct<input name="email" type="email" autocomplete="email" required></label>
        <label>Sifre<span class="password-field"><input name="password" type="password" minlength="8" autocomplete="${register ? "new-password" : "current-password"}" required><button type="button" data-password-toggle>Goster</button></span></label>
        <div class="register-fields" ${register ? "" : "hidden"}>
          <label>Sifreni tekrarla<input name="password_confirm" type="password" minlength="8" ${register ? "required" : ""}></label>
          <label class="terms-check"><input name="terms" type="checkbox"> <span>Istifade sertlerini qebul edirem.</span></label>
        </div>
        <button class="auth-link" type="button" data-forgot-password ${register ? "hidden" : ""}>Sifremi unutdum</button>
        <button class="form-submit" type="submit">${register ? "Qeydiyyatdan kec" : "Daxil ol"}</button>
        <p class="form-message" id="authMessage"></p>
      </form>
    </section>`;
}

function sellerDashboardPage() {
  const email = currentUser()?.email || "seller@egshop.az";
  const sample = products.slice(0, 2);
  return `
    <section class="seller-dashboard-page">
      <div class="seller-dashboard-top"><div><span>SATICI PANELI</span><h1>Magazam</h1><p>${email}</p></div><button type="button" class="form-submit" data-panel="seller">Mehsul idareetmesini ac</button></div>
      <nav class="seller-dashboard-tabs"><button class="active">Dashboard</button><button>Mehsullar <i>${products.length}</i></button><button>Toplu yukleme</button><button>Sifarisler <i>2</i></button><button>Qaytarmalar</button><button>Bildirisler</button><button>Analitika</button></nav>
      <div class="seller-metrics"><article><b>${products.length}</b><span>Aktiv mehsul</span></article><article><b>${money(products.reduce((sum, p) => sum + Number(p.price || 0), 0))}</b><span>Vitrin deyeri</span></article><article><b>2</b><span>Gozleyen sifaris</span></article><article><b>98%</b><span>Hazirliq seviyesi</span></article></div>
      <section class="seller-orders-panel"><div class="seller-panel-heading"><h2>Sifarisler</h2><div><button>Bu gun</button><button>7 gun</button><button>30 gun</button></div></div>${sample.map((product, index) => `<article class="seller-order-row"><img src="${product.image}" alt=""><div><b>${product.name}</b><small>No ${2033446 + index} - ${index + 1} eded - Musteri: EG Shop</small><p>PVZ punkt teyin olunmayib</p></div><strong>${money(product.price)}</strong><button>Paketle</button><button>Gonderildi</button><button>Etiket cap et</button></article>`).join("")}</section>
    </section>`;
}

function contactPage() {
  return `<section class="contact-page"><h1>Elaqe</h1><div class="contact-card"><p><b>@</b> info@egshop.az</p><p><b>T</b> +994 50 000 00 00</p><p><b>M</b> Baki, Azerbaycan</p></div></section>`;
}

function catalogPage() {
  const params = new URLSearchParams(window.location.search);
  const query = params.get("q") || "";
  const category = params.get("category") || "";
  const items = filteredProducts(query, category);
  return `
    <section class="route-hero">
      <span>KATALOQ</span>
      <h1>Butun kateqoriyalar ve mehsullar</h1>
      <p>${category || query ? `${items.length} netice tapildi.` : "EG Shop-da elektronika, ev, moda, hediyye ve daha cox bolme tek ekranda toplanir."}</p>
    </section>
    <section class="route-category-grid">
      ${categories.map(([icon, name]) => `<button type="button" class="${name === category ? "active" : ""}" data-category="${name}"><span>${icon}</span><b>${name}</b><small>${(categoryWords[name] || [name]).join(", ")}</small></button>`).join("")}
    </section>
    <section class="products-section route-products">
      <div class="section-title"><h2>${category || query ? "Filtr neticeleri" : "Kataloq mehsullari"}</h2><button type="button" data-show-all>Hamisi ></button></div>
      <div class="product-grid">${productResults(items, false, query, category)}</div>
    </section>`;
}

function discoverPage() {
  const discounted = products.filter((product) => product.old).concat(products).slice(0, 8);
  return `
    <section class="route-hero discover">
      <span>KESF ET</span>
      <h1>Trend, endirim ve uduslu secimler</h1>
      <p>Alis-verisi daha maraqli etmek ucun populyar mehsullar, endirimler ve hefte hediyyeleri burada gosterilir.</p>
    </section>
    <section class="lv-product-section lv-sale route-block">
      <div class="lv-section-heading"><div><span class="lv-kicker">ENDIRIM</span><h2>Bugunun secimi</h2></div></div>
      <div class="lv-products">${productList(discounted.slice(0, 4), true)}</div>
    </section>
    <section class="products-section route-products">
      <div class="section-title"><h2>Sizin ucun</h2></div>
      <div class="product-grid">${productList(products)}</div>
    </section>`;
}

function productDetailPage(id) {
  const product = findProduct(id);
  const related = products.filter((item) => item.id !== product.id).slice(0, 4);
  return `
    <section class="product-detail-page">
      <button class="route-back" type="button" data-route="/">‹ Ana sehife</button>
      <div class="detail-media"><img src="${product.image}" alt="${product.name}"></div>
      <div class="detail-copy">
        <span>${product.brand || "EG Shop"}</span>
        <h1>${product.name}</h1>
        <div class="detail-price"><strong>${money(product.price)}</strong>${product.old ? `<del>${money(product.old)}</del><em>-${discount(product)}%</em>` : ""}</div>
        <p>Keyfiyyetli mehsul, rahat sebet, sevimliler ve sifaris axini ile EG Shop marketplace tecrubesi.</p>
        <div class="detail-actions">
          <button class="lv-cart" type="button" data-add="${product.id || ""}">Sebete at</button>
          <button class="detail-favorite" type="button" data-favorite="${product.id || ""}">Sevimliye elave et</button>
        </div>
        <ul>
          <li>Catdirilma ve PVZ secimi desteklenir</li>
          <li>Satici paneli ile mehsul idareetmesi</li>
          <li>Təhlükəsiz hesab ve sifaris tarixcesi</li>
        </ul>
      </div>
    </section>
    <section class="products-section route-products">
      <div class="section-title"><h2>Oxsar mehsullar</h2></div>
      <div class="product-grid">${productList(related)}</div>
    </section>`;
}

function promotionsPage() {
  return `
    <section class="route-hero promo">
      <span>AKSIYALAR</span>
      <h1>Endirimler, kuponlar ve uduslar</h1>
      <p>Hefte sonu endirimleri, uduşlu məhsullar və xüsusi kampaniyalar üçün ayrılmış bölmə.</p>
    </section>
    <section class="promo-grid">
      <article><b>70% endirim</b><p>Secilmis kolleksiyalarda boyuk endirim bloklari.</p></article>
      <article><b>Uduşlu sifaris</b><p>Her tamamlanan sifaris hefte hediyyesinde istirak edir.</p></article>
      <article><b>Yeni satici bonusu</b><p>Yeni magazalar ucun komissiya ve reklam destekleri.</p></article>
    </section>`;
}

function comparePage() {
  return `
    <section class="route-hero">
      <span>MUQAYISE</span>
      <h1>Mehsullari yan-yana yoxla</h1>
      <p>Qiymet, endirim, reytinq ve brend melumatlarini bir ekranda muqayise et.</p>
    </section>
    <section class="compare-grid">
      ${products.slice(0, 3).map((product) => `<article>${productCard(product, true)}<dl><dt>Qiymet</dt><dd>${money(product.price)}</dd><dt>Reytinq</dt><dd>${product.rating || "5.0"}</dd><dt>Brend</dt><dd>${product.brand || "EG Shop"}</dd></dl></article>`).join("")}
    </section>`;
}

function supportPage() {
  return `
    <section class="route-hero support">
      <span>DESTEK</span>
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
    <section class="info-list">${items.map((item) => `<article><b>${item}</b><p>Bu modul marketplace inkişaf planına daxil edilib və əsas alis-veris axını ilə birləşdirilir.</p></article>`).join("")}</section>`;
}

function productCard(product, highlighted = false) {
  const percent = discount(product);
  return `
    <article class="${highlighted ? "lv-card" : "product-card"}" data-product-id="${product.id || ""}" tabindex="0" role="link" aria-label="${product.name} mehsuluna bax">
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
        <button class="${highlighted ? "lv-detail" : "detail-button"}" type="button" data-route="/product/${product.id || ""}">Detalli bax</button>
        <button class="${highlighted ? "lv-cart" : "cart-button"}" type="button" data-add="${product.id || ""}">Sebete at</button>
      </div>
    </article>
  `;
}

function emptyProductsText(query = "", category = "") {
  const detail = [category, query].filter(Boolean).join(" / ");
  return `<div class="empty-products"><b>Mehsul tapilmadi</b><p>${detail ? `${detail} ucun` : "Bu bolmede"} netice yoxdur. Basqa soz ve ya kateqoriya yoxlayin.</p></div>`;
}

function productResults(items, highlighted = false, query = "", category = "") {
  return items.length ? productList(items, highlighted) : emptyProductsText(query, category);
}

function renderApp() {
  const userLabel = currentUser() ? "Hesab" : "Giris";
  document.querySelector("#app").innerHTML = `
    <aside class="market-sidebar" aria-label="Esas menyu">
      <a class="side-brand" href="/" data-route="/">
        <img src="/assets/logo.png" alt="EG Shop">
        <span><b>EG Shop</b><small>market</small></span>
      </a>
      <p>Esas menyu</p>
      <nav>
        <button type="button" data-route="/"><span>H</span>Ana sehife</button>
        <button type="button" data-route="/catalog"><span>K</span>Kataloq</button>
        <button type="button" data-route="/shops"><span>M</span>Magazalar</button>
        <button type="button" data-route="/discover"><span>D</span>Kesf et</button>
        <button type="button" data-route="/compare"><span>C</span>Muqayise</button>
        <button type="button" data-route="/map"><span>X</span>Xerite</button>
        <button type="button" data-route="/promotions"><span>A</span>Aksiyalar</button>
        <button type="button" data-route="/bonus"><span>B</span>Bonuslar</button>
        <button type="button" data-route="/support"><span>?</span>Destek</button>
      </nav>
      <div class="side-help">
        <b>Marketplace</b>
        <small>Satici, alici ve PVZ axinlari tek yerde.</small>
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
          <input id="searchInput" type="search" placeholder="Mehsul, marka ve ya kateqoriya axtar...">
          <button type="button" aria-label="Axtaris">O</button>
        </label>
        <nav class="header-actions" aria-label="Istifadeci menyusu">
          <button type="button" data-language><span>AZ</span><b>AZ</b></button>
          <button type="button" data-action="discover"><span>D</span><b>Kesf et</b></button>
          <button type="button" data-action="favorites"><span>F</span><b>Sevimli</b></button>
          <button type="button" class="basket-action" data-action="cart"><span>C</span><b>Sebet</b><i id="cartCount">0</i></button>
          <button type="button" data-route="/auth"><span>U</span><b>${userLabel}</b></button>
        </nav>
      </div>
    </header>

    <main id="top">
      <section class="market-hero">
        <div>
          <span>EG Shop - Azerbaycanin onlayn marketi</span>
          <h1>Alis-veris, magazalar ve catdirilma tek platformada</h1>
          <p>Mehsul axtarisi, satici paneli, PVZ, sebet ve bonus axinlari mobilde de rahat istifade ucun yeniden yigildi.</p>
        </div>
        <div class="hero-stat"><b>${products.length}</b><small>aktiv mehsul</small></div>
      </section>

      <div class="quick-links role-links">
        <button type="button" data-route="/seller">Satici girisi</button>
        <button type="button" data-action="pvz">PVZ girisi</button>
        <button type="button" data-panel="admin">Admin</button>
        <button type="button" class="seller" data-route="/auth?mode=register">Satici ol</button>
      </div>

      <section class="lv-category-area">
        <div class="lv-scroll lv-categories">
          ${categories.map(([icon, name], index) => `<button type="button" class="${index === 0 ? "active" : ""}" data-category="${name}"><span>${icon}</span>${name}</button>`).join("")}
        </div>
        <div class="lv-section-heading lv-subheading"><h2>One cixan kateqoriyalar</h2><button type="button" data-show-all>Hamisi ></button></div>
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
        <div class="lv-section-heading"><div><span class="lv-kicker">HEDIYYE</span><h2>Uduslu mehsullar</h2></div><button type="button" data-show-all>Hamisi ></button></div>
        <div class="lv-products">${products.slice(0, 1).map((product) => productCard(product, true)).join("")}</div>
      </section>

      <section class="lv-product-section lv-sale">
        <div class="lv-section-heading"><div><span class="lv-kicker">ENDIRIM</span><h2>Endirimli qiymetler</h2></div><button type="button" data-show-all>Hamisi ></button></div>
        <div class="lv-products">${products.slice(0, 3).map((product) => productCard(product, true)).join("")}</div>
      </section>

      <section class="products-section">
        <div class="section-title"><h2>Sizin ucun</h2><button type="button" data-show-all>Hamisi ></button></div>
        <div class="product-grid" id="productGrid">${products.map((product) => productCard(product, false)).join("")}</div>
      </section>

      <section class="gift-banner" data-route="/promotions">
        <span>UDUS</span>
        <div><small>Her sifaris bir sansdir</small><h2>Heftelik hediyyeler qazan</h2></div>
        <button type="button" data-route="/promotions">Etrafli bax ></button>
      </section>
    </main>

    <nav class="mobile-nav" aria-label="Mobil menyu">
      <button type="button" data-mobile="home"><span>H</span>Ana sehife</button>
      <button type="button" data-mobile="catalog"><span>K</span>Kataloq</button>
      <button type="button" data-mobile="cart"><span>S</span>Sebet<i id="mobileCartCount">0</i></button>
      <button type="button" data-mobile="favorites"><span>F</span>Sevimli</button>
      <button type="button" data-mobile="account"><span>U</span>${userLabel}</button>
    </nav>

    <dialog class="account-dialog" id="accountDialog">
      <button class="dialog-close" data-close="accountDialog">x</button>
      <div id="accountContent"></div>
    </dialog>

    <dialog class="panel-dialog" id="panelDialog">
      <button class="dialog-close" data-close="panelDialog">x</button>
      <div id="panelContent"></div>
    </dialog>

    <div class="toast" id="toast">Hazirdir</div>
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
    button.addEventListener("click", () => routeTo(`/auth?mode=${button.dataset.routeAuthMode}`));
  });
  root.querySelectorAll("[data-password-toggle]").forEach((button) => {
    if (button.dataset.controlBound) return;
    button.dataset.controlBound = "true";
    button.addEventListener("click", () => {
      const input = button.closest("label")?.querySelector("input");
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
      button.textContent = input.type === "password" ? "Goster" : "Gizlet";
    });
  });
  root.querySelector("#authRouteForm")?.addEventListener("submit", handleAuth);
  root.querySelector("[data-forgot-password]")?.addEventListener("click", async () => {
    const form = root.querySelector("#authRouteForm");
    const message = root.querySelector("#authMessage");
    try {
      await resetPassword(form.elements.email.value);
      message.className = "form-message success";
      message.textContent = "Sifre yenileme linki e-poctunuza gonderildi.";
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
        notify("Mehsul sebete elave edildi");
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
        notify(added ? "Sevimlilere elave edildi" : "Sevimlilerden silindi");
      } catch (error) {
        notify(error.message);
      }
    });
  });
}

function addFooter() {
  if (document.querySelector(".site-footer")) return;
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = '<b>EG SHOP</b><nav><a href="/about.html">Haqqimizda</a><a href="/contact.html">Elaqe</a><a href="/privacy.html">Mexfilik siyaseti</a></nav><small>© 2026 EG Shop</small>';
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
        <button type="button" data-drawer-target="#top"><span>H</span><b>Ana sehife</b></button>
        <button type="button" data-route="/catalog"><span>K</span><b>Kataloq</b></button>
        <button type="button" data-drawer-target=".products-section"><span>M</span><b>Mehsullar</b></button>
        <button type="button" data-route="/shops"><span>S</span><b>Magazalar</b></button>
        <button type="button" data-route="/compare"><span>C</span><b>Muqayise</b></button>
        <button type="button" data-route="/promotions"><span>A</span><b>Aksiyalar</b></button>
        <button type="button" data-route="/bonus"><span>B</span><b>Bonuslar</b></button>
        <button type="button" data-route="/support"><span>D</span><b>Destek</b></button>
        <button type="button" data-drawer-seller><span>S</span><b>Satici ol</b></button>
      </nav>
      <div class="drawer-support"><small>Destek</small><b>Her gun yaninizdayiq</b><a href="mailto:info@egshop.az">info@egshop.az</a></div>
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
  notify(visible ? `${label}: ${visible} mehsul tapildi` : `${label} ucun hele mehsul yoxdur`);
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
  if (!token) throw new Error("Sifaris ucun yeniden giris edin.");
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
  if (!token) throw new Error("Sifaris ucun yeniden giris edin.");
  let result;
  if (method === "card") {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/epoint-create`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ address, phone }),
    });
    result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.message || "Odenis basladilmadi.");
  } else if (method.startsWith("saved:")) {
    result = await callAdvanced({ action: "saved-card-pay", card_id: method.slice(6), address, phone });
  } else if (method.startsWith("wallet:")) {
    result = await callAdvanced({ action: "wallet-pay", wallet_id: method.slice(7), address, phone });
  } else {
    const actions = { split: "split-pay", preauth: "preauth", widget: "payment-widget" };
    result = await callAdvanced({ action: actions[method], address, phone });
  }
  const destination = result?.redirect_url || result?.widget_url;
  if (!destination) throw new Error(result?.message || "Odenis sehifesi yaradilamdi.");
  window.location.assign(destination);
}

async function openFavorites() {
  try {
    const favorites = await getFavorites();
    showInfo("Sevimliler", favorites.length ? `<div class="drawer-products">${favorites.map((item) => drawerProduct(item.products)).join("")}</div>` : "<p>Sevimli mehsulunuz yoxdur.</p>");
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
    <div class="cart-total"><span>Cemi</span><b>${money(total)}</b></div>
    <form id="checkoutForm" class="product-form">
      <p class="flow-hint">Sifaris tesdiqlenende sistem mehsullari saticilara baglayir ve Epoint odenis sehifesine yonlendirir.</p>
      <label>Catdirilma unvani<input name="address" required minlength="8" placeholder="Seher, kuce, bina, menzil"></label>
      <label>Telefon<input name="phone" required inputmode="tel" placeholder="+994 50 000 00 00"></label>
      <label>Odenis usulu
        <select name="payment_method">
          <option value="card">Bank karti</option>
          <option value="split">Marketplace split</option>
          <option value="preauth">Preauth</option>
          <option value="widget">Apple Pay / Google Pay</option>
        </select>
      </label>
      <label>Catdirilma qeydi<textarea name="note" rows="3" placeholder="Kuryer ucun qeyd varsa yazin"></textarea></label>
      <label class="terms-check"><input name="terms" type="checkbox" required><span>Sifaris ve odenis sertlerini qebul edirem</span></label>
      <button type="button" class="form-secondary" data-register-card>Karti yadda saxla</button>
      <button class="form-submit" type="submit">Kartla ode</button>
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
    if (!items.length) return showInfo("Sebet", "<p>Sebetiniz bosdur.</p>");
    const total = items.reduce((sum, item) => sum + Number(item.products.price) * item.quantity, 0);
    showInfo("Sebet", renderCheckoutForm(items, total));
    document.querySelectorAll("[data-remove-cart]").forEach((button) => button.addEventListener("click", async () => {
      await removeCartItem(button.dataset.removeCart);
      await openCart();
      syncCartCount();
    }));
    document.querySelector("[data-register-card]")?.addEventListener("click", async () => {
      try {
        const result = await callAdvanced({ action: "register-card" });
        if (!result.redirect_url) throw new Error("Kart qeydiyyati acilmadi.");
        window.location.assign(result.redirect_url);
      } catch (error) {
        notify(error.message);
      }
    });
    await hydratePaymentOptions(document.querySelector("#checkoutForm"));
  } catch (error) {
    notify(error.message);
  }
}

function openSellerApplication() {
  if (!currentUser()) return openAccountDialog();
  showInfo("Satici ol", `
    <p>Magazanizi EG Shop platformasinda acmaq ucun muraciet gonderin.</p>
    <form id="sellerApplicationForm" class="product-form">
      <p class="flow-hint">Muraciet admin terefinden tesdiqlenenden sonra mehsul yukleme paneli acilacaq.</p>
      <label>Magaza adi<input name="store_name" required placeholder="Meselen: EG Elektronika"></label>
      <label>Telefon<input name="phone" required placeholder="+994 50 000 00 00"></label>
      <label>Kateqoriya
        <select name="category" required>
          <option value="">Secin</option>
          <option>Elektronika</option>
          <option>Geyim ve aksesuar</option>
          <option>Ev ve metbex</option>
          <option>Gozellik ve baxim</option>
          <option>Market ve gundelik</option>
          <option>Diger</option>
        </select>
      </label>
      <label>Seher<input name="city" required placeholder="Baki"></label>
      <label>Unvan<input name="address" required placeholder="Magaza/ofis unvani"></label>
      <label>VOEN<input name="tax_id" required inputmode="numeric" pattern="[0-9]{10}" placeholder="10 reqemli VOEN"></label>
      <label>Odenis hesabi<input name="payout_account" required placeholder="IBAN ve ya kart hesabi"></label>
      <label>Catdirilma imkani
        <select name="delivery_type" required>
          <option>Oz kuryerim var</option>
          <option>Platforma catdirilmasi isteyirem</option>
          <option>Magazadan goturme</option>
        </select>
      </label>
      <label>Qeyd<textarea name="note" rows="4" placeholder="Satacaginiz mehsullar, brendler ve is modeliniz haqqinda qisa melumat"></textarea></label>
      <label class="terms-check"><input name="terms" type="checkbox" required><span>Satici qaydalarini qebul edirem</span></label>
      <button class="form-submit" type="submit">Muraciet gonder</button>
    </form>`);
  document.querySelector("#sellerApplicationForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await createSellerApplication(Object.fromEntries(new FormData(event.currentTarget)));
      notify("Muraciet qebul edildi");
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
  content.innerHTML = "<p>Panel hazirlanir...</p>";
  dialog.showModal();
  try {
    const profile = await getProfile();
    const allowed = type === "admin" ? profile?.role === "admin" : ["seller", "admin"].includes(profile?.role);
    if (!allowed) {
      content.innerHTML = `<span class="dialog-kicker">Giris mehduddur</span><h2>${type === "admin" ? "Admin" : "Satici"} paneli</h2><p>Bu hesab ucun uygun rol teyin edilmeyib.</p>`;
      return;
    }
    if (type === "admin") {
      const admin = await getAdminData();
      content.innerHTML = `
        <span class="dialog-kicker">Admin paneli</span>
        <h2>Platforma idareetmesi</h2>
        <div class="panel-stats">
          <div><b>${admin.profiles.length}</b><span>Istifadeci</span></div>
          <div><b>${admin.products.length}</b><span>Mehsul</span></div>
          <div><b>${admin.orders.length}</b><span>Sifaris</span></div>
          <div><b>${admin.applications.filter((item) => item.status === "pending").length}</b><span>Gozleyen satici</span></div>
        </div>
        <h3>Satici muracietleri</h3>
        <div class="management-list">
          ${admin.applications.length ? admin.applications.map((item) => `<div><span><b>${item.store_name}</b><small>${item.phone} · ${item.status}</small></span>${item.status === "pending" ? `<span><button type="button" data-review="${item.id}" data-approve="true">Tesdiq</button><button type="button" data-review="${item.id}" data-approve="false">Redd</button></span>` : ""}</div>`).join("") : "<p>Muraciet yoxdur.</p>"}
        </div>
        <h3>Sifarisler</h3>
        <div class="management-list">
          ${admin.orders.length ? admin.orders.map((order) => `<div><span><b>${money(order.total)}</b><small>${new Date(order.created_at).toLocaleDateString("az-AZ")}</small></span><select data-order="${order.id}">${["pending", "confirmed", "shipped", "delivered", "cancelled"].map((status) => `<option ${status === order.status ? "selected" : ""}>${status}</option>`).join("")}</select></div>`).join("") : "<p>Sifaris yoxdur.</p>"}
        </div>`;
      content.querySelectorAll("[data-review]").forEach((button) => button.addEventListener("click", async () => {
        await reviewSeller(button.dataset.review, button.dataset.approve === "true");
        notify("Muraciet yenilendi");
        dialog.close();
      }));
      content.querySelectorAll("[data-order]").forEach((select) => select.addEventListener("change", async () => {
        await updateOrderStatus(select.dataset.order, select.value);
        notify("Sifaris statusu yenilendi");
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
      <span class="dialog-kicker">Satici paneli</span>
      <h2>Magaza idareetmesi</h2>
      <div class="panel-stats">
        <div><b>${sellerProducts.length}</b><span>Mehsul</span></div>
        <div><b>${activeProducts}</b><span>Aktiv vitrin</span></div>
        <div><b>${sellerProducts.reduce((sum, item) => sum + Number(item.stock || 0), 0)}</b><span>Stok</span></div>
        <div><b>${money(sellerRevenue)}</b><span>Satis dovriyyesi</span></div>
      </div>
      <div class="seller-panel-grid">
        <section>
          <h3>Yeni mehsul yukle</h3>
      <form id="productForm" class="product-form">
        <p class="flow-hint">Mehsulu sekil fayli ile yukleyin ve ya hazir sekil URL-i daxil edin.</p>
        <label>Mehsul adi<input name="name" required></label>
        <label>Kateqoriya
          <select name="category" required>
            ${categories.map((item) => `<option>${item[1]}</option>`).join("")}
          </select>
        </label>
        <label>Qiymet<input name="price" type="number" min="0" step="0.01" required></label>
        <label>Kohne qiymet<input name="old_price" type="number" min="0" step="0.01" placeholder="Endirim varsa"></label>
        <label>Stok<input name="stock" type="number" min="0" required></label>
        <label>Brend<input name="brand" placeholder="Samsung, Apple, Zara..."></label>
        <label>Tesvir<textarea name="description" rows="3" placeholder="Mehsul haqqinda qisa melumat"></textarea></label>
        <label>Mehsul sekli<input name="image_file" type="file" accept="image/*"></label>
        <label>Shekil URL<input name="image_url" type="url"></label>
        <label class="terms-check"><input name="active" type="checkbox" checked><span>Mehsul vitrinde aktiv gorunsun</span></label>
        <button class="form-submit" type="submit">Mehsul elave et</button>
      </form>
        </section>
        <section>
          <h3>Satici profili</h3>
          <form id="sellerProfileForm" class="product-form compact-form">
            <p class="flow-hint">Bu melumatlar admin yoxlamasi, musteri etibari ve payout ucun istifade olunur.</p>
            <label>Magaza adi<input name="store_name" value="${sellerApplication?.store_name || ""}" required></label>
            <label>Telefon<input name="phone" value="${sellerApplication?.phone || ""}" required></label>
            <label>Seher<input name="city" value="${sellerApplication?.city || ""}" placeholder="Baki"></label>
            <label>Unvan<input name="address" value="${sellerApplication?.address || ""}" placeholder="Magaza/ofis unvani"></label>
            <label>Odenis hesabi<input name="payout_account" value="${sellerApplication?.payout_account || ""}" placeholder="IBAN ve ya kart hesabi"></label>
            <label>Magaza qeydi<textarea name="note" rows="3">${sellerApplication?.note || ""}</textarea></label>
            <button class="form-secondary" type="submit">Profili yenile</button>
          </form>
          <h3>Mehsullarim</h3>
          <div class="management-list seller-products-list">
            ${sellerProducts.length ? sellerProducts.slice(0, 8).map((item) => `<div><span><b>${item.name}</b><small>${money(item.price)} - stok ${item.stock || 0} - ${item.active === false ? "passiv" : "aktiv"}</small></span><img src="${item.image_url || "/assets/product-1.jpg"}" alt=""></div>`).join("") : "<p>Hele mehsul yuklenmeyib.</p>"}
          </div>
          <h3>Sifarislerim</h3>
          <div class="management-list">
            ${sellerOrders.length ? sellerOrders.slice(0, 8).map((item) => `<div><span><b>${item.product_name || item.products?.name || "Mehsul"}</b><small>${item.quantity || 1} eded - ${money(Number(item.price || 0) * Number(item.quantity || 1))} - ${item.orders?.status || "pending"}</small></span></div>`).join("") : "<p>Bu satici ucun hele sifaris yoxdur.</p>"}
          </div>
          <h3>Odenis hesabi</h3>
          <p class="flow-hint">Kart odemeleri Epoint uzerinden qebul olunur. Satici balans ve payout bolmesi novbeti merhelede bank hesabina avtomatik cixaris ucun genislendirile biler.</p>
        </section>
      </div>`;
    content.querySelector("#sellerProfileForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = event.currentTarget.querySelector("button");
      submit.disabled = true;
      submit.textContent = "Yenilenir...";
      try {
        await updateSellerApplication(Object.fromEntries(new FormData(event.currentTarget)));
        notify("Satici profili yenilendi");
      } catch (error) {
        notify(error.message);
      } finally {
        submit.disabled = false;
        submit.textContent = "Profili yenile";
      }
    });
    content.querySelector("#productForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = event.currentTarget.querySelector(".form-submit");
      submit.disabled = true;
      submit.textContent = "Mehsul yuklenir...";
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
        notify("Mehsul elave edildi");
        dialog.close();
        await bootstrap();
      } catch (error) {
        notify(error.message);
      } finally {
        submit.disabled = false;
        submit.textContent = "Mehsul elave et";
      }
    });
  } catch (error) {
    content.innerHTML = `<h2>Baglanti xetasi</h2><p>${error.message}</p>`;
  }
}

function openAccountDialog() {
  const dialog = document.querySelector("#accountDialog");
  const content = document.querySelector("#accountContent");
  const user = currentUser();
  if (!dialog || !content) return;
  if (user) {
    content.innerHTML = `
      <span class="dialog-kicker">Hesabim</span>
      <h2>${user.email}</h2>
      <p>EG Shop hesabiniz aktivdir.</p>
      <button class="form-secondary" type="button" id="ordersButton">Sifarislerim</button>
      <button class="form-submit" type="button" id="logoutButton">Cixis et</button>`;
    content.querySelector("#ordersButton")?.addEventListener("click", showOrders);
    content.querySelector("#logoutButton")?.addEventListener("click", async () => {
      await signOut();
      window.location.reload();
    });
  } else {
    content.innerHTML = `
      <span class="dialog-kicker">EG Shop</span>
      <h2 id="authTitle">Hesabiniza daxil olun</h2>
      <div class="auth-tabs" role="tablist">
        <button type="button" class="active" data-auth-mode="login">Giris</button>
        <button type="button" data-auth-mode="register">Qeydiyyat</button>
      </div>
      <form id="authForm" data-mode="login" novalidate>
        <div class="register-fields" hidden>
          <label>Ad ve soyad<input name="full_name" autocomplete="name" maxlength="100"></label>
          <label>Telefon<input name="phone" type="tel" autocomplete="tel" placeholder="+994 50 000 00 00"></label>
        </div>
        <label>E-poct<input name="email" type="email" autocomplete="email" required></label>
        <label>Sifre
          <span class="password-field"><input name="password" type="password" minlength="8" autocomplete="current-password" required><button type="button" data-password-toggle>Goster</button></span>
        </label>
        <div class="register-fields" hidden>
          <label>Sifreni tekrarla<input name="password_confirm" type="password" minlength="8" autocomplete="new-password"></label>
          <label class="terms-check"><input name="terms" type="checkbox"> <span>Istifade sertlerini qebul edirem.</span></label>
        </div>
        <button class="auth-link" type="button" data-forgot-password>Sifreni unutdum</button>
        <button class="form-submit" type="submit">Giris et</button>
        <p class="form-message" id="authMessage"></p>
      </form>`;
    const authForm = content.querySelector("#authForm");
    content.querySelectorAll("[data-auth-mode]").forEach((button) => button.addEventListener("click", () => {
      const register = button.dataset.authMode === "register";
      authForm.dataset.mode = button.dataset.authMode;
      content.querySelectorAll("[data-auth-mode]").forEach((item) => item.classList.toggle("active", item === button));
      content.querySelectorAll(".register-fields").forEach((item) => { item.hidden = !register; });
      content.querySelector("#authTitle").textContent = register ? "Yeni hesab yaradin" : "Hesabiniza daxil olun";
      authForm.querySelector(".form-submit").textContent = register ? "Qeydiyyatdan kec" : "Giris et";
      authForm.elements.full_name.required = register;
      authForm.elements.phone.required = register;
      authForm.elements.password_confirm.required = register;
      content.querySelector("[data-forgot-password]").hidden = register;
      content.querySelector("#authMessage").textContent = "";
    }));
    content.querySelector("[data-password-toggle]").addEventListener("click", (event) => {
      const input = authForm.elements.password;
      input.type = input.type === "password" ? "text" : "password";
      event.currentTarget.textContent = input.type === "password" ? "Goster" : "Gizlet";
    });
    content.querySelector("[data-forgot-password]").addEventListener("click", async () => {
      const message = content.querySelector("#authMessage");
      try {
        await resetPassword(authForm.elements.email.value);
        message.className = "form-message success";
        message.textContent = "Sifre yenileme linki e-poctunuza gonderildi.";
      } catch (error) {
        message.textContent = error.message;
      }
    });
    authForm.addEventListener("submit", handleAuth);
  }
  dialog.showModal();
}

async function handleAuth(event) {
  event.preventDefault();
  const target = event.currentTarget;
  const form = new FormData(target);
  const mode = target.dataset.mode;
  const message = document.querySelector("#authMessage");
  const submit = target.querySelector(".form-submit");
  if (!target.reportValidity()) return;
  message.className = "form-message";
  message.textContent = "Gozleyin...";
  submit.disabled = true;
  try {
    if (mode === "register") {
      if (form.get("password") !== form.get("password_confirm")) throw new Error("Sifreler eyni deyil.");
      if (!form.get("terms")) throw new Error("Istifade sertlerini qebul edin.");
      await signUp(form.get("email"), form.get("password"), form.get("full_name"), form.get("phone"));
      message.className = "form-message success";
      message.textContent = "Qeydiyyat tamamlandi. E-poctunuzu tesdiqleyin.";
      const resend = document.createElement("button");
      resend.type = "button";
      resend.className = "auth-link";
      resend.textContent = "Tesdiq mektubunu yeniden gonder";
      resend.addEventListener("click", async () => {
        await resendConfirmation(form.get("email"));
        message.textContent = "Tesdiq mektubu yeniden gonderildi.";
      });
      message.after(resend);
    } else {
      await signIn(form.get("email"), form.get("password"));
      window.location.reload();
    }
  } catch (error) {
    message.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
}

async function showOrders() {
  const panel = document.querySelector("#panelDialog");
  const content = document.querySelector("#panelContent");
  document.querySelector("#accountDialog")?.close();
  content.innerHTML = "<h2>Sifarislerim</h2>";
  try {
    const orders = await getOrders();
    if (!orders.length) {
      content.innerHTML += "<p>Hele sifarisiniz yoxdur.</p>";
    } else {
      content.innerHTML += orders.map((order) => `<div class="drawer-product"><span><b>${money(order.total)} · ${order.status}</b><small>${new Date(order.created_at).toLocaleString("az-AZ")}</small></span></div>`).join("");
    }
  } catch (error) {
    content.innerHTML += `<p>${error.message}</p>`;
  }
  panel.showModal();
}

function bindCoreInteractions() {
  bindRouteInteractions();
  bindProductCards();
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
  document.querySelector("[data-language]")?.addEventListener("click", () => showInfo("Dil secimi", "<p>Hazirda sayt Azerbaycan dilindedir. Rus ve ingilis dili sonra elave olunacaq.</p>"));
  document.querySelector("[data-action='campaign']")?.addEventListener("click", () => showInfo("Kampaniya", "<p>Aktiv kampaniya dovrunde tamamlanan her sifaris heftelik udusda istirak edir.</p>"));
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
      notify("Mehsul sebete elave edildi");
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
      notify(added ? "Sevimlilere elave edildi" : "Sevimlilerden silindi");
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
    if (action === "account") routeTo("/auth");
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
      notify("Video basladilmadi");
    }
  }, { once: true });
}

function handleRecovery() {
  const dialog = document.querySelector("#accountDialog");
  const content = document.querySelector("#accountContent");
  content.innerHTML = `
    <span class="dialog-kicker">Hesab tehlukesizliyi</span>
    <h2>Yeni sifre yaradin</h2>
    <form id="passwordUpdateForm">
      <label>Yeni sifre<input name="password" type="password" minlength="8" autocomplete="new-password" required></label>
      <label>Sifreni tekrarla<input name="confirm" type="password" minlength="8" autocomplete="new-password" required></label>
      <button class="form-submit">Sifreni yenile</button>
      <p class="form-message"></p>
    </form>`;
  content.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = event.currentTarget.querySelector(".form-message");
    try {
      if (event.currentTarget.elements.password.value !== event.currentTarget.elements.confirm.value) {
        throw new Error("Sifreler eyni deyil.");
      }
      await updatePassword(event.currentTarget.elements.password.value);
      message.className = "form-message success";
      message.textContent = "Sifreniz yenilendi.";
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
      button.textContent = "Epoint acilir...";
    }
    try {
      await startPayment(
        event.target.elements.address.value.trim(),
        event.target.elements.phone.value.trim(),
        event.target.elements.payment_method?.value || "card",
      );
    } catch (error) {
      notify(error.message || "Odenis basladilmadi.");
      if (button) {
        button.disabled = false;
        button.textContent = "Kartla ode";
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
    notify(payment === "success" ? "Odenis qebul edildi. Sifaris statusu yenilenir." : "Odenis tamamlanmadi.");
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
