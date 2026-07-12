#!/bin/bash
#
# update_all.sh
# Updates the full OrganAIzer deployment:
#   1. Backend  -> AI backend server (167.235.156.114, Docker container)
#   2. Frontend -> 1&1 / ionos hosting
#
set -e

# Always run from the project root (directory of this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "########################################"
echo "#  OrganAIzer - Full Deployment Update  "
echo "########################################"

echo ""
echo ">>> [1/2] Updating BACKEND (AI server 167.235.156.114) ..."
./upload_backend.sh

echo ""
echo ">>> [2/2] Updating FRONTEND (1&1 / ionos) ..."
./upload_frontend.sh

echo ""
echo "=== All systems updated successfully ==="
