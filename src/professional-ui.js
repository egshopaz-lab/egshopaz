function showAllProducts(targetSection) {
  document.querySelectorAll(".product-card[hidden]").forEach((card) => { card.hidden = false; });
  (targetSection || document.querySelector(".products-section"))?.scrollIntoView({ behavior: "smooth", block: "start" });
  const toast = document.querySelector("#toast");
  if (toast) {
    toast.textContent = "Bütün məhsullar göstərilir";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1800);
  }
}

function createDrawer() {
  if (document.querySelector("#mainDrawer")) return;
  const backdrop = document.createElement("div");
  backdrop.className = "drawer-backdrop";
  backdrop.id = "drawerBackdrop";
  backdrop.innerHTML = `
    <aside class="main-drawer" id="mainDrawer" aria-label="Əsas menyu">
      <div class="drawer-head">
        <a href="#top" class="drawer-brand"><img src="/assets/logo.png" alt=""><span><b>EG SHOP</b><small>Marketplace</small></span></a>
        <button type="button" data-drawer-close aria-label="Menyunu bağla">×</button>
      </div>
      <nav class="drawer-links">
        <button type="button" data-drawer-target="#top"><span>⌂</span><b>Ana səhifə</b></button>
        <button type="button" data-drawer-target=".category-strip"><span>▦</span><b>Kateqoriyalar</b></button>
        <button type="button" data-drawer-target=".products-section"><span>✦</span><b>Məhsullar</b></button>
        <button type="button" data-drawer-target=".gift-banner"><span>🎁</span><b>Kampaniyalar</b></button>
        <button type="button" data-drawer-seller><span>♙</span><b>Satıcı ol</b></button>
      </nav>
      <div class="drawer-support"><small>Dəstək</small><b>Hər gün yanınızdayıq</b><a href="mailto:info@egshop.az">info@egshop.az</a></div>
    </aside>`;
  document.body.append(backdrop);
  backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeDrawer(); });
  backdrop.querySelector("[data-drawer-close]").addEventListener("click", closeDrawer);
  backdrop.querySelectorAll("[data-drawer-target]").forEach((button) => button.addEventListener("click", () => {
    closeDrawer();
    document.querySelector(button.dataset.drawerTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  backdrop.querySelector("[data-drawer-seller]").addEventListener("click", () => {
    closeDrawer();
    document.querySelector('[data-action="seller-apply"]')?.click();
  });
}

function openDrawer() {
  createDrawer();
  document.querySelector("#drawerBackdrop").classList.add("open");
  document.body.classList.add("drawer-open");
}

function closeDrawer() {
  document.querySelector("#drawerBackdrop")?.classList.remove("open");
  document.body.classList.remove("drawer-open");
}

function improveTaxIdForm() {
  const input = document.querySelector('#sellerApplicationForm input[name="tax_id"]');
  if (!input || input.dataset.professional) return;
  input.dataset.professional = "true";
  input.required = true;
  input.inputMode = "numeric";
  input.pattern = "[0-9]{10}";
  input.minLength = 10;
  input.maxLength = 10;
  input.placeholder = "10 rəqəmli VÖEN";
  input.autocomplete = "off";
  const hint = document.createElement("small");
  hint.className = "field-hint";
  hint.textContent = "Satıcı hesabının təsdiqi üçün VÖEN məcburidir.";
  input.after(hint);
}

function startProfessionalUi() {
  const app = document.querySelector("#app");
  if (!app) return;
  createDrawer();
  const panel = document.querySelector("#panelContent");
  if (panel) new MutationObserver(improveTaxIdForm).observe(panel, { childList: true, subtree: true });
}

document.addEventListener("click", (event) => {
  const menu = event.target.closest(".menu-button");
  if (menu) {
    event.preventDefault();
    event.stopImmediatePropagation();
    openDrawer();
    return;
  }
  const allButton = event.target.closest(".section-title > button");
  if (allButton && allButton.textContent.includes("Hamısı")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    showAllProducts(allButton.closest(".products-section"));
  }
}, true);

document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeDrawer(); });

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startProfessionalUi);
else startProfessionalUi();
