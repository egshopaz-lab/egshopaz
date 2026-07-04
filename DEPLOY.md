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
sudo nginx -t
sudo systemctl reload nginx
```

Bu noktada site `http://178.105.240.35` adresinde acilir.

## 4. Domain baglama

Domain DNS yonetiminde bir `A` kaydi ekleyin:

```text
@     A     178.105.240.35
www   A     178.105.240.35
```

Sonra `/etc/nginx/sites-available/eg-shop` icindeki:

```nginx
server_name 178.105.240.35 _;
```

satirini su sekilde degistirin:

```nginx
server_name alanadiniz.com www.alanadiniz.com;
```

## 5. HTTPS

DNS oturduktan sonra:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d alanadiniz.com -d www.alanadiniz.com
```

## Guncelleme

```bash
cd /var/www/eg-shop
git pull --ff-only
node scripts/build.mjs
sudo systemctl reload nginx
```
