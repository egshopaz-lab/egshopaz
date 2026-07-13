const configuredSiteUrl = import.meta.env.VITE_SITE_URL || "https://egshop.az";

export const SITE_URL = configuredSiteUrl.replace(/\/+$/, "");

export function absoluteUrl(path = "/") {
  return new URL(path, `${SITE_URL}/`).toString();
}
