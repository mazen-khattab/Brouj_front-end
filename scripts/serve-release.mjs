import { createServer } from 'node:https';
import { readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { loadEnv } from 'vite';
import { securityHeaders, staticResponse } from './hosting-policy.mjs';

const root = resolve(import.meta.dirname, '..');
const pointer = JSON.parse(readFileSync(resolve(root, 'artifacts/release/latest.json'), 'utf8'));
const site = resolve(root, pointer.directory, 'site');
const env = { ...loadEnv('development', root, 'BROUJ_'), ...process.env };

function externalPem(value) {
  if (!value || !isAbsolute(value)) {
    throw new Error('Configure absolute trusted localhost PEM paths outside the repository.');
  }
  const within = relative(realpathSync(root), realpathSync(value));
  if (!isAbsolute(within) && within !== '..' && !within.startsWith(`..${sep}`)) {
    throw new Error('Keep private HTTPS material outside the repository.');
  }
  return readFileSync(value);
}

const server = createServer({ cert: externalPem(env.BROUJ_HTTPS_CERT_FILE), key: externalPem(env.BROUJ_HTTPS_KEY_FILE) }, (request, response) => {
  const result = staticResponse(site, request.url ?? '/', request.method, request.headers.accept);
  response.writeHead(result.status, { ...securityHeaders(), ...result.headers });
  response.end(request.method !== 'HEAD' && result.file ? readFileSync(result.file) : undefined);
});
server.listen(4173, 'localhost', () => console.log('Trusted HTTPS artifact rehearsal at https://localhost:4173 (no request logging).'));

function stop() {
  server.close();
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
