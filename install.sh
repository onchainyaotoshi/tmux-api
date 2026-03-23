#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="tmux-api"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
RUN_USER="${SUDO_USER:-$USER}"
RUN_GROUP="$(id -gn "$RUN_USER")"
NODE_BIN="$(command -v node)"
NPM_BIN="$(command -v npm)"

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# --- Root check ---
if [[ $EUID -ne 0 ]]; then
  error "This script must be run with sudo: sudo ./install.sh"
fi

echo ""
echo "  tmux-api installer"
echo "  ==================="
echo ""

# --- Check prerequisites ---
echo "Checking prerequisites..."

command -v node  >/dev/null 2>&1 || error "Node.js is not installed. Install Node.js 20+ first."
command -v npm   >/dev/null 2>&1 || error "npm is not installed."
command -v tmux  >/dev/null 2>&1 || error "tmux is not installed. Install with: sudo apt install tmux"

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [[ "$NODE_VERSION" -lt 20 ]]; then
  error "Node.js 20+ required. Current: $(node -v)"
fi

info "Node.js $(node -v)"
info "npm $(npm -v)"
info "tmux $(tmux -V)"

# --- Install dependencies ---
echo ""
echo "Installing dependencies..."
cd "$INSTALL_DIR"
sudo -u "$RUN_USER" "$NPM_BIN" ci --omit=dev --ignore-scripts 2>&1 | tail -1
info "Dependencies installed"

# --- Build frontend ---
echo "Building frontend..."
sudo -u "$RUN_USER" "$NPM_BIN" run build 2>&1 | tail -1
info "Frontend built"

# --- Setup .env ---
if [[ ! -f "$INSTALL_DIR/.env" ]]; then
  cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
  chown "$RUN_USER:$RUN_GROUP" "$INSTALL_DIR/.env"
  warn ".env created from .env.example — edit it before starting:"
  warn "  nano $INSTALL_DIR/.env"
  warn "  At minimum, set API_KEY to a secure value."
  echo ""
else
  info ".env already exists"
fi

# --- Create systemd service ---
echo "Creating systemd service..."

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=tmux-api — REST API server for tmux
Documentation=https://github.com/onchainyaotoshi/tmux-api
After=network.target

[Service]
Type=simple
User=${RUN_USER}
Group=${RUN_GROUP}
WorkingDirectory=${INSTALL_DIR}
ExecStart=${NODE_BIN} src/server/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

# Security hardening
NoNewPrivileges=true
ProtectSystem=true

[Install]
WantedBy=multi-user.target
EOF

info "Service file created: $SERVICE_FILE"

# --- Enable and start ---
systemctl daemon-reload
systemctl enable "$SERVICE_NAME" --quiet
info "Service enabled (will start on boot)"

if systemctl is-active --quiet "$SERVICE_NAME"; then
  systemctl restart "$SERVICE_NAME"
  info "Service restarted"
else
  systemctl start "$SERVICE_NAME"
  info "Service started"
fi

# --- Verify ---
sleep 1
if systemctl is-active --quiet "$SERVICE_NAME"; then
  info "tmux-api is running!"
else
  warn "Service may have failed to start. Check logs:"
  warn "  journalctl -u $SERVICE_NAME -n 20"
fi

echo ""
echo "  Setup complete!"
echo ""
echo "  Useful commands:"
echo "    sudo systemctl status $SERVICE_NAME    — check status"
echo "    sudo systemctl restart $SERVICE_NAME   — restart"
echo "    sudo systemctl stop $SERVICE_NAME      — stop"
echo "    journalctl -u $SERVICE_NAME -f         — follow logs"
echo ""
