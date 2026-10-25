# Vendored front-end files (self-hosted, no CDN)

| File(s) | Source (npm) | Version | Licence |
|---|---|---|---|
| public/static/fonts/hind-*.woff2 | @fontsource/hind | 5.3.0 | SIL OFL 1.1 |
| public/static/fonts/playfair-display-*.woff2 | @fontsource/playfair-display | 5.3.0 | SIL OFL 1.1 |
| public/static/fonts/hind-rupee-*.woff2 | subset of hind-devanagari (only U+20B9), made with fonttools `pyftsubset` | - | SIL OFL 1.1 |
| public/static/js/htmx.min.js | htmx.org | 2.0.11 | BSD 0-clause |
| public/static/js/alpine-csp.min.js | @alpinejs/csp (dist/cdn.min.js) | 3.17.4 | MIT |
| tailwindcss (dev dependency, `npm run css:build`) | npm tailwindcss + @tailwindcss/typography | 3.4.17 / 0.5.16 | MIT |

Why the Alpine "CSP build": it needs no `eval`, so Step 8 can ship a strict Content-Security-Policy.
Why Tailwind 3.4 and not 4: v4 needs Chrome 111+/Safari 16.4+; v3.4 output also works on older
mid-range Android phones and WebViews, which matters for this audience.

To upgrade a file: `npm pack <package>@<version>`, copy the file from the tarball, update this table.
