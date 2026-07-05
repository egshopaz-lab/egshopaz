function applySellerTaxField() {
  const input = document.querySelector('#sellerApplicationForm input[name="tax_id"]');
  if (!input || input.dataset.taxReady) return;
  input.dataset.taxReady = "true";
  input.required = true;
  input.inputMode = "numeric";
  input.pattern = "[0-9]{10}";
  input.minLength = 10;
  input.maxLength = 10;
  input.placeholder = "10 rəqəmli VÖEN";
  const hint = document.createElement("small");
  hint.className = "field-hint";
  hint.textContent = "Satıcı hesabının təsdiqi üçün VÖEN məcburidir.";
  input.after(hint);
}

const app = document.querySelector("#app");
if (app) {
  new MutationObserver(applySellerTaxField).observe(app, { childList: true, subtree: true });
  applySellerTaxField();
}
