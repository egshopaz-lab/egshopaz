# EG Shop subdomen restrukturlaşdırma hesabatı

## Arxitektura

| Host | Məqsəd | Giriş | Qeydiyyat | Panel |
| --- | --- | --- | --- | --- |
| `egshop.az` | Müştəri marketplace | `/login` | `/register` | `/` |
| `seller.egshop.az` | Satıcı qeydiyyatı və idarəetmə | `/login` | `/register` | `/seller` |
| `pvz.egshop.az` | PVZ qeydiyyatı və əməliyyatları | `/login` | `/register` | `/pvz` |
| `admin.egshop.az` | İdarəetmə | `/login` | `/register` (dəvət məlumatı) | `/dashboard` |

Bütün hostlar eyni tətbiq build-indən və eyni Supabase layihəsindən
(`njqyfbnxoewjprvvaugr`) istifadə edir. Hostname əsasında portal seçilir; mövcud panel
komponentləri və API çağırışları silinməyib.

## Rol modeli

- Customer — bazada geriyə uyğunluq üçün `buyer`.
- Seller — yalnız təsdiqlənmiş 20 AZN Epoint callback-indən sonra.
- PVZ — ayrıca PVZ qeydiyyat RPC-si ilə.
- Admin — yalnız sistem sahibi tərəfindən idarə olunur; açıq admin qeydiyyatı yoxdur.

Yeni istifadəçi metadata-sı rol vermir. `handle_new_user()` bütün yeni hesabları əvvəlcə
Customer yaradır. Bu, istifadəçinin `raw_user_meta_data` dəyişərək Seller/PVZ rolu almasının
qarşısını alır.

## Köhnə linklər

- `egshop.az/become-seller` → `seller.egshop.az/register`
- `egshop.az/seller` → `seller.egshop.az/seller`
- `egshop.az/pvz` → `pvz.egshop.az/pvz`
- `egshop.az/admin` → `admin.egshop.az/dashboard`
- Köhnə `/auth?role=...` linkləri uyğun portalın `/login` səhifəsinə yönləndirilir.

Redirect-lər həm tətbiq səviyyəsində, həm də Nginx nümunəsində saxlanılır.

## SEO və performans

- Marketplace sitemap-indən köhnə satıcı qeydiyyat URL-i çıxarılıb.
- Login, register və əməliyyat panelləri indekslənmir.
- Portal hostları üçün `X-Robots-Tag: noindex, nofollow` və ayrıca `robots.txt` qaydası var.
- Marketplace canonical URL-ləri dəyişməyib.
- Panel kodları mövcud route chunk-larında qaldığı üçün marketplace-in ilkin məlumat
  yükləməsi ilə birləşdirilməyib.

## Dəyişdirilən fayllar

- `deploy/nginx.conf.example`
- `src/components/SiteHeader.tsx`
- `src/routeTree.gen.ts`
- `src/routes/__root.tsx`
- `src/routes/dashboard.tsx`
- `src/routes/auth.tsx`
- `src/routes/become-seller.tsx`
- `src/routes/index.tsx`
- `src/routes/pvz.tsx`
- `src/routes/robots[.]txt.ts`
- `src/routes/seller.tsx`
- `src/routes/sitemap[.]xml.ts`
- `supabase/config.toml`
- `supabase/functions/seller-payment-init/index.ts`

## Yeni fayllar

- `src/lib/portals.ts`
- `src/components/PortalAuthRoute.tsx`
- `src/routes/login.tsx`
- `src/routes/register.tsx`
- `supabase/migrations/20260715124956_secure_portal_roles.sql`
- `docs/SUBDOMAIN-RESTRUCTURE-REPORT.md`

## Yoxlamalar

- Production build
- TypeScript typecheck
- Yeni portal modulları üçün ESLint
- Beş host/path kombinasiyası üzrə local HTTP smoke test
- Supabase migrasiyası üçün rollback dry-run
- Canlı function definition və execute privilege yoxlaması
- Supabase Security və Performance Advisor yoxlaması

## İnfrastruktur aktivləşdirməsi

DNS zonasında aşağıdakı A qeydləri `178.105.240.35` ünvanına göstərilməlidir:

- `seller`
- `pvz`
- `admin`

Sonra bütün beş hostname-i əhatə edən Let's Encrypt sertifikatı yaradılmalı, Nginx
konfiqurasiyası aktivləşdirilməli və Supabase Auth redirect allow-list mənbədəki
`supabase/config.toml` ilə uyğunlaşdırılmalıdır.
