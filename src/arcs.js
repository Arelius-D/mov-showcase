/* ═══════════════════════════════════════════════════
   mov-showcase — arcs: endpoints to curves

   One SVG overlay over the zones, click-through. Paths are computed from where
   the objects actually ended up, never from hand-placed coordinates, so the map
   survives a resize, a font that loads late, and an object added to map.js.

   Two routing cases, because one rule cannot serve both:

     cross-zone  anchored on the facing sides, control points pushed along the
                 horizontal, so the curve leaves and arrives travelling the way
                 the eye is already moving.

     same-zone   both ends on the left edge, bowed left but kept inside the
                 card. Objects in a zone are a vertical stack, so a straight
                 line between two of them cuts through everything in between.

   Coordinates here are CSS pixels, which is what getBoundingClientRect deals
   in and what an SVG with no viewBox uses as its user units. The no-px rule is
   a rule about the stylesheet, where a hard length would break someone's zoom.
   ═══════════════════════════════════════════════════ */

window.MOV = window.MOV || {};

(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  var MIN_PUSH = 40; /* keeps short hops curved rather than nearly straight */
  var PUSH_RATIO = 0.45;
  /* Objects sit one --space-md in from their zone's edge, so a bow wider than
     that escapes the card. It used to reach well outside the map, which was
     invisible while the arcs painted underneath and became a line across the
     masthead the moment they came to the front. */
  var BOW_MIN = 9;
  var BOW_RATIO = 0.1;
  var BOW_MAX = 15;
  var LABEL_LIFT = 4; /* sit the label just off the line, not on it */

  function box(id, origin) {
    var node = document.getElementById("object-" + id);
    if (!node) return null;
    var rect = node.getBoundingClientRect();
    return {
      left: rect.left - origin.left,
      right: rect.right - origin.left,
      cx: rect.left + rect.width / 2 - origin.left,
      cy: rect.top + rect.height / 2 - origin.top,
    };
  }

  /* A cubic's midpoint, which is where the label goes. Not the average of the
     endpoints: on a bowed curve that lands well off the line. */
  function midpoint(p) {
    return {
      x: (p.x1 + 3 * p.c1x + 3 * p.c2x + p.x2) / 8,
      y: (p.y1 + 3 * p.c1y + 3 * p.c2y + p.y2) / 8,
    };
  }

  function route(a, b, sameZone) {
    if (sameZone) {
      var bow = Math.min(
        BOW_MAX,
        Math.max(BOW_MIN, Math.abs(b.cy - a.cy) * BOW_RATIO)
      );
      return {
        x1: a.left,
        y1: a.cy,
        c1x: a.left - bow,
        c1y: a.cy,
        c2x: b.left - bow,
        c2y: b.cy,
        x2: b.left,
        y2: b.cy,
      };
    }

    var rightward = a.cx < b.cx;
    var x1 = rightward ? a.right : a.left;
    var x2 = rightward ? b.left : b.right;
    var push = Math.max(MIN_PUSH, Math.abs(x2 - x1) * PUSH_RATIO);
    var sign = rightward ? 1 : -1;

    return {
      x1: x1,
      y1: a.cy,
      c1x: x1 + push * sign,
      c1y: a.cy,
      c2x: x2 - push * sign,
      c2y: b.cy,
      x2: x2,
      y2: b.cy,
    };
  }

  function d(p) {
    return (
      "M" + p.x1 + " " + p.y1 +
      " C" + p.c1x + " " + p.c1y +
      " " + p.c2x + " " + p.c2y +
      " " + p.x2 + " " + p.y2
    );
  }

  function svg(name, attributes) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attributes).forEach(function (key) {
      node.setAttribute(key, attributes[key]);
    });
    return node;
  }

  var zoneOf = {};

  function build(layer) {
    window.MOV.OBJECTS.forEach(function (item) {
      zoneOf[item.id] = item.zone;
    });

    window.MOV.ARCS.forEach(function (arc, index) {
      /* Cross-zone arcs are the structure of the page and are drawn at rest.
         Arcs inside a zone are detail: at rest they are noise hugging the edge
         of a card with nothing on the other side of them, so they wait to be
         asked for. The router already knows which is which. */
      var span = zoneOf[arc.from] === zoneOf[arc.to] ? "same" : "cross";
      var path = svg("path", {
        class: "arc",
        "data-kind": arc.kind,
        "data-span": span,
      });
      path.dataset.arc = String(index);
      path.dataset.from = arc.from;
      path.dataset.to = arc.to;
      layer.appendChild(path);

      var label = svg("text", {
        class: "arc-label",
        "text-anchor": "middle",
      });
      label.dataset.arc = String(index);
      label.textContent = arc.label;
      layer.appendChild(label);
    });
  }

  function place(layer, map) {
    var origin = map.getBoundingClientRect();

    window.MOV.ARCS.forEach(function (arc, index) {
      var a = box(arc.from, origin);
      var b = box(arc.to, origin);
      var path = layer.querySelector('path[data-arc="' + index + '"]');
      var label = layer.querySelector('text[data-arc="' + index + '"]');
      if (!a || !b || !path) return;

      var geometry = route(a, b, zoneOf[arc.from] === zoneOf[arc.to]);
      path.setAttribute("d", d(geometry));

      var middle = midpoint(geometry);
      label.setAttribute("x", middle.x);
      label.setAttribute("y", middle.y - LABEL_LIFT);
    });
  }

  window.MOV.arcs = function () {
    var layer = document.getElementById("arcs");
    var map = document.getElementById("map");

    build(layer);
    place(layer, map);

    /* Re-measure whenever the map changes size for any reason: a window
       resize, a font arriving, the panel growing as someone reads. Observing
       the element covers all three; listening for `resize` covers only one. */
    if (typeof ResizeObserver === "function") {
      new ResizeObserver(function () {
        place(layer, map);
      }).observe(map);
    } else {
      window.addEventListener("resize", function () {
        place(layer, map);
      });
    }

    /* Web fonts change every measurement when they land. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        place(layer, map);
      });
    }
  };
})();
