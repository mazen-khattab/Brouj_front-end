import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'dist/.vite/manifest.json'), 'utf8'));
function staticImports(key, visited = new Set()) {
  if (visited.has(key)) return visited;
  assert(manifest[key], `Missing build entry: ${key}`);
  visited.add(key);
  for (const dependency of manifest[key].imports ?? []) staticImports(dependency, visited);
  return visited;
}
const startup = staticImports('index.html');
const browsing = new Set(startup);
for (const key of ['src/Layouts/PublicLayout.tsx', 'src/Pages/WelcomePage.tsx', 'src/Pages/RoutePlaceholder.tsx', 'src/Layouts/AccountLayout.tsx']) {
  staticImports(key, browsing);
}
const publicFiles = new Set([...browsing].map((key) => manifest[key].file));
const adminKeys = ['src/Layouts/AdminLayout.tsx', 'src/Pages/Admin/AdminPlaceholder.tsx', 'src/Pages/Admin/DashboardPage.tsx'];
for (const key of adminKeys) {
  assert(manifest[key]?.isDynamicEntry, `${key} must be lazy`);
  assert(!publicFiles.has(manifest[key].file), `${key} entered the public/startup imports`);
}
for (const key of browsing) assert(!manifest[key].name?.match(/^(AdminLayout|AdminPlaceholder|DashboardPage|navigation)$/), 'Admin code entered public static imports');
for (const file of readdirSync(resolve(root, 'dist/assets')).filter((file) => file.endsWith('.js'))) {
  const source = readFileSync(resolve(root, 'dist/assets', file), 'utf8');
  assert(!/__showcase|__auth|ComponentShowcase|AuthPreview/.test(source), `Development fixture in ${file}`);
}
console.log('PASS: admin layout/pages are separate lazy chunks, absent from startup/public/account static imports; development fixtures are excluded.');
for (const key of adminKeys) console.log(`${key}: ${manifest[key].file}`);
