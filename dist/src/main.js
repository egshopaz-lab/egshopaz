import {
  addCartItem,
  createProduct,
  currentUser,
  getProfile,
  getProducts,
  getSellerProducts,
  signIn,
  signOut,
  signUp,
} from "./supabase.js";

const categories = [
  ["▦", "Elektronika"],
  ["♟", "Qadın geyimləri"],
  ["▣", "Kişi geyimləri"],
  ["●", "Uşaq və körpə"],
  ["◒", "Ayaqqabı"],
  ["♟", "Gözəllik və baxım"],
  ["⌂", "Ev və mətbəx"],
  ["▰", "Mebel"],
];

const subCategories = [
  "Smartfonlar",
  "Telefon aksesuarları",
  "Noutbuklar",
  "Planşetlər",
  "Stolüstü kompüterlər",
  "Monitorlar",
  "Klaviatura və mouse",
];

let products = [
  { name: "EG hədiyyə qutusu", price: 45, old: 59, image: "/assets/product-1.jpg", rating: "4.9", reviews: 18 },
  { name: "İtaliya yataq dəsti", price: 1500, old: 1800, image: "/assets/product-2.jpg", rating: "5.0", reviews: 2 },
  { name: "Elektrikli skuter", price: 1000, old: 1250, image: "/assets/product-3.jpg", rating: "4.8", reviews: 6 },
  { name: "Redmi Note 14 Pro", price: 1199, old: 1399, image: "/assets/product-4.jpg", rating: "4.7", reviews: 31 },
  { name: "Premium ev kolleksiyası", price: 790, old: 990, image: "/assets/product-5.jpg", rating: "4.9", reviews: 12 },
  { name: "Yeni mövsüm seçimi", price: 129, old: 179, image: "/assets/product-6.jpg", rating: "4.6", reviews: 9 },
];

function productCard(product, sponsored = false) {
  return `
    <article class="product-card">
      <div class="product-image">
        ${sponsored ? '<span class="ad-label">REKLAM</span>' : '<button class="heart" aria-label="Sevimlilərə əlavə et">♡</button>'}
        <img src="${product.image}" alt="${product.name}" loading="lazy">
      </div>
      <div class="product-info">
        <div class="price-row">
          <strong>${product.price} ₼</strong>
          <del>${product.old} ₼</del>
        </div>
        <h3>${product.name}</h3>
        <div class="rating"><span>★</span> ${product.rating} · ${product.reviews}</div>
        <button class="cart-button" data-add="${product.id || ""}">Səbətə at</button>
      </div>
    </article>
  `;
}

