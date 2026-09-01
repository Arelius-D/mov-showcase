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
  · the copy states rather than explains       — no reasoning-out-loud tics
                                                  in anything a visitor reads
  · the map's data is internally consistent    — no arc to a missing object,
                                                  no object in a missing zone
                                                  or group, no empty group,
                                                  no object nothing connects to
  · the four data scripts parse                — a broken string in one blanks
                                                  its view while the masthead
                                                  renders fine
  · the sessions say only what mov says        — every CLI line and every TUI
                                                  label matches a format in
                                                  verify/mov-strings.json

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
CLI = ROOT / "src" / "cli.js"
TUI = ROOT / "src" / "tui.js"
HELP = ROOT / "src" / "help.js"
MOV_STRINGS = ROOT / "verify" / "mov-strings.json"
TONES = {"prompt", "picked", "required", "suggested", "muted", "ok"}
KINDS = {"prompt", "input", "line", "hold"}
SCREENS = {"pick", "configure", "name", "review", "help", "hold"}
# What the operator typed or mov generated from it: free text, not a format.
FREE_TEXT_KEYS = {"query", "value", "json", "path"}

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


# Constructions that narrate the reasoning instead of stating the thing. They
# are this author's tics, not the site's voice, and they came back once already
# in a commit message announcing their removal. Cheaper to check than to notice.
TELLS = [
    ("which is why", "Two sentences. The second does not need to announce that it follows."),
    ("which means", "Say the thing it means."),
    ("which makes", "Say what it is."),
    (" — ", "An em-dash aside is an argument in parentheses. Split it or cut it."),
    ("; ", "A semicolon joins two thoughts that could stand apart. Let them."),
    (", so it is", "Reversal. State it forwards."),
    ("rather than a", "Reversal."),
    ("not because", "Reversal."),
]


def copy_strings() -> list[tuple[str, str]]:
    """Every string the visitor reads: zone notes, blurbs, details, and the lede.

    Code comments are exempt. They are written for whoever maintains this and
    are allowed to explain themselves; the page is not.
    """
    found = []
    text = MAP.read_text(encoding="utf-8")
    for field in ("note", "blurb", "detail", "name", "short"):
        pattern = rf'{field}:\s*\n?\s*"((?:[^"\\]|\\.)*)"'
        for value in re.findall(pattern, text):
            found.append((field, value))

    page = (ROOT / "index.html").read_text(encoding="utf-8")
    lede = re.search(r'class="masthead__lede">(.*?)</p>', page, re.DOTALL)
    if lede:
        found.append(("lede", " ".join(lede.group(1).split())))
    for name in ("session__lede", "session__note"):
        for block in re.findall(rf'class="{name}">(.*?)</p>', page, re.DOTALL):
            found.append((name, " ".join(re.sub(r"<[^>]+>", "", block).split())))
    for label in re.findall(r'role="tab"[^>]*>\s*(.*?)\s*</button>', page, re.DOTALL):
        found.append(("tab", " ".join(label.split())))
    found.extend(tui_strings())
    return found


