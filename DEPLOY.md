# Hetzner deployment

Sunucu: `178.105.240.35`

## 1. Sunucu paketleri

```bash
sudo apt update
sudo apt install -y nginx git nodejs
```

## 2. Projeyi cekin

```bash
sudo mkdir -p /var/www/eg-shop
sudo chown "$USER":"$USER" /var/www/eg-shop
git clone https://github.com/egshopaz-lab/egshopaz.git /var/www/eg-shop
cd /var/www/eg-shop
node scripts/build.mjs
```

## 3. Nginx

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/eg-shop
sudo ln -s /etc/nginx/sites-available/eg-shop /etc/nginx/sites-enabled/eg-shop
sudo rm -f /etc/nginx/sites-enabled/default
```

HTTPS sertifikati henuz qurulmayibsa once Certbot isleye bilsin deye muveqqeti HTTP konfiqurasiya ile baslayin ve sonra 5-ci addimdaki Certbot emrini icra edin.

## 4. Domain baglama

Domain DNS yonetiminde bir `A` kaydi ekleyin:

```text
@     A     178.105.240.35
www   A     178.105.240.35
```

`egshop.az` ve `www.egshop.az` ucun DNS hazir olduqdan sonra server bloku `deploy/nginx.conf.example` faylindaki kimi qalmalidir.

## 5. HTTPS

DNS oturduktan sonra:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d egshop.az -d www.egshop.az
sudo nginx -t
sudo systemctl reload nginx
```

## Guncelleme

```bash
cd /var/www/eg-shop
git pull --ff-only
node scripts/build.mjs
sudo systemctl reload nginx
```
