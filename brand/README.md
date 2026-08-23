# brand

Canonical copies. `MOV-CLI/brand/` holds only the three its README renders.

| File | Used by |
| --- | --- |
| `favicon.svg` | the site's tab icon |
| `favicon-16/32/64/180.png` | tab and touch icons |
| `favicon-sizes.png` | reference sheet, light and dark, to check legibility |
| `logo.svg` | the site's masthead. Transparent, works on both themes |
| `logo.png` | raster, for anywhere SVG is not accepted |
| `lockup.svg` / `.png` | README headers and the social card |
| `hero-wrap.svg` / `.png` | the MOV-CLI README |

The `.svg` files are the masters. Rasters are generated from them, so edit the
SVG and re-export rather than touching a PNG.

The favicon's `mov` text is not readable below 32px. At 16 the shape carries it.
