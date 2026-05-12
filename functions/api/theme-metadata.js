import { handleMetadataOptions, handleMetadataPost } from "../_lib/theme-metadata-handler.js";

export async function onRequestOptions() {
  return handleMetadataOptions();
}

export async function onRequestPost(context) {
  return handleMetadataPost(context.request, context.env || {});
}
