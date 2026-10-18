/* ═══════════════════════════════════════════════════
   mov-showcase — which cloud the page shows

   Azure by default, AWS with ?cloud=aws. Chosen once, as the page loads and
   before anything is drawn: the AWS map, session and screens take the place of
   the Azure ones in window.MOV, and render.js, arcs.js, interact.js,
   terminal.js and screens.js draw whichever is there, the same way. The map is
   built once per load, so the switch is a link to the other one, never a
   rebuild in place.

   The links keep the view the page is on, so switching from the TUI tab lands
   on the other cloud's TUI tab.
   ═══════════════════════════════════════════════════ */

window.MOV = window.MOV || {};

(function () {
  "use strict";

  var CLOUDS = ["azure", "aws"];
  var DEFAULT = "azure";

  var asked = new URLSearchParams(window.location.search).get("cloud");
  var cloud = CLOUDS.indexOf(asked) === -1 ? DEFAULT : asked;
  window.MOV.cloud = cloud;

  if (cloud === "aws") {
    var aws = window.MOV.AWS;
    window.MOV.ZONES = aws.ZONES;
    window.MOV.GROUPS = aws.GROUPS;
    window.MOV.OBJECTS = aws.OBJECTS;
    window.MOV.ARCS = aws.ARCS;
    window.MOV.CLI = window.MOV.CLI_AWS;
    window.MOV.TUI = window.MOV.TUI_AWS;
  }

  function link(name) {
    var query = name === DEFAULT ? "" : "?cloud=" + name;
    return window.location.pathname + query + window.location.hash;
  }

  function point() {
    document.querySelectorAll(".cloud__choice").forEach(function (choice) {
      choice.setAttribute("href", link(choice.dataset.cloud));
    });
  }

  window.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".cloud__choice").forEach(function (choice) {
      var current = choice.dataset.cloud === cloud;
      choice.classList.toggle("is-current", current);
      if (current) choice.setAttribute("aria-current", "page");
    });
    point();
    /* The tabs change the hash with replaceState, which says nothing, so the
       link is pointed again as it is followed: the view the page is on then. */
    document.querySelectorAll(".cloud__choice").forEach(function (choice) {
      choice.addEventListener("click", point);
    });
  });
})();
