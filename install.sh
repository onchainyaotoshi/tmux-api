#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="tmux-api"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
RUN_USER="${SUDO_USER:-$USER}"
RUN_GROUP="$(id -gn "$RUN_USER")"

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

# --- Resolve node/npm (nvm-aware) ---
# sudo resets PATH, so node installed via nvm won't be found.
# Check the invoking user's nvm installation as fallback.
resolve_node() {
  # 1. Already in PATH (system install or user passed PATH via sudo env PATH="$PATH")
  if command -v node >/dev/null 2>&1; then
    NODE_BIN="$(command -v node)"
    NPM_BIN="$(command -v npm)"
    return
  fi

  # 2. Check nvm for the invoking user
  local nvm_dir="/home/${RUN_USER}/.nvm"
  if [[ -d "$nvm_dir" ]]; then
    # Find the default or latest installed version
    local nvm_default=""
    if [[ -f "$nvm_dir/alias/default" ]]; then
      nvm_default="$(cat "$nvm_dir/alias/default")"
    fi

    local node_path=""
    if [[ -n "$nvm_default" ]]; then
      # Resolve alias — could be a version like "24" or full like "v24.14.1"
      node_path="$(find "$nvm_dir/versions/node" -maxdepth 1 -type d -name "v${nvm_default}*" | sort -V | tail -1)"
    fi

    # Fallback: pick the latest installed version
    if [[ -z "$node_path" || ! -x "$node_path/bin/node" ]]; then
      node_path="$(find "$nvm_dir/versions/node" -maxdepth 1 -type d -name 'v*' | sort -V | tail -1)"
    fi

    if [[ -n "$node_path" && -x "$node_path/bin/node" ]]; then
      NODE_BIN="$node_path/bin/node"
      NPM_BIN="$node_path/bin/npm"
      export PATH="$node_path/bin:$PATH"
      warn "Node.js found via nvm: $NODE_BIN"
      return
    fi
  fi

  error "Node.js is not installed. Install Node.js 20+ first (system install or nvm)."
}

resolve_node

# --- Check prerequisites ---
echo "Checking prerequisites..."

[[ -x "$NODE_BIN" ]] || error "Node.js is not installed. Install Node.js 20+ first."
[[ -x "$NPM_BIN" ]] || error "npm is not installed."
command -v tmux  >/dev/null 2>&1 || error "tmux is not installed. Install with: sudo apt install tmux"

NODE_VERSION=$("$NODE_BIN" -v | sed 's/v//' | cut -d. -f1)
if [[ "$NODE_VERSION" -lt 20 ]]; then
  error "Node.js 20+ required. Current: $("$NODE_BIN" -v)"
fi

info "Node.js $("$NODE_BIN" -v)"
info "npm $("$NPM_BIN" -v)"
info "tmux $(tmux -V)"

# --- Install dependencies + build ---
echo ""
echo "Installing dependencies..."
cd "$INSTALL_DIR"
sudo -u "$RUN_USER" "$NPM_BIN" ci 2>&1 | tail -1
info "Dependencies installed"

echo "Building frontend..."
sudo -u "$RUN_USER" "$NPM_BIN" run build 2>&1 | tail -3
info "Frontend built"

echo "Removing dev dependencies..."
sudo -u "$RUN_USER" "$NPM_BIN" prune --omit=dev 2>&1 | tail -1
info "Dev dependencies removed"

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
Environment=PATH=$(dirname "$NODE_BIN"):/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

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
