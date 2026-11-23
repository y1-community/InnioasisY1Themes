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

const configs = [join(root, "cloudflare-worker-upload.toml")];

const entry = join(root, "upload-worker.js");

function run(cmd) {
  console.log("[deploy-upload-worker]", cmd);
  execSync(cmd, { cwd: root, stdio: "inherit", env: process.env });
}

console.log("[deploy-upload-worker] repo root:", root);
console.log("[deploy-upload-worker] cwd:", process.cwd());

/* Always deploy through the uploader's explicit config so Worker name,
   compatibility_date, and workers_dev = true stay pinned regardless of cwd. */
for (const config of configs) {
  if (existsSync(config)) {
    run(`npx wrangler deploy --config "${config.replace(/"/g, '\\"')}"`);
    process.exit(0);
  }
}

if (existsSync(entry)) {
  console.error(
    "[deploy-upload-worker] Refusing to deploy upload-worker.js without cloudflare-worker-upload.toml.",
  );
  process.exit(1);
}

console.error("[deploy-upload-worker] No config or entry under:", root);
console.error("Expected one of:", configs.join(", "), "or", entry);
process.exit(1);
