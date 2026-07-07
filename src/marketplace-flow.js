import { createProduct, currentUser, getProfile } from "./supabase.js?v=20260706-2";

function notify(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function field(form, name) {
  return form.elements[name];
}

function enhanceSellerApplication(form) {
  if (!form || form.dataset.marketplaceReady) return;
  form.dataset.marketplaceReady = "true";
  field(form, "store_name")?.setAttribute("placeholder", "Məsələn: EG Elektronika");
  field(form, "phone")?.setAttribute("placeholder", "+994 50 000 00 00");
  field(form, "tax_id")?.setAttribute("required", "required");
  field(form, "tax_id")?.setAttribute("placeholder", "10 rəqəmli VÖEN");
  field(form, "note")?.setAttribute("placeholder", "Satacağınız məhsullar və mağaza haqqında qısa məlumat");

  const hint = document.createElement("p");
  hint.className = "flow-hint";
  hint.textContent = "Müraciət admin tərəfindən təsdiqləndikdən sonra məhsul yükləmə paneli açılacaq.";
  form.prepend(hint);
}

function enhanceProductForm(form) {
  if (!form || form.dataset.marketplaceReady) return;
  form.dataset.marketplaceReady = "true";

  const title = document.createElement("p");
  title.className = "flow-hint";
  title.textContent = "Məhsul aktiv əlavə olunur və təsdiqlənmiş satıcının vitrində görünür.";
  form.prepend(title);

  if (!field(form, "description")) {
    const description = document.createElement("label");
    description.textContent = "Təsvir";
    description.innerHTML += '<textarea name="description" rows="3" placeholder="Məhsul haqqında qısa məlumat"></textarea>';
    field(form, "stock")?.closest("label")?.after(description);
  }

  if (!field(form, "old_price")) {
    const oldPrice = document.createElement("label");
    oldPrice.textContent = "Köhnə qiymət";
    oldPrice.innerHTML += '<input name="old_price" type="number" min="0" step="0.01" placeholder="Endirim varsa">';
    field(form, "price")?.closest("label")?.after(oldPrice);
  }

  if (!field(form, "active")) {
    const active = document.createElement("label");
    active.className = "terms-check";
    active.innerHTML = '<input name="active" type="checkbox" checked> <span>Məhsul vitrində aktiv görünsün</span>';
    form.querySelector(".form-submit")?.before(active);
  }

  form.addEventListener("submit", handleProductSubmit, true);
}

async function handleProductSubmit(event) {
  event.preventDefault();
  event.stopImmediatePropagation();

  const form = event.currentTarget;
  const submit = form.querySelector(".form-submit");
  if (!currentUser()) return notify("Məhsul yükləmək üçün satıcı hesabına daxil olun.");

  submit.disabled = true;
  submit.textContent = "Məhsul yüklənir...";
  try {
    const profile = await getProfile();
    if (!["seller", "admin"].includes(profile?.role)) {
      throw new Error("Məhsul yükləmək üçün satıcı müraciətiniz admin tərəfindən təsdiqlənməlidir.");
    }
    const data = Object.fromEntries(new FormData(form));
    await createProduct({
      name: String(data.name || "").trim(),
      description: String(data.description || "").trim() || null,
      price: Number(data.price),
      old_price: data.old_price ? Number(data.old_price) : null,
      stock: Number(data.stock || 0),
      image_url: String(data.image_url || "").trim() || null,
      active: Boolean(data.active),
    });
    form.reset();
    field(form, "active").checked = true;
    notify("Məhsul əlavə edildi.");
  } catch (error) {
    notify(error.message || "Məhsul əlavə edilmədi.");
  } finally {
    submit.disabled = false;
    submit.textContent = "Məhsul əlavə et";
  }
}

function enhanceCheckout(form) {
  if (!form || form.dataset.marketplaceHint) return;
  form.dataset.marketplaceHint = "true";
  const hint = document.createElement("p");
  hint.className = "flow-hint";
  hint.textContent = "Sifariş təsdiqlənəndə Epoint ödəniş səhifəsinə yönləndiriləcəksiniz.";
  form.prepend(hint);
}

function scan() {
  enhanceSellerApplication(document.querySelector("#sellerApplicationForm"));
  enhanceProductForm(document.querySelector("#productForm"));
  enhanceCheckout(document.querySelector("#checkoutForm"));
}

new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
scan();
