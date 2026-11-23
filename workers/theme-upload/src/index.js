import { handleUploadOptions, handleUploadPost } from "../../../functions/_lib/theme-upload-handler.js";
import { handleRemovalOptions, handleRemovalPost } from "../../../functions/_lib/theme-removal-handler.js";
import { handleMetadataOptions, handleMetadataPost } from "../../../functions/_lib/theme-metadata-handler.js";

const UPLOAD_PATH = "/api/upload-theme";
const REMOVAL_PATH = "/api/removal-request";
const METADATA_PATH = "/api/theme-metadata";
const HEALTH_PATH = "/health";

const HEALTH_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);
    if (url.pathname === HEALTH_PATH) {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: HEALTH_CORS_HEADERS });
      }
      if (request.method === "GET" || request.method === "HEAD") {
        return Response.json(
          {
            ok: true,
            worker: "y1-theme-upload",
            configured: Boolean(env && env.GITHUB_UPLOAD_TOKEN),
          },
          { status: 200, headers: { ...HEALTH_CORS_HEADERS, "Cache-Control": "no-store" } }
        );
      }
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { ...HEALTH_CORS_HEADERS, Allow: "GET, HEAD, OPTIONS" },
      });
    }
    if (url.pathname === METADATA_PATH) {
      if (request.method === "OPTIONS") {
        return handleMetadataOptions();
      }
      if (request.method === "POST") {
        return handleMetadataPost(request, env);
      }
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "POST, OPTIONS" },
      });
    }
    if (url.pathname === REMOVAL_PATH) {
      if (request.method === "OPTIONS") {
        return handleRemovalOptions();
      }
      if (request.method === "POST") {
        return handleRemovalPost(request, env);
      }
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "POST, OPTIONS" },
      });
    }
    if (url.pathname !== UPLOAD_PATH) {
      return new Response("Not Found", { status: 404 });
    }
    if (request.method === "OPTIONS") {
      return handleUploadOptions();
    }
    if (request.method === "POST") {
      return handleUploadPost(request, env);
    }
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "POST, OPTIONS" },
    });
  },
};
