import { handleUploadOptions, handleUploadPost } from "../_lib/theme-upload-handler.js";

export async function onRequestOptions() {
  return handleUploadOptions();
}

export async function onRequestPost(context) {
  return handleUploadPost(context.request, context.env || {});
}
