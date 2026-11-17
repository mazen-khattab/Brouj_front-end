import { readFileSync, readdirSync } from "node:fs";
import { posix } from "node:path";
import ts from "typescript";
import { expect, test } from "vitest";

const sourcePaths = readdirSync("src", { recursive: true })
  .map(String)
  .map((path) => `src/${path.replaceAll("\\", "/")}`)
  .filter((path) => /\.tsx?$/.test(path));

function imports(path: string) {
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
  const targets: string[] = [];
  function collect(specifier: string) {
    if (specifier.startsWith(".")) targets.push(posix.normalize(posix.join(posix.dirname(path), specifier)));
  }
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) collect(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteral(argument)) collect(argument.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return targets;
}

test("business implementations cannot return to legacy folders or pass-through API modules", () => {
  expect(sourcePaths.filter((path) => /^src\/(Pages|Account|Catalogue|AdminOperations|Governance)\//.test(path))).toEqual([]);
  expect(sourcePaths.filter((path) => /^src\/Features\/.*\/api\.tsx?$/i.test(path))).toEqual([]);
});

test("shared infrastructure has no feature dependency except route composition", () => {
  const violations = sourcePaths
    .filter((path) => !path.startsWith("src/Features/") && path !== "src/Router/router.tsx")
    .flatMap((path) =>
      imports(path)
        .filter((target) => target.startsWith("src/Features/"))
        .map((target) => `${path} -> ${target}`),
    );
  expect(violations).toEqual([]);
});

test("cross-domain consumers use explicit integration components, never private state or validation", () => {
  const integrations = new Set([
    "src/Features/Areas/Public/Browser",
    "src/Features/Projects/Public/Browser",
    "src/Features/Units/Public/UnitCarousel",
    "src/Features/Planning/Public/ProjectTimePlan",
    "src/Features/Reservations/Customer/ReservationEntry",
    "src/Features/Reservations/Customer/BookingScope",
  ]);
  const violations = sourcePaths
    .filter((path) => path.startsWith("src/Features/") && !path.startsWith("src/Features/Development/"))
    .flatMap((path) =>
      imports(path)
        .filter((target) => target.startsWith("src/Features/") && target.split("/")[2] !== path.split("/")[2] && !integrations.has(target))
        .map((target) => `${path} -> ${target}`),
    );
  expect(violations).toEqual([]);
});

test("lazy route entries belong to feature pages or infrastructure layouts", () => {
  const routes = imports("src/Router/router.tsx");
  expect(routes.some((path) => path.includes("/Features/Development/"))).toBe(true);
  expect(routes.filter((path) => path.includes("/Pages/"))).toEqual([]);
  const globalContexts = sourcePaths.filter((path) => path.startsWith("src/Context/"));
  expect(globalContexts.every((path) => /\/(Auth|Locale|Realtime|Toast)(Context|Provider)\.tsx?$/.test(path))).toBe(true);
});
