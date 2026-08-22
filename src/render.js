/* ═══════════════════════════════════════════════════
   mov-showcase — data to DOM, once, at load

   Nothing here decides what the page says. It reads window.MOV.ZONES and
   window.MOV.OBJECTS and builds exactly what is in them, which is why adding
   an object to map.js is the whole job of adding an object to the page.

   Objects are <button> elements on purpose: clickable means button, so
   keyboard access, focus handling and screen-reader semantics come from the
   platform instead of being re-implemented, worse, in here.
   ═══════════════════════════════════════════════════ */

window.MOV = window.MOV || {};

(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  /* One glyph per `kind`. Inline, so the page makes no network request and
     works from a file:// URL with nothing else present. All 24×24, stroked
     with currentColor so they inherit whatever the theme decided. */
  var GLYPHS = {
    shell: "M4 5h16v14H4z M7 10l2.5 2L7 14 M12.5 15H16",
    tool: "M12 3v3 M12 18v3 M3 12h3 M18 12h3 M12 8a4 4 0 100 8 4 4 0 000-8z",
    file: "M6 3h8l4 4v14H6z M14 3v4h4",
    key: "M15 7a4 4 0 11-3.4 6.1L6 19H3v-3l5.9-5.6A4 4 0 0115 7z",
    repo: "M5 4h14v16H5z M5 16h14 M8 8h5",
    script: "M6 3h9l3 3v15H6z M9 11h6 M9 15h4",
    release: "M12 3l8 4.5v9L12 21l-8-4.5v-9z M12 12l8-4.5 M12 12v9 M12 12L4 7.5",
    cloud: "M7 18a4 4 0 010-8 5.5 5.5 0 0110.5 1.5A3.5 3.5 0 0117 18z",
    group: "M3 7h6l2 2h10v11H3z",
    cost: "M12 3v18 M8 7h6a2.5 2.5 0 010 5H9a2.5 2.5 0 000 5h7",
    network: "M12 3v5 M6 21v-4 M18 21v-4 M6 17h12 M12 8v9 M9 3h6v5H9z",
    shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4",
    server: "M4 5h16v6H4z M4 13h16v6H4z M8 8h.01 M8 16h.01",
    people: "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7z M2 20a7 7 0 0114 0 M17 5a3.5 3.5 0 010 7 M17.5 13.5A7 7 0 0122 20",
  };

  function svg(name, attributes) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attributes).forEach(function (key) {
      node.setAttribute(key, attributes[key]);
    });
    return node;
  }

  function glyph(kind) {
    var node = svg("svg", {
      class: "object__glyph",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
      focusable: "false",
    });
    node.appendChild(svg("path", { d: GLYPHS[kind] || GLYPHS.file }));
    return node;
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function objectButton(item) {
    var button = element("button", "object");
    button.type = "button";
    button.id = "object-" + item.id;
    button.dataset.object = item.id;
    // The accessible name is the object's own name; the blurb reads as its
    // description rather than being glued onto the name.
    button.setAttribute("aria-label", item.short || item.name);

    var body = element("span");
    body.appendChild(element("span", "object__name", item.short || item.name));
    body.appendChild(element("span", "object__blurb", item.blurb));

    button.appendChild(glyph(item.kind));
    button.appendChild(body);
    return button;
  }

  /* A cluster inside a zone. Its own heading, so the structure is announced to
     a screen reader as well as drawn: a zone is a region, a group is a section
     within it. */
  function groupSection(group, objects) {
    var section = element("section", "group");
    section.dataset.group = group.id;
    section.setAttribute("aria-labelledby", "group-" + group.id);

    var name = element("h3", "group__name", group.name);
    name.id = "group-" + group.id;
    section.appendChild(name);

    var list = element("div", "group__objects");
    objects.forEach(function (item) {
      list.appendChild(objectButton(item));
    });
    section.appendChild(list);
    return section;
  }

  function zoneSection(zone) {
    var section = element("section", "zone");
    section.dataset.zone = zone.id;
    section.style.setProperty("--span", zone.span);
    section.setAttribute("aria-labelledby", "zone-" + zone.id);

    var head = element("div", "zone__head");
    head.appendChild(element("span", "zone__letter", zone.letter));

    var name = element("h2", "zone__name", zone.name);
    name.id = "zone-" + zone.id;
    head.appendChild(name);

    section.appendChild(head);
    section.appendChild(element("p", "zone__note", zone.note));

    var groups = element("div", "zone__groups");
    window.MOV.GROUPS.filter(function (group) {
      return group.zone === zone.id;
    }).forEach(function (group) {
      var members = window.MOV.OBJECTS.filter(function (item) {
        return item.group === group.id;
      });
      groups.appendChild(groupSection(group, members));
    });

    section.appendChild(groups);
    return section;
  }

  var LEGEND = [
    { kind: "causes", text: "configuration becoming infrastructure" },
    { kind: "pulls", text: "something fetching for itself" },
    { kind: "reports", text: "what came back" },
    { kind: "removes", text: "what teardown takes with it" },
  ];

  function renderLegend(into) {
    LEGEND.forEach(function (entry) {
      var item = element("div", "legend__item");
      var swatch = element("span", "legend__swatch");
      swatch.dataset.kind = entry.kind;
      item.appendChild(swatch);
      item.appendChild(element("span", null, entry.text));
      into.appendChild(item);
    });
  }

  window.MOV.render = function () {
    var zones = document.getElementById("zones");
    window.MOV.ZONES.forEach(function (zone) {
      zones.appendChild(zoneSection(zone));
    });
    renderLegend(document.getElementById("legend"));
  };

  /* Looked up often enough by both arcs.js and interact.js to be worth
     building once rather than filtering the array every time. */
  window.MOV.byId = function () {
    var index = {};
    window.MOV.OBJECTS.forEach(function (item) {
      index[item.id] = item;
    });
    return index;
  };
})();
