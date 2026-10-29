import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { securityHeaders, staticResponse } from '../../scripts/hosting-policy.mjs';
import { releaseInputs } from '../../scripts/release-policy.mjs';

const directory = mkdtempSync(join(tmpdir(), 'brouj-release-'));
const prior = join(directory, 'prior');
const current = join(directory, 'current');
for (const [root, content] of [[prior, 'Prior HTML'], [current, 'Current HTML']]) {
  mkdirSync(join(root, 'assets'), { recursive: true });
  writeFileSync(join(root, 'index.html'), content);
  writeFileSync(join(root, 'assets/app-abcdefgh.js'), 'export const version = 1;');
}
after(() => {
  // Resolve and verify the exact temporary child before recursive cleanup on Windows.
  const target = realpathSync(directory);
  assert.equal(dirname(target), realpathSync(tmpdir()));
  assert.match(basename(target), /^brouj-release-/);
  rmSync(target, { recursive: true, force: true });
});

test('public/account/admin HTML navigation falls back and revalidates; missing assets stay actual noncacheable 404s', () => {
  for (const path of ['/', '/projects/id', '/account/orders/id', '/admin/users/id']) {
    const response = staticResponse(current, path, 'GET', 'text/html');
    assert.equal(response.status, 200);
    assert.equal(response.headers['Cache-Control'], 'no-cache');
    assert.equal(readFileSync(response.file, 'utf8'), 'Current HTML');
  }
  for (const path of ['/assets/missing-abcdefgh.js', '/assets/no-extension', '/favicon.png', '/missing.css']) {
    const response = staticResponse(current, path, 'GET', 'text/html');
    assert.equal(response.status, 404);
    assert.equal(response.headers['Cache-Control'], 'no-store');
  }
});

test('hashed assets are immutable and HEAD has the same resource semantics', () => {
  for (const method of ['GET', 'HEAD']) {
    const response = staticResponse(current, '/assets/app-abcdefgh.js', method);
    assert.equal(response.headers['Cache-Control'], 'public, max-age=31536000, immutable');
    assert.match(response.headers['Content-Type'], /javascript/);
  }
});

test('hidden/config/source/API paths, traversal and nonnavigation requests never receive SPA HTML', () => {
  for (const path of ['/.env', '/.vite/manifest.json', '/assets/../../private', '/%2e%2e/private', '/%5cprivate', '/src/main.tsx', '/api/v1/auth/csrf', '/node_modules/file', '/bad%00path']) {
    assert.equal(staticResponse(current, path, 'GET', 'text/html').status, 404);
  }
  assert.equal(staticResponse(current, '/projects', 'GET', 'application/json').status, 404);
  assert.equal(staticResponse(current, '/', 'POST', 'text/html').status, 405);
  assert.equal(staticResponse(current, '/bad%ZZ', 'GET').status, 400);
});

test('switching an artifact root and rolling back restores the matching HTML and caching policy', () => {
  let selected = prior;
  const read = () => staticResponse(selected, '/admin/orders', 'GET', 'text/html');
  assert.equal(readFileSync(read().file, 'utf8'), 'Prior HTML');
  selected = current;
  assert.equal(readFileSync(read().file, 'utf8'), 'Current HTML');
  selected = prior;
  assert.equal(readFileSync(read().file, 'utf8'), 'Prior HTML');
  assert.equal(read().headers['Cache-Control'], 'no-cache');
});

test('SPA CSP permits only the explicit API, bundled resources and local media previews, with no inline script/eval', () => {
  const headers = securityHeaders();
  assert.match(headers['Content-Security-Policy'], /connect-src 'self' https:\/\/api.brouj.com;/);
  assert.match(headers['Content-Security-Policy'], /img-src 'self' data: blob:/);
  assert.doesNotMatch(headers['Content-Security-Policy'], /unsafe-inline|unsafe-eval|https:\/\/\*/);
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  const nginx = readFileSync(new URL('../../deployment/nginx/brouj.conf.example', import.meta.url), 'utf8');
  assert(nginx.includes(headers['Content-Security-Policy']), 'Reference host and rehearsal must use the same reviewed CSP.');
  assert.throws(() => securityHeaders('http://api.brouj.com'));
});

test('release packaging requires explicit production inputs and owner decisions; rehearsal records no approval', () => {
  const env = { VITE_API_ORIGIN: 'https://api.brouj.com', VITE_BUSINESS_CURRENCY: 'EGP' };
  assert.throws(() => releaseInputs({ ...env, VITE_API_ORIGIN: 'https://localhost:7249' }, true));
  assert.throws(() => releaseInputs({ VITE_API_ORIGIN: env.VITE_API_ORIGIN }, true));
  assert.throws(() => releaseInputs({ ...env, VITE_MEDIA_ORIGIN: 'https://media.example.test' }, true));
  assert.throws(() => releaseInputs(env), /approval/);
  assert.equal(releaseInputs(env, true).currencyApproval, null);
  assert.equal(releaseInputs(env, true).mediaApproval, null);
  const approved = releaseInputs({ ...env, BROUJ_CURRENCY_APPROVAL_REFERENCE: 'Owner decision reference', BROUJ_MEDIA_APPROVAL_REFERENCE: 'Placeholder decision reference' });
  assert.equal(approved.rehearsal, false);
});
