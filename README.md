# mov-showcase

<img src="brand/lockup.png" alt="mov, one profile, one command" width="620">

**Live: [mov-cli.duckdns.org](https://mov-cli.duckdns.org)**

An interactive map of [mov](https://github.com/Arelius-D/mov). Three zones,
what sits in each, and what passes between them.

Click anything to read about it. Hover to see what it connects to. Type in the
filter to narrow the map.

Two more tabs. **CLI** is a small terminal playing one session end to end: a
profile written, planned and deployed, each step its own decision. **TUI** is
the picker itself, mov's full-screen application, drawn one screen at a time:
search what the subscription offers, pick, watch what each pick brings along and
why, answer what the picks require, name the project, read the file before it
is written.

Both are scripts, not recordings. Every line the CLI prints and every label,
note and key binding the TUI shows is one of mov's, in mov's spelling, and the
checker refuses a string that matches nothing in `verify/mov-strings.json` -- so
neither can drift from the tool without the build saying so. `#map`, `#cli`
and `#tui` are links.

## Running it

Open `index.html`.

No build step, no package manager, no framework, no network request at runtime.
Icons are inline SVG. Scripts are classic, not modules, because ES imports are
blocked over `file://`.

## Layout

```
index.html        markup
src/map.js        zones, groups, objects, arcs. All of the map's content.
src/cli.js        the CLI session. All of that tab's content.
src/tui.js        the TUI screens, frame by frame. All of that tab's content.
src/help.js       every command and its help. Generated; see verify/help-from-mov.py.
src/render.js     map data to DOM
src/arcs.js       arc geometry
src/interact.js   hover, selection, panel, theme, zoom, filter
src/terminal.js   plays the CLI session: typing, scrolling, the loop
src/screens.js    draws the TUI frames: panes, footer, typing
src/usage.js      draws the command surface, and one help page over it
src/tabs.js       the four views, hash-routed
src/styles.css    tokens, reset, layout, components
verify/check.py   house rules
verify/mov-strings.json   the output formats the session may show
verify/help-from-mov.py   writes src/help.js from `mov -h`
verify/labels.py  drives the page: every arc labelled, on its line, inside the map
```

Everything on the map comes from `map.js`. Adding an object is one entry in
one array.

The Usage tab comes from mov itself. `verify/help-from-mov.py` runs `mov -h`
and `mov <command> -h` and writes `src/help.js`, so that tab cannot drift from
the tool the way hand-copied text does. Run it after a release that changes the
command surface; it refuses if mov lists a command it does not know about, and
it strips the workspace header, which names a real tenant and a real path.

Arc paths are computed from where objects land, not from fixed coordinates. The
map survives a resize, a late font, or a new object. Each arc routes along
whichever axis its two ends are further apart on, and takes its own slot on the
edge it leaves from so arcs sharing an object do not stack.

Zoom scales one element. The stage is laid out at the inverse of the scale and
drawn at it, so the rendered width never changes and nothing overflows.

The filter matches two ways: substring over every field, and subsequence over
names, so `vnw` finds `vnet-novatrix-web`. A match brings its connections with
it.

## Checks

```
python verify/check.py
python verify/labels.py
```

| Rule | |
| --- | --- |
| Colours | `oklch()` or a token. No hex, `rgb()`, `hsl()` or named colours. |
| Lengths | `rem`, `em`, `%`, `ch`. No `px`. |
| Specificity | No `!important`. |
| Tokens | Declared and used, both directions. Same set in every palette. |
| Copy | No reasoning-out-loud constructions in anything a visitor reads. |
| Map data | No arc to a missing object. No object in a missing zone or group. No empty group. No object without arcs. |
| Scripts | `map.js` and `tui.js` parse. A broken string in either blanks its view while the masthead renders fine. |
| Session | Every line matches a format in `verify/mov-strings.json`, each with the mov source that prints it. |

Checked by hand: keyboard navigation, both themes plus the system default,
narrow viewports, `prefers-reduced-motion`.

## Accuracy

Every value shown is one `mov` produced against a live subscription:
`rg-novatrix-v34`, `Standard_B2ts_v2`, `swedencentral`, a real HTTP probe. The
budget alert address is the one exception, replaced because this page is public.

## Licence

AGPL-3.0-only.
