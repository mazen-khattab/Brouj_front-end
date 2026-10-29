import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'vite';
import { artifactFiles, releaseInputs, sha256 } from './release-policy.mjs';

const root = resolve(import.meta.dirname, '..');
const inputs = releaseInputs(process.env, process.argv.includes('--rehearsal'));
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const sourceDirty = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim().length > 0;
if (!inputs.rehearsal && sourceDirty) {
  throw new Error('Package a reviewed, committed clean source tree for release. Use --rehearsal for local verification.');
}
execFileSync(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '--noEmit'], { cwd: root, stdio: 'inherit' });
const id = `${new Date().toISOString().replaceAll(/[:.]/g, '-')}-${sourceCommit.slice(0, 8)}${inputs.rehearsal ? '-rehearsal' : ''}`;
const directory = resolve(root, 'artifacts/release', id);
mkdirSync(directory, { recursive: true });

await build({
  root, mode: 'production', envDir: false,
  // Override only named public values, independently of ignored development .env files.
  define: {
    'import.meta.env.VITE_API_ORIGIN': JSON.stringify(inputs.apiOrigin),
    'import.meta.env.VITE_BUSINESS_CURRENCY': JSON.stringify(inputs.businessCurrency),
    'import.meta.env.VITE_MEDIA_ORIGIN': JSON.stringify(''),
  },
  build: { outDir: resolve(directory, 'site'), emptyOutDir: false, sourcemap: false, manifest: true },
});
const files = artifactFiles(resolve(directory, 'site'));
const manifest = {
  schemaVersion: 1, artifactId: id, createdAt: new Date().toISOString(), sourceCommit, sourceDirty,
  node: process.version, npm: JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).packageManager,
  lockSha256: sha256(readFileSync(resolve(root, 'package-lock.json'))), inputs, files,
  // Packaging never proves real sessions, staging configuration or release authorization.
  releaseAuthorization: 'Required separately after verification; this command never deploys.',
};
writeFileSync(resolve(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(resolve(root, 'artifacts/release/latest.json'), JSON.stringify({ directory: relativeToRoot(directory), rehearsal: inputs.rehearsal }, null, 2) + '\n');
console.log(`Artifact: ${relativeToRoot(directory)} (${inputs.rehearsal ? 'REHEARSAL ONLY; not release approval' : 'packaged; deployment still requires approval'})`);

function relativeToRoot(path) {
  return path.slice(root.length + 1).replaceAll('\\', '/');
}
