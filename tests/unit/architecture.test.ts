// Use ESLint itself so a configuration regression cannot silently allow a second transport.
import { ESLint } from 'eslint';
import { expect, test } from 'vitest';

test.each([
  ['src/Services/probe.ts', 'import axios from "axios"; void axios;', true],
  ['src/Services/probe.ts', 'import client from "axios/unsafe/core/Axios.js"; void client;', true],
  ['src/Services/probe.ts', 'void import("axios");', true],
  ['src/Services/probe.ts', 'require("axios");', true],
  ['src/Services/probe.ts', 'import type { AxiosError } from "axios"; export type Failure = AxiosError;', false],
  ['src/API.tsx', 'import axios from "axios"; void axios.create();', false],
])('enforces Axios ownership in %s', async (filePath, text, restricted) => {
  const result = await new ESLint().lintText(text, { filePath });
  const boundaryErrors = result[0]?.messages.filter((message) =>
    message.ruleId === 'no-restricted-imports' || message.ruleId === 'no-restricted-syntax');
  expect(boundaryErrors).toHaveLength(restricted ? 1 : 0);
  if (!restricted) expect(result[0]?.errorCount).toBe(0);
});
