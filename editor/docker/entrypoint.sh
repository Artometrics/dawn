#!/bin/bash
set -euo pipefail
SERVER="/home/.openvscode-server/bin/openvscode-server"
if [[ ! -x "$SERVER" ]]; then
  SERVER="$(command -v openvscode-server)"
fi
"$SERVER" --install-extension /opt/dawn-code.vsix --force || true
exec "$SERVER" \
  --host 0.0.0.0 \
  --port 3000 \
  --server-base-path /editor \
  --without-connection-token \
  --accept-server-license-terms \
  --default-folder /home/workspace
