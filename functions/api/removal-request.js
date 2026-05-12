import { handleRemovalOptions, handleRemovalPost } from "../_lib/theme-removal-handler.js";

export async function onRequestOptions() {
  return handleRemovalOptions();
}

export async function onRequestPost(context) {
  return handleRemovalPost(context.request, context.env || {});
}
