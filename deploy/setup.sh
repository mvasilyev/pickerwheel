#!/usr/bin/env bash
set -euo pipefail

# ── Config ──────────────────────────────────────────────
APP_USER="pickerwheel"
APP_DIR="/opt/pickerwheel"
REPO="https://github.com/mvasilyev/pickerwheel.git"

# ── Domain (argument or prompt) ─────────────────────────
DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  read -rp "Enter domain (e.g. pickerwheel.example.com): " DOMAIN
fi
if [ -z "$DOMAIN" ]; then
  echo "Domain is required"
  exit 1
fi

# ── Must run as root ────────────────────────────────────
if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root"
  exit 1
fi

echo "==> Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

echo "==> Creating user '$APP_USER'..."
if ! id "$APP_USER" &>/dev/null; then
  useradd -r -m -s /bin/bash "$APP_USER"
  usermod -aG docker "$APP_USER"
fi

echo "==> Cloning repo to $APP_DIR..."
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
  sudo -u "$APP_USER" git pull
else
  git clone "$REPO" "$APP_DIR"
  chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
fi

echo "==> Generating Caddyfile for $DOMAIN..."
export DOMAIN
envsubst < "$APP_DIR/deploy/Caddyfile.template" > "$APP_DIR/deploy/Caddyfile"

echo "==> Starting services..."
cd "$APP_DIR"
sudo -u "$APP_USER" docker compose up -d --build

echo ""
echo "Done! The app should be live at https://$DOMAIN"
echo ""
echo "Useful commands (run as $APP_USER or with sudo):"
echo "  cd $APP_DIR && docker compose logs -f"
echo "  cd $APP_DIR && docker compose restart"
echo "  cd $APP_DIR && git pull && docker compose up -d --build"
