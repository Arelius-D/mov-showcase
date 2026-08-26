/* ═══════════════════════════════════════════════════
   mov-showcase — plays the session in tui.js

   A renderer and nothing more: every string comes from window.MOV.TUI. It
   types the inputs, prints the lines, keeps only the last `rows` of them so
   the card never grows, holds at the end, and loops.

   It does not start until the tab it lives in is first shown, and it does not
   run at all if tui.js failed to load -- a broken session file must not take
   the map down with it.

   Someone who asked for less motion gets the finished frame at once: the same
   content, no timers, no cursor.
   ═══════════════════════════════════════════════════ */

window.MOV = window.MOV || {};

(function () {
  "use strict";

  var TYPE_MS = 45; /* one character */
  var LINE_MS = 180; /* one printed line */
  var PROMPT_MS = 700; /* a pause before a prompt, as if someone read the screen */
  var HOLD_MS = 4200; /* the finished frame, before it starts over */

  var screen, cursorLine;
  var timer = null;
  var paused = false;
  var started = false;
  var pending = null; /* what to do when unpaused */

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

  function trim() {
    var rows = window.MOV.TUI.rows;
    while (screen.children.length > rows) {
      screen.removeChild(screen.firstChild);
    }
  }

  function line(tone, text) {
    var node = element("span", "terminal__line", text);
    if (tone) node.dataset.tone = tone;
    screen.appendChild(node);
    trim();
    return node;
  }

  function setCursor(node) {
    if (cursorLine) cursorLine.classList.remove("has-cursor");
    cursorLine = node;
    if (node) node.classList.add("has-cursor");
  }

  /* Waiting that respects the pause: a paused player keeps its place and
     picks up where it was, rather than skipping or racing to catch up. */
  function wait(ms, next) {
    if (paused) {
      pending = function () {
        wait(ms, next);
      };
      return;
    }
    timer = window.setTimeout(next, ms);
  }

  function play(index) {
    var beats = window.MOV.TUI.beats;
    if (index >= beats.length) index = 0;
    var beat = beats[index];

    if (beat.kind === "hold") {
      setCursor(null);
      wait(HOLD_MS, function () {
        screen.textContent = "";
        play(0);
      });
      return;
    }

    if (beat.kind === "prompt") {
      wait(PROMPT_MS, function () {
        setCursor(line("prompt", beat.text));
        play(index + 1);
      });
      return;
    }

    if (beat.kind === "input") {
      var glyph = (beat.prompt || "›") + " ";
      var node = line("prompt", glyph);
      setCursor(node);
      var typed = 0;
      var step = function () {
        if (typed >= beat.text.length) {
          wait(LINE_MS, function () {
            play(index + 1);
          });
          return;
        }
        typed += 1;
        node.textContent = glyph + beat.text.slice(0, typed);
        wait(TYPE_MS, step);
      };
      wait(PROMPT_MS, step);
      return;
    }

    /* line */
    wait(LINE_MS, function () {
      setCursor(line(beat.tone, beat.text));
      play(index + 1);
    });
  }

  /* Everything, at once, no motion. Same strings, same colours. */
  function still() {
    var beats = window.MOV.TUI.beats;
    screen.textContent = "";
    beats.forEach(function (beat) {
      if (beat.kind === "hold") return;
      if (beat.kind === "input") {
        line("prompt", (beat.prompt || "›") + " " + beat.text);
        return;
      }
      line(beat.kind === "prompt" ? "prompt" : beat.tone, beat.text);
    });
  }

  function build(into) {
    var card = element("div", "terminal");
    var bar = element("div", "terminal__bar");
    bar.appendChild(element("span", "terminal__dot"));
    bar.appendChild(element("span", "terminal__dot"));
    bar.appendChild(element("span", "terminal__dot"));
    bar.appendChild(element("span", "terminal__title", window.MOV.TUI.title));
    card.appendChild(bar);

    screen = element("pre", "terminal__screen");
    screen.setAttribute("role", "log");
    screen.setAttribute("aria-live", "off");
    screen.style.setProperty("--rows", String(window.MOV.TUI.rows));
    screen.style.setProperty("--columns", String(window.MOV.TUI.columns));
    card.appendChild(screen);

    card.tabIndex = 0;
    card.setAttribute("aria-label", "A mov new session, playing");

    /* Hovering or focusing holds the frame, so a line can be read. */
    function hold() {
      paused = true;
      card.classList.add("is-paused");
    }
    function release() {
      paused = false;
      card.classList.remove("is-paused");
      if (pending) {
        var resume = pending;
        pending = null;
        resume();
      }
    }
    card.addEventListener("pointerenter", hold);
    card.addEventListener("pointerleave", release);
    card.addEventListener("focusin", hold);
    card.addEventListener("focusout", release);

    into.appendChild(card);
  }

  /* Called by tabs.js the first time the session tab is shown. Safe to call
     again: a second call does nothing. */
  window.MOV.terminal = function (into) {
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
