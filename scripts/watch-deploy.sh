#!/usr/bin/env bash
# watch-deploy.sh — Daemon that polls for new git tags and auto-deploys.
#
# How it works:
#   1. Every POLL_INTERVAL seconds, fetch tags from origin.
#   2. Compare the latest tag to the last deployed tag (stored in .deployed-tag).
#   3. If a newer tag exists, call deploy.sh.
#
# Usage:
#   ./scripts/watch-deploy.sh            # run in foreground (Ctrl-C to stop)
#   ./scripts/watch-deploy.sh &          # run in background
#
# Managed automatically by the systemd service (delphinet-deploy.service).
#
# Configuration via environment variables:
#   POLL_INTERVAL   — seconds between checks  (default: 30)
#   REPO_DIR        — repository root         (default: parent of this script)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="${REPO_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
POLL_INTERVAL="${POLL_INTERVAL:-30}"
STATE_FILE="${REPO_DIR}/scripts/.deployed-tag"
LOG_FILE="${REPO_DIR}/scripts/deploy.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# ── Read the last deployed tag ────────────────────────────────────────────────
last_deployed_tag() {
  if [[ -f "$STATE_FILE" ]]; then
    cat "$STATE_FILE"
  else
    # Bootstrap: treat current checkout as already deployed
    git -C "$REPO_DIR" describe --tags --abbrev=0 2>/dev/null || echo ""
  fi
}

# ── Write the deployed tag ────────────────────────────────────────────────────
save_deployed_tag() {
  echo "$1" > "$STATE_FILE"
}

# ── Get the latest remote tag (semver-sorted) ────────────────────────────────
latest_remote_tag() {
  git -C "$REPO_DIR" fetch --tags --force --quiet 2>/dev/null
  git -C "$REPO_DIR" tag --sort=-version:refname 2>/dev/null | head -n1
}

# ── Compare two version tags (returns 0 if $1 < $2, i.e. new is newer) ───────
is_newer() {
  local current="$1"
  local candidate="$2"

  # Treat empty current as "nothing deployed yet" → always deploy
  if [[ -z "$current" ]]; then return 0; fi
  if [[ "$current" == "$candidate" ]]; then return 1; fi

  # Sort the two tags; if candidate comes after current it is newer
  local newest
  newest="$(printf '%s\n%s\n' "$current" "$candidate" \
    | sort -V | tail -n1)"
  [[ "$newest" == "$candidate" ]]
}

# ── Main loop ─────────────────────────────────────────────────────────────────
log "watch-deploy started (repo=$REPO_DIR, interval=${POLL_INTERVAL}s)"

while true; do
  CURRENT_TAG="$(last_deployed_tag)"
  LATEST_TAG="$(latest_remote_tag)"

  if [[ -z "$LATEST_TAG" ]]; then
    log "No tags found on remote. Waiting..."
  elif is_newer "$CURRENT_TAG" "$LATEST_TAG"; then
    log "New tag detected: $LATEST_TAG (was: ${CURRENT_TAG:-none})"
    if bash "$SCRIPT_DIR/deploy.sh" "$LATEST_TAG"; then
      save_deployed_tag "$LATEST_TAG"
      log "Successfully deployed $LATEST_TAG."
    else
      log "ERROR: deploy.sh failed for tag $LATEST_TAG. Will retry next cycle."
    fi
  else
    log "No new tag (current=$CURRENT_TAG, latest=$LATEST_TAG). Sleeping ${POLL_INTERVAL}s."
  fi

  sleep "$POLL_INTERVAL"
done
