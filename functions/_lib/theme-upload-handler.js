/**
 * Shared GitHub ZIP upload handler for Cloudflare Pages Functions and Workers.
 * Theme uploads: no CAPTCHA / bot gate by design (retro moderation in repo).
 */

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: CORS_HEADERS,
  });
}

export function handleUploadOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

function slugify(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
}

const BLOCKED_AUTHOR_KEYS = new Set([
  "community",
  "user",
  "users",
  "anonymous",
  "anon",
  "unknown",
  "guest",
  "admin",
  "administrator",
  "moderator",
  "mod",
  "creator",
  "themecreator",
  "themeauthor",
  "nobody",
  "someone",
  "test",
  "tester",
  "default",
  "null",
  "none",
  "na",
  "n/a",
]);

function normalizeSpaces(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeAuthorKey(value) {
  return normalizeSpaces(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function hasReservedAuthorName(value) {
  const key = normalizeAuthorKey(value);
  if (!key) return true;
  if (key.includes("innioasis")) return true;
  return BLOCKED_AUTHOR_KEYS.has(key);
}

function hyphenSlugForZipPrefix(title) {
  let s = String(title || "")
    .trim()
    .replace(/^u\//i, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/_+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || "";
}

function sanitizeThemeTitle(value) {
  const trimmed = normalizeSpaces(value);
  if (!trimmed) return { value: "", changed: false };
  if (/^theme\s+/i.test(trimmed)) return { value: trimmed, changed: false };
  if (/\s+theme$/i.test(trimmed)) {
    return {
      value: trimmed.replace(/\s+theme$/i, "").trim(),
      changed: true,
    };
  }
  return { value: trimmed, changed: false };
}

const BLOCKED_DIRECT_FILE_EXTENSIONS = new Set([
  ".htm", ".html", ".xhtml", ".shtml",
  ".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx",
  ".php", ".phtml", ".php3", ".php4", ".php5", ".phar",
  ".asp", ".aspx", ".jsp", ".cgi", ".pl", ".py", ".rb",
  ".sh", ".bash", ".zsh", ".ps1", ".bat", ".cmd", ".com",
  ".exe", ".dll", ".so", ".dylib", ".jar",
]);

/** First path segments that must never ship via direct theme uploads. */
const RESERVED_DIRECT_UPLOAD_SEGMENTS = new Set([
  "scripts",
  "functions",
  "assets",
  ".github",
  "workers",
  "themes",
  "node_modules",
  "creators",
  ".git",
]);

/** CI / workflow manifest filenames (repo root or subtree). */
const CI_MANIFEST_BASENAMES = new Set(
  [
    "azure-pipelines.yml",
    "azure-pipelines.yaml",
    ".travis.yml",
    "travis.yml",
    "appveyor.yml",
    ".gitlab-ci.yml",
    ".circleci.yml",
    "Makefile",
    "Jenkinsfile",
  ].map((s) => s.toLowerCase())
);

function normalizedUploadRepoPath(pathValue) {
  return String(pathValue || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim();
}

function fileSuffixLower(pathValue) {
  const norm = normalizedUploadRepoPath(pathValue).toLowerCase();
  const file = norm.split("/").pop() || "";
  const dot = file.lastIndexOf(".");
  if (dot < 0) return "";
  return file.slice(dot);
}

/**
 * Drops web-executable, script, CI, or repo infra paths before opening the GitHub PR.
 * The upload request still succeeds HTTP-wise; withheld paths are omitted from commits only.
 */
function shouldOmitFromDirectThemeCommit(pathValue) {
  const normRaw = normalizedUploadRepoPath(pathValue);
  const normLow = normRaw.toLowerCase();
  if (!normLow || normLow.includes("..")) return true;

  const segments = normLow.split("/").filter(Boolean);
  const firstSeg = segments[0] || "";
  if (RESERVED_DIRECT_UPLOAD_SEGMENTS.has(firstSeg)) return true;

  const leaf = (segments.length ? segments[segments.length - 1] : normLow).toLowerCase();
  if (leaf && CI_MANIFEST_BASENAMES.has(leaf)) return true;

  const ext = fileSuffixLower(pathValue);
  if (ext && BLOCKED_DIRECT_FILE_EXTENSIONS.has(ext)) return true;

  if (ext === ".yml" || ext === ".yaml") {
    if (/\/workflows\//i.test(normRaw)) return true;
    if (segments.includes(".github")) return true;
  }

  return false;
}

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function ghJson(url, token, init = {}, context = "") {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      // GitHub REST API returns 403 if User-Agent is missing (server-side fetch has no browser UA).
      "User-Agent": "y1-theme-upload/1.0 (+https://github.com/y1-community/InnioasisY1Themes)",
      ...(init.headers || {}),
    },
  });

  const raw = await res.text();
  let json = {};
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    json = { message: raw ? raw.slice(0, 500) : "" };
  }

  if (!res.ok) {
    const parts = [];
    if (json.message) parts.push(String(json.message));
    if (json.error) parts.push(String(json.error));
    if (Array.isArray(json.errors)) {
      for (const e of json.errors) {
        if (e && e.message) parts.push(e.message);
      }
    }
    let detail = parts.filter(Boolean).join(" — ") || raw?.slice(0, 300) || `HTTP ${res.status}`;
    if (json.documentation_url) detail += ` (${json.documentation_url})`;
    const prefix = context ? `${context}: ` : "";
    throw new Error(`${prefix}GitHub API ${res.status}: ${detail}`);
  }
  return json;
}

async function ghJson(url, token, init = {}, context = "") {
  const enc = String(path || "")
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
  const res = await fetch(`${apiBase}/contents/${enc}?ref=${encodeURIComponent(ref)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "y1-theme-upload/1.0 (+https://github.com/y1-community/InnioasisY1Themes)",
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return await res.json().catch(() => null);
}

/**
 * Create or update a file on a branch. Tries PUT without sha first (new paths on a fresh branch
 * skip an extra GET); if GitHub requires sha for an existing path, fetches meta and retries.
 */
async function ghPutContentsCreateOrUpdate(apiBase, token, path, branchName, message, contentBase64) {
  const enc = String(path || "")
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
  const url = `${apiBase}/contents/${enc}`;
  const baseBody = {
    message,
    content: contentBase64,
    branch: branchName,
  };
  try {
    await ghJson(
      url,
      token,
      {
        method: "PUT",
        body: JSON.stringify(baseBody),
      },
      `upload file ${path}`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const needsSha = /422|409/.test(msg) && /sha|exists/i.test(msg);
    if (!needsSha) throw err;
    const existing = await ghGetFileMeta(apiBase, token, path, branchName);
    if (!existing || !existing.sha) throw err;
    await ghJson(
      url,
      token,
      {
        method: "PUT",
        body: JSON.stringify({
          ...baseBody,
          sha: existing.sha,
        }),
      },
      `upload file ${path} (with sha)`
    );
  }
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 */
export async function handleUploadPost(request, env) {
  try {
    const token = env.GITHUB_UPLOAD_TOKEN;
    const owner = env.GITHUB_OWNER || "y1-community";
    const repo = env.GITHUB_REPO || "InnioasisY1Themes";
    const baseBranch = env.GITHUB_BASE_BRANCH || "main";
    const zipDir =
      env.GITHUB_ZIP_UPLOAD_DIR !== undefined &&
      env.GITHUB_ZIP_UPLOAD_DIR !== null &&
      String(env.GITHUB_ZIP_UPLOAD_DIR).trim() !== ""
        ? String(env.GITHUB_ZIP_UPLOAD_DIR).trim()
        : "";

    if (!token) {
      return jsonResponse({ error: "Server upload token is not configured." }, 500);
    }

    const form = await request.formData();
    const zipFile = form.get("zip");
    const directFilesRaw = form.get("directFilesJson");
    let themeTitle = String(form.get("themeTitle") || "").trim();
    let themeAuthor = String(form.get("themeAuthor") || "").trim();
    if (!themeTitle) themeTitle = String(form.get("themeName") || "").trim();
    if (!themeAuthor) themeAuthor = String(form.get("uploaderName") || "").trim();
    const sanitizedTitle = sanitizeThemeTitle(themeTitle);
    themeTitle = sanitizedTitle.value;
    themeAuthor = normalizeSpaces(themeAuthor);
    if (!themeTitle) {
      return jsonResponse({ error: "Theme title is required." }, 400);
    }
    if (!themeAuthor) {
      return jsonResponse({ error: "Theme author is required." }, 400);
    }
    if (hasReservedAuthorName(themeAuthor)) {
      return jsonResponse(
        {
          error:
            "Author name is reserved or too generic. Use your own creator handle (manufacturer-only names like 'Innioasis' are not allowed).",
        },
        400
      );
    }
    const uploaderName = themeAuthor;

    let directFiles = [];
    if (typeof directFilesRaw === "string" && directFilesRaw.trim()) {
      try {
        const parsed = JSON.parse(directFilesRaw);
        if (Array.isArray(parsed)) {
          directFiles = parsed
            .map((item) => ({
              path: String(item && item.path ? item.path : "").replace(/^\/+/, "").trim(),
              contentBase64: String(item && item.contentBase64 ? item.contentBase64 : "").trim(),
            }))
            .filter((item) => item.path && item.contentBase64);
        }
      } catch {
        return jsonResponse({ error: "Invalid directFilesJson payload." }, 400);
      }
    }
    const hasDirectFiles = directFiles.length > 0;
    if (!hasDirectFiles && !(zipFile instanceof File)) {
      return jsonResponse({ error: "Missing ZIP file or direct file payload." }, 400);
    }

    let originalName = "theme.zip";
    if (!hasDirectFiles) {
      originalName = slugify(zipFile.name || "theme.zip");
      if (!originalName.toLowerCase().endsWith(".zip")) {
        return jsonResponse({ error: "Only .zip uploads are accepted." }, 400);
      }
      const maxBytes = Number(env.MAX_UPLOAD_BYTES || 25 * 1024 * 1024);
      if (zipFile.size > maxBytes) {
        return jsonResponse({ error: `ZIP exceeds max size (${maxBytes} bytes).` }, 400);
      }
    }

    const now = Date.now();
    const branchName = `upload/theme-${now}-${Math.random().toString(36).slice(2, 8)}`;
    const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

    let directCommitted = directFiles;
    let directOmittedForSecurity = 0;
    if (hasDirectFiles) {
      const kept = [];
      for (const file of directFiles) {
        const path = normalizedUploadRepoPath(file.path || "");
        if (!path || path.includes("..")) {
          return jsonResponse({ error: `Invalid file path in direct upload payload: ${path || "(empty)"}` }, 400);
        }
        if (shouldOmitFromDirectThemeCommit(path)) {
          directOmittedForSecurity += 1;
          continue;
        }
        kept.push(file);
      }
      directCommitted = kept;
      if (!directCommitted.length) {
        return jsonResponse(
          {
            error:
              "Nothing left to attach to this pull request: every uploaded path was withheld for repository security (.html/.js/.php/scripts/CI/workflows are not merged). Resubmit theme images, fonts, and config.json.",
          },
          400
        );
      }
    }

    const baseRef = await ghJson(
      `${apiBase}/git/ref/heads/${encodeURIComponent(baseBranch)}`,
      token,
      {},
      `read base branch ${baseBranch} on ${owner}/${repo}`
    );
    const baseSha = baseRef?.object?.sha;
    if (!baseSha) {
      throw new Error(`Could not resolve base branch SHA for ${baseBranch}.`);
    }

    await ghJson(
      `${apiBase}/git/refs`,
      token,
      {
        method: "POST",
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: baseSha,
        }),
      },
      `create branch ${branchName}`
    );

    /** Lowercase hyphenated token for disambiguating same theme folder name (see validate_theme_pr.py). */
    const uploaderSlug = slugify(String(uploaderName || "").replace(/^u\//i, ""))
      .replace(/_/g, "-")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);

    let shareFolderHints = [];
    const hintsRaw = form.get("shareFolderHints");
    if (typeof hintsRaw === "string" && hintsRaw.trim()) {
      try {
        const parsed = JSON.parse(hintsRaw.trim());
        if (Array.isArray(parsed)) {
          shareFolderHints = parsed
            .map((x) => String(x || "").trim())
            .filter(Boolean)
            .slice(0, 24);
        }
      } catch {
        shareFolderHints = [];
      }
    }

    let zipPath = "";
    if (!hasDirectFiles) {
      const arrayBuffer = await zipFile.arrayBuffer();
      const contentB64 = toBase64(arrayBuffer);
      const zipPrefix = zipDir ? `${zipDir.replace(/^\/+|\/+$/g, "")}/` : "";
      const unique = `${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      const titleTag = hyphenSlugForZipPrefix(themeTitle);
      const zipName = titleTag
        ? `gallery-upload-${titleTag}-${unique}.zip`
        : `gallery-upload-${unique}.zip`;
      zipPath = zipPrefix ? `${zipPrefix}${zipName}` : zipName;
      await ghJson(
        `${apiBase}/contents/${zipPath.split("/").map(encodeURIComponent).join("/")}`,
        token,
        {
          method: "PUT",
          body: JSON.stringify({
            message: `Upload theme zip: ${themeTitle || originalName}`,
            content: contentB64,
            branch: branchName,
          }),
        },
        `upload file ${zipPath}`
      );

      const metaPath = `${zipPath}.meta.json`;
      const metaPayload = JSON.stringify(
        {
          uploaderName: uploaderName || "",
          uploaderSlug: uploaderSlug || "",
          shareFolderHints,
          themeTitle: themeTitle || "",
        },
        null,
        2
      ) + "\n";
      const metaB64 = toBase64(new TextEncoder().encode(metaPayload));
      await ghJson(
        `${apiBase}/contents/${metaPath.split("/").map(encodeURIComponent).join("/")}`,
        token,
        {
          method: "PUT",
          body: JSON.stringify({
            message: `Upload metadata for ${originalName}`,
            content: metaB64,
            branch: branchName,
          }),
        },
        `upload file ${metaPath}`
      );
    } else {
      for (const file of directCommitted) {
        const path = String(file.path || "")
          .replace(/\\/g, "/")
          .replace(/^\/+/, "")
          .trim();
        if (!path || path.includes("..")) {
          return jsonResponse({ error: `Invalid file path in direct upload payload: ${path || "(empty)"}` }, 400);
        }
        await ghPutContentsCreateOrUpdate(
          apiBase,
          token,
          path,
          branchName,
          `Upload theme file: ${path}`,
          file.contentBase64
        );
      }
    }

    let prTitle = "Theme submission";
    if (themeTitle && themeAuthor) prTitle = `${themeTitle} — ${themeAuthor}`;
    else if (themeTitle) prTitle = themeTitle;
    else if (themeAuthor) prTitle = `Theme submission — ${themeAuthor}`;

    const prBody = [
      "## New theme from the gallery uploader",
      "",
      hasDirectFiles
        ? `- Upload mode: direct file commit (${directCommitted.length} file(s) attached; ${directOmittedForSecurity > 0 ? `${directOmittedForSecurity} path(s) withheld for security` : "no paths withheld"})`
        : `- Package: \`${originalName}\``,
      directOmittedForSecurity > 0
        ? `- **Security:** withheld ${directOmittedForSecurity} repo path(s) (e.g. HTML/JS/PHP, CI/workflow manifests, or \`scripts\`/\`functions\`/\`.github\`). They may still have been sent to the uploader but were not written to this branch.`
        : null,
      themeTitle ? `- Title (from config): ${themeTitle}` : null,
      themeAuthor ? `- Author (from config): ${themeAuthor}` : null,
      "",
      "**Automatic submission policy:**",
      "- Automatic submission only when `scripts/validate_theme_pr.py` passes.",
      "- If your theme’s **folder name** matches an existing gallery theme and the **author is the same** (or both unknown), this counts as an **update** — it stays with the team for manual review.",
      "- If the **author differs**, rename the root folder inside the ZIP to include your suffix, e.g. `MyTheme_your-handle` (and dark variants as `MyTheme_your-handle_dark-mode`), then upload again — otherwise automatic submission is not available.",
      "- If another **ZIP on `main`** is still waiting to be extracted and claims the same folder identity, automatic submission is paused until that archive is processed.",
    ]
      .filter(Boolean)
      .join("\n");

    const pr = await ghJson(
      `${apiBase}/pulls`,
      token,
      {
        method: "POST",
        body: JSON.stringify({
          title: prTitle,
          head: branchName,
          base: baseBranch,
          body: prBody,
        }),
      },
      "open pull request"
    );

    return jsonResponse(
      {
        ok: true,
        prUrl: pr.html_url || null,
        branch: branchName,
      },
      200
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    console.error("[theme-upload]", message);
    return jsonResponse({ error: message }, 500);
  }
}
