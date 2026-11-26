# X Signal

Curated AI & tech timeline in an X-style feed.

**Live:** https://gravityst.github.io/signal-brief/

Priority voices: @elonmusk · @AlexFinn · @MKBHD · and key AI accounts.

## Data

Updates go in `data/posts.json`.

```json
{
  "updatedAt": "ISO",
  "posts": [
    {
      "date": "YYYY-MM-DD",
      "author": "Display Name",
      "handle": "handle",
      "text": "Post text",
      "topic": "Product|Review|Roadmap|Workflow|Benchmark",
      "url": "https://x.com/..."
    }
  ]
}
```

## Stack

Static site. `index.html` + `styles.css` + `app.js`. Dark, mobile-first, PWA-ready.
