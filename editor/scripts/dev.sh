#!/bin/bash
# Run the gateway and OpenVSCode Server on this machine. Mock answers unless keys are set.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export DAWN_CODE_TOKEN="${DAWN_CODE_TOKEN:-dev-dawn-code-token}"
export DAWN_CODE_MOCK="${DAWN_CODE_MOCK:-1}"
export DAWN_CODE_MOCK_DELAY_MS="${DAWN_CODE_MOCK_DELAY_MS:-18}"
export DAWN_CODE_DATA="${DAWN_CODE_DATA:-$ROOT/data}"
export DAWN_CODE_HOST="${DAWN_CODE_HOST:-127.0.0.1}"
export DAWN_CODE_PORT="${DAWN_CODE_PORT:-8791}"
export DAWN_CODE_DEMO="${DAWN_CODE_DEMO:-1}"
export DAWN_AGENTS_URL="${DAWN_AGENTS_URL:-http://127.0.0.1:8787}"
export DAWN_TRAINING_LOG_URL="${DAWN_TRAINING_LOG_URL:-}"
export OPENVSCODE_PORT="${OPENVSCODE_PORT:-3000}"

if [[ ! -f dist/gateway.cjs || ! -f dist/dawn-code.vsix ]]; then
  npm run package
fi

CACHE="${OPENVSCODE_HOME:-/tmp/dawn-code-cache/openvscode-server-v1.109.5-linux-x64}"
if [[ ! -x "$CACHE/bin/openvscode-server" ]]; then
  mkdir -p /tmp/dawn-code-cache
  tarball="/tmp/dawn-code-cache/openvscode-server-v1.109.5-linux-x64.tar.gz"
  if [[ ! -f "$tarball" ]]; then
    curl -fL -o "$tarball" "https://github.com/gitpod-io/openvscode-server/releases/download/openvscode-server-v1.109.5/openvscode-server-v1.109.5-linux-x64.tar.gz"
  fi
  tar -xzf "$tarball" -C /tmp/dawn-code-cache
fi

SERVER_DATA="$ROOT/data/vscode"
mkdir -p "$SERVER_DATA"
"$CACHE/bin/openvscode-server" --install-extension "$ROOT/dist/dawn-code.vsix" --force --server-data-dir "$SERVER_DATA" >/tmp/dawn-code-install.log
mkdir -p "$SERVER_DATA/data/User" "$SERVER_DATA/User"
cp "$ROOT/deploy/settings.json" "$SERVER_DATA/data/User/settings.json"
cp "$ROOT/deploy/settings.json" "$SERVER_DATA/User/settings.json"

if ! curl -fsS "http://127.0.0.1:${DAWN_CODE_PORT}/health" >/dev/null 2>&1; then
  node "$ROOT/dist/gateway.cjs" >/tmp/dawn-code-gateway.log 2>&1 &
  echo $! > /tmp/dawn-code-gateway.pid
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    curl -fsS "http://127.0.0.1:${DAWN_CODE_PORT}/health" >/dev/null 2>&1 && break
    sleep 0.2
  done
fi

WORKSPACE="$(cd "$ROOT/.." && pwd)"
exec "$CACHE/bin/openvscode-server" \
  --host 127.0.0.1 \
  --port "$OPENVSCODE_PORT" \
  --server-base-path /editor \
  --without-connection-token \
  --accept-server-license-terms \
  --server-data-dir "$SERVER_DATA" \
  --default-folder "$WORKSPACE"
