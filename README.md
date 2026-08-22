# mov-showcase

An interactive map of what [mov](https://github.com/Arelius-D/MOV-CLI) actually
does: three zones, the objects in each, and every arc between them.

A command list does not convey that a JSON file on your laptop causes a virtual
machine in Sweden to clone a repository from GitHub and serve it — nor that
tearing it down takes the budget, the SSH key and the host entry with it. The
relationships are the interesting part, so the page is built out of them.

Click anything to find out what it is. Hover to see only what it is connected
to. Nothing autoplays and nothing is on a timer.

## Running it

Open `index.html`. That is the whole procedure.

No build step, no package manager, no framework, and no network request at
runtime — the icons are inline SVG and the fonts fall back to whatever the
system has. It works from a `file://` URL, which is why the scripts are classic
rather than modules: ES module imports are blocked over `file://`, and a page
that needs a web server to be looked at is a page with a build step by another
name.

## How it is put together

```
index.html        semantic landmarks, nothing presentational
src/map.js        ZONES, OBJECTS, ARCS — the entire content of the page
src/render.js     data -> DOM, once, at load
src/arcs.js       geometry: where objects landed -> SVG curves
src/interact.js   hover and selection state, the detail panel, the theme
src/styles.css    tokens, then reset, then layout, then components
verify/check.py   the house rules, enforced
```

`map.js` is the only file with anything to say. Every object on the page comes
from it, so adding an object is one entry in one array — there is no second
place to update and no chance of the map and its description disagreeing.

Arc paths are computed from where the objects actually ended up, never from
hand-placed coordinates, so the map survives a resize, a late-loading font, or
a new object appearing.

## The rules, and why they are checked

```
python verify/check.py
```

Standards kept by intention are standards until the day someone is in a hurry.
These are checked mechanically instead:

| | |
| --- | --- |
| every colour is `oklch()` or a `var(--…)` | no hex, no `rgb()`, no `hsl()`, no named colours |
| every length is `rem`/`em`/`%`/`ch` | a `px` length ignores the reader's font size |
| no `!important` | if a rule loses, the selector was wrong |
| custom properties declared **and** used | both directions — dead tokens and silent nothings |
| the map's data is consistent | no arc to a missing object, no object in a missing zone, no duplicates, and no object nothing connects to |

That last one is a content rule wearing a linter's clothes: an island on a map
about relationships is a bug even when it renders perfectly.

Things a script cannot judge are checked by hand: tabbing through the whole map
with focus always visible, both themes plus the no-explicit-choice case, narrow
viewports, and `prefers-reduced-motion`.

## Accuracy

Every value shown is one `mov` actually produced against a live subscription,
copied from a real workspace or from the tool's own output — `rg-novatrix-v34`,
`Standard_B2ts_v2`, `swedencentral`, a real HTTP probe result. The single
exception is the budget alert address, which is neutral here because this page
is public.

## Licence

AGPL-3.0-only, matching the rest of these repositories.
