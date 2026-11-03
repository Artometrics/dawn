#!/bin/bash
set -euo pipefail
if [[ -f /etc/dawn-code/env ]]; then
  set -a
  # shellcheck disable=SC1091
  source /etc/dawn-code/env
  set +a
fi
install -d -m 0700 "${DAWN_CODE_DATA:-/var/lib/dawn-code}"
exec /usr/bin/node /opt/dawn-code/dist/gateway.cjs
