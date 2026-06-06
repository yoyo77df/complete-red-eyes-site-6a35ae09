#!/usr/bin/env node
// Transforms `dist/` produced by `vite build` (with Nitro Vercel preset)
// into the Vercel Build Output API v3 layout under `.vercel/output/`.
//
// Layout produced:
//   .vercel/output/config.json
//   .vercel/output/static/**         (client assets)
//   .vercel/output/functions/__server.func/**  (SSR server bundle)
//   .vercel/output/functions/__server.func/.vc-config.json

import { existsSync, mkdirSync, cpSync, rmSync, writeFileSync, readdirSync, statSync, renameSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const outDir = resolve(root, ".vercel/output");
const staticDir = join(outDir, "static");
const fnDir = join(outDir, "functions", "__server.func");

if (!existsSync(dist)) {
  console.error("[vercel-postbuild] dist/ not found. Did `vite build` succeed?");
  process.exit(1);
}

// Clean previous output
if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
mkdirSync(staticDir, { recursive: true });
mkdirSync(fnDir, { recursive: true });

// If Nitro's Vercel preset already produced .vercel/output inside dist, prefer it.
const nestedVercel = join(dist, ".vercel", "output");
if (existsSync(nestedVercel)) {
  cpSync(nestedVercel, outDir, { recursive: true });
  console.log("[vercel-postbuild] Copied nested dist/.vercel/output → .vercel/output");
  process.exit(0);
}

// Identify client and server directories produced by the build.
// Common layouts: dist/client + dist/server, or dist/public + dist/server.
const candidates = readdirSync(dist).filter((n) => statSync(join(dist, n)).isDirectory());

const clientDirName =
  candidates.find((n) => n === "client") ??
  candidates.find((n) => n === "public") ??
  candidates.find((n) => n === "static");

const serverDirName =
  candidates.find((n) => n === "server") ??
  candidates.find((n) => n === "ssr");

if (clientDirName) {
  cpSync(join(dist, clientDirName), staticDir, { recursive: true });
  console.log(`[vercel-postbuild] static/ ← dist/${clientDirName}`);
} else {
  // Fallback: treat dist root (minus server/) as static
  for (const name of candidates) {
    if (name === serverDirName) continue;
    cpSync(join(dist, name), join(staticDir, name), { recursive: true });
  }
  for (const name of readdirSync(dist)) {
    const p = join(dist, name);
    if (statSync(p).isFile()) cpSync(p, join(staticDir, name));
  }
  console.log("[vercel-postbuild] static/ ← dist/ (fallback)");
}

if (serverDirName) {
  cpSync(join(dist, serverDirName), fnDir, { recursive: true });
  console.log(`[vercel-postbuild] functions/__server.func/ ← dist/${serverDirName}`);
} else {
  console.error("[vercel-postbuild] No server/ directory found in dist/. Aborting.");
  process.exit(1);
}

// Ensure the function entry is index.mjs
const fnFiles = readdirSync(fnDir);
if (!fnFiles.includes("index.mjs")) {
  const entryCandidate =
    fnFiles.find((f) => f === "index.js") ??
    fnFiles.find((f) => f === "server.mjs") ??
    fnFiles.find((f) => f === "server.js");
  if (entryCandidate) {
    renameSync(join(fnDir, entryCandidate), join(fnDir, "index.mjs"));
    console.log(`[vercel-postbuild] Renamed ${entryCandidate} → index.mjs`);
  } else {
    console.warn("[vercel-postbuild] Could not find a server entry to rename to index.mjs");
  }
}

// .vc-config.json for the serverless function
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

// Top-level Vercel Build Output config: route everything to the server function,
// while static assets are served automatically from static/.
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

console.log("[vercel-postbuild] Done → .vercel/output/");
