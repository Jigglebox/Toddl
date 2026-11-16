#!/usr/bin/env bash
# Stamp the build's git sha into the web app, so the service worker's
# cache name changes with every build and the grown-ups' Update button
# can tell the running version from the newest one on the server.
# Run by CI before deploying/syncing; harmless to run twice.
set -euo pipefail
cd "$(dirname "$0")/.."
V="${1:-$(git rev-parse --short=7 HEAD)}"
sed -i.bak "s/__TODDL_VERSION__/$V/g" www/index.html www/sw.js
rm -f www/index.html.bak www/sw.js.bak
printf '{"version":"%s","built":"%s"}\n' "$V" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > www/version.json
echo "stamped $V"
