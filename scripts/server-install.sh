#!/usr/bin/env bash
# server-install.sh — Bootstrap DelphiNet 6 on a fresh Linux server.
#
# What this script does:
#   1. Installs system dependencies (Docker, Git, curl)
#   2. Clones the repo (or updates it if already present)
#   3. Checks out the latest git tag
#   4. Creates .env from .env.example with secure auto-generated secrets
#   5. Runs the initial docker compose build + up
#   6. Installs and starts the delphinet-deploy systemd service
#      (auto-deploys whenever a new git tag is pushed)
#
# Supported OS: Debian 11/12, Ubuntu 20.04/22.04/24.04
#
# Usage (run as root or a sudo-capable user):
#   curl -fsSL https://raw.githubusercontent.com/ariplayz/DelphiNet6/main/scripts/server-install.sh | bash
#   -- or --
#   sudo bash scripts/server-install.sh
#
# Environment overrides (optional):
#   REPO_URL      Git clone URL  (default: https://github.com/ariplayz/DelphiNet6.git)
#   INSTALL_DIR   Where to clone (default: /opt/delphinet6)
#   RUN_USER      OS user to own the files and run the service (default: current user or 'delphinet')
#   POLL_INTERVAL Seconds between tag checks (default: 30)

set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════
REPO_URL="${REPO_URL:-https://github.com/ariplayz/DelphiNet6.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/delphinet6}"
POLL_INTERVAL="${POLL_INTERVAL:-30}"
SERVICE_NAME="delphinet-deploy"

# Determine the run user
if [[ -n "${RUN_USER:-}" ]]; then
  :
elif [[ "${EUID}" -ne 0 ]]; then
  RUN_USER="$(whoami)"
else
  # Running as root — create a dedicated service account
  RUN_USER="delphinet"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }
header()  { echo -e "\n${BOLD}${GREEN}══ $* ══${RESET}"; }

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    error "This script must be run as root (or with sudo)."
  fi
}

gen_secret() {
  # 64 random hex chars
  openssl rand -hex 32
}

# ═══════════════════════════════════════════════════════════════════════════════
# Step 0 — Preflight
# ═══════════════════════════════════════════════════════════════════════════════
require_root

header "DelphiNet 6 — Server Install"
info "Install directory : $INSTALL_DIR"
info "Run user          : $RUN_USER"
info "Repo              : $REPO_URL"
info "Poll interval     : ${POLL_INTERVAL}s"
echo ""

# Detect OS
if [[ -f /etc/os-release ]]; then
  # shellcheck source=/dev/null
  source /etc/os-release
  OS_ID="${ID:-unknown}"
  OS_VERSION="${VERSION_ID:-unknown}"
else
  error "Cannot detect OS. Only Debian/Ubuntu are supported."
fi

case "$OS_ID" in
  debian|ubuntu|raspbian) : ;;
  *) warn "Untested OS: $OS_ID $OS_VERSION. Continuing anyway..." ;;
esac

info "Detected OS: $OS_ID $OS_VERSION"

# ═══════════════════════════════════════════════════════════════════════════════
# Step 1 — Create service user (if running as root)
# ═══════════════════════════════════════════════════════════════════════════════
header "Step 1 — Service user"

if [[ "${EUID}" -eq 0 && "$RUN_USER" == "delphinet" ]]; then
  if ! id "$RUN_USER" &>/dev/null; then
    useradd --system --create-home --shell /bin/bash "$RUN_USER"
    success "Created system user: $RUN_USER"
  else
    success "User $RUN_USER already exists."
  fi
  # Allow this user to run docker
  usermod -aG docker "$RUN_USER" 2>/dev/null || true
fi

RUN_USER_HOME="$(getent passwd "$RUN_USER" | cut -d: -f6)"

# ═══════════════════════════════════════════════════════════════════════════════
# Step 2 — Install system packages
# ═══════════════════════════════════════════════════════════════════════════════
header "Step 2 — System packages"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq

PKGS_NEEDED=()
for pkg in git curl ca-certificates gnupg lsb-release openssl; do
  if ! dpkg -l "$pkg" &>/dev/null; then
    PKGS_NEEDED+=("$pkg")
  fi
done

