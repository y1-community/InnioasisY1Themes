import {
  handleAnalyticsHealth,
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
const HEALTH_PATH = "/health";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return handleAnalyticsOptions(request);
    }

    if (path === HEALTH_PATH && (request.method === "GET" || request.method === "HEAD")) {
      return handleAnalyticsHealth(request, env);
    }
    if (path === STATS_PATH && request.method === "GET") {
      return handleThemeStatsGet(request, env, ctx);
    }
    if (path === PRIVACY_PATH && request.method === "GET") {
      return handleThemePrivacyGet(request, env);
    }
    if (path === PRIVACY_PATH && request.method === "POST") {
      return handleThemePrivacyPost(request, env);
    }
    if (path === EVENT_PATH && request.method === "POST") {
      return handleThemeEventPost(request, env, ctx);
    }
    if (path === RATING_PATH && request.method === "POST") {
      return handleThemeRatingPost(request, env, ctx);
    }

    return new Response("Not Found", { status: 404 });
  },
};
