import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        const body = `# EG Shop

> EG Shop — Azərbaycanın onlayn marketi. Milyonlarla məhsul, sürətli çatdırılma və sərfəli qiymətlər.

EG Shop is an Azerbaijani online marketplace connecting buyers with verified local sellers. The platform offers a wide range of products, pickup-point (PVZ) delivery, secure card payments, and seller storefronts.

## Pages

- [Ana səhifə](/): Featured products, banners, promotions and giveaways.
- [Katalog](/catalog): Full product catalog with categories and filters.
- [Kəşf et](/discover): Trending and recommended products.
- [Mağazalar](/shops): Browse verified seller shops.
- [Aksiyalar](/promotions): Current discounts and promo codes.
- [PVZ punktları](/pickup-points): Pickup point locations across Azerbaijan.
- [Xəritə](/map): Interactive map of couriers and pickup points.
- [Satıcı ol](/become-seller): Information for sellers joining EG Shop.
- [Əlaqə](/contact): Contact details and support.

## Optional

- [Şərtlər](/terms): Terms of service and platform rules.
- [Məxfilik](/privacy): Privacy policy and data handling.
`;
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
