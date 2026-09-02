#!/usr/bin/env python3
"""Every arc on the map says what it is, on its own line, inside the map.

check.py reads the files. This one drives the page: it opens index.html in a
headless browser, walks the whole map, and asks each arc's label where it
actually ended up. Three questions per arc, all of which were answered wrong at
some point by something that looked right in the source:

  · is the label there at all      — a hiding rule meant to tidy short arcs
                                      took the word off connections the map is
                                      supposed to name
  · is it inside the map           — a label centred on a curve that bows past
                                      the cards reached into the margin, where
                                      it read as text leaking out of the page
  · is it on its own line          — duplicated arcs left unplaced copies at
                                      the origin, revealed on hover

Run it after touching arcs.js, map.js or anything that changes the layout:

    python verify/labels.py

It checks several window widths, and again after a trip through the other tabs,
because the map is measured when it is shown and a view that was hidden
measures everything at nothing.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"

WIDTHS = [1600, 1280, 1024]
NEAR = 80  # a label further than this from its own curve is not on its line

PROBE = """
<pre id="report"></pre>
<script>
window.addEventListener("load", function () {
  setTimeout(function () {
    /* A trip through the other tabs and back: the map is measured when it is
       shown, and this is where duplicated arcs used to appear. */
    document.getElementById("tab-cli").click();
    document.getElementById("tab-usage").click();
    document.getElementById("tab-map").click();

    setTimeout(function () {
      var stage = document.getElementById("stage");
      var frame = stage.getBoundingClientRect();
      var rows = [];

      rows.push(JSON.stringify({
        kind: "count",
        labels: document.querySelectorAll(".arc-label").length,
        paths: document.querySelectorAll(".arc").length,
        arcs: window.MOV.ARCS.length
      }));

      document.querySelectorAll(".arc-label").forEach(function (label) {
        var index = Number(label.dataset.arc);
        var arc = window.MOV.ARCS[index];
        var path = document.querySelector('path[data-arc="' + index + '"]');
        var box = label.getBoundingClientRect();
        var hidden = label.getAttribute("visibility") === "hidden" ||
                     box.width === 0 || box.height === 0;

        var near = null;
        if (path && path.getTotalLength() > 0) {
          var best = Infinity;
          var cx = box.left + box.width / 2 - frame.left;
          var cy = box.top + box.height / 2 - frame.top;
          for (var t = 0; t <= 1.0001; t += 0.05) {
            var point = path.getPointAtLength(path.getTotalLength() * t);
            var dx = point.x - cx, dy = point.y - cy;
            best = Math.min(best, Math.sqrt(dx * dx + dy * dy));
          }
          near = Math.round(best);
        }

        rows.push(JSON.stringify({
          kind: "arc",
          label: arc.label,
          from: arc.from,
          to: arc.to,
          hidden: hidden,
          outsideLeft: Math.round(frame.left - box.left),
          outsideTop: Math.round(frame.top - box.top),
          outsideRight: Math.round(box.right - frame.right),
          near: near
        }));
      });

      document.getElementById("report").textContent = "@@" + rows.join("@@") + "@@";
    }, 800);
  }, 1500);
});
</script>
</body>"""


def chrome() -> str | None:
    for candidate in (
        os.environ.get("CHROME"),
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium",
    ):
        if candidate and Path(candidate).exists():
            return candidate
    return shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chrome")


def measure(browser: str, width: int) -> list[dict]:
    """One run of the page at one width, as a list of records."""
    with tempfile.TemporaryDirectory() as work:
        page = Path(work) / "probe.html"
        page.write_text(INDEX.read_text(encoding="utf-8").replace("</body>", PROBE, 1), encoding="utf-8")
        for name in ("src", "brand"):
            shutil.copytree(ROOT / name, Path(work) / name)

        done = subprocess.run(
            [browser, "--headless=new", "--disable-gpu", f"--window-size={width},1100",
             "--virtual-time-budget=9000", "--dump-dom", page.as_uri()],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
        )

    body = re.search(r'<pre id="report">(.*?)</pre>', done.stdout, re.S)
    if not body:
        return []
    import html as unescape

    return [json.loads(chunk) for chunk in unescape.unescape(body.group(1)).split("@@") if chunk.strip()]


def main() -> int:
    browser = chrome()
    if browser is None:
        print("no headless browser found, so the map's labels were not checked")
        return 0

    problems: list[str] = []
    for width in WIDTHS:
        records = measure(browser, width)
        if not records:
            problems.append(f"{width}px: the page produced no report at all")
            continue

        counts = records[0]
        if counts["labels"] != counts["arcs"] or counts["paths"] != counts["arcs"]:
            problems.append(
                f"{width}px: {counts['arcs']} arcs drew {counts['paths']} paths and "
                f"{counts['labels']} labels -- the layer is being built more than once"
            )

        for row in records[1:]:
            where = f"{width}px  {row['from']}->{row['to']}  [{row['label']}]"
            if row["hidden"]:
                problems.append(f"{where}: no label on the line")
                continue
            for edge in ("outsideLeft", "outsideTop", "outsideRight"):
                if row[edge] > 1:
                    problems.append(f"{where}: {row[edge]}px outside the map ({edge[7:].lower()})")
            if row["near"] is not None and row["near"] > NEAR:
                problems.append(f"{where}: {row['near']}px from its own curve")

    if problems:
        print(f"{len(problems)} problem(s):")
        for problem in problems:
            print(f"  {problem}")
        return 1

    print(f"OK  every arc labelled, on its line and inside the map, at {', '.join(str(w) for w in WIDTHS)}px")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
