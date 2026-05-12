/**
 * Theme removal: opens a PR that deletes the theme folder and removes themes.json entry.
 * Never auto-merged (PR title prefix [Removal]; workflow skips merge).
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

export function handleRemovalOptions() {
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

async function ghJson(url, token, init = {}, context = "") {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "y1-theme-removal/1.0 (+https://github.com/y1-community/InnioasisY1Themes)",
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

/**
 * @param {string} apiBase
 * @param {string} token
 * @param {string} folder
 * @param {string} branch
 * @returns {Promise<string[]>} blob paths under folder
 */
async function collectBlobPathsUnderFolder(apiBase, token, folder, branch) {
  const enc = encodeRepoPath(folder);
  const url = `${apiBase}/contents/${enc}?ref=${encodeURIComponent(branch)}`;
  const data = await ghJson(url, token, {}, `list ${folder}`);

  if (!Array.isArray(data)) {
    if (data && data.type === "file" && data.path) {
      return [data.path];
    }
    return [];
  }

  const out = [];
  for (const item of data) {
    if (!item || !item.path) continue;
    if (item.type === "file") {
      out.push(item.path);
    } else if (item.type === "dir") {
      const sub = await collectBlobPathsUnderFolder(apiBase, token, item.path, branch);
      out.push(...sub);
    }
  }
  return out;
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 */
export async function handleRemovalPost(request, env) {
  try {
    const token = env.GITHUB_UPLOAD_TOKEN;
    const owner = env.GITHUB_OWNER || "y1-community";
    const repo = env.GITHUB_REPO || "InnioasisY1Themes";
    const baseBranch = env.GITHUB_BASE_BRANCH || "main";

    if (!token) {
      return jsonResponse({ error: "Server upload token is not configured." }, 500);
    }

    const form = await request.formData();
    const folderRaw = String(form.get("folder") || "").trim();
    const reason = String(form.get("reason") || "").trim();
    const requester = String(form.get("requester") || "").trim();
    const confirm = String(form.get("confirmFolder") || "").trim();

    if (!folderRaw) {
      return jsonResponse({ error: "Missing folder name." }, 400);
    }
    if (folderRaw.includes("..") || folderRaw.startsWith("/") || folderRaw.startsWith(".")) {
      return jsonResponse({ error: "Invalid folder path." }, 400);
    }
    const top = folderRaw.split("/")[0];
    if (RESERVED_TOP.has(top)) {
      return jsonResponse({ error: "That path cannot be removed via this form." }, 400);
    }
    if (confirm !== folderRaw) {
      return jsonResponse({ error: "Confirmation must match the folder name exactly." }, 400);
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

    const themesFile = await ghJson(
      `${apiBase}/contents/themes.json?ref=${encodeURIComponent(baseBranch)}`,
      token,
      {},
      "read themes.json"
    );
    if (!themesFile || !themesFile.content) {
      throw new Error("Could not read themes.json from base branch.");
    }
    const themesJsonText = decodeBase64Utf8(themesFile.content);
    const themesData = JSON.parse(themesJsonText);
    const list = Array.isArray(themesData.themes) ? themesData.themes : [];
    const idx = list.findIndex((t) => t && String(t.folder || "").trim() === folderRaw);
    if (idx < 0) {
      return jsonResponse({ error: "That folder is not listed in themes.json." }, 400);
    }
    if (String(list[idx].sourceType || "").toLowerCase() === "external") {
      return jsonResponse({ error: "External catalog entries cannot be removed this way." }, 400);
    }

    const blobPaths = await collectBlobPathsUnderFolder(apiBase, token, folderRaw, baseBranch);
    if (!blobPaths.length) {
      return jsonResponse({ error: "No files found for that folder on the default branch." }, 404);
    }

    const now = Date.now();
    const branchName = `upload/removal-${now}-${Math.random().toString(36).slice(2, 8)}`;

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

    const sortedPaths = [...new Set(blobPaths)].sort((a, b) => b.length - a.length);
    for (const path of sortedPaths) {
      const enc = encodeRepoPath(path);
      const meta = await ghJson(
        `${apiBase}/contents/${enc}?ref=${encodeURIComponent(branchName)}`,
        token,
        {},
        `read blob ${path}`
      );
      if (!meta || !meta.sha) continue;
      await ghJson(
        `${apiBase}/contents/${enc}`,
        token,
        {
          method: "DELETE",
          body: JSON.stringify({
            message: `Removal request: delete ${path}`,
            sha: meta.sha,
            branch: branchName,
          }),
        },
        `delete ${path}`
      );
      await new Promise((r) => setTimeout(r, 40));
    }

    const themesOnBranch = await ghJson(
      `${apiBase}/contents/themes.json?ref=${encodeURIComponent(branchName)}`,
      token,
      {},
      "read themes.json on branch"
    );
    const onBranchText = decodeBase64Utf8(themesOnBranch.content);
    const onBranchData = JSON.parse(onBranchText);
    const filtered = (Array.isArray(onBranchData.themes) ? onBranchData.themes : []).filter(
      (t) => !t || String(t.folder || "").trim() !== folderRaw
    );
    const nextJson = JSON.stringify({ themes: filtered }, null, 4) + "\n";
    await ghJson(
      `${apiBase}/contents/themes.json`,
      token,
      {
        method: "PUT",
        body: JSON.stringify({
          message: `Removal request: remove ${folderRaw} from themes.json`,
          content: toBase64Utf8(nextJson),
          sha: themesOnBranch.sha,
          branch: branchName,
        }),
      },
      "update themes.json"
    );

    const prTitle = `[Removal] ${folderRaw}`;
    const prBody = [
      "## Theme removal request",
      "",
      `- **Folder:** \`${folderRaw}\``,
      requester ? `- **Requester:** ${requester}` : null,
      reason ? `- **Reason:** ${reason}` : null,
      "",
      "This pull request **deletes the theme folder** and **removes the catalog entry** from `themes.json`.",
      "",
      "**This PR is not auto-merged.** A maintainer must review and merge (or close) manually.",
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
    const message = error instanceof Error ? error.message : "Removal request failed.";
    console.error("[theme-removal]", message);
    return jsonResponse({ error: message }, 500);
  }
}
