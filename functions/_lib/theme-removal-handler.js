/**
 * Theme removal: opens a tracked change that deletes the theme folder and removes themes.json entry.
 * Never published automatically (title prefix [Removal]; workflow skips automatic handling).
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

/** Normalize user/catalog strings for confirmation compare (trim, collapse spaces, case-insensitive). */
function normConfirmText(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}

function redactEmailLikeText(value) {
  return String(value || "").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]");
}

async function readThemeConfigAuthorFromBase(apiBase, token, folder, branch) {
  const enc = encodeRepoPath(`${folder}/config.json`);
  try {
    const data = await ghJson(
      `${apiBase}/contents/${enc}?ref=${encodeURIComponent(branch)}`,
      token,
      {},
      `read ${folder}/config.json for author`
    );
    if (!data || !data.content) return "";
    const parsed = JSON.parse(decodeBase64Utf8(data.content));
    if (!parsed || typeof parsed !== "object") return "";
    for (const key of ["theme_info", "source_info"]) {
      const block = parsed[key];
      if (block && typeof block === "object") {
        const auth = block.author;
        if (typeof auth === "string" && auth.trim()) return auth.trim();
      }
    }
  } catch {
    return "";
  }
  return "";
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
    const safeRequester = redactEmailLikeText(requester);
    const safeReason = redactEmailLikeText(reason);

    const confirmNameRaw = String(form.get("confirmName") || "").trim();
    const confirmAuthorRaw = String(form.get("confirmAuthor") || "").trim();
    const contactEmail = String(form.get("contactEmail") || "").trim();
    const confirmContactEmail = String(form.get("confirmContactEmail") || "").trim();
    const blacklistOptOut = /^(1|true|yes|on)$/i.test(String(form.get("blacklistOptOut") || "").trim());

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

    if (!contactEmail || !isValidEmail(contactEmail)) {
      return jsonResponse({ error: "Enter a valid contact email so we can verify this request." }, 400);
    }
    if (confirmContactEmail && String(confirmContactEmail).trim() !== String(contactEmail).trim()) {
      return jsonResponse({ error: "Contact email fields do not match." }, 400);
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

    const baseCommit = await ghJson(
      `${apiBase}/git/commits/${encodeURIComponent(baseSha)}`,
      token,
      {},
      "read base commit"
    );
    const baseTreeSha = baseCommit?.tree?.sha;
    if (!baseTreeSha) {
      throw new Error("Could not resolve base tree SHA.");
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

    const catalogRow = list[idx];
    const catalogName = String(catalogRow.name || "").trim() || folderRaw;
    let catalogAuthor = String(catalogRow.author || "").trim();
    if (!catalogAuthor) {
      catalogAuthor = await readThemeConfigAuthorFromBase(apiBase, token, folderRaw, baseBranch);
    }

    if (!confirmNameRaw) {
      return jsonResponse({ error: "Type the catalog title exactly as shown for this theme." }, 400);
    }
    if (normConfirmText(confirmNameRaw) !== normConfirmText(catalogName)) {
      return jsonResponse(
        {
          error:
            "The title you typed does not match this theme’s catalog listing. Use the same spelling as the gallery (see the removal page).",
        },
        400
      );
    }
    if (catalogAuthor) {
      if (!confirmAuthorRaw) {
        return jsonResponse({ error: "Type the catalog author exactly as shown for this theme." }, 400);
      }
      if (normConfirmText(confirmAuthorRaw) !== normConfirmText(catalogAuthor)) {
        return jsonResponse(
          {
            error:
              "The author you typed does not match this theme’s catalog listing. Copy it from the removal form.",
          },
          400
        );
      }
    }

    const tree = await ghJson(
      `${apiBase}/git/trees/${encodeURIComponent(baseTreeSha)}?recursive=1`,
      token,
      {},
      "read repository tree"
    );
    const blobPaths = Array.isArray(tree?.tree)
      ? tree.tree
          .filter((node) => node && node.type === "blob" && typeof node.path === "string")
          .map((node) => String(node.path))
          .filter((p) => p === folderRaw || p.startsWith(`${folderRaw}/`))
      : [];
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

    const filtered = (Array.isArray(themesData.themes) ? themesData.themes : []).filter(
      (t) => !t || String(t.folder || "").trim() !== folderRaw
    );
    const nextJson = JSON.stringify({ themes: filtered }, null, 4) + "\n";
    const themesBlob = await ghJson(
      `${apiBase}/git/blobs`,
      token,
      {
        method: "POST",
        body: JSON.stringify({
          content: nextJson,
          encoding: "utf-8",
        }),
      },
      "create themes.json blob"
    );
    if (!themesBlob?.sha) {
      throw new Error("Could not create themes.json blob.");
    }

    const treeEntries = [
      ...[...new Set(blobPaths)].map((path) => ({
        path,
        mode: "100644",
        type: "blob",
        sha: null,
      })),
      {
        path: "themes.json",
        mode: "100644",
        type: "blob",
        sha: themesBlob.sha,
      },
    ];
    const nextTree = await ghJson(
      `${apiBase}/git/trees`,
      token,
      {
        method: "POST",
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeEntries,
        }),
      },
      "create removal tree"
    );
    if (!nextTree?.sha) {
      throw new Error("Could not create removal tree.");
    }

    const commit = await ghJson(
      `${apiBase}/git/commits`,
      token,
      {
        method: "POST",
        body: JSON.stringify({
          message: `Removal request: delete ${folderRaw} and update themes.json`,
          tree: nextTree.sha,
          parents: [baseSha],
        }),
      },
      "create removal commit"
    );
    const commitSha = commit?.sha;
    if (!commitSha) {
      throw new Error("Could not create removal commit.");
    }

    await ghJson(
      `${apiBase}/git/refs/heads/${encodeURIComponent(branchName)}`,
      token,
      {
        method: "PATCH",
        body: JSON.stringify({
          sha: commitSha,
          force: false,
        }),
      },
      "advance removal branch"
    );

    const prTitle = `[Removal] ${folderRaw}`;
    const prBody = [
      "## Theme removal request",
      "",
      `- **Folder:** \`${folderRaw}\``,
      `- **Catalog title:** ${catalogName}`,
      catalogAuthor ? `- **Catalog author:** ${catalogAuthor}` : `- **Catalog author:** _(none listed)_`,
      "- **Submitter contact email:** _(redacted; delivered privately via FabForm)_",
      safeRequester ? `- **Requester:** ${safeRequester}` : null,
      safeReason ? `- **Reason:** ${safeReason}` : null,
      `- **Blacklist preference:** ${blacklistOptOut ? "Requested (block re-uploads)" : "Not requested"}`,
      "",
      "The submitter confirmed the **listed title** (and **author**, if listed) before this request was created.",
      "",
      "This change **removes the theme folder** and **the catalog entry** in `themes.json`.",
      "",
      "**This request is not handled automatically.** A maintainer must review and complete (or decline) it manually. It is **not** eligible for automatic submission.",
      "",
      "### Verification note for original GitHub uploaders",
      "- If the original author/uploader added this theme using their GitHub account, they can verify consent by commenting on this PR.",
      "- A repository maintainer should manually compare that commenter’s displayed name/handle with the original uploader identity in repository history before approving removal.",
      "- Maintainer confirmation is required before merge.",
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
        themeFolder: folderRaw,
        catalogTitle: catalogName,
        catalogAuthor: catalogAuthor || "",
      },
      200
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Removal request failed.";
    console.error("[theme-removal]", message);
    return jsonResponse({ error: message }, 500);
  }
}
