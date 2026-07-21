import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const body = [
          "User-agent: *",
          "Allow: /",
          "Disallow: /dashboard",
          "Disallow: /seller",
          "Disallow: /pvz",
          "Disallow: /auth",
          "Disallow: /login",
          "Disallow: /register",
          "Disallow: /become-seller",
          "Disallow: /reset-password",
          "Disallow: /checkout-pay",
          "",
          `Sitemap: ${SITE_URL}/sitemap.xml`,
          "",
        ].join("\n");
        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
