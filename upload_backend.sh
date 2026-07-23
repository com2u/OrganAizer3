#!/bin/bash
#
# upload_backend.sh
# Copies the backend (code + Docker setup) to the AI backend server and
# (re)starts the Docker container.
#
# Target: root@167.235.156.114:/home/hermes/OrganAIzer/
#
set -e

# --- Configuration ---
REMOTE_HOST="167.235.156.114"
REMOTE_USER="root"
REMOTE_PASS="PPH2com2u"
REMOTE_DIR="/home/hermes/OrganAIzer"

SSH_OPTS="-o StrictHostKeyChecking=no"

# Always run from the project root (directory of this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== OrganAIzer Backend Upload ==="
echo "Target: $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR"

# --- Check prerequisites ---
if ! command -v sshpass &> /dev/null; then
    echo "Error: sshpass is not installed."
    echo "Install it with: sudo apt-get install sshpass"
    exit 1
fi

SSH="sshpass -p $REMOTE_PASS ssh $SSH_OPTS $REMOTE_USER@$REMOTE_HOST"

# --- Ensure remote directory exists and back up persistent telephony data ---
echo "Ensuring remote directory exists..."
$SSH "set -e
mkdir -p $REMOTE_DIR/data $REMOTE_DIR/persistent-backups
touch $REMOTE_DIR/log.txt
BACKUP_DIR=$REMOTE_DIR/persistent-backups/\$(date +%Y%m%d-%H%M%S)
mkdir -p \"\$BACKUP_DIR\"
for FILE in phonebook.json phonebook.seed.json telephony_calls.json telephony.env; do
    if [ -f \"$REMOTE_DIR/data/\$FILE\" ]; then
        cp -a \"$REMOTE_DIR/data/\$FILE\" \"\$BACKUP_DIR/\$FILE\"
    fi
done"

# Files/dirs that must never be uploaded or deleted on the server.
# Leading slashes in the rsync rules anchor persistent paths at the project root,
# so required image content such as voice/data remains deployable.
PERSISTENT_ROOT_PATHS=(
    ".env"
    "data"
    "log.txt"
    "n8n_data"
    "persistent-backups"
)

# Build artifacts and local-only directories excluded at any depth.
EXCLUDES=(
    ".git"
    "venv"
    ".venv"
    "node_modules"
    "frontend/dist"
    "__pycache__"
    ".ruff_cache"
)

# --- Upload project ---
if command -v rsync &> /dev/null; then
    echo "Uploading project via rsync..."
    RSYNC_EXCLUDES=()
    for e in "${PERSISTENT_ROOT_PATHS[@]}"; do
        RSYNC_EXCLUDES+=(--exclude "/$e")
    done
    for e in "${EXCLUDES[@]}"; do
        RSYNC_EXCLUDES+=(--exclude "$e")
    done
    rsync -az --delete \
        -e "sshpass -p $REMOTE_PASS ssh $SSH_OPTS" \
        "${RSYNC_EXCLUDES[@]}" \
        ./ "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"
else
    echo "rsync not found - falling back to tar over ssh..."
    TAR_EXCLUDES=()
    for e in "${PERSISTENT_ROOT_PATHS[@]}"; do
        TAR_EXCLUDES+=(--exclude="./$e")
    done
    for e in "${EXCLUDES[@]}"; do
        TAR_EXCLUDES+=(--exclude="./$e")
    done
    tar czf - "${TAR_EXCLUDES[@]}" . | \
        $SSH "mkdir -p $REMOTE_DIR && tar xzf - -C $REMOTE_DIR"
fi

echo "Upload complete."

# --- Build & (re)start the Docker container on the server ---
echo "Building and starting the Docker container on the server..."
$SSH "set -e
cd $REMOTE_DIR
# Generate Open Notebook secrets once. Existing values are never replaced.
grep -q '^OPEN_NOTEBOOK_ENCRYPTION_KEY=' .env || echo \"OPEN_NOTEBOOK_ENCRYPTION_KEY=\$(openssl rand -hex 32)\" >> .env
grep -q '^OPEN_NOTEBOOK_PASSWORD=' .env || echo \"OPEN_NOTEBOOK_PASSWORD=\$(openssl rand -hex 24)\" >> .env
grep -q '^OPEN_NOTEBOOK_DB_PASSWORD=' .env || echo \"OPEN_NOTEBOOK_DB_PASSWORD=\$(openssl rand -hex 24)\" >> .env
docker compose up -d --build
# Keep the existing Nginx Proxy Manager connected to the private stack so the
# Open Notebook HTTPS host can reach UI and API without publishing host ports.
if docker container inspect nginxreverse-app-1 >/dev/null 2>&1; then
    docker network connect terminlandschaft_default nginxreverse-app-1 2>/dev/null || true
fi
echo 'Ensuring SIP trunk and dispatch rule exist...'
docker compose exec -T voice-agent python -m app.setup_sip"

echo ""
echo "=== Done ==="
echo "Backend is running at: http://$REMOTE_HOST:4815"
