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

const products = [
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
        <button class="cart-button" data-add="${product.name}">Səbətə at</button>
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
          <button><span>♙</span><b>Giriş</b></button>
        </nav>
      </div>
    </header>

    <main id="top">
      <div class="quick-links">
        <button>Satıcı girişi</button>
        <button>PVZ girişi</button>
        <button>Admin</button>
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
      <button><span>♙</span>Giriş</button>
    </nav>

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
    button.addEventListener("click", () => {
      cartCount += 1;
      document.querySelector("#cartCount").textContent = cartCount;
      document.querySelector("#mobileCartCount").textContent = cartCount;
      const toast = document.querySelector("#toast");
      toast.classList.add("show");
      window.setTimeout(() => toast.classList.remove("show"), 1600);
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
}

render();
startClock();
bindInteractions();
