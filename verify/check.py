#!/usr/bin/env python3
"""The house rules, enforced.

Standards kept by intention are standards until the day someone is in a hurry.
These are the rules this repository claims to follow, checked mechanically so
the claim is testable:

  · every colour is oklch() or a var(--…)      — no hex, no rgb(), no hsl(),
                                                  no named colours
  · every length is rem/em/%/ch/vw/vh/etc      — no px, which breaks zoom
  · no !important                              — if a rule loses, fix the
                                                  selector
  · custom properties are declared and used    — both directions
  · every palette declares the same tokens     — a token added to one theme
                                                  and forgotten in another
  · the map's data is internally consistent    — no arc to a missing object,
                                                  no object in a missing zone
                                                  or group, no empty group,
                                                  no object nothing connects to

Plain Python, no dependencies. Run it from anywhere:

    python verify/check.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSS = ROOT / "src" / "styles.css"
MAP = ROOT / "src" / "map.js"

# Colours that are neither oklch() nor a token. Named colours are included
# because "red" is exactly the kind of thing that gets typed at 2am and then
# ignores the theme forever.
NAMED_COLOURS = (
    "aqua|black|blue|brown|coral|crimson|cyan|fuchsia|gold|gray|grey|green|"
    "indigo|ivory|khaki|lime|magenta|maroon|navy|olive|orange|orchid|pink|"
    "plum|purple|red|salmon|silver|tan|teal|tomato|violet|wheat|white|yellow"
)

CSS_RULES = [
    (
        "!important",
        re.compile(r"!\s*important"),
        "If a rule loses, the selector is wrong. Fix the selector.",
    ),
    (
        "px length",
        re.compile(r"(?<![\w-])\d*\.?\d+px\b"),
        "Use rem. A px length ignores the reader's font size.",
    ),
    (
        "hex colour",
        re.compile(r"#[0-9a-fA-F]{3,8}\b"),
        "Use oklch(), or a var(--…) that resolves to one.",
    ),
    (
        "rgb()/hsl()",
        re.compile(r"\b(?:rgba?|hsla?)\s*\("),
        "Use oklch(): it is perceptually uniform, so a lightness step looks like one.",
    ),
    (
        "named colour",
        re.compile(rf"(?<![\w-])(?:{NAMED_COLOURS})(?![\w-])"),
        "Use oklch() or a token, so the theme can move it.",
    ),
]


def strip_css_comments(text: str) -> str:
    """Blank out comments, keeping newlines so line numbers still mean something.

    Comments are where this file explains itself, and several of those
    explanations legitimately contain the words they ban.
    """
    def blank(match: re.Match[str]) -> str:
        return re.sub(r"[^\n]", " ", match.group(0))

    return re.sub(r"/\*.*?\*/", blank, text, flags=re.DOTALL)


def offences(text: str) -> list[str]:
    found: list[str] = []
    code = strip_css_comments(text)

    for name, pattern, hint in CSS_RULES:
        for number, line in enumerate(code.splitlines(), start=1):
            for hit in pattern.finditer(line):
                found.append(
                    f"styles.css:{number}: {name} — {hit.group(0)!r}\n"
                    f"    {hint}\n"
                    f"    {line.strip()}"
                )
    return found


def custom_properties(text: str) -> list[str]:
    """A property declared and never used is dead weight; one used and never
    declared is a silent fallback to nothing, which renders as though the rule
    were never written."""
    code = strip_css_comments(text)
    declared = set(re.findall(r"^\s*(--[\w-]+)\s*:", code, flags=re.MULTILINE))
    used = set(re.findall(r"var\(\s*(--[\w-]+)", code))

    problems = []
    for name in sorted(declared - used):
        problems.append(f"styles.css: {name} is declared and never used")
    for name in sorted(used - declared):
        problems.append(f"styles.css: {name} is used and never declared")
    return problems


def themes(text: str) -> list[str]:
    """Every palette must declare the same tokens.

    A token added to one theme and forgotten in another does not fail, and does
    not look broken while you are in the theme you were working in. It renders
    the wrong colour for everybody in the other one — and the block that is
    forgotten most is prefers-color-scheme, because nobody has it selected while
    they work.
    """
    code = strip_css_comments(text)

    # Each palette is a block that sets color-scheme; that is what makes it a
    # palette rather than a component rule.
    blocks = re.findall(r"\{([^{}]*color-scheme[^{}]*)\}", code)
    if len(blocks) < 2:
        return ["styles.css: fewer than two palettes found — has the theming changed?"]

    declared = [set(re.findall(r"(--[\w-]+)\s*:", block)) for block in blocks]
    everywhere = set().union(*declared)

    problems = []
    for index, names in enumerate(declared, start=1):
        for missing in sorted(everywhere - names):
            problems.append(
                f"styles.css: palette {index} of {len(blocks)} does not declare {missing}"
            )
    return problems


def read_map() -> tuple[set[str], set[str], list[tuple[str, str, str]], set[str], list[tuple[str, str]]]:
    """Pull the shape of the map out of map.js.

    A regex rather than a JS parser: the file is data written in JS syntax, and
    the alternative is a dependency to read five kinds of string.
    """
    text = MAP.read_text(encoding="utf-8")

    zones = set(re.findall(r'id:\s*"([^"]+)",\s*\n\s*letter:', text))
    groups = set(re.findall(r'id:\s*"([^"]+)",\s*zone:\s*"[^"]+",\s*name:', text))
    objects = re.findall(
        r'id:\s*"([^"]+)",\s*\n\s*zone:\s*"([^"]+)",\s*\n\s*group:\s*"([^"]+)"', text
    )
    arcs = re.findall(r'\{\s*from:\s*"([^"]+)",\s*to:\s*"([^"]+)"', text)
    object_ids = {entry[0] for entry in objects}

    return zones, groups, objects, object_ids, arcs


def map_problems() -> list[str]:
    zones, groups, objects, object_ids, arcs = read_map()
    problems: list[str] = []

    if not zones or not groups or not objects or not arcs:
        return ["map.js: could not read zones, groups, objects or arcs — has the shape changed?"]

    for identifier, zone, group in objects:
        if zone not in zones:
            problems.append(f"map.js: object {identifier!r} is in zone {zone!r}, which is not declared")
        if group not in groups:
            problems.append(f"map.js: object {identifier!r} is in group {group!r}, which is not declared")

    grouped = {group for _, _, group in objects}
    for empty in sorted(groups - grouped):
        problems.append(f"map.js: group {empty!r} has no objects, so it renders as a bare heading")

    seen: set[str] = set()
    for identifier, _, _ in objects:
        if identifier in seen:
            problems.append(f"map.js: object id {identifier!r} is used twice")
        seen.add(identifier)

    drawn: set[tuple[str, str]] = set()
    for pair in arcs:
        if pair in drawn:
            problems.append(f"map.js: arc {pair[0]}->{pair[1]} is declared twice")
        drawn.add(pair)

    connected: set[str] = set()
    for source, target in arcs:
        for end in (source, target):
            if end not in object_ids:
                problems.append(f"map.js: arc {source}->{target} names {end!r}, which is not an object")
        connected.add(source)
        connected.add(target)

    for identifier in sorted(object_ids - connected):
        problems.append(
            f"map.js: object {identifier!r} has no arc. "
            "An island on a map about relationships is a content bug."
        )

    return problems


def main() -> int:
    css = CSS.read_text(encoding="utf-8")

    problems = offences(css) + custom_properties(css) + themes(css) + map_problems()

    if problems:
        print(f"{len(problems)} problem(s):\n")
        for problem in problems:
            print(f"  {problem}")
        return 1

    zones, groups, objects, _, arcs = read_map()
    print(
        f"OK  {len(zones)} zones, {len(groups)} groups, {len(objects)} objects, {len(arcs)} arcs; "
        f"{len(css.splitlines())} lines of CSS within the rules"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
