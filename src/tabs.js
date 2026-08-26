/* ═══════════════════════════════════════════════════
   mov-showcase — three views, one page

   The map, the CLI session and the TUI screens are separate files with
   separate renderers, and this is the only thing that knows they all exist.
   The active view lives in the URL hash, so a link can open any of them and
   nothing needs storage.

   Standard tablist behaviour: Left, Right, Home and End move between tabs and
   activate as they go; the inactive tabs are out of the tab order so one Tab
   press leaves the bar.

   Switching to the map re-measures its arcs, because a panel that was hidden
   at load measured every object at nothing.
   ═══════════════════════════════════════════════════ */

window.MOV = window.MOV || {};

(function () {
  "use strict";

  var VIEWS = ["map", "cli", "tui"];
  var DEFAULT = "map";

  var page, tabs, panels;

  function fromHash() {
    var name = (window.location.hash || "").replace(/^#/, "");
    return VIEWS.indexOf(name) === -1 ? DEFAULT : name;
  }

  function activate(name, focusTab) {
    VIEWS.forEach(function (view) {
      var active = view === name;
      tabs[view].setAttribute("aria-selected", String(active));
      tabs[view].tabIndex = active ? 0 : -1;
      panels[view].hidden = !active;
    });
    page.dataset.view = name;

    if (window.location.hash.replace(/^#/, "") !== name) {
      /* replaceState rather than assigning the hash: no scroll jump, and the
         back button is not filled with tab switches. */
      window.history.replaceState(null, "", "#" + name);
    }

    if (focusTab) tabs[name].focus();

    if (name === "map" && typeof window.MOV.arcs === "function") {
      window.MOV.arcs();
    }
    if (name === "cli" && typeof window.MOV.terminal === "function") {
      window.MOV.terminal(document.getElementById("session"));
    }
    if (name === "tui" && typeof window.MOV.screens === "function") {
      window.MOV.screens(document.getElementById("screens"));
    }
  }

  function keys(event) {
    var current = VIEWS.indexOf(page.dataset.view);
    var next = null;
    if (event.key === "ArrowRight") next = (current + 1) % VIEWS.length;
    if (event.key === "ArrowLeft") next = (current - 1 + VIEWS.length) % VIEWS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = VIEWS.length - 1;
    if (next === null) return;
    event.preventDefault();
    activate(VIEWS[next], true);
  }

  window.addEventListener("DOMContentLoaded", function () {
    page = document.querySelector(".page");
    tabs = {};
    panels = {};
    VIEWS.forEach(function (view) {
      tabs[view] = document.getElementById("tab-" + view);
      panels[view] = document.getElementById("view-" + view);
      tabs[view].addEventListener("click", function () {
        activate(view, false);
      });
    });
    document.querySelector(".tabs").addEventListener("keydown", keys);
    window.addEventListener("hashchange", function () {
      activate(fromHash(), false);
    });
    activate(fromHash(), false);
  });
})();