function render() {
  document.querySelector("#app").innerHTML = `
    <header class="site-header">
      <div class="header-inner">
        <button class="icon-button menu-button" aria-label="Menyu">☰</button>
        <a class="logo" href="#top">
          <img src="/assets/logo.png" alt="EG Shop">
          <span>EG SHOP</span>
        </a>
        <div class="clock"><b id="clock">17:50</b><small id="date">2026-07-04</small></div>
        <label class="search">
          <span>⌕</span>
          <input id="searchInput" type="search" placeholder="Məhsul, marka və ya kateqoriya axtar...">
          <button type="button" aria-label="Şəkillə axtar">▣</button>
        </label>
        <nav class="header-actions" aria-label="İstifadəçi menyusu">
          <button><span>◎</span><b>AZ AZ</b></button>
          <button><span>🔥</span><b>Kəşf et</b></button>
          <button><span>♡</span><b>Sevimli</b></button>
          <button class="basket-action"><span>🛒</span><b>Səbət</b><i id="cartCount">0</i></button>
          <button data-auth><span>♙</span><b>${currentUser() ? "Hesab" : "Giriş"}</b></button>
        </nav>
      </div>
    </header>

    <main id="top">
      <div class="quick-links">
        <button data-panel="seller">Satıcı girişi</button>
        <button>PVZ girişi</button>
        <button data-panel="admin">Admin</button>
        <button class="seller">Satıcı ol</button>
      </div>

      <section class="category-strip" aria-label="Kateqoriyalar">
        ${categories.map(([icon, name], index) => `
          <button class="category ${index === 0 ? "active" : ""}" data-category="${name}">
            <span>${icon}</span>${name}
          </button>
        `).join("")}
      </section>

      <section class="sub-category-section">
        <div class="section-title">
          <h2>Önə çıxan kateqoriyalar</h2>
          <button>Hamısı ›</button>
        </div>
        <div class="sub-categories">
          ${subCategories.map((name) => `<button><span>▦</span>${name}</button>`).join("")}
        </div>
      </section>

      <section class="campaign">
        <span class="ad-label">REKLAM</span>
        <div class="campaign-copy">
          <p>Yay endirimləri</p>
          <h1>Seçilmiş məhsullarda<br><strong>40%-dək endirim</strong></h1>
          <button>Məhsullara bax</button>
        </div>
        <img src="/assets/product-1.jpg" alt="EG Shop yay kampaniyası">
        <div class="slider-dots"><i></i><i class="active"></i><i></i></div>
      </section>

      <section class="products-section">
        <div class="section-title">
          <h2>✨ Sponsor məhsullar <small>REKLAM</small></h2>
          <button>Hamısı ›</button>
        </div>
        <div class="product-grid" id="productGrid">
          ${products.slice(0, 4).map((product) => productCard(product, true)).join("")}
        </div>
      </section>

      <section class="gift-banner">
        <span>🎁 UDUŞ</span>
        <div><small>Hər sifariş bir şansdır</small><h2>Həftəlik hədiyyələr qazan</h2></div>
        <button>Ətraflı bax ›</button>
      </section>

      <section class="products-section">
        <div class="section-title">
          <h2>Yeni məhsullar</h2>
          <button>Hamısı ›</button>
        </div>
        <div class="product-grid">
          ${products.map((product) => productCard(product)).join("")}
        </div>
      </section>

      <section class="benefits">
        <div><span>🚚</span><b>Sürətli çatdırılma</b><small>Bütün Azərbaycan üzrə</small></div>
        <div><span>✓</span><b>Təhlükəsiz alış-veriş</b><small>Məhsulları rahat seç</small></div>
        <div><span>↺</span><b>Asan geri qaytarma</b><small>Sadə və aydın proses</small></div>
        <div><span>☎</span><b>Dəstək xidməti</b><small>Hər gün yanınızdayıq</small></div>
      </section>
    </main>

    <nav class="mobile-nav" aria-label="Mobil menyu">
      <button><span>⌂</span>Ana səhifə</button>
      <button><span>🔥</span>Kəşf et</button>
      <button><span>♡</span>Sevimli</button>
      <button class="basket-action"><span>🛒</span>Səbət<i id="mobileCartCount">0</i></button>
      <button data-auth><span>♙</span>${currentUser() ? "Hesab" : "Giriş"}</button>
    </nav>

    <dialog class="account-dialog" id="accountDialog">
      <button class="dialog-close" data-close="accountDialog">×</button>
      <div id="accountContent"></div>
    </dialog>

    <dialog class="panel-dialog" id="panelDialog">
      <button class="dialog-close" data-close="panelDialog">×</button>
      <div id="panelContent"></div>
    </dialog>

    <div class="toast" id="toast">Məhsul səbətə əlavə edildi</div>
  `;
}

function startClock() {
  const update = () => {
    const now = new Date();
    document.querySelector("#clock").textContent = now.toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" });
    document.querySelector("#date").textContent = now.toLocaleDateString("az-AZ");
  };
  update();
  setInterval(update, 30000);
}

