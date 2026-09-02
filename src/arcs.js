/* ═══════════════════════════════════════════════════
   mov-showcase — arcs: endpoints to curves

   One SVG overlay over the zones, click-through. Paths are computed from where
   the objects actually ended up, never from hand-placed coordinates, so the map
   survives a resize, a font that loads late, and an object added to map.js.

   Two routing cases, because one rule cannot serve both:

     cross-zone  anchored on the facing edges of whichever axis the two are
                 further apart on, with the control points pushed along it, so
                 a curve leaves and arrives travelling the way it is going.

     same-zone   both ends on the left edge, bowed left but kept inside the
                 card. Two objects in one group sit close together, so the bow
                 has to be generous or the arc is a stub rather than a curve.

   Coordinates here are CSS pixels in the stage's own layout space, which is
   what an SVG with no viewBox uses as its user units. The no-px rule is a rule
   about the stylesheet, where a hard length would break someone's zoom.
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
  var BOW_MIN = 14;
  var BOW_RATIO = 0.2;
  var BOW_MAX = 26;
  var LABEL_LIFT = 4; /* sit the label just off the line, not on it */
  var LABEL_ROOM = 14; /* the arc has to be longer than the words by this much */

  /* Every arc used to leave from its object's exact centre, so all eight of the
     VM's arcs started at one point and lay on top of each other — worst when
     the far end was roughly level, which turns the curve into a straight line
     with nothing to separate it from its neighbours. Each arc gets its own slot
     along the object's edge instead. The step shrinks to fit rather than
     spilling out of a card that has a lot of arcs. */
  var FAN_STEP = 7;
  var FAN_MARGIN = 12;

  /* Layout coordinates, not screen ones. getBoundingClientRect reports what is
     on screen, which means it reports post-transform values — so the moment the
     stage is scaled, every arc computed from it would be wrong by that factor.
     offsetLeft and offsetTop are pre-transform, so geometry stays in the
     stage's own space and zooming is one transform on one element with nothing
     to recompute.

     offsetLeft is measured against offsetParent rather than the stage, so the
     chain has to be walked and summed. */
  function box(id, stage) {
    var node = document.getElementById("object-" + id);
    if (!node) return null;

    var left = 0;
    var top = 0;
    var cursor = node;
    while (cursor && cursor !== stage) {
      left += cursor.offsetLeft;
      top += cursor.offsetTop;
      cursor = cursor.offsetParent;
    }

    return {
      left: left,
      right: left + node.offsetWidth,
      top: top,
      bottom: top + node.offsetHeight,
      cx: left + node.offsetWidth / 2,
      cy: top + node.offsetHeight / 2,
      width: node.offsetWidth,
      height: node.offsetHeight,
    };
  }

  /* Which slot this arc takes on that object's edge, as an offset from centre.
     Declaration order decides, so it is stable between renders. */
  function slot(extent, arcIndex, objectId) {
    var list = slots[objectId];
    if (!list || list.length < 2) return 0;

    var position = list.indexOf(arcIndex);
    var step = Math.min(FAN_STEP, (extent - FAN_MARGIN) / (list.length - 1));
    return (position - (list.length - 1) / 2) * Math.max(0, step);
  }

  /* A cubic's midpoint, which is where the label goes. Not the average of the
     endpoints: on a bowed curve that lands well off the line. */
  function midpoint(p) {
    return {
      x: (p.x1 + 3 * p.c1x + 3 * p.c2x + p.x2) / 8,
      y: (p.y1 + 3 * p.c1y + 3 * p.c2y + p.y2) / 8,
    };
  }

  function route(a, b, sameZone, index, fromId, toId) {
    /* Bowing out to the side exists for one situation: two objects in the same
       column, where a straight line between them cuts through everything
       stacked in between. It used to apply to every arc inside a zone, which
       was true when a zone was one column and stopped being true when groups
       started tiling side by side. Two cards next to each other were sent out
       the left edge and around, the long way, instead of straight across. */
    var stacked = Math.abs(b.cx - a.cx) < (a.width + b.width) / 4;

    if (sameZone && stacked) {
      var ay = a.cy + slot(a.height, index, fromId);
      var by = b.cy + slot(b.height, index, toId);
      var bow = Math.min(BOW_MAX, Math.max(BOW_MIN, Math.abs(by - ay) * BOW_RATIO));
      return {
        x1: a.left,
        y1: ay,
        c1x: a.left - bow,
        c1y: ay,
        c2x: b.left - bow,
        c2y: by,
        x2: b.left,
        y2: by,
      };
    }

    /* Whichever way the two objects are further apart is the way the curve
       should travel. The islands are no longer a single row: Azure sits below
       the other two, so an arc into it is a vertical journey, and anchoring
       that on the left and right edges sent it looping out sideways to reach
       something directly underneath. */
    var horizontal = Math.abs(b.cx - a.cx) >= Math.abs(b.cy - a.cy);

    if (horizontal) {
      var rightward = a.cx < b.cx;
      var x1 = rightward ? a.right : a.left;
      var x2 = rightward ? b.left : b.right;
      var push = Math.max(MIN_PUSH, Math.abs(x2 - x1) * PUSH_RATIO);
      var sign = rightward ? 1 : -1;
      /* Fanned across the edge the arc leaves from, which for a horizontal
         journey is the vertical one. */
      var hy1 = a.cy + slot(a.height, index, fromId);
      var hy2 = b.cy + slot(b.height, index, toId);

      return {
        x1: x1,
        y1: hy1,
        c1x: x1 + push * sign,
        c1y: hy1,
        c2x: x2 - push * sign,
        c2y: hy2,
        x2: x2,
        y2: hy2,
      };
    }

    var downward = a.cy < b.cy;
    var y1 = downward ? a.bottom : a.top;
    var y2 = downward ? b.top : b.bottom;
    var vpush = Math.max(MIN_PUSH, Math.abs(y2 - y1) * PUSH_RATIO);
    var vsign = downward ? 1 : -1;
    var vx1 = a.cx + slot(a.width, index, fromId);
    var vx2 = b.cx + slot(b.width, index, toId);

    return {
      x1: vx1,
      y1: y1,
      c1x: vx1,
      c1y: y1 + vpush * vsign,
      c2x: vx2,
      c2y: y2 - vpush * vsign,
      x2: vx2,
      y2: y2,
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
  var slots = {};

  function build(layer) {
    window.MOV.OBJECTS.forEach(function (item) {
      zoneOf[item.id] = item.zone;
    });

    window.MOV.ARCS.forEach(function (arc, index) {
      slots[arc.from] = slots[arc.from] || [];
      slots[arc.to] = slots[arc.to] || [];
      slots[arc.from].push(index);
      slots[arc.to].push(index);
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

  function place(layer, stage) {
    window.MOV.ARCS.forEach(function (arc, index) {
      var a = box(arc.from, stage);
      var b = box(arc.to, stage);
      var path = layer.querySelector('path[data-arc="' + index + '"]');
      var label = layer.querySelector('text[data-arc="' + index + '"]');
      if (!a || !b || !path) {
        /* Nothing to measure against, so the label has no line to sit on. It
           keeps whatever x and y it last had -- 0,0 when it has never been
           placed -- and hovering either end would reveal it in the corner. */
        if (label) label.classList.add("is-cramped");
        return;
      }

      var geometry = route(
        a,
        b,
        zoneOf[arc.from] === zoneOf[arc.to],
        index,
        arc.from,
        arc.to
      );
      path.setAttribute("d", d(geometry));

      var middle = midpoint(geometry);
      label.setAttribute("x", middle.x);
      label.setAttribute("y", middle.y - LABEL_LIFT);

      /* A label longer than the arc it belongs to is not a label, it is a word
         lying across the diagram with a line behind it. Measured along the
         curve, which is longer than the straight line between the endpoints.

         Measured across the curve's width instead for a while, on the theory
         that a horizontal word needs horizontal room. It reads well and it was
         wrong: it took the label off every short vertical hop, and `runs` on
         the arc from the shell to mov is one of those. The labels appearing
         where they did not belong was never this measurement -- it was a
         second, unplaced copy of every arc, which is fixed where it was made.

         The class comes off before measuring: hidden text measures zero, which
         would un-hide it on the next pass and flap. */
      label.classList.remove("is-cramped");
      if (label.getComputedTextLength() + LABEL_ROOM > path.getTotalLength()) {
        label.classList.add("is-cramped");
        return;
      }

      /* A label is centred on the curve's midpoint, and two cards stacked in
         one column are joined by an arc that bows out past their left edge.
         The bow is small, so a short word rides it and stays inside the zone.
         A phrase does not: half of "every command, as a transcript" reaches
         past the card, past the zone, and into the margin beside it, which is
         where words were turning up with nothing under them.

         Measured after placing rather than guessed at beforehand: what
         matters is where the words ended up, and only the ones that ended up
         off the map are dropped. */
      var extent = label.getBBox();
      if (extent.x < 0 || extent.y < 0) {
        label.classList.add("is-cramped");
      }
    });
  }

  var drawn = false;

  /* Called on every visit to the map, because a view that was hidden measured
     every object at nothing and has to be measured again when it is shown.
     Only the measuring repeats: build() appends, so calling it twice left a
     second full set of paths and labels in the layer. place() looks each one
     up with querySelector, which answers with the first, so the duplicates
     were never positioned -- they sat at 0,0 with the layer's own opacity of
     zero, invisible until a hover marked every element carrying that arc's
     index and lit them up in the corner of the map. Two visits, two copies,
     and the pile grew with every trip through the tabs. */
  window.MOV.arcs = function () {
    var layer = document.getElementById("arcs");
    var stage = document.getElementById("stage");
    if (!layer || !stage) return;

    if (!drawn) {
      build(layer);
      drawn = true;

      /* Re-measure whenever the map changes size for any reason: a window
         resize, a font arriving, the panel growing as someone reads. Observing
         the element covers all three; listening for `resize` covers only one.
         Registered here with the build, so returning to the map does not add
         another observer on top of the one already watching. */
      if (typeof ResizeObserver === "function") {
        new ResizeObserver(function () {
          place(layer, stage);
        }).observe(stage);
      } else {
        window.addEventListener("resize", function () {
          place(layer, stage);
        });
      }

      /* Web fonts change every measurement when they land. */
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
          place(layer, stage);
        });
      }
    }

    place(layer, stage);
  };
})();
