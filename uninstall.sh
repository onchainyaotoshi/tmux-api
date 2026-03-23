#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="tmux-api"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

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
  error "This script must be run with sudo: sudo ./uninstall.sh"
fi

echo ""
echo "  tmux-api uninstaller"
echo "  ====================="
echo ""

# --- Stop and disable service ---
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  systemctl stop "$SERVICE_NAME"
  info "Service stopped"
else
  info "Service was not running"
fi

if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
  systemctl disable "$SERVICE_NAME" --quiet
  info "Service disabled"
fi

# --- Remove service file ---
if [[ -f "$SERVICE_FILE" ]]; then
  rm "$SERVICE_FILE"
  systemctl daemon-reload
  info "Service file removed"
else
  info "Service file already removed"
fi

echo ""
info "tmux-api service has been removed."
echo ""
echo "  Note: Project files and .env were NOT deleted."
echo "  To remove everything: rm -rf $(cd "$(dirname "$0")" && pwd)"
echo ""
