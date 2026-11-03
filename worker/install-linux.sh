#!/usr/bin/env bash
# Install the Dawn Agents worker on Ubuntu 24.04 (a Hetzner VM or any Linux host).
# The worker dials the gateway. It does not open a port.
# No Hetzner password belongs in this script. You fill in the gateway URL and
# the shared DAWN_WORKER_TOKEN after install.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo ./install-linux.sh"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 22 or newer is required. Install it, then re-run this script."
  exit 1
fi

if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)'; then
  echo "Node.js 22 or newer is required. This machine has $(node -v)."
  exit 1
fi

NODE_BIN="$(command -v node)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! id dawn-agents >/dev/null 2>&1; then
  useradd --system --create-home --home-dir /var/lib/dawn-agents --shell /usr/sbin/nologin dawn-agents
fi

install -d -o dawn-agents -g dawn-agents -m 0750 /var/lib/dawn-agents
install -d -o dawn-agents -g dawn-agents -m 0750 /var/lib/dawn-agents/sandboxes
install -d -m 0755 /opt/dawn-agents
install -d -m 0750 /etc/dawn-agents

install -m 0644 "$SCRIPT_DIR/dawn-worker.mjs" /opt/dawn-agents/dawn-worker.mjs
install -m 0644 "$SCRIPT_DIR/sandbox.mjs" /opt/dawn-agents/sandbox.mjs

if [[ ! -f /etc/dawn-agents/worker.env ]]; then
  cat > /etc/dawn-agents/worker.env << 'EOF'
# Gateway the worker dials. Nothing on this machine needs to accept connections.
DAWN_AGENTS_URL=https://your-dawn-agents-gateway.example
# Same value as DAWN_WORKER_TOKEN on the gateway. Not a server password.
DAWN_WORKER_TOKEN=
DAWN_WORKER_KIND=linux
DAWN_AGENTS_HOME=/var/lib/dawn-agents/sandboxes
EOF
  chown root:dawn-agents /etc/dawn-agents/worker.env
  chmod 0640 /etc/dawn-agents/worker.env
  echo "Wrote /etc/dawn-agents/worker.env"
  echo "Set DAWN_AGENTS_URL and DAWN_WORKER_TOKEN, then: systemctl restart dawn-agents"
fi

sed "s#/usr/bin/node#${NODE_BIN}#" "$SCRIPT_DIR/dawn-agents.service" > /etc/systemd/system/dawn-agents.service
chmod 0644 /etc/systemd/system/dawn-agents.service
systemctl daemon-reload
systemctl enable dawn-agents.service
echo "Enabled dawn-agents.service (outbound worker, user dawn-agents)."
echo "When the env file is filled in: systemctl restart dawn-agents && systemctl status dawn-agents"
