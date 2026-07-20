const TRUSTED_PAYMENT_HOSTS = new Set(["epoint.az", "pashabank.az"]);

function isTrustedPaymentHost(hostname: string): boolean {
  return (
    TRUSTED_PAYMENT_HOSTS.has(hostname) ||
    hostname.endsWith(".epoint.az") ||
    hostname.endsWith(".pashabank.az")
  );
}

export function isTrustedPaymentRedirect(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  return url.protocol === "https:" && isTrustedPaymentHost(hostname);
}

export function parseTrustedPaymentRedirect(value: unknown): URL {
  if (typeof value !== "string") {
    throw new Error("Ödəniş ünvanı qaytarılmadı");
  }

  const target = new URL(value);
  if (!isTrustedPaymentRedirect(target)) {
    throw new Error(`Ödəniş ünvanı etibarsızdır: ${target.hostname}`);
  }

  return target;
}
