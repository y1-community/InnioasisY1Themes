#!/usr/bin/env node
/**
 * Deploy y1-theme-analytics (D1). Cloudflare Git Build command:
 *   node scripts/deploy-analytics-worker.mjs
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = join(root, "cloudflare-worker-analytics.toml");
const entry = join(root, "analytics-worker.js");
const workerConfig = join(root, "workers/theme-analytics/wrangler.toml");

function run(cmd) {
  console.log("[deploy-analytics-worker]", cmd);
  execSync(cmd, { cwd: root, stdio: "inherit", env: process.env });
}

console.log("[deploy-analytics-worker] repo root:", root);

if (existsSync(config)) {
  run(`npx wrangler deploy --config "${config.replace(/"/g, '\\"')}"`);
  process.exit(0);
}

if (existsSync(entry)) {
  run(
    `npx wrangler deploy "${entry.replace(/"/g, '\\"')}" --name y1-theme-analytics --compatibility-date 2026-05-11`,
  );
  process.exit(0);
}

if (existsSync(workerConfig)) {
  run(`npx wrangler deploy --config "${workerConfig.replace(/"/g, '\\"')}"`);
  process.exit(0);
}

console.error("[deploy-analytics-worker] Missing config under", root);
process.exit(1);
