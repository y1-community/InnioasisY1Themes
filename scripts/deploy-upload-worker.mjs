#!/usr/bin/env node
/**
 * Reliable deploy for y1-theme-upload from Cloudflare Git (any cwd quirks).
 * Set Deploy command to: node scripts/deploy-upload-worker.mjs
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "..");

const configs = [
  join(root, "cloudflare-worker-upload.toml"),
  join(root, "wrangler.toml"),
  join(root, "wrangler.jsonc"),
];

const entry = join(root, "upload-worker.js");

function run(cmd) {
  console.log("[deploy-upload-worker]", cmd);
  execSync(cmd, { cwd: root, stdio: "inherit", env: process.env });
}

console.log("[deploy-upload-worker] repo root:", root);
console.log("[deploy-upload-worker] cwd:", process.cwd());

if (existsSync(entry)) {
  run(
    `npx wrangler deploy "${entry.replace(/"/g, '\\"')}" --name y1-theme-upload --compatibility-date 2026-05-11`,
  );
  process.exit(0);
}

for (const config of configs) {
  if (existsSync(config)) {
    run(`npx wrangler deploy --config "${config.replace(/"/g, '\\"')}"`);
    process.exit(0);
  }
}

console.error("[deploy-upload-worker] No config or entry under:", root);
console.error("Expected one of:", configs.join(", "), "or", entry);
process.exit(1);
