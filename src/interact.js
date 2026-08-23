/* ═══════════════════════════════════════════════════
   mov-showcase — hover, selection, and the panel

   One piece of state: which object is active, and whether that came from
   hovering or from clicking. Everything visible is derived from it in a single
   pass, so there is no way for the arcs to be lit for one object while the
   panel describes another.

   Hover is transient and click is sticky. Moving the mouse away from a clicked
   object returns to that object rather than to nothing, which is what lets
   someone select a thing and then read its detail without the map going dark
   the moment the pointer leaves.
   ═══════════════════════════════════════════════════ */

window.MOV = window.MOV || {};

(function () {
  "use strict";

  var THEMES = { "deep-field": "Light", paper: "Dark" };
  var STORED_THEME = "mov-showcase-theme";

  var selected = null; /* set by clicking; survives the pointer leaving */
  var hovered = null; /* set by pointer or focus; transient */

  var map, panel, byId, related;

  /* For each object, everything it touches. Built once: the answer never
     changes, and recomputing it on every hover is work for nothing. */
  function relations() {
    var index = {};
    window.MOV.OBJECTS.forEach(function (item) {
      index[item.id] = { objects: {}, arcs: [] };
    });
    window.MOV.ARCS.forEach(function (arc, position) {
      if (!index[arc.from] || !index[arc.to]) return;
      index[arc.from].objects[arc.to] = arc.label;
      index[arc.to].objects[arc.from] = arc.label;
      index[arc.from].arcs.push(position);
      index[arc.to].arcs.push(position);
    });
    return index;
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function describe(item) {
    panel.textContent = "";

    if (!item) {
      panel.appendChild(
        element(
          "p",
          "panel__empty",
          "Hover anything to see what it connects to. Click to keep it open."
        )
      );
      return;
    }

    panel.appendChild(element("span", "panel__kind", item.kind));
    panel.appendChild(element("h2", "panel__name", item.name));
    panel.appendChild(element("p", "panel__detail", item.detail));

    if (item.evidence) {
      var figure = element("figure");
      figure.appendChild(element("pre", "panel__evidence", item.evidence.text));
      panel.appendChild(figure);
    }

    /* The same relationships the arcs draw, as text. The SVG is hidden from
       assistive technology, so this is where that information actually lives
       for anyone not looking at curves. */
    var connections = Object.keys(related[item.id].objects);
    if (connections.length) {
      var links = element("div", "panel__links");
      links.appendChild(
        element("p", "panel__links-title", connections.length + " connections")
      );
      connections.forEach(function (id) {
        var link = element("button", "panel__link");
        link.type = "button";
        link.dataset.object = id;
        link.appendChild(element("span", null, byId[id].name + " "));
        link.appendChild(
          element("span", "panel__link-verb", related[item.id].objects[id])
        );
        links.appendChild(link);
      });
      panel.appendChild(links);
    }
  }

  function paint() {
    var active = hovered || selected;

    map.classList.toggle("is-focused", Boolean(active));

    var lit = active ? related[active] : null;

    document.querySelectorAll(".object").forEach(function (node) {
      var id = node.dataset.object;
      node.classList.toggle("is-active", Boolean(active) && id === active);
      node.classList.toggle(
        "is-related",
        Boolean(lit) && Object.prototype.hasOwnProperty.call(lit.objects, id)
      );
      node.setAttribute("aria-pressed", String(id === selected));
    });

    document.querySelectorAll(".arc, .arc-label").forEach(function (node) {
      var position = Number(node.dataset.arc);
      node.classList.toggle(
        "is-related",
        Boolean(lit) && lit.arcs.indexOf(position) !== -1
      );
    });

    describe(active ? byId[active] : null);
  }

  function select(id) {
    selected = selected === id ? null : id;
    hovered = null;
    paint();
  }

  function bind() {
    /* Delegated: one listener each rather than one per object, so objects
       rendered from data need no wiring of their own. */
    map.addEventListener("pointerover", function (event) {
      var node = event.target.closest(".object");
      if (!node) return;
      hovered = node.dataset.object;
      paint();
    });

    map.addEventListener("pointerout", function (event) {
      if (!event.target.closest(".object")) return;
      hovered = null;
      paint();
    });

    map.addEventListener("click", function (event) {
      var node = event.target.closest(".object");
      if (!node) return;
      select(node.dataset.object);
    });

    /* Keyboard focus is the same signal as hover: tabbing across the map
       should light it up exactly as moving a mouse across it does. */
    map.addEventListener("focusin", function (event) {
      var node = event.target.closest(".object");
      if (!node) return;
      hovered = node.dataset.object;
      paint();
    });

    map.addEventListener("focusout", function (event) {
      if (!event.target.closest(".object")) return;
      hovered = null;
      paint();
    });

    /* Following a connection from the panel moves the map with you, and moves
       focus too, so a keyboard user is not left behind where they clicked. */
    panel.addEventListener("click", function (event) {
      var link = event.target.closest(".panel__link");
      if (!link) return;
      selected = link.dataset.object;
      hovered = null;
      paint();
      var target = document.getElementById("object-" + selected);
      if (target) target.focus();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || !selected) return;
      selected = null;
      hovered = null;
      paint();
    });

    document.addEventListener("click", function (event) {
      if (event.target.closest(".map") || event.target.closest(".panel")) return;
      if (!selected) return;
      selected = null;
      paint();
    });
  }


  /* ── zoom ──────────────────────────────────────────
     One transform on one element. The arcs live inside it, so nothing is
     recomputed — they scale with what they connect.

     The stage is laid out at the inverse of the scale and then drawn at it, so
     the two cancel and the rendered width never changes. Zoom changes how much
     fits, not how much room is needed, which is why there is no overflow and
     no scrollbar of its own. The browser already has one.
     ────────────────────────────────────────────────── */
  var MIN_SCALE = 0.6;
  var MAX_SCALE = 1.4;
  var SCALE_STEP = 0.1;
  var STORED_SCALE = "mov-showcase-scale";

  var scale = 1;
  var stage, mapBox, level;

  function clamp(value) {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(value * 100) / 100));
  }

  /* Width cancels out; height does not. A transform never changes layout size,
     so the stage still reserves its unscaled height: too much of it when zoomed
     out, too little when zoomed in, where it would run under the legend. The
     map is given the height the stage is actually drawn at. This is honest
     space, not a scroll container — the page keeps scrolling as one page. */
  function reserve() {
    mapBox.style.height = stage.offsetHeight * scale + "px";
  }

  function applyScale(next) {
    scale = clamp(next);
    /* One property. The stylesheet works out both the transform and the
       compensating width from it, so the two can never disagree. */
    stage.style.setProperty("--scale", String(scale));
    reserve();
    level.textContent = Math.round(scale * 100) + "%";
    try {
      localStorage.setItem(STORED_SCALE, String(scale));
    } catch (ignored) {
      /* Storage refused. The zoom still works, it just will not be remembered. */
    }
  }

  function zoom() {
    stage = document.getElementById("stage");
    mapBox = document.getElementById("map");
    level = document.getElementById("zoom-reset");

    var stored = null;
    try {
      stored = parseFloat(localStorage.getItem(STORED_SCALE));
    } catch (ignored) {
      stored = null;
    }

    document.getElementById("zoom-in").addEventListener("click", function () {
      applyScale(scale + SCALE_STEP);
    });
    document.getElementById("zoom-out").addEventListener("click", function () {
      applyScale(scale - SCALE_STEP);
    });
    level.addEventListener("click", function () {
      applyScale(1);
    });

    /* Ctrl+wheel is the gesture people already use to zoom, and the browser's
       own version of it would zoom the whole page including the controls. Only
       claimed over the map, and only with the modifier held, so ordinary
       scrolling is untouched. */
    mapBox.addEventListener(
      "wheel",
      function (event) {
        if (!event.ctrlKey) return;
        event.preventDefault();
        applyScale(scale + (event.deltaY < 0 ? SCALE_STEP : -SCALE_STEP));
      },
      { passive: false }
    );

    /* The stage's own height changes with the window, and the reserved space
       has to follow it rather than the height it had when the page loaded. */
    if (typeof ResizeObserver === "function") {
      new ResizeObserver(reserve).observe(stage);
    } else {
      window.addEventListener("resize", reserve);
    }

    applyScale(stored && !Number.isNaN(stored) ? stored : 1);
  }

  function theme() {
    var button = document.getElementById("theme-toggle");
    var label = document.getElementById("theme-toggle-label");

    function apply(name) {
      document.documentElement.setAttribute("data-theme", name);
      label.textContent = THEMES[name];
      try {
        localStorage.setItem(STORED_THEME, name);
      } catch (ignored) {
        /* A private window, or storage switched off. The page works without
           remembering; refusing to render because of it would not. */
      }
    }

    var stored = null;
    try {
      stored = localStorage.getItem(STORED_THEME);
    } catch (ignored) {
      stored = null;
    }

    if (stored && THEMES[stored]) {
      apply(stored);
    } else {
      /* No explicit choice yet: leave the attribute off so the stylesheet's
         prefers-color-scheme block decides, and label the button with the
         other option. */
      var wantsLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      label.textContent = wantsLight ? "Dark" : "Light";
    }

    button.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme");
      if (!current) {
        current = window.matchMedia("(prefers-color-scheme: light)").matches
          ? "paper"
          : "deep-field";
      }
      apply(current === "paper" ? "deep-field" : "paper");
    });
  }

  window.addEventListener("DOMContentLoaded", function () {
    map = document.getElementById("map");
    panel = document.getElementById("panel");

    window.MOV.render();
    byId = window.MOV.byId();
    related = relations();

    window.MOV.arcs();
    zoom();
    theme();
    bind();
    paint();
  });
})();
