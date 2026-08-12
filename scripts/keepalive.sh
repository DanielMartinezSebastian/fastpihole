#!/usr/bin/env bash
#
# Watchdog for fastPiHole. Checks that the dashboard answers HTTP requests
# and (re)starts it if it doesn't. Meant to run from cron every minute:
#
#   * * * * * /path/to/pi-hole-fast-dashboard/scripts/keepalive.sh
#
# Safe to run manually too. Uses flock so overlapping cron ticks don't
# start duplicate instances if a restart is still in progress.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/keepalive.log"
PID_FILE="$PROJECT_DIR/.server.pid"
LOCK_FILE="/tmp/fastpihole-keepalive.lock"

mkdir -p "$LOG_DIR"

exec 200>"$LOCK_FILE"
flock -n 200 || exit 0

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >>"$LOG_FILE"
}

DASHBOARD_PORT="$(grep -E '^DASHBOARD_PORT=' "$PROJECT_DIR/.env" 2>/dev/null | cut -d= -f2)"
DASHBOARD_PORT="${DASHBOARD_PORT:-3000}"

is_healthy() {
  curl -fs -o /dev/null --max-time 5 "http://localhost:${DASHBOARD_PORT}/api/auth/check"
}

if is_healthy; then
  exit 0
fi

log "App not responding on port ${DASHBOARD_PORT}. Restarting..."

# If a previous run's process is still alive but unresponsive, kill it
# before starting a fresh one.
if [ -f "$PID_FILE" ]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    log "Killing unresponsive process (PID $OLD_PID)"
    kill -9 "$OLD_PID" 2>/dev/null || true
    sleep 1
  fi
fi

NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
  for candidate in /usr/bin/node /usr/local/bin/node; do
    if [ -x "$candidate" ]; then
      NODE_BIN="$candidate"
      break
    fi
  done
fi
if [ -z "$NODE_BIN" ]; then
  log "ERROR: node binary not found on PATH. Aborting."
  exit 1
fi

cd "$PROJECT_DIR"
nohup "$NODE_BIN" server.js >>"$LOG_FILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" >"$PID_FILE"

sleep 3

if is_healthy; then
  log "App restarted successfully (PID $NEW_PID)"
else
  log "ERROR: app still not responding after restart attempt (PID $NEW_PID) — check $LOG_FILE"
fi
