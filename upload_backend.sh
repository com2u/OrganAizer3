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
# Migrate legacy Open Notebook values from the root .env into its private,
# persisted integration configuration. The root .env no longer owns them.
mkdir -p data/integrations data/slidev
ON_ENC=\$(sed -n 's/^OPEN_NOTEBOOK_ENCRYPTION_KEY=//p' .env | tail -1)
ON_PASS=\$(sed -n 's/^OPEN_NOTEBOOK_PASSWORD=//p' .env | tail -1)
ON_DB=\$(sed -n 's/^OPEN_NOTEBOOK_DB_PASSWORD=//p' .env | tail -1)
[ -n \"\$ON_ENC\" ] || ON_ENC=\$(sed -n 's/^OPEN_NOTEBOOK_ENCRYPTION_KEY=//p' data/integrations/open-notebook.env 2>/dev/null | tail -1)
[ -n \"\$ON_PASS\" ] || ON_PASS=\$(sed -n 's/^OPEN_NOTEBOOK_PASSWORD=//p' data/integrations/open-notebook.env 2>/dev/null | tail -1)
[ -n \"\$ON_DB\" ] || ON_DB=\$(sed -n 's/^OPEN_NOTEBOOK_DB_PASSWORD=//p' data/integrations/open-notebook.env 2>/dev/null | tail -1)
[ -n \"\$ON_ENC\" ] || ON_ENC=\$(openssl rand -hex 32)
[ -n \"\$ON_PASS\" ] || ON_PASS=\$(openssl rand -hex 24)
[ -n \"\$ON_DB\" ] || ON_DB=\$(openssl rand -hex 24)
export ON_ENC ON_PASS ON_DB
printf 'OPEN_NOTEBOOK_ENCRYPTION_KEY=%s\nOPEN_NOTEBOOK_PASSWORD=%s\nOPEN_NOTEBOOK_DB_PASSWORD=%s\nOPEN_NOTEBOOK_DB_USER=root\nSURREAL_USER=root\nSURREAL_PASS=%s\nSURREAL_PASSWORD=%s\n' \"\$ON_ENC\" \"\$ON_PASS\" \"\$ON_DB\" \"\$ON_DB\" \"\$ON_DB\" > data/integrations/open-notebook.env
chmod 600 data/integrations/open-notebook.env
python3 -c 'import json,os; p=\"data/integrations/open_notebook.json\"; old=json.load(open(p)) if os.path.exists(p) else {}; old.update({\"enabled\":True,\"public_url\":\"https://open-notebook.ai-server.org\",\"api_url\":\"http://open-notebook:5055\",\"encryption_key\":os.environ[\"ON_ENC\"],\"password\":os.environ[\"ON_PASS\"],\"db_password\":os.environ[\"ON_DB\"]}); open(p,\"w\").write(json.dumps(old,indent=2)+\"\\n\")'
chmod 600 data/integrations/open_notebook.json
python3 -c 'import json,os; p=\"data/integrations/slidev.json\"; old=json.load(open(p)) if os.path.exists(p) else {}; old.update({\"enabled\":True,\"public_url\":\"https://open-notebook.ai-server.org/slidev/\",\"project_name\":old.get(\"project_name\",\"OrganAIzer Präsentation\")}); open(p,\"w\").write(json.dumps(old,ensure_ascii=False,indent=2)+\"\\n\")'
chmod 600 data/integrations/slidev.json
sed -i '/^OPEN_NOTEBOOK_ENCRYPTION_KEY=/d;/^OPEN_NOTEBOOK_PASSWORD=/d;/^OPEN_NOTEBOOK_DB_PASSWORD=/d' .env
[ -f data/slidev/slides.md ] || printf '%s\n' '---' 'theme: default' 'title: OrganAIzer Präsentation' '---' '' '# OrganAIzer Präsentation' '' 'Mit Markdown und Slidev erstellt.' > data/slidev/slides.md
# This host also runs the voice and research stack. Sequential builds avoid
# memory pressure from building the React and Slidev images at the same time.
COMPOSE_PARALLEL_LIMIT=1 docker compose build
docker compose up -d --no-build
# Keep the existing Nginx Proxy Manager connected to the private stack so the
# Open Notebook HTTPS host can reach UI and API without publishing host ports.
if docker container inspect nginxreverse-app-1 >/dev/null 2>&1; then
    docker network connect terminlandschaft_default nginxreverse-app-1 2>/dev/null || true
    docker exec nginxreverse-app-1 mkdir -p /data/nginx/custom
    docker cp deploy/nginx/open-notebook-workspaces.conf nginxreverse-app-1:/data/nginx/custom/open-notebook-workspaces.conf
    PROXY_CONF=\$(docker exec nginxreverse-app-1 sh -c 'grep -l \"server_name open-notebook.ai-server.org\" /data/nginx/proxy_host/*.conf' | head -1)
    if [ -n \"\$PROXY_CONF\" ] && ! docker exec nginxreverse-app-1 grep -q 'open-notebook-workspaces.conf' \"\$PROXY_CONF\"; then
        docker exec nginxreverse-app-1 sed -i '/# Custom/i\\  include /data/nginx/custom/open-notebook-workspaces.conf;' \"\$PROXY_CONF\"
    fi
    docker exec nginxreverse-app-1 nginx -t
    docker exec nginxreverse-app-1 nginx -s reload
fi
echo 'Ensuring SIP trunk and dispatch rule exist...'
docker compose exec -T voice-agent python -m app.setup_sip"

echo ""
echo "=== Done ==="
echo "Backend is running at: http://$REMOTE_HOST:4815"
