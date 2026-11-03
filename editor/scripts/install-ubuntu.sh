#!/bin/bash
# Install Dawn Code on Ubuntu 24.04. Does not SSH and does not start a public listener
# until /etc/dawn-code/env contains the tokens. Kyle's assistant runs this on the server.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash editor/scripts/install-ubuntu.sh" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PREFIX=/opt/dawn-code
OPENVSCODE_VERSION="${OPENVSCODE_VERSION:-1.109.5}"
NODE_VERSION="${NODE_VERSION:-22.23.4}"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends ca-certificates curl tar xz-utils

if ! id dawncode >/dev/null 2>&1; then
  useradd --system --create-home --home-dir /var/lib/dawn-code --shell /usr/sbin/nologin dawncode
fi
install -d -m 0750 -o dawncode -g dawncode /var/lib/dawn-code /var/lib/dawn-code/vscode /var/lib/dawn-code/workspace

if ! command -v node >/dev/null 2>&1 || ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)'; then
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/node.tar.xz" "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz"
  tar -xJf "$tmp/node.tar.xz" -C /usr/local --strip-components=1
  rm -rf "$tmp"
fi

if ! command -v caddy >/dev/null 2>&1; then
  curl -fsSL "https://github.com/caddyserver/caddy/releases/download/v2.10.2/caddy_2.10.2_linux_amd64.tar.gz" -o /tmp/caddy.tgz
  tar -xzf /tmp/caddy.tgz -C /usr/local/bin caddy
  chmod 0755 /usr/local/bin/caddy
  rm -f /tmp/caddy.tgz
fi

OAUTH2_PROXY_VERSION="${OAUTH2_PROXY_VERSION:-7.7.1}"
if ! command -v oauth2-proxy >/dev/null 2>&1; then
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/oauth2-proxy.tar.gz" \
    "https://github.com/oauth2-proxy/oauth2-proxy/releases/download/v${OAUTH2_PROXY_VERSION}/oauth2-proxy-v${OAUTH2_PROXY_VERSION}.linux-amd64.tar.gz"
  tar -xzf "$tmp/oauth2-proxy.tar.gz" -C "$tmp"
  install -m 0755 "$tmp/oauth2-proxy-v${OAUTH2_PROXY_VERSION}.linux-amd64/oauth2-proxy" /usr/local/bin/oauth2-proxy
  rm -rf "$tmp"
fi
if ! id dawnproxy >/dev/null 2>&1; then
  useradd --system --create-home --home-dir /var/lib/dawn-proxy --shell /usr/sbin/nologin dawnproxy
fi

install -d "$PREFIX/bin" "$PREFIX/dist"
if [[ ! -x "$PREFIX/openvscode-server/bin/openvscode-server" ]]; then
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/openvscode.tar.gz" \
    "https://github.com/gitpod-io/openvscode-server/releases/download/openvscode-server-v${OPENVSCODE_VERSION}/openvscode-server-v${OPENVSCODE_VERSION}-linux-x64.tar.gz"
  tar -xzf "$tmp/openvscode.tar.gz" -C "$tmp"
  rm -rf "$PREFIX/openvscode-server"
  mv "$tmp/openvscode-server-v${OPENVSCODE_VERSION}-linux-x64" "$PREFIX/openvscode-server"
  rm -rf "$tmp"
fi

(cd "$ROOT" && npm ci && npm run package)
install -m 0755 "$ROOT/dist/gateway.cjs" "$PREFIX/dist/gateway.cjs"
install -m 0644 "$ROOT/dist/gateway.cjs.map" "$PREFIX/dist/gateway.cjs.map" || true
install -m 0755 "$ROOT/deploy/run-gateway.sh" "$PREFIX/bin/run-gateway.sh"
install -m 0755 "$ROOT/deploy/run-editor.sh" "$PREFIX/bin/run-editor.sh"

runuser -u dawncode -- "$PREFIX/openvscode-server/bin/openvscode-server" \
  --server-data-dir /var/lib/dawn-code/vscode \
  --install-extension "$ROOT/dist/dawn-code.vsix" \
  --force
install -d -m 0750 -o dawncode -g dawncode /var/lib/dawn-code/vscode/data/User
install -m 0640 -o dawncode -g dawncode "$ROOT/deploy/settings.json" /var/lib/dawn-code/vscode/data/User/settings.json

