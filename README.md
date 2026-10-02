# Signal Brief

Editorial daily brief for **SpaceXAI / Grok** — models, product, desktop.

**Live:** https://gravityst.github.io/signal-brief/  
**RSS:** https://gravityst.github.io/signal-brief/feed.xml

## Enable Pages

Settings → Pages → Deploy from branch → `main` / `/ (root)`.

## Files that matter

| Path | Role |
|------|------|
| `data/briefs.json` | **Daily updates go here only** |
| `feed.xml` | RSS (refresh on big days) |
| `index.html` / `styles.css` / `app.js` | Shell |

### `briefs.json` shape

- `status` — four status cards
- `reference` — sidebar key/value
- `watchNext` — string list
- `briefs[]` — `date`, `dateLabel`, `tag`, `title`, `points[]`, optional `assumption`, optional `links[{label,href}]`

Tags used by filters: `Today`, `Model`, `Product`, `Roadmap`.
