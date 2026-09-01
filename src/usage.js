/* ═══════════════════════════════════════════════════
   mov-showcase — the Usage view

   The map says what the pieces are. The CLI session says what a run looks
   like. This says what there is to type: every command mov has, in the panels
   mov groups them into, and the help for any one of them on demand.

   Renderer only. Every string comes from src/help.js, which is generated from
   the tool itself — see verify/help-from-mov.py. Nothing here writes copy.

   The help page opens over the grid rather than beside it. A help page is
   eighty columns of fixed-width text and the grid is not, so putting them
   side by side would shrink one of them to nothing on the width most people
   read this at.
   ═══════════════════════════════════════════════════ */

window.MOV = window.MOV || {};

(function () {
  "use strict";

  var view, grid, overlay, sheet, opener;

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

  function build() {
    var data = window.MOV.HELP;

    data.panels.forEach(function (panel) {
      var section = element("section", "usage__panel");
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
    view = document.getElementById("view-usage");
    grid = document.getElementById("usage-grid");
    overlay = document.getElementById("usage-overlay");
    sheet = document.getElementById("usage-sheet");
    if (!view || !grid || !window.MOV.HELP) return;

    build();
    wire();
  };
})();
