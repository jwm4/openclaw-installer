#!/usr/bin/env bash
# Backup all OpenClaw podman volumes to ~/openclaw-backups/
# Keeps the last 7 daily backups per volume, deletes older ones.
#
# Install:
#   sudo cp scripts/macos/backup-openclaw-volumes.sh /usr/local/bin/openclaw-backup.sh
#   sudo chmod +x /usr/local/bin/openclaw-backup.sh
#   cp scripts/macos/ai.openclaw.backup.plist ~/Library/LaunchAgents/
#   launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.openclaw.backup.plist
#
# To run manually:
#   bash scripts/macos/backup-openclaw-volumes.sh
#
# Logs: /tmp/openclaw-backup.log

set -euo pipefail

BACKUP_DIR="$HOME/openclaw-backups"
KEEP_DAYS=7
DATE=$(date +%Y%m%d)
# Common podman install paths on macOS
export PATH="/opt/podman/bin:/usr/local/bin:$PATH"
PODMAN=$(command -v podman || echo "")

if [[ -z "$PODMAN" ]]; then
  echo "[openclaw-backup] ERROR: podman not found in PATH" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

# Find all OpenClaw-managed volumes
VOLUMES=$("$PODMAN" volume ls --format '{{.Name}}' | grep '^openclaw-' || true)

if [[ -z "$VOLUMES" ]]; then
  echo "[openclaw-backup] No openclaw-* volumes found, nothing to back up."
  exit 0
fi

for VOL in $VOLUMES; do
  OUTFILE="$BACKUP_DIR/${VOL}-${DATE}.tar"
  echo "[openclaw-backup] Exporting $VOL -> $OUTFILE"
  "$PODMAN" volume export "$VOL" -o "$OUTFILE"
  echo "[openclaw-backup] Done: $OUTFILE ($(du -sh "$OUTFILE" | cut -f1))"
done

# Prune backups older than KEEP_DAYS days
echo "[openclaw-backup] Pruning backups older than $KEEP_DAYS days..."
find "$BACKUP_DIR" -name 'openclaw-*.tar' -mtime +"$KEEP_DAYS" -delete

echo "[openclaw-backup] Backup complete at $(date)"
