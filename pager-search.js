/*
 * The pager turns into a search field.
 *
 * A magnifier sits beside the page numbers. Opening it hides the pages and
 * shows a field bound to the page's real #theme-search input, so the existing
 * filter code runs unchanged; the × clears the query and puts the magnifier
 * back. renderPager() replaces the pager's innerHTML on every page change, so
 * a MutationObserver re-mounts the controls after each render.
 */
(function () {
  "use strict";

  function realSearch() {
    var input = document.getElementById("theme-search");
    if (input) return input;
    return document.querySelector(".topbar-search, #global-theme-search");
  }

  function build(pager) {
    if (pager.querySelector(".pager-search-box")) return;

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "pager-search-toggle";
    toggle.setAttribute("aria-label", "Search themes");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = '<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.2"/><path d="m12.6 12.6 3.2 3.2"/></svg>';

    var box = document.createElement("div");
    box.className = "pager-search-box";
    box.setAttribute("role", "search");
    box.innerHTML = '<input class="pager-search-input" type="search" placeholder="Search" aria-label="Search themes" autocomplete="off"><button class="pager-search-close" type="button" aria-label="Close search">&times;</button>';

    pager.appendChild(box);
    pager.appendChild(toggle);

    var input = box.querySelector(".pager-search-input");
    var close = box.querySelector(".pager-search-close");

    function open() {
      var real = realSearch();
      input.value = real ? real.value : "";
      pager.classList.add("is-searching");
      toggle.setAttribute("aria-expanded", "true");
      input.focus();
      try { input.select(); } catch (_) {}
    }

    function shut(clear) {
      pager.classList.remove("is-searching");
      toggle.setAttribute("aria-expanded", "false");
      if (clear) {
        input.value = "";
        var real = realSearch();
        if (real) {
          real.value = "";
          real.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
      toggle.focus();
    }

    toggle.addEventListener("click", function () {
      if (pager.classList.contains("is-searching")) shut(false);
      else open();
    });

    close.addEventListener("click", function () { shut(true); });

    input.addEventListener("input", function () {
      var real = realSearch();
      if (!real) return;
      real.value = input.value;
      real.dispatchEvent(new Event("input", { bubbles: true }));
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        shut(false);
      }
    });
  }

  function mount() {
    var pager = document.getElementById("theme-pager-top");
    if (!pager) return;
    if (pager.hidden) {
      if (pager.querySelector(".pager-search-box")) pager.innerHTML = "";
      return;
    }
    build(pager);
  }

  function boot() {
    mount();
    var pager = document.getElementById("theme-pager-top");
    if (pager && typeof MutationObserver === "function") {
      new MutationObserver(function () {
        if (!pager.hidden && !pager.querySelector(".pager-search-box")) build(pager);
      }).observe(pager, { childList: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
