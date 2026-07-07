import * as supabase from "./supabase.js?v=20260707-3";

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
  getSellerProducts,
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
} = supabase;

const SUPABASE_URL = "https://ootloyfutihvupfforrv.supabase.co";
const SUPABASE_KEY = "sb_publishable_ppRwsR2EfF1Xx4ZTiQsSCw__w7tOLkG";
const SESSION_KEY = "egshop_session";
const BANNER_VIDEO = "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/12ea4064-c75b-46f7-be42-a9242b61737e/banner-video-1782387703134.mp4";

const categories = [
  ["EI", "Elektronika"],
  ["QG", "Qadin geyimleri"],
  ["KG", "Kisi geyimleri"],
  ["UK", "Usaq ve korpe"],
  ["AY", "Ayaqqabi"],
  ["GB", "Gozellik ve baxim"],
  ["EM", "Ev ve metbex"],
  ["ME", "Mebel"],
];

const subCategories = [
  "Smartfonlar",
  "Telefon aksesuarlari",
  "Noutbuklar",
  "Plansetler",
  "Stolustu komputerler",
  "Monitorlar",
];

const categoryWords = {
  Elektronika: ["telefon", "redmi", "skuter", "elektrik", "portable", "xiaomi"],
  "Qadin geyimleri": ["qadin", "geyim"],
  "Kisi geyimleri": ["kisi", "geyim"],
  "Usaq ve korpe": ["usaq", "korpe"],
  Ayaqqabi: ["ayaqqabi"],
  "Gozellik ve baxim": ["etir", "gozellik", "baxim"],
  "Ev ve metbex": ["ev", "yataq", "metbex", "kofe"],
  Mebel: ["mebel", "italya"],
};

