const TRUSTED_PAYMENT_HOSTS = new Set(["epoint.az", "ecomm.pashabank.az"]);

export function isTrustedPaymentRedirect(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  const isTrustedHost =
    TRUSTED_PAYMENT_HOSTS.has(hostname) ||
    hostname.endsWith(".epoint.az");

  return url.protocol === "https:" && isTrustedHost;
}

export function parseTrustedPaymentRedirect(value: unknown): URL {
  if (typeof value !== "string") {
    throw new Error("Ödəniş ünvanı qaytarılmadı");
  }

  const target = new URL(value);
  if (!isTrustedPaymentRedirect(target)) {
    throw new Error("Ödəniş ünvanı etibarsızdır");
  }

  return target;
}
