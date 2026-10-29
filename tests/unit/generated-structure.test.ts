import { expect, test } from "vitest";
import { typescriptStructure } from "../../scripts/typescript-structure.mjs";

test("generated verification accepts formatting and comments while rejecting contract and execution changes", () => {
  const original = "import type { Request } from './types'; const args = {method: 'PATCH', query: ['projectId'], authenticated: true}; send(args);";
  const formatted =
    '/* explanation */ import type { Request } from "./types";\nconst args = { method: "PATCH", query: ["projectId",], authenticated: true, };\nsend(args);';
  expect(typescriptStructure(original)).toBe(typescriptStructure(formatted));
  for (const changed of [
    original.replace("PATCH", "POST"),
    original.replace("projectId", "id"),
    original.replace("true", "false"),
    original.replace("const args", "let args"),
    original.replace("import type", "import"),
    original.replace("send(args)", "replay(args)"),
  ]) {
    expect(typescriptStructure(changed)).not.toBe(typescriptStructure(original));
  }
  expect(() => typescriptStructure("const =")).toThrow("must parse");
});
