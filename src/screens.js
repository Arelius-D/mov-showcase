/* ═══════════════════════════════════════════════════
   mov-showcase — draws the frames in tui.js

   mov's picker is a textual application: a header, a body of panes, and a
   footer of key bindings. This draws one frame of it at a time from
   window.MOV.TUI, in HTML, from the page's own tokens. It knows the four
   screens' layouts and nothing about their words.

   A frame marked `typing` types its query or value before the next frame is
   shown, so the session reads as someone using it rather than as slides.

   Does not start until its tab is first shown; does nothing if tui.js is
   missing. Reduced motion gets the review frame, still.
   ═══════════════════════════════════════════════════ */

window.MOV = window.MOV || {};

(function () {
  "use strict";

  var TYPE_MS = 55;
  var FRAME_MS = 2600;
  var HOLD_MS = 4200;

  var app, body, footer;
  var paused = false;
  var started = false;
  var pending = null;

  function reducedMotion() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function wait(ms, next) {
    if (paused) {
      pending = function () {
        wait(ms, next);
      };
      return;
    }
    window.setTimeout(next, ms);
  }

  /* ── the four screens ─────────────────────────────── */

  function input(text, placeholder) {
    var box = element("div", "tui__input");
    if (text) {
      box.appendChild(element("span", "tui__typed", text));
    } else {
      box.appendChild(element("span", "tui__placeholder", placeholder || ""));
    }
    box.appendChild(element("span", "tui__caret"));
    return box;
  }

  function pick(frame, typed) {
    var split = element("div", "tui__split");

    var left = element("div", "tui__left");
    left.appendChild(input(typed, window.MOV.TUI.placeholder));
    var list = element("div", "tui__list");
    (typed === frame.query ? frame.results : []).forEach(function (result, index) {
      var row = element("div", "tui__row", result);
      if (index === frame.highlight) row.classList.add("is-highlighted");
      list.appendChild(row);
    });
    left.appendChild(list);
    split.appendChild(left);

    var right = element("div", "tui__right");
    if (!frame.picked.length) {
      right.appendChild(element("div", "tui__muted", window.MOV.TUI.empty));
    }
    frame.picked.forEach(function (item) {
      var row = element("div", "tui__pick");
      row.appendChild(element("span", "tui__type", item.type));
      row.appendChild(element("span", "tui__badge", item.badge));
      right.appendChild(row);
      if (item.origin) right.appendChild(element("div", "tui__origin", item.origin));
    });
    var notes = element("div", "tui__notes");
    frame.notes.forEach(function (note) {
      var tone = note.charAt(0) === "+" ? "required" : "suggested";
      var line = element("div", "tui__note", note);
      line.dataset.tone = tone;
      notes.appendChild(line);
    });
    right.appendChild(notes);
    split.appendChild(right);
    return split;
  }

  function configure(frame) {
    var form = element("div", "tui__form");
    frame.sections.forEach(function (section) {
      form.appendChild(element("div", "tui__heading", section.type));
      section.fields.forEach(function (field) {
        var label = element("div", "tui__label");
        label.appendChild(element("span", null, field.label));
        if (field.required) label.appendChild(element("span", "tui__required", " *"));
        form.appendChild(label);
        if (field.note) form.appendChild(element("div", "tui__muted", field.note));
        form.appendChild(input(field.value));
      });
    });
    return form;
  }

  function name(frame, typed) {
    var block = element("div", "tui__form");
    var heading = element("div", "tui__heading");
    heading.appendChild(element("span", null, frame.heading));
    heading.appendChild(element("span", "tui__muted", "  " + frame.hint));
    block.appendChild(heading);
    block.appendChild(input(typed, "selfhosted"));
    (typed === frame.value ? frame.preview : []).forEach(function (line) {
      block.appendChild(element("div", "tui__preview", line));
    });
    return block;
  }

  function review(frame) {
    var block = element("div", "tui__form");
    block.appendChild(element("div", "tui__heading", frame.path));
    var pre = element("pre", "tui__json", frame.json.join("\n"));
    block.appendChild(pre);
    block.appendChild(element("div", "tui__muted", frame.note));
    return block;
  }

  var KEYS = {
    Configure: "^n",
    "Name it": "^n",
    "Write the profile": "^s",
    Quit: "esc",
    Back: "esc",
    Help: "?",
    Close: "?",
  };

  var STEP_OF = { pick: "Pick", configure: "Configure", name: "Name", review: "Review" };

  /* The strip across the top of every screen: the four steps, the current
     one lit, and how to reach help. */
  function steps(current) {
    var strip = element("div", "tui__steps");
    window.MOV.TUI.steps.forEach(function (step, index) {
      if (index) strip.appendChild(element("span", "tui__muted", "  ›  "));
      var label = element("span", step === current ? "tui__step is-current" : "tui__step", (index + 1) + " " + step);
      strip.appendChild(label);
    });
    strip.appendChild(element("span", "tui__muted", "      " + window.MOV.TUI.stepsHint));
    return strip;
  }

  function help() {
    var data = window.MOV.TUI.help;
    var box = element("div", "tui__help");
    var head = element("div", "tui__heading");
    head.appendChild(element("span", null, data.title));
    head.appendChild(element("span", "tui__muted", "  " + data.tagline));
    box.appendChild(head);
    data.screens.forEach(function (pair) {
      box.appendChild(element("div", "tui__heading", pair[0]));
      box.appendChild(element("div", "tui__muted", pair[1]));
    });
    box.appendChild(element("div", "tui__heading", data.heading));
    data.keys.forEach(function (pair) {
      var row = element("div", "tui__keyrow");
      row.appendChild(element("kbd", "tui__shown", pair[0]));
      row.appendChild(element("span", null, pair[1]));
      box.appendChild(row);
    });
    box.appendChild(element("div", "tui__muted", data.note));
    return box;
  }

  function draw(frame, typed, overlay) {
    body.textContent = "";
    footer.textContent = "";
    app.classList.toggle("has-help", Boolean(overlay));
    if (frame.screen in STEP_OF) body.appendChild(steps(STEP_OF[frame.screen]));
    if (frame.screen === "pick") body.appendChild(pick(frame, typed));
    if (frame.screen === "configure") body.appendChild(configure(frame));
    if (frame.screen === "name") body.appendChild(name(frame, typed));
    if (frame.screen === "review") body.appendChild(review(frame));
    if (overlay) body.appendChild(help());
    ((overlay || frame).footer || []).forEach(function (label) {
      var key = element("span", "tui__key");
      key.appendChild(element("kbd", null, KEYS[label] || ""));
      key.appendChild(element("span", null, " " + label));
      footer.appendChild(key);
    });
  }

  /* ── playback ─────────────────────────────────────── */

  function play(index) {
    var frames = window.MOV.TUI.frames;
    if (index >= frames.length) index = 0;
    var frame = frames[index];

    if (frame.screen === "hold") {
      wait(HOLD_MS, function () {
        play(0);
      });
      return;
    }

    /* Help is an overlay: the screen before it stays where it was, dimmed. */
    if (frame.screen === "help") {
      var under = frames[index - 1];
      draw(under, (under.screen === "name" ? under.value : under.query) || "", frame);
      wait(FRAME_MS, function () {
        play(index + 1);
      });
      return;
    }

    var full = frame.screen === "name" ? frame.value : frame.query;
    if (frame.typing && full) {
      var typed = 0;
      var step = function () {
        typed += 1;
        draw(frame, full.slice(0, typed));
        if (typed < full.length) {
          wait(TYPE_MS, step);
        } else {
          wait(FRAME_MS, function () {
            play(index + 1);
          });
        }
      };
      draw(frame, "");
      wait(TYPE_MS * 6, step);
      return;
    }

    draw(frame, full || "");
    wait(FRAME_MS, function () {
      play(index + 1);
    });
  }

  function still() {
    var frames = window.MOV.TUI.frames;
    var last = null;
    frames.forEach(function (frame) {
      if (frame.screen === "review") last = frame;
    });
    if (last) draw(last, "");
  }

  function build(into) {
    app = element("div", "tui");
    app.style.setProperty("--columns", String(window.MOV.TUI.columns));
    app.style.setProperty("--rows", String(window.MOV.TUI.rows));
    app.tabIndex = 0;
    app.setAttribute("aria-label", "The mov new screens, playing");

    var header = element("div", "tui__header", window.MOV.TUI.title);
    body = element("div", "tui__body");
    footer = element("div", "tui__footer");
    app.appendChild(header);
    app.appendChild(body);
    app.appendChild(footer);

    function hold() {
      paused = true;
      app.classList.add("is-paused");
    }
    function release() {
      paused = false;
      app.classList.remove("is-paused");
      if (pending) {
        var resume = pending;
        pending = null;
        resume();
      }
    }
    app.addEventListener("pointerenter", hold);
    app.addEventListener("pointerleave", release);
    app.addEventListener("focusin", hold);
    app.addEventListener("focusout", release);

    into.appendChild(app);
  }

  window.MOV.screens = function (into) {
    if (started || !window.MOV.TUI || !into) return;
    started = true;
    build(into);
    if (reducedMotion()) {
      still();
      return;
    }
    play(0);
  };
})();
