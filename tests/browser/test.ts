import { test as base, expect } from "@playwright/test";

// Every browser journey checks errors, including those raised after its assertions.
export const test = base.extend<{ applicationErrors: void }>({
  applicationErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      const capture = (error: Error) => errors.push(error.message);
      page.on("pageerror", capture);
      await use();
      page.off("pageerror", capture);
      expect(errors, "uncaught application errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
