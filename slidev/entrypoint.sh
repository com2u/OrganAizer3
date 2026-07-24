#!/bin/sh
set -eu

ROOT=/slides
PROJECTS="$ROOT/projects"
ACTIVE="$ROOT/.active-project"
mkdir -p "$PROJECTS"

child=""
cleanup() {
  [ -z "$child" ] || kill "$child" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

while true; do
  project="$(cat "$ACTIVE" 2>/dev/null || true)"
  if [ -z "$project" ]; then
    for candidate in "$PROJECTS"/*; do
      if [ -d "$candidate" ]; then
        project="${candidate##*/}"
        break
      fi
    done
  fi
  if [ -z "$project" ] || [ ! -f "$PROJECTS/$project/slides.md" ]; then
    sleep 2
    continue
  fi
  npx slidev "$PROJECTS/$project/slides.md" --remote --port 3030 --base /slidev/ &
  child=$!
  while kill -0 "$child" 2>/dev/null; do
    sleep 2
    current="$(cat "$ACTIVE" 2>/dev/null || true)"
    if [ "$current" != "$project" ]; then
      kill "$child" 2>/dev/null || true
      wait "$child" 2>/dev/null || true
      child=""
      break
    fi
  done
  [ -z "$child" ] || wait "$child" 2>/dev/null || true
  child=""
done
