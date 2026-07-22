#!/usr/bin/env bash
cd "$(dirname "$0")/game"
PORT="${1:-9321}"
echo "Starting Barbarian VS Mummy at http://localhost:${PORT}/index.html"
python3 -m http.server "$PORT"
