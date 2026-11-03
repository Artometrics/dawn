#!/bin/bash
set -euo pipefail
if [[ -f /etc/dawn-code/env ]]; then
  set -a
  # shellcheck disable=SC1091
  source /etc/dawn-code/env
  set +a
fi
DATA="${DAWN_CODE_SERVER_DATA:-/var/lib/dawn-code/vscode}"
install -d -m 0750 "$DATA"
exec /opt/dawn-code/openvscode-server/bin/openvscode-server \
  --host 127.0.0.1 \
  --port "${OPENVSCODE_PORT:-3000}" \
  --server-base-path /editor \
  --without-connection-token \
  --accept-server-license-terms \
  --server-data-dir "$DATA" \
  --default-folder "${DAWN_CODE_WORKSPACE:-/var/lib/dawn-code/workspace}"
