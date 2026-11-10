/*
 * Retired. The gallery has one search button, the large circle beside the
 * pager (gallery-chrome.js). This file used to add a second magnifier and a
 * close control inside the page numbers. If an older copy already inserted
 * them, remove them.
 */
(function () {
  "use strict";

  function strip(pager) {
    if (!pager) return;
    pager.querySelectorAll(".pager-search-box, .pager-search-toggle, .pager-search-close").forEach(function (node) {
      node.remove();
    });
    pager.classList.remove("is-searching");
  }

  function boot() {
    var pager = document.getElementById("theme-pager-top");
    strip(pager);
    if (pager && typeof MutationObserver === "function") {
      new MutationObserver(function () { strip(pager); }).observe(pager, { childList: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
