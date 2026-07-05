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
  const sections = document.querySelectorAll(".products-section");
  sections[sectionIndex]?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      const input = document.querySelector("#searchInput");
      if (input) {
        input.value = button.textContent.replace("▦", "").trim();
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      scrollToProducts(1);
      toast(`${button.textContent.replace("▦", "").trim()} üzrə nəticələr`);
    });
  });

  document.querySelectorAll(".section-title button").forEach((button, index) => {
    bindOnce(button, "click", () => {
      if (index === 0) document.querySelector(".category-strip")?.scrollIntoView({ behavior: "smooth" });
      else scrollToProducts(index === 1 ? 0 : 1);
    });
  });

  const campaignButton = document.querySelector(".campaign button:not(.ad-label)");
  bindOnce(campaignButton, "click", () => scrollToProducts(0));

  bindOnce(document.querySelector(".gift-banner button"), "click", () => {
    showInfo("Həftəlik hədiyyələr", "<p>Aktiv kampaniya müddətində tamamlanan hər sifariş avtomatik olaraq həftəlik uduşda bir iştirak haqqı qazandırır.</p><p>Qaliblər hesablarında qeydiyyatda olan əlaqə məlumatı ilə məlumatlandırılır.</p>");
  });

  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      scrollToProducts(1);
      toast(`${button.dataset.category} kateqoriyası seçildi`);
    });
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", enhancePage);
else enhancePage();
