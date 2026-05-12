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

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function ghJson(url, token, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      json && (json.message || json.error)
        ? `${json.message || json.error}`
        : `GitHub API error (${res.status})`;
    throw new Error(msg);
  }
  return json;
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
    const themeName = String(form.get("themeName") || "").trim();
    const uploaderName = String(form.get("uploaderName") || "").trim();
    const notes = String(form.get("notes") || "").trim();

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
    const zipPath = `${zipDir ? `${zipDir.replace(/^\/+|\/+$/g, "")}/` : ""}${now}-${originalName}`;
    const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

    const baseRef = await ghJson(`${apiBase}/git/ref/heads/${encodeURIComponent(baseBranch)}`, token);
    const baseSha = baseRef?.object?.sha;
    if (!baseSha) {
      throw new Error(`Could not resolve base branch SHA for ${baseBranch}.`);
    }

    await ghJson(`${apiBase}/git/refs`, token, {
      method: "POST",
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      }),
    });

    await ghJson(`${apiBase}/contents/${zipPath.split("/").map(encodeURIComponent).join("/")}`, token, {
      method: "PUT",
      body: JSON.stringify({
        message: `Upload theme zip: ${originalName}`,
        content: contentB64,
        branch: branchName,
      }),
    });

    const titlePieces = ["Theme zip upload"];
    if (themeName) titlePieces.push(`- ${themeName}`);
    const prTitle = titlePieces.join(" ");
    const prBody = [
      "## Uploaded via upload.html",
      "",
      `- File: \`${originalName}\``,
      uploaderName ? `- Uploader: ${uploaderName}` : null,
      notes ? `- Notes: ${notes}` : null,
      "",
      "This PR was created by the theme upload API.",
    ]
      .filter(Boolean)
      .join("\n");

    const pr = await ghJson(`${apiBase}/pulls`, token, {
      method: "POST",
      body: JSON.stringify({
        title: prTitle,
        head: branchName,
        base: baseBranch,
        body: prBody,
      }),
    });

    return jsonResponse(
      {
        ok: true,
        prUrl: pr.html_url || null,
        branch: branchName,
      },
      200
    );
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Upload failed." },
      500
    );
  }
}
