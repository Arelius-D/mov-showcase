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


  /* ── finder ────────────────────────────────────────
     Two ways to match, because one does not serve both intentions.

     Substring, over every field a visitor can read: someone hunting for "the
     one that clones the repo" is searching the detail, not the name.

     Subsequence, over the name alone: "vnw" should find vnet-novatrix-web.
     Run loose over the whole text it matches everything, which is how the
     first attempt returned 23 of 25 objects for a three-letter query. A name
     is short enough for the letters to mean something.

     A match brings its connections with it. On a map about relationships, an
     object on its own answers half the question.
     ────────────────────────────────────────────────── */
  var finder, counter;

  function subsequence(needle, haystack) {
    var at = 0;
    for (var i = 0; i < needle.length; i++) {
      at = haystack.indexOf(needle[i], at);
      if (at === -1) return false;
      at += 1;
    }
    return true;
  }

  function searchable(item) {
    return [
      item.name,
      item.short,
      item.blurb,
      item.detail,
      item.kind,
      item.evidence && item.evidence.text,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function matches(query, item) {
    if (searchable(item).indexOf(query) !== -1) return true;
    return [item.name, item.short].filter(Boolean).some(function (field) {
      return subsequence(query, field.toLowerCase());
    });
  }

  function filter(term) {
    var query = term.trim().toLowerCase();
    map.classList.toggle("is-filtered", Boolean(query));

    if (!query) {
      document.querySelectorAll(".object, .arc, .group").forEach(function (node) {
        node.classList.remove("is-match", "is-empty");
      });
      counter.textContent = "";
      return;
    }

    var hit = {};
    window.MOV.OBJECTS.forEach(function (item) {
      if (matches(query, item)) hit[item.id] = true;
    });

    /* Neighbours of a hit are shown too, dimmer only in the sense that they
       were not what you typed. */
    var shown = Object.assign({}, hit);
    Object.keys(hit).forEach(function (id) {
      Object.keys(related[id].objects).forEach(function (other) {
        shown[other] = true;
      });
    });

    document.querySelectorAll(".object").forEach(function (node) {
      node.classList.toggle("is-match", Boolean(shown[node.dataset.object]));
    });

    document.querySelectorAll(".arc, .arc-label").forEach(function (node) {
      var arc = window.MOV.ARCS[Number(node.dataset.arc)];
      node.classList.toggle("is-match", Boolean(hit[arc.from] || hit[arc.to]));
    });

    /* A group whose every object is dimmed is noise now. */
    document.querySelectorAll(".group").forEach(function (node) {
      var members = node.querySelectorAll(".object");
      var any = Array.prototype.some.call(members, function (object) {
        return shown[object.dataset.object];
      });
      node.classList.toggle("is-empty", !any);
    });

    var found = Object.keys(hit).length;
    counter.textContent = found ? found + " of " + window.MOV.OBJECTS.length : "nothing";
  }

  function search() {
    finder = document.getElementById("search");
    counter = document.getElementById("search-count");

    finder.addEventListener("input", function () {
      filter(finder.value);
    });

    finder.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      finder.value = "";
      filter("");
    });
  }

  function theme() {
    var button = document.getElementById("theme-toggle");

    var crossing = null;

    function apply(name) {
      /* Everything with a hover state is fast by default. For the length of a
         theme change it is not, so the whole page arrives together. */
      var root = document.documentElement;
      root.classList.add("is-theming");
      window.clearTimeout(crossing);
      crossing = window.setTimeout(function () {
        root.classList.remove("is-theming");
      }, 450);

      root.setAttribute("data-theme", name);
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

    /* No explicit choice yet: leave the attribute off so the stylesheet's
       prefers-color-scheme block decides what the glyph shows. */
    if (stored && THEMES[stored]) apply(stored);

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
    search();
    bind();
    paint();
  });
})();
