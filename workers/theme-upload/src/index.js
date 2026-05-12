import { handleUploadOptions, handleUploadPost } from "../../../functions/_lib/theme-upload-handler.js";
import { handleRemovalOptions, handleRemovalPost } from "../../../functions/_lib/theme-removal-handler.js";
import { handleMetadataOptions, handleMetadataPost } from "../../../functions/_lib/theme-metadata-handler.js";

const UPLOAD_PATH = "/api/upload-theme";
const REMOVAL_PATH = "/api/removal-request";
const METADATA_PATH = "/api/theme-metadata";

export default {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);
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
