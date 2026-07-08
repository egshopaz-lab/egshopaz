function toast(message) {
  const element = document.querySelector("#toast");
  if (!element) return;
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 2200);
}

function showInfo(title, html) {
  const dialog = document.querySelector("#panelDialog");
  const content = document.querySelector("#panelContent");
  if (!dialog || !content) return;
  content.innerHTML = `<span class="dialog-kicker">EG Shop</span><h2>${title}</h2>${html}`;
  dialog.showModal();
}

function scrollToProducts(sectionIndex = 0) {
  document.querySelectorAll(".products-section")[sectionIndex]?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function bindOnce(element, event, handler) {
  if (!element || element.dataset.enhanced) return;
  element.dataset.enhanced = "true";
  element.addEventListener(event, handler);
}

function enhancePage() {
  bindOnce(document.querySelector(".menu-button"), "click", () => {
    document.querySelector(".category-strip")?.scrollIntoView({ behavior: "smooth", block: "start" });
    toast("Kateqoriyalar göstərildi");
  });

  bindOnce(document.querySelector(".search button"), "click", () => {
    showInfo("Şəkillə axtarış", "<p>Şəkillə məhsul axtarışı hazırlanır. Hələlik məhsul adını axtarış sətrinə yazın.</p>");
  });

  const language = [...document.querySelectorAll(".header-actions button")]
    .find((button) => button.textContent.includes("AZ AZ"));
  bindOnce(language, "click", () => {
    showInfo("Dil seçimi", "<p>Hazırda sayt Azərbaycan dilindədir. Rus və ingilis dili növbəti versiyada əlavə ediləcək.</p>");
  });

  document.querySelectorAll(".sub-categories button").forEach((button) => {
    bindOnce(button, "click", () => {
      const name = button.textContent.replace("▦", "").trim();
      showInfo(name, "<p>Bu alt kateqoriya üçün məhsullar əlavə olunduqca burada göstəriləcək.</p>");
    });
  });

  document.querySelectorAll(".section-title button").forEach((button, index) => {
    bindOnce(button, "click", () => {
      if (index === 0) document.querySelector(".category-strip")?.scrollIntoView({ behavior: "smooth" });
      else scrollToProducts(index === 1 ? 0 : 1);
    });
  });

  bindOnce(document.querySelector(".campaign button:not(.ad-label)"), "click", () => scrollToProducts(0));
  bindOnce(document.querySelector(".gift-banner button"), "click", () => {
    showInfo("Həftəlik hədiyyələr", "<p>Aktiv kampaniya müddətində tamamlanan hər sifariş avtomatik olaraq həftəlik uduşda bir iştirak haqqı qazandırır.</p><p>Qaliblər hesablarında qeydiyyatda olan əlaqə məlumatı ilə məlumatlandırılır.</p>");
  });

  document.querySelectorAll("[data-category]").forEach((button) => {
    bindOnce(button, "click", () => {
      scrollToProducts(1);
      toast(`${button.dataset.category} kateqoriyası seçildi`);
    });
  });
}

function startEnhancements() {
  if (document.querySelector(".site-header")) return enhancePage();
  const app = document.querySelector("#app");
  if (!app) return;
  const observer = new MutationObserver(() => {
    if (!document.querySelector(".site-header")) return;
    observer.disconnect();
    enhancePage();
  });
  observer.observe(app, { childList: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startEnhancements);
else startEnhancements();
