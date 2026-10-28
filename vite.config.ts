import { readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, sep } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite';

/** Serve HTTPS only, using developer-provided material kept outside the repository. */
function localHttps(env: Record<string, string>) {
  const certPath = env.BROUJ_HTTPS_CERT_FILE;
  const keyPath = env.BROUJ_HTTPS_KEY_FILE;
  if (!certPath || !keyPath) {
    throw new Error(
      "Set BROUJ_HTTPS_CERT_FILE and BROUJ_HTTPS_KEY_FILE to trusted localhost PEM files outside the repository. See README.md.",
    );
  }
  const root = realpathSync(process.cwd());
  for (const file of [certPath, keyPath]) {
    if (!isAbsolute(file))
      throw new Error("HTTPS certificate paths must be absolute.");
    const location = relative(root, realpathSync(file));
    const outside =
      location === ".." ||
      location.startsWith(`..${sep}`) ||
      isAbsolute(location);
    if (!outside) {
      throw new Error(
        "Keep HTTPS certificates and keys outside the repository.",
      );
    }
  }
  return { cert: readFileSync(certPath), key: readFileSync(keyPath) };
}

export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env } as Record<
    string,
    string
  >;
  // Builds and unit tests do not need private certificate material.
  const https = command === "serve" ? localHttps(env) : undefined;
  return {
    plugins: [react(), tailwindcss()],
    build: { manifest: true },
    // Services are loaded lazily; prepare Axios before their first import to avoid a dev reload.
    optimizeDeps: { include: ['axios'] },
    server: {
      host: "localhost",
      port: 5173,
      strictPort: true,
      ...(https && { https }),
    },
    preview: {
      host: "localhost",
      port: 5173,
      strictPort: true,
      ...(https && { https }),
    },
  };
});
