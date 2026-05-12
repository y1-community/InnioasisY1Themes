/**
 * Gallery metadata-only PRs: modify existing ThemeName/config.json theme_info and/or
 * themes.json listing fields (name, author, authorUrl) without uploading binaries.
 */

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const LISTING_KEYS = new Set(["name", "author", "authorUrl"]);
const THEME_INFO_KEYS = new Set(["title", "author", "authorUrl", "description"]);

const RESERVED_TOP = new Set([
  "scripts",
  "functions",
  "assets",
  ".github",
  "workers",
  "themes",
  "node_modules",
  "creators",
]);

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: CORS_HEADERS,
  });
}

export function handleMetadataOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

function encodeRepoPath(path) {
  return String(path || "")
    .split("/")
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join("/");
}

function decodeBase64Utf8(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function toBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text);
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
      "User-Agent": "y1-theme-metadata/1.0 (+https://github.com/y1-community/InnioasisY1Themes)",
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
    let detail = parts.filter(Boolean).join(" — ") || raw?.slice(0, 300) || `HTTP ${res.status}`;
    const prefix = context ? `${context}: ` : "";
    throw new Error(`${prefix}GitHub API ${res.status}: ${detail}`);
  }
  return json;
}

function stableStringify(obj) {
  return JSON.stringify(obj, null, 2) + "\n";
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 */
export async function handleMetadataPost(request, env) {
  try {
    const token = env.GITHUB_UPLOAD_TOKEN;
    const owner = env.GITHUB_OWNER || "y1-community";
    const repo = env.GITHUB_REPO || "InnioasisY1Themes";
    const baseBranch = env.GITHUB_BASE_BRANCH || "main";
    const maxItems = Math.max(
      1,
      Math.min(100, Number(env.METADATA_API_MAX_ITEMS || 25) || 25)
    );

    if (!token) {
      return jsonResponse({ error: "Server upload token is not configured." }, 500);
    }

    const ct = String(request.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("application/json")) {
      return jsonResponse({ error: "Content-Type must be application/json." }, 400);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body." }, 400);
    }
    if (!body || typeof body !== "object") {
      return jsonResponse({ error: "Body must be a JSON object." }, 400);
    }

    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) {
      return jsonResponse({ error: "Provide a non-empty items array." }, 400);
    }
    if (items.length > maxItems) {
      return jsonResponse({ error: `At most ${maxItems} theme(s) per metadata request.` }, 400);
    }

    const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

    const baseRef = await ghJson(
      `${apiBase}/git/ref/heads/${encodeURIComponent(baseBranch)}`,
      token,
      {},
      `read base branch ${baseBranch}`
    );
    const baseSha = baseRef?.object?.sha;
    if (!baseSha) {
      throw new Error(`Could not resolve base branch SHA for ${baseBranch}.`);
    }

    const puts = [];

    for (const raw of items) {
      if (!raw || typeof raw !== "object") {
        return jsonResponse({ error: "Each item must be an object." }, 400);
      }
      const folder = String(raw.folder || "").trim();
      if (!folder || folder.includes("..") || folder.includes("/") || folder.startsWith(".")) {
        return jsonResponse({ error: `Invalid folder: ${folder || "(empty)"}` }, 400);
      }
      const top = folder.split("/")[0];
      if (RESERVED_TOP.has(top)) {
        return jsonResponse({ error: "That folder cannot be updated via this API." }, 400);
      }

      const themeInfo = raw.themeInfo && typeof raw.themeInfo === "object" ? raw.themeInfo : {};
      const listing = raw.listing && typeof raw.listing === "object" ? raw.listing : null;

      const path = `${folder}/config.json`;
      const enc = encodeRepoPath(path);
      const fileMeta = await ghJson(
        `${apiBase}/contents/${enc}?ref=${encodeURIComponent(baseBranch)}`,
        token,
        {},
        `read ${path}`
      );
      if (!fileMeta || !fileMeta.content) {
        return jsonResponse({ error: `Missing ${path} on default branch.` }, 404);
      }

      let config;
      try {
        config = JSON.parse(decodeBase64Utf8(fileMeta.content));
      } catch {
        return jsonResponse({ error: `${path} is not valid JSON on the server.` }, 400);
      }
      if (!config || typeof config !== "object") {
        return jsonResponse({ error: `${path} must be a JSON object.` }, 400);
      }

      const block = config.theme_info && typeof config.theme_info === "object" ? config.theme_info : {};
      const nextTi = { ...block };
      for (const k of Object.keys(themeInfo)) {
        if (!THEME_INFO_KEYS.has(k)) continue;
        const v = themeInfo[k];
        if (v === undefined) continue;
        nextTi[k] = typeof v === "string" ? v : String(v ?? "");
      }
      const nextConfig = { ...config, theme_info: nextTi };
      const nextText = stableStringify(nextConfig);
      const prevText = stableStringify(config);
      if (nextText !== prevText) {
        puts.push({ path, content: nextText, sha: fileMeta.sha });
      }

      if (listing && Object.keys(listing).length > 0) {
        for (const k of Object.keys(listing)) {
          if (!LISTING_KEYS.has(k)) {
            return jsonResponse({ error: `Listing key not allowed: ${k}` }, 400);
          }
        }
        puts.push({ _listingUpdate: true, folder, listing });
      }
    }

    const themesFile = await ghJson(
      `${apiBase}/contents/themes.json?ref=${encodeURIComponent(baseBranch)}`,
      token,
      {},
      "read themes.json"
    );
    if (!themesFile || !themesFile.content) {
      throw new Error("Could not read themes.json from base branch.");
    }
    let themesData;
    try {
      themesData = JSON.parse(decodeBase64Utf8(themesFile.content));
    } catch {
      return jsonResponse({ error: "themes.json on server is invalid JSON." }, 500);
    }
    const prevThemesText = stableStringify(themesData);
    const list = JSON.parse(JSON.stringify(Array.isArray(themesData.themes) ? themesData.themes : []));
    let themesChanged = false;
    for (const put of puts) {
      if (!put._listingUpdate) continue;
      const idx = list.findIndex((t) => t && String(t.folder || "").trim() === put.folder);
      if (idx < 0) {
        return jsonResponse({ error: `Folder ${put.folder} not found in themes.json.` }, 400);
      }
      const row = { ...list[idx] };
      for (const k of Object.keys(put.listing)) {
        if (!LISTING_KEYS.has(k)) continue;
        const v = put.listing[k];
        row[k] = typeof v === "string" ? v : String(v ?? "");
      }
      if (JSON.stringify(row) !== JSON.stringify(list[idx])) {
        themesChanged = true;
      }
      list[idx] = row;
    }
    const nextThemesText = stableStringify({ themes: list });
    let fileCommits = puts.filter((p) => !p._listingUpdate);
    if (!fileCommits.length && !themesChanged) {
      return jsonResponse(
        {
          error:
            "No changes detected. Edit the description or other fields, or upload a new theme package.",
        },
        400
      );
    }

    const now = Date.now();
    const branchName = `upload/metadata-${now}-${Math.random().toString(36).slice(2, 8)}`;

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

    for (const p of fileCommits) {
      const enc = encodeRepoPath(p.path);
      await ghJson(
        `${apiBase}/contents/${enc}`,
        token,
        {
          method: "PUT",
          body: JSON.stringify({
            message: `Gallery metadata: update ${p.path}`,
            content: toBase64Utf8(p.content),
            sha: p.sha,
            branch: branchName,
          }),
        },
        `commit ${p.path}`
      );
    }

    if (themesChanged && nextThemesText !== prevThemesText) {
      const themesOnBranch = await ghJson(
        `${apiBase}/contents/themes.json?ref=${encodeURIComponent(branchName)}`,
        token,
        {},
        "read themes.json on branch"
      );
      await ghJson(
        `${apiBase}/contents/themes.json`,
        token,
        {
          method: "PUT",
          body: JSON.stringify({
            message: "Gallery metadata: update themes.json",
            content: toBase64Utf8(nextThemesText),
            sha: themesOnBranch.sha,
            branch: branchName,
          }),
        },
        "commit themes.json"
      );
      fileCommits = [...fileCommits, { path: "themes.json" }];
    }

    const prTitle = `Gallery: metadata update (${items.length} theme(s))`;
    const prBody = [
      "## Metadata-only update (gallery)",
      "",
      "This PR was opened from the theme gallery **metadata** flow (no new image binaries).",
      "",
      "**Changed paths:**",
      ...fileCommits.map((p) => `- \`${p.path}\``),
      "",
      "Automatic merge applies only when `scripts/validate_theme_pr.py` passes on this PR.",
    ].join("\n");

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
    const message = error instanceof Error ? error.message : "Metadata request failed.";
    console.error("[theme-metadata]", message);
    return jsonResponse({ error: message }, 500);
  }
}
