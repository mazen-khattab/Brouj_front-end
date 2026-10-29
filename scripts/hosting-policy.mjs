import { existsSync, realpathSync, statSync } from 'node:fs';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';

export function securityHeaders(apiOrigin = 'https://api.brouj.com') {
  const origin = new URL(apiOrigin);
  if (origin.protocol !== 'https:' || origin.origin !== apiOrigin) {
    throw new Error('Hosting CSP requires a validated HTTPS API origin.');
  }
  return {
    'Content-Security-Policy': `default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'none'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ${apiOrigin}; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'`,
    'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}

export const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon',
};

/** Mirror the documented static-host rules; this local server is a rehearsal, not production hosting. */
export function staticResponse(root, rawPath, method = 'GET', accept = '') {
  const rejected = (status) => ({ status, headers: { 'Cache-Control': 'no-store' } });
  if (!['GET', 'HEAD'].includes(method)) {
    return rejected(405);
  }
  let path;
  try {
    path = decodeURIComponent(rawPath.split('?')[0]);
  } catch {
    return rejected(400);
  }
  const controls = [...path].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
  if (!path.startsWith('/') || path.includes('\\') || controls || path.split('/').some((part) => part.startsWith('.'))) {
    return rejected(404);
  }
  if (/^\/(api|src|node_modules)(\/|$)/.test(path)) {
    return rejected(404);
  }
  const candidate = resolve(root, `.${path}`);
  const contained = (file) => {
    const within = relative(realpathSync(root), realpathSync(file));
    return !isAbsolute(within) && within !== '..' && !within.startsWith(`..${sep}`);
  };
  let file = existsSync(candidate) && statSync(candidate).isFile() && contained(candidate) ? candidate : undefined;
  const asset = path.startsWith('/assets/');
  if (!file && !asset && !extname(path) && accept.toLowerCase().includes('text/html')) {
    file = resolve(root, 'index.html');
  }
  if (!file || !existsSync(file) || !contained(file)) {
    return rejected(404);
  }
  const immutable = asset && /-[A-Za-z0-9_-]{8,}\.[^/]+$/.test(file);
  return {
    status: 200, file,
    headers: { 'Content-Type': contentTypes[extname(file)] ?? 'application/octet-stream', 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache' },
  };
}
