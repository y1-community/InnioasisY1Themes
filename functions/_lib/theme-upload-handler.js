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

async function ghPathExists(apiBase, token, path, ref) {
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
  if (res.status === 404) return false;
  return res.ok;
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

    if (!(zipFile instanceof File)) {
      return jsonResponse({ error: "Missing ZIP file." }, 400);
    }

    const originalName = slugify(zipFile.name || "theme.zip");
    if (!originalName.toLowerCase().endsWith(".zip")) {
      return jsonResponse({ error: "Only .zip uploads are accepted." }, 400);
    }

    const maxBytes = Number(env.MAX_UPLOAD_BYTES || 25 * 1024 * 1024);
    if (zipFile.size > maxBytes) {
      return jsonResponse({ error: `ZIP exceeds max size (${maxBytes} bytes).` }, 400);
    }

    const arrayBuffer = await zipFile.arrayBuffer();
    const contentB64 = toBase64(arrayBuffer);

    const now = Date.now();
    const branchName = `upload/theme-${now}-${Math.random().toString(36).slice(2, 8)}`;
    const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

    /** Lowercase hyphenated token for disambiguating same theme folder name (see validate_theme_pr.py). */
    const uploaderSlug = slugify(String(uploaderName || "").replace(/^u\//i, ""))
      .replace(/_/g, "-")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    const zipStem = originalName.replace(/\.zip$/i, "") || "theme";
    const candidateNames = [
      originalName,
      uploaderSlug ? `${zipStem}-${uploaderSlug}.zip` : "",
      `${zipStem}-${Math.random().toString(36).slice(2, 8)}.zip`,
    ].filter(Boolean);
    const zipPrefix = zipDir ? `${zipDir.replace(/^\/+|\/+$/g, "")}/` : "";
    let zipName = candidateNames[candidateNames.length - 1];
    for (const cand of candidateNames) {
      const exists = await ghPathExists(apiBase, token, `${zipPrefix}${cand}`, baseBranch);
      if (!exists) {
        zipName = cand;
        break;
      }
    }
    const zipPath = `${zipPrefix}${zipName}`;

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

    let prTitle = "Theme submission";
    if (themeTitle && themeAuthor) prTitle = `${themeTitle} — ${themeAuthor}`;
    else if (themeTitle) prTitle = themeTitle;
    else if (themeAuthor) prTitle = `Theme submission — ${themeAuthor}`;

    const prBody = [
      "## New theme from the gallery uploader",
      "",
      `- Package: \`${originalName}\``,
      themeTitle ? `- Title (from config): ${themeTitle}` : null,
      themeAuthor ? `- Author (from config): ${themeAuthor}` : null,
      "",
      "**Automatic submission policy:**",
      "- Automatic submission only when `scripts/validate_theme_pr.py` passes.",
      "- If your theme’s **folder name** matches an existing gallery theme and the **author is the same** (or both unknown), this counts as an **update** — it stays with the team for manual review.",
      "- If the **author differs**, rename the root folder inside the ZIP to end with your suffix, e.g. `MyTheme-yourhandle` (use the same slug style as your uploader / `theme_info.author`), then upload again — otherwise automatic submission is not available.",
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
