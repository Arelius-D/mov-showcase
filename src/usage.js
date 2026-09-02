/* ═══════════════════════════════════════════════════
   mov-showcase — the Usage view

   The map says what the pieces are. The CLI session says what a run looks
   like. This says what there is to type: every command mov has, in the panels
   mov groups them into, and the help for any one of them on demand.

   Renderer only. Every string comes from src/help.js, which is generated from
   the tool itself — see verify/help-from-mov.py. Nothing here writes copy.

   The help page opens over the grid rather than beside it. A help page is
   eighty-four columns of fixed-width text and the grid is not, so side by side
   would shrink one of them to nothing on the width most people read this at.
   ═══════════════════════════════════════════════════ */

window.MOV = window.MOV || {};

(function () {
  "use strict";

  var view, grid, overlay, sheet, opener, finder, counter;

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function chip(command) {
    var button = element("button", "usage__command");
    button.type = "button";
    button.dataset.command = command.name;
    button.setAttribute("aria-haspopup", "dialog");

    button.appendChild(element("span", "usage__name", command.name));
    button.appendChild(element("span", "usage__summary", command.summary));

    if (command.subcommands && command.subcommands.length) {
      button.appendChild(
        element("span", "usage__subcommands", command.subcommands.join(" · "))
      );
    }
    return button;
  }

  /* How wide each panel sits on the twelve-column grid. A fact about the
     content, the way a zone's span is a fact about the content in map.js:
     Setting up and Environments hold eight commands each, Reading Azure holds
     three and Exporting two, so the two small ones share the second row
     instead of being stretched to the width of the large ones.

     Declared here rather than in help.js, which is generated: this is a
     decision about the page, and nothing mov prints has an opinion on it. */
  var SPAN = {
    "Setting up": 4,
    Profiles: 4,
    Environments: 4,
    "Reading Azure": 6,
    Exporting: 6,
  };

  function build() {
    var data = window.MOV.HELP;

    data.panels.forEach(function (panel) {
      var section = element("section", "usage__panel");
      if (SPAN[panel]) section.style.setProperty("--span", SPAN[panel]);
      section.appendChild(element("h3", "usage__panel-title", panel));

      var list = element("div", "usage__commands");
      data.commands
        .filter(function (command) {
          return command.panel === panel;
        })
        .forEach(function (command) {
          list.appendChild(chip(command));
        });

      section.appendChild(list);
      grid.appendChild(section);
    });
  }

  /* The help text is the tool's own output, box-drawing characters and all.
     It goes in a <pre> unchanged: reflowing it would be rewriting it. */
  function open(name) {
    var command = window.MOV.HELP.commands.filter(function (entry) {
      return entry.name === name;
    })[0];
    if (!command) return;

    opener = document.activeElement;
    sheet.innerHTML = "";

    var head = element("div", "usage__sheet-head");
    head.appendChild(element("h3", "usage__sheet-title", "mov " + command.name));

    var close = element("button", "usage__close", "Close");
    close.type = "button";
    close.setAttribute("aria-label", "Close the help for mov " + command.name);
    head.appendChild(close);
    sheet.appendChild(head);
    sheet.appendChild(element("pre", "usage__help", command.help));

    overlay.hidden = false;
    view.classList.add("is-reading");
    sheet.setAttribute("aria-label", "mov " + command.name);
    close.focus();
  }

  function shut() {
    overlay.hidden = true;
    view.classList.remove("is-reading");
    if (opener && opener.focus) opener.focus();
    opener = null;
  }

  /* Searched over everything the command answers to, its help text included,
     so `subscription` finds the commands that mention one and not only the
     command called that. Every word has to appear somewhere, in any order: a
     phrase match meant `delete group` found nothing while both words were on
     the same page. The map filters the same way, and dims rather than hides
     for the same reason -- what did not match is still worth seeing beside
     what did. */
  function haystack(command) {
    return [
      command.name,
      command.summary,
      command.help,
      (command.subcommands || []).join(" "),
    ]
      .join(" ")
      .toLowerCase();
  }

  function filter(term) {
    var query = term.trim().toLowerCase();
    view.classList.toggle("is-filtered", Boolean(query));

    if (!query) {
      grid.querySelectorAll(".usage__command, .usage__panel").forEach(function (node) {
        node.classList.remove("is-match", "is-empty");
      });
      counter.textContent = "";
      return;
    }

    var words = query.split(/\s+/);
    var hits = 0;
    window.MOV.HELP.commands.forEach(function (command) {
      var node = grid.querySelector('[data-command="' + command.name + '"]');
      if (!node) return;
      var text = haystack(command);
      var hit = words.every(function (word) {
        return text.indexOf(word) !== -1;
      });
      node.classList.toggle("is-match", hit);
      if (hit) hits += 1;
    });

    /* A panel with nothing in it is a heading over an empty box. */
    grid.querySelectorAll(".usage__panel").forEach(function (panel) {
      panel.classList.toggle("is-empty", !panel.querySelector(".usage__command.is-match"));
    });

    counter.textContent = hits + (hits === 1 ? " command" : " commands");
  }

  function search() {
    finder = document.getElementById("usage-search");
    counter = document.getElementById("usage-search-count");
    if (!finder || !counter) return;

    finder.addEventListener("input", function () {
      filter(finder.value);
    });

    /* Escape clears the field before it reaches the document listener, which
       would otherwise only ever close the help page. */
    finder.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || !finder.value) return;
      event.stopPropagation();
      finder.value = "";
      filter("");
    });
  }

  function wire() {
    grid.addEventListener("click", function (event) {
      var button = event.target.closest(".usage__command");
      if (button) open(button.dataset.command);
    });

    overlay.addEventListener("click", function (event) {
      /* Anywhere off the sheet, including the Close button inside it. */
      if (event.target === overlay || event.target.closest(".usage__close")) shut();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !overlay.hidden) shut();
    });

    /* A dialog keeps the keyboard inside it. Two focus stops -- Close and the
       text -- so the wrap is a straight comparison rather than a walk. */
    sheet.addEventListener("keydown", function (event) {
      if (event.key !== "Tab") return;
      var stops = sheet.querySelectorAll("button, [tabindex='0']");
      if (!stops.length) return;
      var first = stops[0];
      var last = stops[stops.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        last.focus();
        event.preventDefault();
      } else if (!event.shiftKey && document.activeElement === last) {
        first.focus();
        event.preventDefault();
      }
    });
  }

  window.MOV.usage = function () {
    /* The `.usage` block, not the tab panel around it: the dim rule reads
       `.usage.is-reading`, and the class was going on the section. */
    view = document.querySelector("#view-usage .usage");
    grid = document.getElementById("usage-grid");
    overlay = document.getElementById("usage-overlay");
    sheet = document.getElementById("usage-sheet");
    if (!view || !grid || !window.MOV.HELP) return;

    build();
    wire();
    search();
  };
})();
