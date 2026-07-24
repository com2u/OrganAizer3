#!/bin/sh
set -eu

PROJECT_DIR="/data/hyperframes/projects/${HYPERFRAMES_PROJECT:-default}"
mkdir -p "$PROJECT_DIR" /data/hyperframes/assets /data/hyperframes/output
if [ ! -f "$PROJECT_DIR/index.html" ]; then
  cp /opt/hyperframes-seed/index.html "$PROJECT_DIR/index.html"
fi
ln -sfn /data/hyperframes/assets "$PROJECT_DIR/assets"
ln -sfn /data/hyperframes/output "$PROJECT_DIR/output"
cd "$PROJECT_DIR"
node /opt/hyperframes-forwarder.mjs &
exec hyperframes preview --port 3003 --no-open --force-new .
