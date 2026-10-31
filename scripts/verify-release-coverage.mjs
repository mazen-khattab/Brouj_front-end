import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const matrix = JSON.parse(readFileSync(resolve(root, 'docs/contracts/api-ui-matrix.json'), 'utf8'));
const services = new Set(matrix.operations.map((operation) => `${operation.service}.ts`));
const references = new Map();

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(path) ? [path] : [];
  });
}

for (const path of sourceFiles(resolve(root, 'src'))) {
  const fileName = relative(root, path).replaceAll('\\', '/');
  const file = ts.createSourceFile(fileName, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const imports = new Map();
  const namespaces = new Map();
  for (const node of file.statements) {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier) || node.importClause?.isTypeOnly) {
      continue;
    }
    const service = relative(resolve(root, 'src'), resolve(dirname(path), `${node.moduleSpecifier.text}.ts`)).replaceAll('\\', '/');
    if (!services.has(service)) {
      continue;
    }
    const bindings = node.importClause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) {
      namespaces.set(bindings.name.text, service);
    } else if (bindings && ts.isNamedImports(bindings)) {
      for (const item of bindings.elements) {
        if (!item.isTypeOnly) {
          imports.set(item.name.text, `${service}:${item.propertyName?.text ?? item.name.text}`);
        }
      }
    }
  }

  function visit(node) {
    // Record executable references, including callbacks passed to the session coordinator.
    // This is source evidence, not proof that a browser/backend journey passed.
    if (ts.isImportDeclaration(node) || ts.isTypeNode(node)) {
      return;
    }
    let key;
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && namespaces.has(node.expression.text)) {
      key = `${namespaces.get(node.expression.text)}:${node.name.text}`;
    } else if (ts.isIdentifier(node) && imports.has(node.text)) {
      key = imports.get(node.text);
    }
    if (key) {
      const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
      const value = `${fileName}:${line}`;
      references.set(key, [...new Set([...(references.get(key) ?? []), value])]);
    }
    ts.forEachChild(node, visit);
  }

  visit(file);
}

// The approved redesign reconciles this backend addition without adding a project-lookup UI.
const exclusions = [{ action: 'GetProjectsLookup', reason: 'Generated and service-tested; project-lookup UI is outside the approved redesign scope (docs/project-details-redesign-plan.md).' }];
const operations = matrix.operations.map((operation) => {
  const name = operation.action[0].toLowerCase() + operation.action.slice(1);
  const consumers = references.get(`${operation.service}.ts:${name}`) ?? [];
  const exclusion = exclusions.find((item) => item.action === operation.action)?.reason ?? null;
  assert(consumers.length > 0 || exclusion, `No implemented consumer for ${operation.action}`);
  return {
    action: operation.action, method: operation.method, route: operation.route,
    policy: operation.policy, screen: operation.screen, phase: operation.uiPhase,
    service: `${operation.service}.ts`, consumers, exclusion,
  };
});
assert.equal(operations.length, 104);
const output = { businessOperationCount: operations.length, exclusions, operations };
const json = JSON.stringify(output, null, 2) + '\n';
const markdown = [
  '# Final API/UI source coverage', '',
  'The verified inventory contains 104 operations. 103 have implemented feature consumers; the project lookup has a generated, service-tested client and an explicit UI exclusion required by the approved project-details redesign. CSRF is separately exercised through API.tsx. These are source references, not live-backend verification.', '',
  '| Operation | Policy | Screen/action | Implemented source consumers |', '|---|---|---|---|',
  ...operations.map((operation) => `| ${operation.method} ${operation.route} | ${operation.policy} | ${operation.screen} / ${operation.action} | ${operation.exclusion ?? operation.consumers.join('<br>')} |`), '',
].join('\n');
const directory = resolve(root, 'docs/release');
for (const [name, content] of [['api-coverage.json', json], ['api-coverage.md', markdown]]) {
  const path = resolve(directory, name);
  if (process.argv.includes('--write')) {
    mkdirSync(directory, { recursive: true });
    writeFileSync(path, content);
  } else {
    assert.equal(readFileSync(path, 'utf8').replaceAll('\r\n', '\n'), content, `Stale ${name}; inspect source and rerun with --write.`);
  }
}
console.log(`PASS: ${operations.length} verified operations; ${exclusions.length} explicit UI exclusion. Live-backend release checks remain separate.`);
