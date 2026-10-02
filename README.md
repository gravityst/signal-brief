# Signal Brief

Clean daily brief for **SpaceXAI / Grok** model, product, and desktop signals.

Live site (after Pages is enabled): **https://gravityst.github.io/signal-brief/**

## Enable GitHub Pages

1. Open the repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / folder: **/ (root)**
4. Save. Site is usually live within a minute or two.

## Structure

| Path | Role |
|------|------|
| `index.html` | Shell |
| `styles.css` | Editorial light/dark UI |
| `app.js` | Renders `data/briefs.json` |
| `data/briefs.json` | **Only file the daily update needs to edit** |

## Daily update

Replace or prepend entries in `data/briefs.json`, bump `updatedAt` and `status` fields, commit to `main`. No build step.

## Design notes

Warm paper background, serif titles, no neon, no robot motifs. Confirmed points vs labeled assumptions.
