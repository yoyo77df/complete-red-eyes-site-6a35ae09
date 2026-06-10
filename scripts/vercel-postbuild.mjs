#!/usr/bin/env node
// Transforms dist/ into .vercel/output/ (Vercel Build Output API v3)
import { existsSync, mkdirSync, rmSync, cpSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const outDir = resolve(root, ".vercel/output");
const staticDir = join(outDir, "static");
const fnDir = join(outDir, "functions/__server.func");

if (!existsSync(dist)) {
  console.error("[vercel-postbuild] dist/ not found. Did `vite build` run?");
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
mkdirSync(staticDir, { recursive: true });
mkdirSync(fnDir, { recursive: true });

// Locate client + server subdirectories within dist
function findDir(...candidates) {
  for (const c of candidates) {
    const p = join(dist, c);
    if (existsSync(p) && statSync(p).isDirectory()) return p;
  }
  return null;
}

const clientDir = findDir("client", "public", "_client");
const serverDir = findDir("server", "_server", "ssr");

if (clientDir) {
  for (const entry of readdirSync(clientDir)) {
    cpSync(join(clientDir, entry), join(staticDir, entry), { recursive: true });
  }
} else {
  console.warn("[vercel-postbuild] No client dir found in dist/.");
}

if (serverDir) {
  for (const entry of readdirSync(serverDir)) {
    cpSync(join(serverDir, entry), join(fnDir, entry), { recursive: true });
  }
} else {
  console.warn("[vercel-postbuild] No server dir found in dist/.");
}

// .vc-config.json for the server function
writeFileSync(
  join(fnDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      supportsResponseStreaming: true,
    },
    null,
    2,
  ),
);

// Root config.json — route everything to the server function, static assets handled automatically
writeFileSync(
  join(outDir, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/__server" },
      ],
    },
    null,
    2,
  ),
);

console.log("[vercel-postbuild] Wrote .vercel/output/");
