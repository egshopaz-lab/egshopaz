import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/site";

const STATIC_PATHS: { path: string; changefreq: string; priority: string }[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/catalog", changefreq: "daily", priority: "0.9" },
  { path: "/discover", changefreq: "daily", priority: "0.8" },
  { path: "/shops", changefreq: "weekly", priority: "0.8" },
  { path: "/promotions", changefreq: "weekly", priority: "0.7" },
  { path: "/pickup-points", changefreq: "weekly", priority: "0.6" },
  { path: "/map", changefreq: "weekly", priority: "0.5" },
  { path: "/become-seller", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        let productPaths: string[] = [];
        let shopPaths: string[] = [];
        try {
          const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
          const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          if (url && key) {
            const sb = createClient(url, key, { auth: { persistSession: false } });
            const [{ data: products }, { data: shops }] = await Promise.all([
              sb.from("products").select("id").eq("is_active", true).limit(5000),
              sb.from("profiles_public").select("id").not("shop_name", "is", null).limit(2000),
            ]);
            productPaths = (products ?? []).map((p) => `/product/${p.id}`);
            shopPaths = (shops ?? []).map((s) => `/shop/${s.id}`);
          }
        } catch {
          // fall back to static only
        }

        const entries = [
          ...STATIC_PATHS.map((e) => ({ ...e })),
          ...productPaths.map((p) => ({ path: p, changefreq: "weekly", priority: "0.7" })),
          ...shopPaths.map((p) => ({ path: p, changefreq: "weekly", priority: "0.6" })),
        ];

        const urls = entries.map((e) =>
          [
            "  <url>",
            `    <loc>${SITE_URL}${e.path}</loc>`,
            `    <changefreq>${e.changefreq}</changefreq>`,
            `    <priority>${e.priority}</priority>`,
            "  </url>",
          ].join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
