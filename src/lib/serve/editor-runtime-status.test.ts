import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';

const exec = promisify(execFile);

test('the editor status report does not claim OpenVSCode is running', async () => {
  const { stdout } = await exec(process.execPath, ['scripts/editor-runtime-status.mjs'], { cwd: process.cwd() });
  const report = JSON.parse(stdout) as { openvscodeBundled: boolean; gatewayBundle: boolean; dawnFileEditor: string; processRunning?: boolean };
  assert.equal(report.processRunning, undefined);
  assert.equal(typeof report.openvscodeBundled, 'boolean');
  assert.equal(typeof report.gatewayBundle, 'boolean');
  assert.match(report.dawnFileEditor, /not OpenVSCode/);
});
