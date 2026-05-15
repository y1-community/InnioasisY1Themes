import {
  handleAnalyticsOptions,
  handleThemeEventPost,
  handleThemePrivacyGet,
  handleThemePrivacyPost,
  handleThemeRatingPost,
  handleThemeStatsGet,
} from "../../../functions/_lib/theme-analytics-handler.js";

const EVENT_PATH = "/api/theme-event";
const RATING_PATH = "/api/theme-rating";
const STATS_PATH = "/api/theme-stats";
const PRIVACY_PATH = "/api/theme-privacy";

export default {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return handleAnalyticsOptions();
    }

    if (path === STATS_PATH && request.method === "GET") {
      return handleThemeStatsGet(request, env);
    }
    if (path === PRIVACY_PATH && request.method === "GET") {
      return handleThemePrivacyGet(request, env);
    }
    if (path === PRIVACY_PATH && request.method === "POST") {
      return handleThemePrivacyPost(request, env);
    }
    if (path === EVENT_PATH && request.method === "POST") {
      return handleThemeEventPost(request, env);
    }
    if (path === RATING_PATH && request.method === "POST") {
      return handleThemeRatingPost(request, env);
    }

    return new Response("Not Found", { status: 404 });
  },
};
