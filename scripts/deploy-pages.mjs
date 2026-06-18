#!/usr/bin/env node
/**
 * Publish the static gallery to Cloudflare Pages (themes.innioasis.app).
 * Use when Git-connected Pages builds stop tracking main — ingest still updates GitHub
 * but the public site can lag until this runs.
 *
 * Requires: CLOUDFLARE_API_TOKEN (Account → Cloudflare Pages → Edit)
 * Optional: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_PAGES_PROJECT (default y1themes)
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = join(root, "wrangler.pages.toml");
const project = String(process.env.CLOUDFLARE_PAGES_PROJECT || "y1themes").trim() || "y1themes";
const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();

function run(cmd) {
  console.log("[deploy-pages]", cmd);
  execSync(cmd, { cwd: root, stdio: "inherit", env: process.env });
}

if (!process.env.CLOUDFLARE_API_TOKEN) {
  console.error("[deploy-pages] CLOUDFLARE_API_TOKEN is required.");
  process.exit(1);
}

console.log("[deploy-pages] repo root:", root);
console.log("[deploy-pages] project:", project);

const parts = [
  "npx",
  "wrangler",
  "pages",
  "deploy",
  `"${root.replace(/"/g, '\\"')}"`,
  `--project-name="${project.replace(/"/g, '\\"')}"`,
  "--branch=main",
  "--commit-dirty=true",
];
if (existsSync(config)) {
  parts.push(`--config="${config.replace(/"/g, '\\"')}"`);
}
if (accountId) {
  parts.push(`--account-id="${accountId.replace(/"/g, '\\"')}"`);
}

run(parts.join(" "));
