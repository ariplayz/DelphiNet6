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

REPO_PRE_EXISTED=0
if [[ -d "$INSTALL_DIR/.git" ]]; then
  REPO_PRE_EXISTED=1
  info "Repo already exists at $INSTALL_DIR — fetching latest..."
  # --prune --prune-tags removes locally-cached tags that no longer exist
  # on the remote and forces moved tags to refresh, so we never get stuck on
  # an outdated "latest" tag from a previous install.
  sudo -u "$RUN_USER" git -C "$INSTALL_DIR" fetch --tags --force --prune --prune-tags origin
  success "Repo updated."
else
  info "Cloning $REPO_URL → $INSTALL_DIR ..."
  git clone "$REPO_URL" "$INSTALL_DIR"
  chown -R "$RUN_USER":"$RUN_USER" "$INSTALL_DIR"
  success "Repo cloned."
fi

# Checkout latest tag (semver-sorted, GitHub's CDN may take a few seconds to
# propagate so list everything we have).
LATEST_TAG="$(git -C "$INSTALL_DIR" tag --list 'v*' --sort=-version:refname | head -n1)"
if [[ -z "$LATEST_TAG" ]]; then
  warn "No tags found — staying on default branch (main)."
  LATEST_TAG="main"
  sudo -u "$RUN_USER" git -C "$INSTALL_DIR" checkout main --quiet
  sudo -u "$RUN_USER" git -C "$INSTALL_DIR" reset --hard origin/main --quiet
else
  info "Checking out latest tag: $LATEST_TAG"
  # Discard any local edits before switching (e.g. stale tsbuildinfo files)
  sudo -u "$RUN_USER" git -C "$INSTALL_DIR" reset --hard --quiet
  sudo -u "$RUN_USER" git -C "$INSTALL_DIR" checkout --force "$LATEST_TAG" --quiet
  success "At tag: $LATEST_TAG"
fi

# Record the previously deployed tag (if any) so Step 5 can decide whether
# to wipe the Postgres volume due to a known-broken prior tag.
if [[ -f "$INSTALL_DIR/scripts/.deployed-tag" ]]; then
  cp -f "$INSTALL_DIR/scripts/.deployed-tag" "$INSTALL_DIR/scripts/.deployed-tag.previous"
fi

# Save the deployed tag so the watcher doesn't redeploy immediately
echo "$LATEST_TAG" > "$INSTALL_DIR/scripts/.deployed-tag"
chown "$RUN_USER":"$RUN_USER" "$INSTALL_DIR/scripts/.deployed-tag"

# ═══════════════════════════════════════════════════════════════════════════════
# Step 5 — Create .env
# ═══════════════════════════════════════════════════════════════════════════════
header "Step 5 — Environment configuration"

ENV_FILE="$INSTALL_DIR/.env"

# Detect a stale Postgres volume from a prior failed install. Postgres only
# initialises POSTGRES_PASSWORD on first start, so if the volume already
# exists with one password and we (re)generate a *new* random password in
# .env, the API will fail to authenticate forever. We auto-recover by
# wiping the volume in any of these situations:
#   1. .env is missing but a Postgres volume already exists.
#   2. The previously deployed tag was v0.1, which shipped with a hardcoded
#      'delphinet' password that doesn't match the random one in .env.
#   3. The caller passed FRESH_INSTALL=1.
WIPE_DB_VOLUME=0
PG_VOLUME_NAME="$(basename "$INSTALL_DIR")_postgres_data"
PREV_DEPLOYED_TAG=""
if [[ -f "$INSTALL_DIR/scripts/.deployed-tag.previous" ]]; then
  PREV_DEPLOYED_TAG="$(cat "$INSTALL_DIR/scripts/.deployed-tag.previous" 2>/dev/null || echo "")"
fi

if [[ ! -f "$ENV_FILE" ]] && docker volume inspect "$PG_VOLUME_NAME" &>/dev/null; then
  warn "Found Postgres volume ($PG_VOLUME_NAME) but no .env."
  warn "The DB password we generated won't match — wiping the volume."
  WIPE_DB_VOLUME=1
fi

if [[ "$PREV_DEPLOYED_TAG" == "v0.1" ]] && docker volume inspect "$PG_VOLUME_NAME" &>/dev/null; then
  warn "Previous deploy was v0.1 (hardcoded DB password)."
  warn "Wiping Postgres volume so the v0.1.1+ generated password takes effect."
  WIPE_DB_VOLUME=1
fi

if [[ "${FRESH_INSTALL:-0}" == "1" ]]; then
  warn "FRESH_INSTALL=1 — wiping all DelphiNet docker volumes."
  WIPE_DB_VOLUME=1
  rm -f "$ENV_FILE"
fi

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
# Step 6 — Install systemd service (BEFORE the initial build so the auto-deploy
# watcher exists even if the first build fails — it will pick up the next tag
# and try again automatically).
# ═══════════════════════════════════════════════════════════════════════════════
header "Step 6 — Systemd auto-deploy service"

