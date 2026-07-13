#!/bin/bash

set -e

echo "🔗 Deploying Applet to server..."

ssh faunder@faunder.fi << 'EOF'
  set -e
  export PATH="/home/faunder/.bun/bin:$PATH"

  mkdir -p /home/faunder/apps

  if [ ! -d "/home/faunder/apps/applet/.git" ]; then
    echo "📦 Cloning applet repository..."
    bash -lc "cd /home/faunder/apps && git clone git@github.com:ranefaunder/applet.git applet"
  fi

  if [ ! -x "/home/faunder/.bun/bin/bun" ]; then
    echo "📦 Installing Bun for faunder..."
    bash -lc "curl -fsSL https://bun.sh/install | bash"
  fi

  if [ ! -f "/home/faunder/apps/applet/.env" ]; then
    echo "❌ Missing /home/faunder/apps/applet/.env"
    echo "Create it on the server before deploying (see .env.example)."
    exit 1
  fi

  bash -lc "cd /home/faunder/apps/applet && git remote set-url origin git@github.com:ranefaunder/applet.git && git fetch origin && git checkout main && git reset --hard origin/main && /home/faunder/.bun/bin/bun install"
  sudo -n install -m 644 /home/faunder/apps/applet/ops/applet.service /etc/systemd/system/applet.service
  sudo -n systemctl daemon-reload
  sudo -n systemctl disable --now appliet.service 2>/dev/null || true
  sudo -n systemctl enable --now applet.service
  sudo -n systemctl restart applet.service

  if sudo -n systemctl status applet.service > /dev/null 2>&1; then
    echo "✅ Applet deploy complete! (systemd service)"
  else
    echo "❌ Applet service failed to start"
    echo "Check logs with: journalctl -u applet.service -f"
    exit 1
  fi
EOF
