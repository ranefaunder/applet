#!/bin/bash

set -e

echo "🔗 Deploying Appliet to server..."

ssh faunder@faunder.fi << 'EOF'
  set -e
  export PATH="/home/faunder/.bun/bin:$PATH"

  mkdir -p /home/faunder/apps

  if [ ! -d "/home/faunder/apps/appstudo/.git" ]; then
    echo "📦 Cloning appstudo repository..."
    bash -lc "cd /home/faunder/apps && git clone git@github.com:ranefaunder/appstudo.git"
  fi

  if [ ! -x "/home/faunder/.bun/bin/bun" ]; then
    echo "📦 Installing Bun for faunder..."
    bash -lc "curl -fsSL https://bun.sh/install | bash"
  fi

  if [ ! -f "/home/faunder/apps/appstudo/.env" ]; then
    echo "❌ Missing /home/faunder/apps/appstudo/.env"
    echo "Create it on the server before deploying (see .env.example)."
    exit 1
  fi

  bash -lc "cd /home/faunder/apps/appstudo && git fetch origin && git checkout main && git reset --hard origin/main && /home/faunder/.bun/bin/bun install"
  sudo -n install -m 644 /home/faunder/apps/appstudo/ops/appliet.service /etc/systemd/system/appliet.service
  sudo -n systemctl daemon-reload
  sudo -n systemctl enable --now appliet.service
  sudo -n systemctl restart appliet.service

  if sudo -n systemctl status appliet.service > /dev/null 2>&1; then
    echo "✅ Appliet deploy complete! (systemd service)"
  else
    echo "❌ Appliet service failed to start"
    echo "Check logs with: journalctl -u appliet.service -f"
    exit 1
  fi
EOF