function bindInteractions() {
  let cartCount = 0;
  document.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!currentUser()) {
        openAccountDialog();
        return;
      }
      if (button.dataset.add) {
        try {
          await addCartItem(button.dataset.add);
        } catch (error) {
          showToast(error.message);
          return;
        }
      }
      cartCount += 1;
      document.querySelector("#cartCount").textContent = cartCount;
      document.querySelector("#mobileCartCount").textContent = cartCount;
      showToast("Məhsul səbətə əlavə edildi");
    });
  });

  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-category]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
    });
  });

  document.querySelector("#searchInput").addEventListener("input", (event) => {
    const query = event.target.value.trim().toLocaleLowerCase("az-AZ");
    document.querySelectorAll(".product-card").forEach((card) => {
      card.hidden = query && !card.textContent.toLocaleLowerCase("az-AZ").includes(query);
    });
  });

  document.querySelectorAll("[data-auth]").forEach((button) => button.addEventListener("click", openAccountDialog));
  document.querySelectorAll("[data-panel]").forEach((button) => {
    button.addEventListener("click", () => openPanel(button.dataset.panel));
  });
  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => document.querySelector(`#${button.dataset.close}`).close());
  });
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function openAccountDialog() {
  const dialog = document.querySelector("#accountDialog");
  const content = document.querySelector("#accountContent");
  const user = currentUser();
  if (user) {
    content.innerHTML = `
      <span class="dialog-kicker">Hesabım</span>
      <h2>${user.email}</h2>
      <p>EG Shop hesabınız aktivdir.</p>
      <button class="form-submit" id="logoutButton">Çıxış et</button>
    `;
    content.querySelector("#logoutButton").addEventListener("click", () => {
      signOut();
      window.location.reload();
    });
  } else {
    content.innerHTML = `
      <span class="dialog-kicker">EG Shop</span>
      <h2>Hesabınıza daxil olun</h2>
      <form id="authForm">
        <label>Ad və soyad<input name="full_name" autocomplete="name"></label>
        <label>E-poçt<input name="email" type="email" autocomplete="email" required></label>
        <label>Şifrə<input name="password" type="password" minlength="6" required></label>
        <div class="form-actions">
          <button class="form-submit" name="mode" value="login">Giriş</button>
          <button class="form-secondary" name="mode" value="register">Qeydiyyat</button>
        </div>
        <p class="form-message" id="authMessage"></p>
      </form>
    `;
    content.querySelector("#authForm").addEventListener("submit", handleAuth);
  }
  dialog.showModal();
}

async function handleAuth(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const mode = event.submitter.value;
  const message = document.querySelector("#authMessage");
  message.textContent = "Gözləyin...";
  try {
    if (mode === "register") {
      await signUp(form.get("email"), form.get("password"), form.get("full_name"));
      message.textContent = "Qeydiyyat tamamlandı. E-poçtunuzu təsdiqləyin.";
    } else {
      await signIn(form.get("email"), form.get("password"));
      window.location.reload();
    }
  } catch (error) {
    message.textContent = error.message;
  }
}

async function openPanel(type) {
  if (!currentUser()) {
    openAccountDialog();
    return;
  }
  const dialog = document.querySelector("#panelDialog");
  const content = document.querySelector("#panelContent");
  content.innerHTML = "<p>Panel hazırlanır...</p>";
  dialog.showModal();
  try {
    const profile = await getProfile();
    const allowed = type === "admin" ? profile?.role === "admin" : ["seller", "admin"].includes(profile?.role);
    if (!allowed) {
      content.innerHTML = `<span class="dialog-kicker">Giriş məhduddur</span><h2>${type === "admin" ? "Admin" : "Satıcı"} paneli</h2><p>Bu hesab üçün uyğun rol təyin edilməyib.</p>`;
      return;
    }
    const sellerProducts = await getSellerProducts();
    content.innerHTML = `
      <span class="dialog-kicker">${type === "admin" ? "Admin" : "Satıcı"} paneli</span>
      <h2>Məhsul idarəetməsi</h2>
      <div class="panel-stats"><div><b>${sellerProducts.length}</b><span>Məhsul</span></div><div><b>${sellerProducts.reduce((sum, item) => sum + item.stock, 0)}</b><span>Stok</span></div></div>
      <form id="productForm" class="product-form">
        <label>Məhsul adı<input name="name" required></label>
        <label>Qiymət<input name="price" type="number" min="0" step="0.01" required></label>
        <label>Stok<input name="stock" type="number" min="0" required></label>
        <label>Şəkil URL<input name="image_url" type="url"></label>
        <button class="form-submit">Məhsul əlavə et</button>
      </form>
    `;
    content.querySelector("#productForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget));
      try {
        await createProduct({ ...data, price: Number(data.price), stock: Number(data.stock) });
        showToast("Məhsul əlavə edildi");
        dialog.close();
        await bootstrap();
      } catch (error) {
        showToast(error.message);
      }
    });
  } catch (error) {
    content.innerHTML = `<h2>Bağlantı xətası</h2><p>${error.message}</p>`;
  }
}

async function bootstrap() {
  try {
    const liveProducts = await getProducts();
    if (liveProducts.length) {
      products = liveProducts.map((item) => ({
        ...item,
        old: item.old_price || item.price,
        image: item.image_url || "/assets/product-1.jpg",
        rating: "5.0",
        reviews: 0,
      }));
    }
  } catch (error) {
    console.warn("Supabase hazır deyil, demo katalog göstərilir.", error);
  }
  render();
  startClock();
  bindInteractions();
}

bootstrap();
