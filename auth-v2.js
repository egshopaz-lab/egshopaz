import { currentUser, getCart, getOrders, initializeAuth, resetPassword } from "./supabase.js?v=20260705-1";

const SUPABASE_URL = "https://ootloyfutihvupfforrv.supabase.co";
const SUPABASE_KEY = "sb_publishable_ppRwsR2EfF1Xx4ZTiQsSCw__w7tOLkG";

function storedSession() {
  try { return JSON.parse(localStorage.getItem("egshop_session") || "null"); }
  catch { return null; }
}

function notify(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

async function syncCartCount() {
  if (!currentUser()) return setCartCount(0);
  try {
    const items = await getCart();
    setCartCount(items.reduce((sum, item) => sum + Number(item.quantity || 0), 0));
  } catch (error) {
    console.warn("Səbət sayı yenilənmədi", error);
  }
}

function setCartCount(count) {
  document.querySelectorAll("#cartCount, #mobileCartCount").forEach((item) => { item.textContent = String(count); });
}

async function checkout(address, phone) {
  const token = storedSession()?.access_token;
  if (!token) throw new Error("Sifariş üçün yenidən giriş edin.");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/checkout_cart`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ _address: address, _phone: phone }),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) throw new Error(data?.message || "Sifariş tamamlanmadı.");
  return data;
}

function addPasswordReset(form) {
  if (!form || form.querySelector("[data-reset-password]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "form-secondary";
  button.dataset.resetPassword = "true";
  button.textContent = "Şifrəni unutdum";
  button.addEventListener("click", async () => {
    const email = form.elements.email?.value;
    const message = form.querySelector("#authMessage");
    try {
      await resetPassword(email);
      message.textContent = "Şifrə yeniləmə linki e-poçtunuza göndərildi.";
    } catch (error) { message.textContent = error.message; }
  });
  form.querySelector(".form-actions")?.after(button);
}

function addOrdersButton(content) {
  if (!currentUser() || content.querySelector("[data-my-orders]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "form-secondary";
  button.dataset.myOrders = "true";
  button.textContent = "Sifarişlərim";
  button.addEventListener("click", showOrders);
  content.querySelector("#logoutButton")?.before(button);
}

async function showOrders() {
  const panel = document.querySelector("#panelDialog");
  const content = document.querySelector("#panelContent");
  document.querySelector("#accountDialog")?.close();
  content.replaceChildren();
  const title = document.createElement("h2");
  title.textContent = "Sifarişlərim";
  content.append(title);
  try {
    const orders = await getOrders();
    if (!orders.length) content.append(Object.assign(document.createElement("p"), { textContent: "Hələ sifarişiniz yoxdur." }));
    orders.forEach((order) => {
      const row = document.createElement("div");
      row.className = "drawer-product";
      const text = document.createElement("span");
      const name = document.createElement("b");
      name.textContent = `${Number(order.total).toFixed(2)} ₼ · ${order.status}`;
      const date = document.createElement("small");
      date.textContent = new Date(order.created_at).toLocaleString("az-AZ");
      text.append(name, date);
      row.append(text);
      content.append(row);
    });
  } catch (error) { content.append(Object.assign(document.createElement("p"), { textContent: error.message })); }
  panel.showModal();
}

const categoryWords = {
  "Elektronika": ["telefon", "redmi", "skuter", "elektrik"],
  "Qadın geyimləri": ["qadın", "geyim"],
  "Kişi geyimləri": ["kişi", "geyim"],
  "Uşaq və körpə": ["uşaq", "körpə"],
  "Ayaqqabı": ["ayaqqabı"],
  "Gözəllik və baxım": ["gözəllik", "baxım"],
  "Ev və mətbəx": ["ev", "yataq", "mətbəx"],
  "Mebel": ["mebel"],
};

function filterProducts(label) {
  const words = categoryWords[label] || [label.toLocaleLowerCase("az-AZ")];
  let visible = 0;
  document.querySelectorAll(".product-card").forEach((card) => {
    const matches = words.some((word) => card.textContent.toLocaleLowerCase("az-AZ").includes(word.toLocaleLowerCase("az-AZ")));
    card.hidden = !matches;
    if (matches) visible += 1;
  });
  notify(visible ? `${label}: ${visible} məhsul tapıldı` : `${label} kateqoriyasında hələ məhsul yoxdur`);
}

function watchAccountContent() {
  const target = document.querySelector("#accountContent");
  if (!target) return;
  const apply = () => { addPasswordReset(target.querySelector("#authForm")); addOrdersButton(target); };
  new MutationObserver(apply).observe(target, { childList: true, subtree: true });
  apply();
}

document.addEventListener("submit", async (event) => {
  if (event.target.id !== "checkoutForm") return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const button = event.target.querySelector("button[type='submit'], button:not([type])");
  if (button) button.disabled = true;
  try {
    await checkout(event.target.elements.address.value.trim(), event.target.elements.phone.value.trim());
    setCartCount(0);
    document.querySelector("#panelDialog")?.close();
    notify("Sifariş qəbul edildi");
  } catch (error) { notify(error.message); }
  finally { if (button) button.disabled = false; }
}, true);

document.addEventListener("click", (event) => {
  const category = event.target.closest("[data-category]");
  if (category) filterProducts(category.dataset.category);
  const sub = event.target.closest(".sub-categories button");
  if (sub) {
    event.stopImmediatePropagation();
    filterProducts(sub.textContent.replace("▦", "").trim());
  }
  if (event.target.closest("[data-add], [data-remove-cart]")) setTimeout(syncCartCount, 500);
}, true);

async function start() {
  await initializeAuth();
  const app = document.querySelector("#app");
  if (!app) return;
  const ready = () => {
    if (!document.querySelector(".site-header")) return false;
    watchAccountContent();
    syncCartCount();
    return true;
  };
  if (ready()) return;
  const observer = new MutationObserver(() => { if (ready()) observer.disconnect(); });
  observer.observe(app, { childList: true });
}

start();
