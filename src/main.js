const siteConfig = {
  name: "EG Shop",
  apiBaseUrl: "",
};

const products = [
  { id: 1, name: "Premium smart saat", category: "Elektronika", price: 89, oldPrice: 119, stock: "24 saatda teslim", toneA: "#5b35d5", toneB: "#10a6a6", mark: "S" },
  { id: 2, name: "Minimal sirt cantasi", category: "Moda", price: 42, oldPrice: 58, stock: "Anbarda var", toneA: "#111827", toneB: "#64748b", mark: "C" },
  { id: 3, name: "Ev ucun LED lampa", category: "Ev", price: 18, oldPrice: 25, stock: "Cox satilan", toneA: "#f05a28", toneB: "#f59e0b", mark: "L" },
  { id: 4, name: "Kosmetik baxim seti", category: "Gozellik", price: 34, oldPrice: 48, stock: "Yeni kolleksiya", toneA: "#db2777", toneB: "#fb7185", mark: "B" },
  { id: 5, name: "Usta idman ayaqqabisi", category: "Idman", price: 76, oldPrice: 99, stock: "Pulsuz qaytarma", toneA: "#0f766e", toneB: "#14b8a6", mark: "A" },
  { id: 6, name: "Ofis organizer", category: "Ofis", price: 21, oldPrice: 29, stock: "Bugun gonderilir", toneA: "#4338ca", toneB: "#7c3aed", mark: "O" },
  { id: 7, name: "Usaq oyun seti", category: "Usaq", price: 31, oldPrice: 44, stock: "Sertifikatli", toneA: "#0369a1", toneB: "#38bdf8", mark: "U" },
  { id: 8, name: "Mutfak saklama kabi", category: "Ev", price: 15, oldPrice: 22, stock: "Toplu endirim", toneA: "#15803d", toneB: "#84cc16", mark: "M" },
];

const sellerRows = [
  ["Yeni sifaris", "12", "Hazirlama gozleyir"],
  ["Aktiv mehsul", "248", "8 mehsulda stok az"],
  ["Bu ay gelir", "4 820 AZN", "Test gostergesi"],
];

const adminRows = [
  ["Katalog temizlik", "Hazir", "Mock data ile acilir"],
  ["Veritabani baglantisi", "Sonra", "Tek config/API katmani ile"],
  ["Harici servisler", "Kapali", "Build yolunda yok"],
];

let activeCategory = "Hamisi";

function money(value) {
  return new Intl.NumberFormat("az-AZ", { style: "currency", currency: "AZN" }).format(value);
}

function productCard(product) {
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  return `
    <article class="product-card">
      <div class="product-media" style="--tone-a:${product.toneA};--tone-b:${product.toneB}">${product.mark}</div>
      <div class="product-body">
        <h3>${product.name}</h3>
        <p>${product.category} / ${product.stock}</p>
        <div class="product-meta">
          <span class="price">${money(product.price)}</span>
          ${discount ? `<span class="badge">-${discount}%</span>` : ""}
        </div>
      </div>
    </article>
  `;
}

function dashboardCard(row) {
  return `
    <div class="dashboard-card">
      <span>${row[0]}</span>
      <strong>${row[1]}</strong>
      <p>${row[2]}</p>
    </div>
  `;
}

function renderCatalog() {
  const catalog = document.querySelector("[data-catalog]");
  const chips = document.querySelector("[data-chips]");
  if (!catalog || !chips) return;

  const categories = ["Hamisi", ...new Set(products.map((product) => product.category))];
  chips.innerHTML = categories.map((category) => (
    `<button class="chip ${category === activeCategory ? "active" : ""}" data-category="${category}">${category}</button>`
  )).join("");

  const visibleProducts = activeCategory === "Hamisi"
    ? products
    : products.filter((product) => product.category === activeCategory);
  catalog.innerHTML = visibleProducts.map(productCard).join("");

  chips.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category || "Hamisi";
      renderCatalog();
    });
  });
}

