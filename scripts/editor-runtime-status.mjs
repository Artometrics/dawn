/**
 * Truthful editor status. Exit 0 even when the binaries are absent.
 * OpenVSCode Server is not vendored. editor/scripts/dev.sh downloads it
 * and starts dist/gateway.cjs only after npm run package.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const report = {
  openvscodeBundled: existsSync('/tmp/dawn-code-cache/openvscode-server-v1.109.5-linux-x64/bin/openvscode-server'),
  openvscodeInRepo: false,
  gatewayBundle: existsSync(path.join(root, 'editor/dist/gateway.cjs')),
  devScript: 'editor/scripts/dev.sh',
  devScriptDefault: 'DAWN_CODE_MOCK=1 downloads OpenVSCode if missing, then starts the code gateway. It is not running unless that script has been executed.',
  dawnFileEditor: '/editor saves page.txt through the owner desk. It is not OpenVSCode.',
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
