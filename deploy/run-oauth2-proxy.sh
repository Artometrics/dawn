#!/bin/bash
# Maps Dawn's env names onto the ones oauth2-proxy reads.
set -euo pipefail
if [[ -f /etc/dawn/oauth.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source /etc/dawn/oauth.env
  set +a
fi
export OAUTH2_PROXY_CLIENT_ID="${OAUTH2_PROXY_CLIENT_ID:-${GOOGLE_CLIENT_ID:-}}"
export OAUTH2_PROXY_CLIENT_SECRET="${OAUTH2_PROXY_CLIENT_SECRET:-${GOOGLE_CLIENT_SECRET:-}}"
if [[ -z "${OAUTH2_PROXY_CLIENT_ID}" || -z "${OAUTH2_PROXY_CLIENT_SECRET}" || -z "${OAUTH2_PROXY_COOKIE_SECRET:-}" ]]; then
  echo "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and OAUTH2_PROXY_COOKIE_SECRET are required." >&2
  exit 1
fi
exec /usr/local/bin/oauth2-proxy --config=/etc/dawn/oauth2-proxy.cfg