if [[ ${#PKGS_NEEDED[@]} -gt 0 ]]; then
  info "Installing: ${PKGS_NEEDED[*]}"
  apt-get install -y -qq "${PKGS_NEEDED[@]}"
fi
success "System packages ready."

# ═══════════════════════════════════════════════════════════════════════════════
# Step 3 — Install Docker
# ═══════════════════════════════════════════════════════════════════════════════
header "Step 3 — Docker"

if command -v docker &>/dev/null; then
  DOCKER_VERSION="$(docker --version 2>&1 | grep -oP '\d+\.\d+\.\d+' | head -1)"
  success "Docker already installed: $DOCKER_VERSION"
else
  info "Installing Docker via official install script..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker --quiet
  systemctl start docker
  success "Docker installed."
fi

# Ensure compose plugin is available
if ! docker compose version &>/dev/null; then
  info "Installing docker-compose-plugin..."
  apt-get install -y -qq docker-compose-plugin
  success "Docker Compose plugin installed."
else
  success "Docker Compose available: $(docker compose version --short 2>/dev/null || echo 'ok')"
fi

# Add run user to docker group
usermod -aG docker "$RUN_USER" 2>/dev/null || true

# ═══════════════════════════════════════════════════════════════════════════════
# Step 4 — Clone / update repo
# ═══════════════════════════════════════════════════════════════════════════════
header "Step 4 — Repository"

if [[ -d "$INSTALL_DIR/.git" ]]; then
  info "Repo already exists at $INSTALL_DIR — fetching latest..."
  sudo -u "$RUN_USER" git -C "$INSTALL_DIR" fetch --tags --force --quiet
  success "Repo updated."
else
  info "Cloning $REPO_URL → $INSTALL_DIR ..."
  git clone "$REPO_URL" "$INSTALL_DIR"
  chown -R "$RUN_USER":"$RUN_USER" "$INSTALL_DIR"
  success "Repo cloned."
fi

# Checkout latest tag
LATEST_TAG="$(git -C "$INSTALL_DIR" tag --sort=-version:refname | head -n1)"
if [[ -z "$LATEST_TAG" ]]; then
  warn "No tags found — staying on default branch (main)."
  LATEST_TAG="main"
else
  info "Checking out latest tag: $LATEST_TAG"
  sudo -u "$RUN_USER" git -C "$INSTALL_DIR" checkout "$LATEST_TAG" --quiet
  success "At tag: $LATEST_TAG"
fi

# Save the deployed tag so the watcher doesn't redeploy immediately
echo "$LATEST_TAG" > "$INSTALL_DIR/scripts/.deployed-tag"
chown "$RUN_USER":"$RUN_USER" "$INSTALL_DIR/scripts/.deployed-tag"

# ═══════════════════════════════════════════════════════════════════════════════
# Step 5 — Create .env
# ═══════════════════════════════════════════════════════════════════════════════
header "Step 5 — Environment configuration"

ENV_FILE="$INSTALL_DIR/.env"

if [[ -f "$ENV_FILE" ]]; then
  warn ".env already exists — skipping generation. Edit $ENV_FILE if needed."
else
  info "Generating .env with secure random secrets..."

  DB_PASSWORD="$(gen_secret)"
  SESSION_SECRET="$(gen_secret)"

  cat > "$ENV_FILE" <<EOF
# ── Database ─────────────────────────────────────────────
DATABASE_URL=postgresql://delphinet:${DB_PASSWORD}@db:5432/delphinet

# Internal postgres password (must match DATABASE_URL above)
POSTGRES_PASSWORD=${DB_PASSWORD}

# ── Session ──────────────────────────────────────────────
# Used to sign session tokens — keep this secret
SESSION_SECRET=${SESSION_SECRET}

# ── Redis ────────────────────────────────────────────────
REDIS_URL=redis://cache:6379

# ── Mail (Mailpit dev inbox, swap for real SMTP in prod) ─
SMTP_HOST=mail
SMTP_PORT=1025

# ── App ──────────────────────────────────────────────────
PORT=3000
NODE_ENV=production
SCHOOL_TIMEZONE=America/Los_Angeles
EOF

  chown "$RUN_USER":"$RUN_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  success ".env created at $ENV_FILE"
  info "  DB password   : ${DB_PASSWORD:0:8}... (auto-generated)"
  info "  Session secret: ${SESSION_SECRET:0:8}... (auto-generated)"
fi

# docker-compose.yml reads POSTGRES_PASSWORD / POSTGRES_USER / POSTGRES_DB
# from the .env we just generated, so no patching is needed.

# ═══════════════════════════════════════════════════════════════════════════════
# Step 6 — Initial Docker build + up
# ═══════════════════════════════════════════════════════════════════════════════
header "Step 6 — Initial Docker build"

info "Building and starting containers (this may take a few minutes)..."
cd "$INSTALL_DIR"
sudo -u "$RUN_USER" docker compose up -d --build

info "Waiting for API health check..."
for i in {1..40}; do
  if sudo -u "$RUN_USER" docker compose exec -T api \
       wget -qO- http://localhost:3000/api/health &>/dev/null 2>&1; then
    success "API is healthy."
    break
  fi
  if [[ $i -eq 40 ]]; then
    warn "API health check timed out. Check logs: docker compose -f $INSTALL_DIR/docker-compose.yml logs api"
  fi
  sleep 3
done

success "Stack is running on port 8090."

# ═══════════════════════════════════════════════════════════════════════════════
# Step 7 — Install systemd service
# ═══════════════════════════════════════════════════════════════════════════════
header "Step 7 — Systemd service"

SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
SERVICE_TEMPLATE="${INSTALL_DIR}/scripts/${SERVICE_NAME}.service"

if [[ ! -f "$SERVICE_TEMPLATE" ]]; then
  error "Service template not found at $SERVICE_TEMPLATE — repo may be out of date."
fi

# Copy canonical template, then patch User/paths/POLL_INTERVAL to match this install.
cp "$SERVICE_TEMPLATE" "$SERVICE_FILE"
sed -i \
  -e "s|^User=.*|User=${RUN_USER}|" \
  -e "s|^WorkingDirectory=.*|WorkingDirectory=${INSTALL_DIR}|" \
  -e "s|^ExecStart=.*|ExecStart=/bin/bash ${INSTALL_DIR}/scripts/watch-deploy.sh|" \
  -e "s|^Environment=\"POLL_INTERVAL=.*\"|Environment=\"POLL_INTERVAL=${POLL_INTERVAL}\"|" \
  -e "s|^Environment=\"REPO_DIR=.*\"|Environment=\"REPO_DIR=${INSTALL_DIR}\"|" \
  "$SERVICE_FILE"

systemctl daemon-reload
systemctl enable "$SERVICE_NAME" --quiet
systemctl start "$SERVICE_NAME"
sleep 2

if systemctl is-active --quiet "$SERVICE_NAME"; then
  success "Service $SERVICE_NAME is running as user '$RUN_USER' from $INSTALL_DIR."
else
  warn "Service may not have started — check: journalctl -u $SERVICE_NAME -n 50"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Done
# ═══════════════════════════════════════════════════════════════════════════════
header "Installation complete"

SERVER_IP="$(hostname -I | awk '{print $1}')"

echo ""
echo -e "  ${BOLD}DelphiNet 6 is live at:${RESET}"
echo -e "  ${GREEN}http://${SERVER_IP}:8090${RESET}"
echo ""
echo -e "  ${BOLD}Default admin login:${RESET}"
echo -e "    Email   : ari@aricummings.com"
echo -e "    Password: adminpassword"
echo -e "  ${YELLOW}⚠  Change the admin password after first login!${RESET}"
echo ""
echo -e "  ${BOLD}Useful commands:${RESET}"
echo -e "    Logs (live)    : journalctl -u ${SERVICE_NAME} -f"
echo -e "    Stack logs     : docker compose -f ${INSTALL_DIR}/docker-compose.yml logs -f"
echo -e "    Manual deploy  : ${INSTALL_DIR}/scripts/deploy.sh [tag]"
echo -e "    Stop service   : systemctl stop ${SERVICE_NAME}"
echo -e "    Restart service: systemctl restart ${SERVICE_NAME}"
echo ""
echo -e "  ${BOLD}To trigger a deployment, push a new tag:${RESET}"
echo -e "    git tag v1.0.0 && git push origin v1.0.0"
echo ""
