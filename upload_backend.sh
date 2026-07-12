#!/bin/bash
#
# upload_backend.sh
# Copies the backend (code + Docker setup) to the AI backend server and
# (re)starts the Docker container.
#
# Target: root@167.235.156.114:/root/OrganAIzer/
#
set -e

# --- Configuration ---
REMOTE_HOST="167.235.156.114"
REMOTE_USER="root"
REMOTE_PASS="PPH2com2u"
REMOTE_DIR="/root/OrganAIzer"

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

# --- Ensure remote directory exists ---
echo "Ensuring remote directory exists..."
$SSH "mkdir -p $REMOTE_DIR/data && touch $REMOTE_DIR/log.txt"

# Files/dirs that must NOT be uploaded (build artifacts, local data, secrets store)
EXCLUDES=(
    ".git"
    "venv"
    ".venv"
    "node_modules"
    "frontend/dist"
    "__pycache__"
    ".ruff_cache"
    "data"
    "log.txt"
)

# --- Upload project ---
if command -v rsync &> /dev/null; then
    echo "Uploading project via rsync..."
    RSYNC_EXCLUDES=()
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
    for e in "${EXCLUDES[@]}"; do
        TAR_EXCLUDES+=(--exclude="./$e")
    done
    tar czf - "${TAR_EXCLUDES[@]}" . | \
        $SSH "mkdir -p $REMOTE_DIR && tar xzf - -C $REMOTE_DIR"
fi

echo "Upload complete."

# --- Build & (re)start the Docker container on the server ---
echo "Building and starting the Docker container on the server..."
$SSH "cd $REMOTE_DIR && docker compose up -d --build"

echo ""
echo "=== Done ==="
echo "Backend is running at: http://$REMOTE_HOST:4815"