def voice() -> list[str]:
    problems = []
    for field, value in copy_strings():
        for tell, why in TELLS:
            if tell in value:
                problems.append(
                    f"copy: {field} contains {tell!r}\n"
                    f"    {why}\n"
                    f"    {value[:88]}..."
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


def parses() -> list[str]:
    """map.js is a script, not data: a string that a heredoc split across lines
    is a syntax error, and a syntax error in this one file blanks the whole
    map while the masthead above it renders fine. Regex over strings never
    noticed. node does."""
    import shutil
    import subprocess

    node = shutil.which("node")
    if node is None:
        return ["node is not on PATH, so the data scripts were not parsed"]
    problems = []
    for script in (MAP, CLI, TUI, HELP):
        result = subprocess.run([node, "--check", str(script)], capture_output=True, text=True)
        if result.returncode != 0:
            problems.append(f"{script.name} does not parse:\n    {result.stderr.strip().splitlines()[0]}")
    return problems


def read_data(script: Path, name: str) -> dict:
    """A data file, as data. Each is one object literal assigned to
    window.MOV.<name>; node evaluates it and prints it, so this reads the real
    thing rather than a regex's idea of it."""
    import json
    import shutil
    import subprocess

    node = shutil.which("node")
    if node is None:
        return {}
    source = (
        "const fs=require('fs');const window={};"
        f"new Function('window', fs.readFileSync({json.dumps(str(script))},'utf8'))(window);"
        f"process.stdout.write(JSON.stringify(window.MOV.{name}));"
    )
    result = subprocess.run([node, "-e", source], capture_output=True, text=True)
    if result.returncode != 0:
        return {}
    return json.loads(result.stdout)


def read_cli() -> dict:
    return read_data(CLI, "CLI")


def read_tui() -> dict:
    return read_data(TUI, "TUI")


def strings_in(node, key: str = "") -> list[tuple[str, str]]:
    """Every string leaf, with the key it hangs off."""
    found: list[tuple[str, str]] = []
    if isinstance(node, str):
        found.append((key, node))
    elif isinstance(node, list):
        for item in node:
            found.extend(strings_in(item, key))
    elif isinstance(node, dict):
        for child_key, value in node.items():
            found.extend(strings_in(value, child_key))
    return found


def tui_strings() -> list[tuple[str, str]]:
    """Every string either session shows, for the voice check."""
    found = []
    for beat in read_cli().get("beats", []):
        if beat.get("text"):
            found.append((f"cli {beat['kind']}", beat["text"]))
    for key, text in strings_in(read_tui()):
        if key not in FREE_TEXT_KEYS:
            found.append((f"tui {key}", text))
    return found


def _formats() -> list:
    import json

    entries = json.loads(MOV_STRINGS.read_text(encoding="utf-8"))["formats"]
    return [(re.compile(entry["pattern"]), entry["source"]) for entry in entries]


def _unknown(text: str, patterns: list) -> bool:
    return not any(pattern.search(text) for pattern, _ in patterns)


def cli_problems() -> list[str]:
    """The CLI session has the right shape, and prints only what mov prints."""
    session = read_cli()
    if not session:
        return ["cli.js: could not read window.MOV.CLI -- has the shape changed?"]

    problems = []
    for key in ("rows", "columns"):
        if not isinstance(session.get(key), int):
            problems.append(f"cli.js: {key} must be an integer")
    beats = session.get("beats") or []
    if not beats:
        problems.append("cli.js: no beats")

    patterns = _formats()
    for index, beat in enumerate(beats):
        kind = beat.get("kind")
        if kind not in KINDS:
            problems.append(f"cli.js: beat {index} has kind {kind!r}; known: {', '.join(sorted(KINDS))}")
            continue
        tone = beat.get("tone")
        if tone is not None and tone not in TONES:
            problems.append(f"cli.js: beat {index} has tone {tone!r}; known: {', '.join(sorted(TONES))}")
        if kind in ("line", "prompt") and _unknown(beat.get("text", ""), patterns):
            problems.append(
                f"cli.js: beat {index} is not something mov prints:\n"
                f"    {beat.get('text')!r}\n"
                f"    add the format to verify/mov-strings.json with the mov source that emits it, "
                f"or fix the line"
            )
    return problems


def tui_problems() -> list[str]:
    """The TUI frames have the right shape, and every label is one of mov's."""
    session = read_tui()
    if not session:
        return ["tui.js: could not read window.MOV.TUI -- has the shape changed?"]

    problems = []
    for key in ("rows", "columns"):
        if not isinstance(session.get(key), int):
            problems.append(f"tui.js: {key} must be an integer")
    frames = session.get("frames") or []
    if not frames:
        problems.append("tui.js: no frames")

    patterns = _formats()
    for index, frame in enumerate(frames):
        screen = frame.get("screen")
        if screen not in SCREENS:
            problems.append(f"tui.js: frame {index} has screen {screen!r}; known: {', '.join(sorted(SCREENS))}")
            continue
        for key, text in strings_in(frame):
            if key in FREE_TEXT_KEYS or key == "screen":
                continue
            if _unknown(text, patterns):
                problems.append(
                    f"tui.js: frame {index} {key} is not something mov shows:\n"
                    f"    {text!r}\n"
                    f"    add the format to verify/mov-strings.json with the mov source that emits it, "
                    f"or fix the string"
                )
    for key in ("placeholder", "empty", "title"):
        text = session.get(key, "")
        if _unknown(text, patterns):
            problems.append(f"tui.js: {key} {text!r} is not something mov shows")
    return problems


def main() -> int:
    css = CSS.read_text(encoding="utf-8")

    # A map that does not parse renders nothing; nothing else is worth reporting.
    problems = parses()
    if not problems:
        problems = (
            offences(css) + custom_properties(css) + themes(css)
            + map_problems() + cli_problems() + tui_problems() + voice()
        )

    if problems:
        print(f"{len(problems)} problem(s):\n")
        for problem in problems:
            print(f"  {problem}")
        return 1

    zones, groups, objects, _, arcs = read_map()
    beats = len(read_cli().get("beats", []))
    frames = len(read_tui().get("frames", []))
    print(
        f"OK  {len(zones)} zones, {len(groups)} groups, {len(objects)} objects, {len(arcs)} arcs; "
        f"{beats} CLI beats and {frames} TUI frames, every string one of mov's; "
        f"{len(css.splitlines())} lines of CSS within the rules"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
