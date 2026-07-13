#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_URL="https://raw.githubusercontent.com/egshopaz-lab/egshopaz/main/deploy/server-deploy.sh"

curl -fsSL "$DEPLOY_URL" -o /usr/local/sbin/egshop-deploy
chmod 0755 /usr/local/sbin/egshop-deploy

cat >/etc/systemd/system/egshop-deploy.service <<'UNIT'
[Unit]
Description=Deploy EG Shop from GitHub
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/egshop-deploy
Nice=10
UNIT

cat >/etc/systemd/system/egshop-deploy.timer <<'UNIT'
[Unit]
Description=Check GitHub for EG Shop updates

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
RandomizedDelaySec=30
Persistent=true
Unit=egshop-deploy.service

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now egshop-deploy.timer
systemctl start egshop-deploy.service

echo "EG Shop automatic deployment is installed."
systemctl --no-pager status egshop-deploy.timer
