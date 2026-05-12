import { handleUploadOptions, handleUploadPost } from "../../../functions/_lib/theme-upload-handler.js";

const UPLOAD_PATH = "/api/upload-theme";

export default {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);
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
