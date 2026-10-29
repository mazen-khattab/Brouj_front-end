import assert from "node:assert/strict";
import ts from "typescript";

/** Ignore presentation trivia while retaining the declarations, literals and executable tree. */
export function typescriptStructure(source) {
  const file = ts.createSourceFile("generated.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  assert.equal(file.parseDiagnostics.length, 0, "Generated TypeScript must parse");

  function visit(node) {
    const children = [];
    ts.forEachChild(node, (child) => {
      children.push(visit(child));
    });
    // Type-only imports and variable declaration modes are represented by scalar flags, not child nodes.
    return [
      node.kind,
      node.kind !== ts.SyntaxKind.SourceFile && typeof node.text === "string" ? node.text : null,
      node.isTypeOnly ?? null,
      node.isExportEquals ?? null,
      node.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const | ts.NodeFlags.Using | ts.NodeFlags.AwaitUsing),
      children,
    ];
  }

  return JSON.stringify(visit(file));
}
