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

Bu surum backend'e baglanmaz. Kendi veritabani sunucunuza gecince baglanti ayarlari icin `src/main.js` icindeki `siteConfig` alanini veya ayri bir API katmanini kullanin.
