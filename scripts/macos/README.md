# macOS Maintenance Scripts

## Volume Backup (`backup-openclaw-volumes.sh`)

Daily backup of all `openclaw-*` Podman volumes to `~/openclaw-backups/`.
Keeps 7 days of backups and auto-prunes older ones.

### Install (one-time)

```bash
# Install the backup script to a fixed path
sudo cp scripts/macos/backup-openclaw-volumes.sh /usr/local/bin/openclaw-backup.sh
sudo chmod +x /usr/local/bin/openclaw-backup.sh

# Install and load the launchd agent
cp scripts/macos/ai.openclaw.backup.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/ai.openclaw.backup.plist
```

Runs automatically every day at 2:00 AM. Logs go to `/tmp/openclaw-backup.log`.

### Run manually

```bash
bash scripts/macos/backup-openclaw-volumes.sh
```

### Test the launchd job immediately

```bash
launchctl kickstart gui/$(id -u)/ai.openclaw.backup
tail -f /tmp/openclaw-backup.log
```

### Check logs

```bash
tail -f /tmp/openclaw-backup.log
tail -f /tmp/openclaw-backup.error.log
```

### Uninstall

```bash
launchctl bootout gui/$(id -u)/ai.openclaw.backup
rm ~/Library/LaunchAgents/ai.openclaw.backup.plist
sudo rm /usr/local/bin/openclaw-backup.sh
```

### Restore a volume

```bash
podman volume import openclaw-<prefix>-<name>-data \
  ~/openclaw-backups/openclaw-<prefix>-<name>-data-<date>.tar
```
