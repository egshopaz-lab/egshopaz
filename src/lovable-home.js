const referenceProducts = [
  { name: "Ətir", brand: "Brend", price: 100, old: 110, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/d39654de-946a-4352-b1f1-77b7facd2705/986c0fbc-169b-49a9-b6f1-f4a79a844db9.jpg", rating: "0.0", reviews: 0 },
  { name: "italya mebel", brand: "avilla", price: 1500, old: 1800, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/d39654de-946a-4352-b1f1-77b7facd2705/cbb4919c-9264-42fb-88cb-3351e81d812c.jpg", rating: "5.0", reviews: 2 },
  { name: "Mopet", brand: "Bmv", price: 1000, old: null, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/d39654de-946a-4352-b1f1-77b7facd2705/721da7d9-71c3-43fb-9cc2-7e34fded753b.jpg", rating: "0.0", reviews: 0 },
  { name: "Xiaomi", brand: "Redmı", price: 800, old: null, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/d39654de-946a-4352-b1f1-77b7facd2705/b43b3238-5324-4b67-87e4-fa2ad6232ce7.jpg", rating: "5.0", reviews: 1 },
  { name: "kofe", brand: "", price: 100, old: null, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/d39654de-946a-4352-b1f1-77b7facd2705/d58b87e3-b1b5-4084-b21f-3545cc816552.jpg", rating: "0.0", reviews: 0 },
  { name: "Portable", brand: "", price: 30, old: null, image: "https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/ab3f5c02-b3d9-461c-ba4a-f3b22c627bfb/3a362ccf-4a19-4f86-8e4e-333ff846e46c.jpg", rating: "0.0", reviews: 0 },
];

const lovableCategories = [
  ["📱", "Elektronika"], ["👗", "Qadın geyimləri"], ["👔", "Kişi geyimləri"],
  ["👶", "Uşaq və körpə"], ["👟", "Ayaqqabı"], ["💄", "Gözəllik və baxım"],
  ["🏠", "Ev və mətbəx"], ["🛏️", "Ev tekstili"], ["🚗", "Avtomobil"],
  ["🔧", "Tikinti və təmir"], ["🌳", "Bağ və həyət"], ["⚽", "İdman və istirahət"],
];
const lovableSubcategories = ["Smartfonlar", "Telefon aksesuarları", "Noutbuklar", "Planşetlər", "Stolüstü kompüterlər", "Monitorlar"];

function discount(product) { return product.old ? Math.round((1 - product.price / product.old) * 100) : 0; }
function card(product) {
  const percent = discount(product);
  return `<article class="lv-card" data-product-name="${product.name.toLocaleLowerCase("az-AZ")}"><div class="lv-card-media">${percent ? `<span class="lv-discount">-${percent}%</span>` : ""}<button class="lv-heart" type="button" aria-label="Sevimlilərə əlavə et">♡</button><img src="${product.image}" alt="${product.name}" loading="lazy"></div><div class="lv-card-body"><div class="lv-price"><strong>${product.price} ₼</strong>${product.old ? `<del>${product.old} ₼</del>` : ""}</div><small>${product.brand || "&nbsp;"}</small><h3>${product.name}</h3><div class="lv-rating"><span>★</span> ${product.rating} <i>· ${product.reviews}</i></div><button class="lv-cart" type="button">Səbətə at</button></div></article>`;
}
function productSection(title, products, className = "", kicker = "") {
  return `<section class="lv-product-section ${className}"><div class="lv-section-heading"><div>${kicker ? `<span class="lv-kicker">${kicker}</span>` : ""}<h2>${title}</h2></div><button type="button" class="lv-all">Hamısına bax →</button></div><div class="lv-products">${products.map(card).join("")}</div></section>`;
}
function buildLovableHome(main) {
  if (main.dataset.lovableHome) return;
  main.dataset.lovableHome = "true";
  const dialogs = Array.from(main.querySelectorAll("dialog"));
  const quickLinks = main.querySelector(".quick-links");
  main.innerHTML = `<h1 class="sr-only">EG Shop — Azərbaycanın onlayn marketi</h1>${quickLinks ? quickLinks.outerHTML : ""}<section class="lv-category-area"><div class="lv-scroll lv-categories">${lovableCategories.map(([icon, name], index) => `<button type="button" class="${index === 0 ? "active" : ""}"><span>${icon}</span>${name}</button>`).join("")}</div><div class="lv-section-heading lv-subheading"><h2>Önə çıxan kateqoriyalar</h2><button type="button">Hamısı ›</button></div><div class="lv-scroll lv-subcategories">${lovableSubcategories.map(name => `<button type="button"><span>📱</span>${name}</button>`).join("")}</div></section><section class="lv-ad"><video autoplay muted loop playsinline preload="metadata" src="https://ibhmwwdrzgjgwfrvpjht.supabase.co/storage/v1/object/public/product-images/12ea4064-c75b-46f7-be42-a9242b61737e/banner-video-1782387703134.mp4"></video><span class="lv-ad-label">REKLAM</span><strong>Mmm</strong></section>${productSection("🎁 Uduşlu Məhsullar", [referenceProducts[0]], "lv-win", "🎁 UDUŞ")}${productSection("Endirimli qiymətlər", [referenceProducts[1], referenceProducts[2], referenceProducts[0]], "lv-sale", "70% ENDİRİM")}${productSection("Trend məhsullar", [referenceProducts[1], referenceProducts[3], referenceProducts[3], referenceProducts[3], referenceProducts[2], referenceProducts[4]], "", "Hamı baxır")}${productSection("Sizin üçün", [referenceProducts[0], referenceProducts[4], referenceProducts[2], referenceProducts[1], referenceProducts[5], referenceProducts[3], referenceProducts[3], referenceProducts[3]])}`;
  dialogs.forEach(dialog => main.append(dialog));
  alignNavigation();
  bindLovableHome(main);
}
function alignNavigation() {
  const labels = [["⌂", "Ana səhifə"], ["▦", "Kataloq"], ["🛒", "Səbət"], ["♡", "Sevimli"], ["♙", "Kabinet"]];
  document.querySelectorAll(".mobile-nav button").forEach((item, index) => {
    if (!labels[index]) return;
    const badge = item.querySelector("i")?.outerHTML || "";
    item.innerHTML = `<span>${labels[index][0]}</span>${labels[index][1]}${badge}`;
  });
}
function bindLovableHome(main) {
  main.querySelectorAll(".lv-categories button").forEach(button => button.addEventListener("click", () => main.querySelectorAll(".lv-categories button").forEach(item => item.classList.toggle("active", item === button))));
  main.querySelectorAll(".lv-cart").forEach(button => button.addEventListener("click", () => document.querySelector("[data-auth]")?.click()));
  main.querySelectorAll(".lv-heart").forEach(button => button.addEventListener("click", () => { button.textContent = button.textContent === "♡" ? "♥" : "♡"; button.classList.toggle("active"); }));
  main.querySelectorAll(".lv-all").forEach(button => button.addEventListener("click", () => button.closest(".lv-product-section")?.querySelector(".lv-products")?.scrollTo({ left: 9999, behavior: "smooth" })));
  const search = document.querySelector("#searchInput");
  search?.addEventListener("input", () => { const query = search.value.trim().toLocaleLowerCase("az-AZ"); main.querySelectorAll(".lv-card").forEach(item => { item.hidden = Boolean(query) && !item.dataset.productName.includes(query); }); });
}
function startLovableHome() {
  const app = document.querySelector("#app");
  if (!app) return;
  const apply = () => { const main = app.querySelector("main"); if (!main) return false; buildLovableHome(main); return true; };
  if (apply()) return;
  const observer = new MutationObserver(() => { if (apply()) observer.disconnect(); });
  observer.observe(app, { childList: true, subtree: true });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startLovableHome); else startLovableHome();
