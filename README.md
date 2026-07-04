# EG Shop Clean

Harici connector ve hazir backend baglantisi olmadan hazirlanan temiz, bagimliliksiz vitrin surumu.

## Yerel calistirma

```bash
npm run dev
```

## Production build

```bash
npm run build
```

Build sonucu `dist/` klasorune yazilir. Hetzner uzerinde Nginx ile bu klasoru servis edebilirsiniz.

## Veritabani

Supabase baglantisi `src/supabase.js` icinde yapilandirilmistir.

1. Supabase panelinde SQL Editor'u acin.
2. `supabase/schema.sql` dosyasinin tamamini calistirin.
3. Ilk admin kullaniciyi olusturduktan sonra SQL Editor'da rolunu guncelleyin:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@egshop.az');
```

Satici rolu icin `admin` yerine `seller` kullanin.