install_systemd_service() {
  local service_file="/etc/systemd/system/${SERVICE_NAME}.service"
  local service_template="${INSTALL_DIR}/scripts/${SERVICE_NAME}.service"

  if [[ ! -f "$service_template" ]]; then
    error "Service template not found at $service_template — repo may be out of date."
  fi

  cp "$service_template" "$service_file"
  sed -i \
    -e "s|^User=.*|User=${RUN_USER}|" \
    -e "s|^WorkingDirectory=.*|WorkingDirectory=${INSTALL_DIR}|" \
    -e "s|^ExecStart=.*|ExecStart=/bin/bash ${INSTALL_DIR}/scripts/watch-deploy.sh|" \
    -e "s|^Environment=\"POLL_INTERVAL=.*\"|Environment=\"POLL_INTERVAL=${POLL_INTERVAL}\"|" \
    -e "s|^Environment=\"REPO_DIR=.*\"|Environment=\"REPO_DIR=${INSTALL_DIR}\"|" \
    "$service_file"

  # Make sure the watcher's state/log files are writable by RUN_USER.
  install -d -o "$RUN_USER" -g "$RUN_USER" "${INSTALL_DIR}/scripts"
  touch "${INSTALL_DIR}/scripts/deploy.log"
  chown "$RUN_USER":"$RUN_USER" "${INSTALL_DIR}/scripts/deploy.log"

  systemctl daemon-reload
  systemctl enable "$SERVICE_NAME" --quiet
  systemctl restart "$SERVICE_NAME"
  sleep 2

  if systemctl is-active --quiet "$SERVICE_NAME"; then
    success "Service $SERVICE_NAME is running as user '$RUN_USER' from $INSTALL_DIR."
  else
    warn "Service may not have started — check: journalctl -u $SERVICE_NAME -n 50"
  fi
}

install_systemd_service

# ═══════════════════════════════════════════════════════════════════════════════
# Step 7 — Initial Docker build + up
# ═══════════════════════════════════════════════════════════════════════════════
header "Step 7 — Initial Docker build"

info "Building and starting containers (this may take a few minutes)..."
cd "$INSTALL_DIR"

# Always bring the stack down before rebuilding so we pick up new images
# cleanly. If we detected a stale Postgres volume above, also wipe volumes.
if [[ "$WIPE_DB_VOLUME" -eq 1 ]]; then
  info "Tearing down stack and wiping volumes..."
  sudo -u "$RUN_USER" docker compose down -v --remove-orphans 2>/dev/null || true
else
  sudo -u "$RUN_USER" docker compose down --remove-orphans 2>/dev/null || true
fi

start_stack() {
  # Non-fatal: if the build/up fails the auto-deploy watcher (already installed
  # in Step 6) will retry on the next tag, so we don't want a transient build
  # error to abort the rest of the install.
  sudo -u "$RUN_USER" docker compose up -d --build || return 1
}

probe_db_auth() {
  # Returns 0 if the DB accepts the credentials in .env, 1 otherwise.
  # We give the DB up to ~30 s to start.
  local pw
  pw="$(grep -E '^POSTGRES_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)"
  for _ in {1..15}; do
    if sudo -u "$RUN_USER" docker compose exec -T -e PGPASSWORD="$pw" db \
         psql -U delphinet -d delphinet -c 'SELECT 1' &>/dev/null; then
      return 0
    fi
    sleep 2
  done
  return 1
}

BUILD_OK=1
if ! start_stack; then
  BUILD_OK=0
  warn "Initial docker build/up failed."
  warn "The ${SERVICE_NAME} watcher is installed and will retry automatically"
  warn "on the next git tag. To rebuild manually now:"
  warn "    cd $INSTALL_DIR && sudo -u $RUN_USER docker compose up -d --build"
fi

if [[ "$BUILD_OK" -eq 1 ]]; then
  info "Verifying database credentials..."
  if ! probe_db_auth; then
    warn "DB authentication failed — Postgres volume has a stale password."
    warn "Wiping the volume and reinitialising..."
    sudo -u "$RUN_USER" docker compose down -v --remove-orphans 2>/dev/null || true
    start_stack || BUILD_OK=0
    if [[ "$BUILD_OK" -eq 1 ]] && ! probe_db_auth; then
      warn "DB still rejecting credentials after wipe. Showing logs:"
      sudo -u "$RUN_USER" docker compose logs --tail=40 db 2>&1 || true
    elif [[ "$BUILD_OK" -eq 1 ]]; then
      success "DB credentials accepted after volume wipe."
    fi
  else
    success "DB credentials OK."
  fi

  info "Waiting for API health check (up to 2 min)..."
  API_HEALTHY=0
  for i in {1..40}; do
    if sudo -u "$RUN_USER" docker compose exec -T api \
         wget -qO- http://localhost:3000/api/health &>/dev/null 2>&1; then
      API_HEALTHY=1
      success "API is healthy."
      break
    fi
    sleep 3
  done

  if [[ "$API_HEALTHY" -eq 0 ]]; then
    warn "API health check timed out. Last 80 lines of API logs:"
    echo "─────────────────────────────────────────────────────────────"
    sudo -u "$RUN_USER" docker compose logs --tail=80 api 2>&1 || true
    echo "─────────────────────────────────────────────────────────────"
    warn "If the error mentions Postgres auth, run:"
    warn "    FRESH_INSTALL=1 sudo bash $INSTALL_DIR/scripts/server-install.sh"
    warn "The auto-deploy watcher will retry on the next git tag."
  else
    success "Stack is running on port 8090."
  fi
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
