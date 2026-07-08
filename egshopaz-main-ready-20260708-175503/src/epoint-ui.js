const SUPABASE_URL = "https://ootloyfutihvupfforrv.supabase.co";
const SUPABASE_KEY = "sb_publishable_ppRwsR2EfF1Xx4ZTiQsSCw__w7tOLkG";

function session() {
  try { return JSON.parse(localStorage.getItem("egshop_session") || "null"); }
  catch { return null; }
}

function notify(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

async function startPayment(address, phone) {
  const token = session()?.access_token;
  if (!token) throw new Error("Sifariş üçün yenidən giriş edin.");

  const response = await fetch(`${SUPABASE_URL}/functions/v1/epoint-create`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ address, phone }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.redirect_url) {
    throw new Error(result?.message || "Ödəniş başladılmadı.");
  }
  window.location.assign(result.redirect_url);
}

function updateCheckoutButton() {
  const button = document.querySelector("#checkoutForm .form-submit");
  if (button && !button.disabled) button.textContent = "Kartla ödə";
}

function showPaymentResult() {
  const url = new URL(window.location.href);
  const payment = url.searchParams.get("payment");
  if (!payment) return;
  history.replaceState({}, "", `${url.pathname}${url.hash}`);
  setTimeout(() => {
    notify(payment === "success"
      ? "Ödəniş qəbul edildi. Sifariş statusu yenilənir."
      : "Ödəniş tamamlanmadı. Yenidən cəhd edə bilərsiniz.");
  }, 500);
}

document.addEventListener("submit", async (event) => {
  if (event.target.id !== "checkoutForm") return;
  event.preventDefault();
  event.stopImmediatePropagation();

  const button = event.target.querySelector(".form-submit");
  if (button) {
    button.disabled = true;
    button.textContent = "Epoint açılır...";
  }
  try {
    await startPayment(
      event.target.elements.address.value.trim(),
      event.target.elements.phone.value.trim(),
    );
  } catch (error) {
    notify(error instanceof Error ? error.message : "Ödəniş başladılmadı.");
    if (button) {
      button.disabled = false;
      button.textContent = "Kartla ödə";
    }
  }
}, true);

new MutationObserver(updateCheckoutButton).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
showPaymentResult();