function render() {
  document.title = siteConfig.name;
  document.querySelector("#app").innerHTML = `
    <div class="app">
      <header class="topbar">
        <div class="shell topbar-inner">
          <a class="brand" href="#home" aria-label="Ana sehife">
            <span class="brand-mark">EG</span>
            <span>${siteConfig.name}</span>
          </a>
          <nav class="nav" aria-label="Esas menu">
            <a href="#catalog">Katalog</a>
            <a href="#seller">Satici paneli</a>
            <a href="#admin">Admin</a>
            <a href="#deploy">Deploy</a>
          </nav>
        </div>
      </header>

      <section class="shell hero" id="home">
        <div class="hero-copy">
          <span class="eyebrow">Bagimsiz marketplace hazirligi</span>
          <h1>Temiz, hizli ve sunucuya hazir vitrin.</h1>
          <p class="lead">Bu surum dis connector, hazir musteri verisi ve aktif backend baglantisi tasimaz. Hetzner uzerinde statik olarak acilir.</p>
          <div class="actions">
            <a class="btn btn-primary" href="#catalog">Urunleri incele</a>
            <a class="btn btn-secondary" href="#deploy">Kurulum notu</a>
          </div>
        </div>
        <aside class="hero-panel" aria-label="Arama ve ozet">
          <div class="search-card">
            <span class="eyebrow">Canli backend kapali</span>
            <h2>Demo katalog</h2>
            <div class="search-row">
              <input placeholder="Urun, kategori veya marka ara" aria-label="Arama" />
              <button class="btn btn-primary" type="button">Ara</button>
            </div>
          </div>
          <div class="mini-grid">
            <div class="mini-stat"><b>0</b><span>Gercek musteri verisi</span></div>
            <div class="mini-stat"><b>0</b><span>AI endpoint</span></div>
            <div class="mini-stat"><b>1</b><span>Temiz deploy yolu</span></div>
            <div class="mini-stat"><b>100%</b><span>Mobil uyumlu</span></div>
          </div>
        </aside>
      </section>

      <section class="shell section" id="catalog">
        <div class="section-head">
          <div>
            <h2>Katalog</h2>
            <p>Gercek stok ve fiyatlar ileride kendi veri kaynagindan gelecek.</p>
          </div>
          <div class="chips" data-chips aria-label="Kategori filtresi"></div>
        </div>
        <div class="product-grid" data-catalog></div>
      </section>

      <section class="shell section" id="seller">
        <div class="section-head"><div><h2>Satici paneli</h2><p>Veri kaydetmeyen, bagimsiz panel onizlemesi.</p></div></div>
        <div class="dashboard">${sellerRows.map(dashboardCard).join("")}</div>
      </section>

      <section class="shell section" id="admin">
        <div class="section-head"><div><h2>Admin hazirlik</h2><p>Dis cloud baglantilari olmadan sade yonetim ozeti.</p></div></div>
        <div class="dashboard">${adminRows.map(dashboardCard).join("")}</div>
      </section>

      <section class="shell section">
        <div class="section-head">
          <div>
            <h2>Sonraki baglanti plani</h2>
            <p>Veritabani ve API baglantisi su an kapali; domain acildiginda yapilandirma hatasi vermez.</p>
          </div>
        </div>
        <div class="timeline">
          <div class="timeline-item"><span class="dot"></span><strong>Frontend deploy</strong><span class="badge">Hazir</span></div>
          <div class="timeline-item"><span class="dot"></span><strong>Kendi veritabani ve API ayarlari</strong><span class="badge">Sonra</span></div>
          <div class="timeline-item"><span class="dot"></span><strong>Gercek odeme ve siparis akisi</strong><span class="badge">Sonra</span></div>
        </div>
      </section>

      <section class="shell notice" id="deploy">
        <strong>Deploy hedefi:</strong> GitHub'a bu temiz projeyi gonder, Hetzner'de <code>npm run build</code> calistir, <code>dist</code> klasorunu Nginx ile domainine servis et.
      </section>

      <footer class="shell footer">EG Shop temiz surum / harici connector yok / aktif backend baglantisi yok</footer>
    </div>
  `;
  renderCatalog();
}

render();