if [[ ! -f /etc/dawn-code/env ]]; then
  install -d -m 0750 /etc/dawn-code
  install -m 0600 "$ROOT/.env.example" /etc/dawn-code/env
  echo "Wrote /etc/dawn-code/env from the example. Fill the tokens before starting." >&2
fi

install -m 0644 "$ROOT/deploy/dawn-code-gateway.service" /etc/systemd/system/dawn-code-gateway.service
install -m 0644 "$ROOT/deploy/dawn-code.service" /etc/systemd/system/dawn-code.service

# shellcheck disable=SC1091
source /etc/dawn-code/env
REPO_ROOT="$(cd "$ROOT/.." && pwd)"
install -d -m 0750 /etc/dawn
if [[ ! -f /etc/dawn/oauth.env ]]; then
  install -m 0600 "$REPO_ROOT/deploy/oauth.env.example" /etc/dawn/oauth.env
  echo "Wrote /etc/dawn/oauth.env. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and OAUTH2_PROXY_COOKIE_SECRET." >&2
fi
# shellcheck disable=SC1091
source /etc/dawn/oauth.env
allowed="${DAWN_ALLOWED_EMAIL:-kylesmcauliffe@gmail.com,team@artometrics.com}"
# oauth2-proxy wants one address per line. The env value is comma-separated.
: > /etc/dawn/allowed-emails.txt
while IFS= read -r email; do
  email="${email#"${email%%[![:space:]]*}"}"
  email="${email%"${email##*[![:space:]]}"}"
  if [[ -n "$email" ]]; then
    printf '%s\n' "$email" >> /etc/dawn/allowed-emails.txt
  fi
done < <(printf '%s\n' "$allowed" | tr ',' '\n')
chown root:dawnproxy /etc/dawn/allowed-emails.txt /etc/dawn/oauth.env
chmod 0640 /etc/dawn/allowed-emails.txt
chmod 0640 /etc/dawn/oauth.env
install -m 0644 "$REPO_ROOT/deploy/oauth2-proxy.cfg" /etc/dawn/oauth2-proxy.cfg
install -m 0755 "$REPO_ROOT/deploy/run-oauth2-proxy.sh" /usr/local/bin/run-oauth2-proxy
install -m 0644 "$REPO_ROOT/deploy/oauth2-proxy.service" /etc/systemd/system/oauth2-proxy.service

public_host="${DAWN_PUBLIC_HOST:-2-29-173-68.sslip.io}"
static_root="${DAWN_STATIC_ROOT:-/var/lib/dawn/out}"
install -d /etc/caddy
sed -e "s/{\$DAWN_PUBLIC_HOST}/${public_host}/g" -e "s/{\$DAWN_STATIC_ROOT}/${static_root//\//\\/}/g" \
  "$REPO_ROOT/deploy/Caddyfile" > /etc/caddy/Caddyfile
chmod 0644 /etc/caddy/Caddyfile

systemctl daemon-reload
systemctl enable oauth2-proxy.service dawn-code-gateway.service dawn-code.service
if [[ -n "${DAWN_CODE_TOKEN:-}" && -n "${GOOGLE_CLIENT_ID:-}" && -n "${OAUTH2_PROXY_COOKIE_SECRET:-}" ]]; then
  systemctl enable --now oauth2-proxy.service dawn-code-gateway.service dawn-code.service
  if systemctl list-unit-files caddy.service >/dev/null 2>&1; then
    systemctl enable --now caddy.service || caddy reload --config /etc/caddy/Caddyfile || true
  else
    echo "Caddy is installed at /usr/local/bin/caddy. Start it with: caddy start --config /etc/caddy/Caddyfile" >&2
  fi
else
  echo "Units are enabled but not started. Fill /etc/dawn/oauth.env and DAWN_CODE_TOKEN, then start oauth2-proxy, dawn-code-gateway, dawn-code, and caddy." >&2
fi

echo "Dawn Code files are in $PREFIX. Gateway listens on 127.0.0.1:${DAWN_CODE_PORT:-8791}. Editor listens on 127.0.0.1:${OPENVSCODE_PORT:-3000}."
