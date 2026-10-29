import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { artifactFiles } from './release-policy.mjs';

const root = resolve(import.meta.dirname, '..');
const selected = process.argv[2] ?? JSON.parse(readFileSync(resolve(root, 'artifacts/release/latest.json'), 'utf8')).directory;
const directory = resolve(root, selected);
const within = relative(resolve(root, 'artifacts/release'), directory);
assert(!isAbsolute(within) && within !== '..' && !within.startsWith(`..${sep}`), 'Select a workspace release artifact.');
const manifest = JSON.parse(readFileSync(resolve(directory, 'manifest.json'), 'utf8'));
assert.equal(manifest.inputs.apiOrigin, 'https://api.brouj.com');
assert.deepEqual(artifactFiles(resolve(directory, 'site')), manifest.files, 'Artifact content differs from its manifest.');
for (const file of manifest.files) {
  assert(!/\.(map|pem|key|pfx)$|(^|\/)\.env/.test(file.path), 'Private/debug material in artifact.');
  if (/\.(js|html)$/.test(file.path)) {
    const source = readFileSync(resolve(directory, 'site', file.path), 'utf8');
    assert(!/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|AKIA[0-9A-Z]{16}|eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(source), `Credential-shaped literal in ${file.path}`);
    // The environment validator retains its inert development default. Reject an actual
    // compiled localhost input, rather than mistaking that tested fallback for configuration.
    assert(!/VITE_API_ORIGIN\s*:\s*['"`]https:\/\/localhost|__showcase|__auth|AuthPreview|ComponentShowcase|captureEvents|captureStatuses|BROUJ_UNEXPECTED_PUBLIC_SENTINEL/.test(source), `Development input/fixture in ${file.path}`);
  }
}
console.log(`PASS: ${manifest.files.length} artifact files match SHA-256 inventory; production API origin and fixture exclusion checked. Rehearsal=${manifest.inputs.rehearsal}.`);