const fallbackProducts = [
  { id: "31d03601-5ff1-4b36-8825-5884c00d3332", name: "Etir", price: 100, old: 110, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/d39654de-946a-4352-b1f1-77b7facd2705/986c0fbc-169b-49a9-b6f1-f4a79a844db9.jpg", rating: "4.8", reviews: 12, brand: "Brend" },
  { id: "118306a5-3867-42db-a025-170f52e786f7", name: "italya mebel", price: 1500, old: 1800, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/d39654de-946a-4352-b1f1-77b7facd2705/cbb4919c-9264-42fb-88cb-3351e81d812c.jpg", rating: "5.0", reviews: 2, brand: "avilla" },
  { id: "e6635adc-e394-485f-b999-a7ee263760cd", name: "Mopet", price: 1000, old: null, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/d39654de-946a-4352-b1f1-77b7facd2705/721da7d9-71c3-43fb-9cc2-7e34fded753b.jpg", rating: "4.6", reviews: 7, brand: "Bmv" },
  { id: "9dfcd652-cfd9-4e1e-8496-8a11934f4fb2", name: "Xiaomi", price: 800, old: null, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/d39654de-946a-4352-b1f1-77b7facd2705/b43b3238-5324-4b67-87e4-fa2ad6232ce7.jpg", rating: "4.9", reviews: 19, brand: "Redmi" },
  { id: "af318359-3b26-4080-ac5b-67c4518d3ac8", name: "kofe", price: 100, old: null, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/d39654de-946a-4352-b1f1-77b7facd2705/d58b87e3-b1b5-4084-b21f-3545cc816552.jpg", rating: "4.5", reviews: 4, brand: "EG Shop" },
  { id: "69fbe1c2-af49-4b0e-a4f6-c6d4ec75fb57", name: "Portable", price: 30, old: null, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/ab3f5c02-b3d9-461c-ba4a-f3b22c627bfb/3a362ccf-4a19-4f86-8e4e-333ff846e46c.jpg", rating: "4.2", reviews: 5, brand: "Audio" },
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

function productCard(product, highlighted = false) {
  const percent = discount(product);
  return `
    <article class="${highlighted ? "lv-card" : "product-card"}" data-product-id="${product.id || ""}">
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
        <button class="${highlighted ? "lv-cart" : "cart-button"}" type="button" data-add="${product.id || ""}">Sebete at</button>
      </div>
    </article>
  `;
}

function renderApp() {
  const userLabel = currentUser() ? "Hesab" : "Giris";
  document.querySelector("#app").innerHTML = `
    <header class="site-header">
      <div class="header-inner">
        <button class="icon-button menu-button" aria-label="Menyu">=</button>
        <a class="logo" href="#top"><img src="/assets/logo.png" alt="EG Shop"><span>EG SHOP</span></a>
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
          <button type="button" data-auth><span>U</span><b>${userLabel}</b></button>
        </nav>
      </div>
    </header>

    <main id="top">
      <div class="quick-links">
        <button type="button" data-panel="seller">Satici girisi</button>
        <button type="button" data-action="pvz">PVZ girisi</button>
        <button type="button" data-panel="admin">Admin</button>
        <button type="button" class="seller" data-action="seller-apply">Satici ol</button>
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

      <section class="lv-ad">
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
        <div class="section-title"><h2>Trend mehsullar</h2><button type="button" data-show-all>Hamisi ></button></div>
        <div class="product-grid" id="productGrid">${products.map((product) => productCard(product, false)).join("")}</div>
      </section>

      <section class="gift-banner">
        <span>UDUS</span>
        <div><small>Her sifaris bir sansdir</small><h2>Heftelik hediyyeler qazan</h2></div>
        <button type="button" data-action="campaign">Etrafli bax ></button>
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
  `;
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
        <button type="button" data-drawer-target=".lv-category-area"><span>K</span><b>Kateqoriyalar</b></button>
        <button type="button" data-drawer-target=".products-section"><span>M</span><b>Mehsullar</b></button>
        <button type="button" data-drawer-seller><span>S</span><b>Satici ol</b></button>
      </nav>
      <div class="drawer-support"><small>Destek</small><b>Her gun yaninizdayiq</b><a href="mailto:info@egshop.az">info@egshop.az</a></div>
    </aside>`;
  document.body.append(backdrop);
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
  const words = categoryWords[label] || [label.toLowerCase()];
  let visible = 0;
  document.querySelectorAll(".product-card").forEach((card) => {
    const text = card.textContent.toLowerCase();
    const matches = words.some((word) => text.includes(word.toLowerCase()));
    card.hidden = !matches;
    if (matches) visible += 1;
  });
  notify(visible ? `${label}: ${visible} mehsul tapildi` : `${label} ucun hele mehsul yoxdur`);
  document.querySelector(".products-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      <p class="flow-hint">Sifaris tesdiqlenende Epoint odenis sehifesine yonlendirileceksiniz.</p>
      <label>Catdirilma unvani<input name="address" required></label>
      <label>Telefon<input name="phone" required placeholder="+994 50 000 00 00"></label>
      <label>Odenis usulu
        <select name="payment_method">
          <option value="card">Bank karti</option>
          <option value="split">Marketplace split</option>
          <option value="preauth">Preauth</option>
          <option value="widget">Apple Pay / Google Pay</option>
        </select>
      </label>
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
  showInfo("Satici ol", `
    <p>Magazanizi EG Shop platformasinda acmaq ucun muraciet gonderin.</p>
    <form id="sellerApplicationForm" class="product-form">
      <p class="flow-hint">Muraciet admin terefinden tesdiqlenenden sonra mehsul yukleme paneli acilacaq.</p>
      <label>Magaza adi<input name="store_name" required placeholder="Meselen: EG Elektronika"></label>
      <label>Telefon<input name="phone" required placeholder="+994 50 000 00 00"></label>
      <label>VOEN<input name="tax_id" required inputmode="numeric" pattern="[0-9]{10}" placeholder="10 reqemli VOEN"></label>
      <label>Qeyd<textarea name="note" rows="4" placeholder="Satacaginiz mehsullar haqqinda qisa melumat"></textarea></label>
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
    const sellerProducts = await getSellerProducts();
    content.innerHTML = `
      <span class="dialog-kicker">Satici paneli</span>
      <h2>Mehsul idareetmesi</h2>
      <div class="panel-stats"><div><b>${sellerProducts.length}</b><span>Mehsul</span></div><div><b>${sellerProducts.reduce((sum, item) => sum + Number(item.stock || 0), 0)}</b><span>Stok</span></div></div>
      <form id="productForm" class="product-form">
        <p class="flow-hint">Mehsul aktiv elave olunur ve tesdiqlenmis saticinin vitrinde gorunur.</p>
        <label>Mehsul adi<input name="name" required></label>
        <label>Qiymet<input name="price" type="number" min="0" step="0.01" required></label>
        <label>Kohne qiymet<input name="old_price" type="number" min="0" step="0.01" placeholder="Endirim varsa"></label>
        <label>Stok<input name="stock" type="number" min="0" required></label>
        <label>Tesvir<textarea name="description" rows="3" placeholder="Mehsul haqqinda qisa melumat"></textarea></label>
        <label>Shekil URL<input name="image_url" type="url"></label>
        <label class="terms-check"><input name="active" type="checkbox" checked><span>Mehsul vitrinde aktiv gorunsun</span></label>
        <button class="form-submit" type="submit">Mehsul elave et</button>
      </form>`;
    content.querySelector("#productForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = event.currentTarget.querySelector(".form-submit");
      submit.disabled = true;
      submit.textContent = "Mehsul yuklenir...";
      try {
        const data = Object.fromEntries(new FormData(event.currentTarget));
        await createProduct({
          name: String(data.name || "").trim(),
          description: String(data.description || "").trim() || null,
          price: Number(data.price),
          old_price: data.old_price ? Number(data.old_price) : null,
          stock: Number(data.stock || 0),
          image_url: String(data.image_url || "").trim() || null,
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
    document.querySelectorAll(".product-card[hidden]").forEach((card) => { card.hidden = false; });
    document.querySelector(".products-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  document.querySelector("[data-language]")?.addEventListener("click", () => showInfo("Dil secimi", "<p>Hazirda sayt Azerbaycan dilindedir. Rus ve ingilis dili sonra elave olunacaq.</p>"));
  document.querySelector("[data-action='campaign']")?.addEventListener("click", () => showInfo("Kampaniya", "<p>Aktiv kampaniya dovrunde tamamlanan her sifaris heftelik udusda istirak edir.</p>"));
  document.querySelector("#searchInput")?.addEventListener("input", (event) => {
    const query = event.target.value.trim().toLowerCase();
    document.querySelectorAll(".product-card,.lv-card").forEach((card) => {
      card.hidden = Boolean(query) && !card.textContent.toLowerCase().includes(query);
    });
  });
  document.querySelectorAll("[data-add]").forEach((button) => button.addEventListener("click", async () => {
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
  document.querySelectorAll("[data-favorite]").forEach((button) => button.addEventListener("click", async () => {
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
    if (action === "home") window.scrollTo({ top: 0, behavior: "smooth" });
    if (action === "catalog") document.querySelector(".lv-category-area")?.scrollIntoView({ behavior: "smooth" });
    if (action === "cart") openCart();
    if (action === "favorites") openFavorites();
    if (action === "account") openAccountDialog();
  }));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeDrawer(); });
}

async function openFeature(action) {
  if (action === "discover") return document.querySelector(".products-section")?.scrollIntoView({ behavior: "smooth" });
  if (action === "pvz") return showInfo("PVZ menteqeleri", "<p>Yaxin teshvil menteqesi secimi tezlikle burada olacaq.</p>");
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
  button.addEventListener("click", async () => {
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
      products = liveProducts.map((item) => ({
        ...item,
        old: item.old_price || null,
        image: item.image_url || "/assets/product-1.jpg",
        rating: "5.0",
        reviews: 0,
        brand: item.brand || "",
      }));
    }
  } catch {}
  renderApp();
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
bootstrap();
