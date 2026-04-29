#!/usr/bin/env bash
# deploy.sh — Pull latest code for a given tag and rebuild the stack.
#
# Usage:
#   ./scripts/deploy.sh [TAG]
#
# If TAG is omitted the latest git tag is used.
# The script is idempotent: running it again with the same tag is safe.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="${REPO_DIR}/scripts/deploy.log"
COMPOSE_FILE="${REPO_DIR}/docker-compose.yml"

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "$msg" | tee -a "$LOG_FILE"
}

cd "$REPO_DIR"

# ── Resolve target tag ────────────────────────────────────────────────────────
TARGET_TAG="${1:-}"
if [[ -z "$TARGET_TAG" ]]; then
  git fetch --tags --force --quiet
  TARGET_TAG="$(git tag --sort=-version:refname | head -n1)"
fi

if [[ -z "$TARGET_TAG" ]]; then
  log "ERROR: No tags found in repository."
  exit 1
fi

log "═══════════════════════════════════════════════"
log "Deploying tag: $TARGET_TAG"
log "═══════════════════════════════════════════════"

# ── Pull the tag ──────────────────────────────────────────────────────────────
log "Fetching origin..."
git fetch --tags --force --quiet

log "Checking out $TARGET_TAG..."
git checkout "$TARGET_TAG" --quiet

# ── Bring stack down (keep volumes intact) ───────────────────────────────────
log "Stopping existing containers..."
docker compose -f "$COMPOSE_FILE" down --remove-orphans

# ── Rebuild and start ─────────────────────────────────────────────────────────
log "Building and starting containers..."
docker compose -f "$COMPOSE_FILE" up -d --build

# ── Health check ──────────────────────────────────────────────────────────────
log "Waiting for API health check..."
for i in {1..30}; do
  if docker compose -f "$COMPOSE_FILE" exec -T api \
       wget -qO- http://localhost:3000/api/health &>/dev/null; then
    log "API is healthy. ✓"
    break
  fi
  if [[ $i -eq 30 ]]; then
    log "ERROR: API failed health check after 60s."
    exit 1
  fi
  sleep 2
done

log "Deployment of $TARGET_TAG complete. ✓"
