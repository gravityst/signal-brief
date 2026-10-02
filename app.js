(async function () {
  const $ = (id) => document.getElementById(id);
  const themeToggle = $("theme-toggle");
  const stored = localStorage.getItem("signal-theme");
  if (stored === "dark" || (!stored && matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
  themeToggle.addEventListener("click", () => {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    if (dark) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("signal-theme", "light");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("signal-theme", "dark");
    }
  });

  let data;
  try {
    const res = await fetch("data/briefs.json", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    data = await res.json();
  } catch (e) {
    $("last-updated").textContent = "Could not load data";
    $("brief-list").innerHTML = "";
    $("empty").hidden = false;
    $("empty").textContent = "Failed to load briefs.json. Check GitHub Pages path.";
    return;
  }

  $("last-updated").textContent = "Updated " + formatWhen(data.updatedAt);

  const status = data.status || {};
  $("status-bar").innerHTML = [
    card("Flagship model", status.model || "—", status.modelHint),
    card("Desktop app", status.desktop || "—", status.desktopHint),
    card("Next model signal", status.nextModel || "—", status.nextModelHint),
    card("Cadence", status.cadence || "—", status.cadenceHint),
  ].join("");

  const ref = data.reference || {};
  $("ref-list").innerHTML = Object.entries(ref)
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
    .join("");

  const watch = data.watchNext || [
    "Official Grok 5 / next-flagship announcement",
    "Desktop version bumps on Grok Bot stable",
    "Musk or @SpaceXAI posts on model timeline",
  ];
  $("watch-list").innerHTML = watch.map((w) => `<li>${esc(w)}</li>`).join("");

  const allBriefs = data.briefs || [];
  let filter = "all";
  let query = "";

  const filtersEl = $("filters");
  filtersEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    filter = btn.dataset.filter;
    filtersEl.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === btn));
    render();
  });

  let searchTimer;
  $("search").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      query = e.target.value.trim().toLowerCase();
      render();
    }, 120);
  });

  render();

  function render() {
    const filtered = allBriefs.filter((b) => {
      if (filter !== "all" && (b.tag || "") !== filter) return false;
      if (!query) return true;
      const blob = [b.title, b.dateLabel, b.tag, ...(b.points || []), b.assumption || ""]
        .join(" ")
        .toLowerCase();
      return blob.includes(query);
    });

    $("result-count").textContent =
      filtered.length === allBriefs.length
        ? "Confirmed signals first. Assumptions labeled."
        : filtered.length + " of " + allBriefs.length + " briefs";

    $("empty").hidden = filtered.length > 0;
    const list = $("brief-list");
    list.innerHTML = "";

    let lastMonth = "";
    filtered.forEach((b, i) => {
      const month = monthKey(b.date);
      if (month && month !== lastMonth) {
        lastMonth = month;
        const lab = document.createElement("div");
        lab.className = "month-label";
        lab.textContent = month;
        list.appendChild(lab);
      }

      const article = document.createElement("article");
      article.className = "brief-card" + (i === 0 && filter === "all" && !query ? " latest" : "");

      const points = (b.points || []).map((p) => `<li>${esc(p)}</li>`).join("");
      const assumption = b.assumption
        ? `<div class="assumption"><strong>Assumption.</strong> ${esc(b.assumption)}</div>`
        : "";
      const links = (b.links || [])
        .map((l) => `<a href="${esc(l.href)}" rel="noopener" target="_blank">${esc(l.label)}</a>`)
        .join("");

      article.innerHTML = `
        <div class="brief-meta">
          <span class="brief-date">${esc(b.dateLabel || b.date)}</span>
          <span class="brief-ago">${relative(b.date)}</span>
          ${b.tag ? `<span class="brief-tag">${esc(b.tag)}</span>` : ""}
        </div>
        <h2 class="brief-title">${esc(b.title)}</h2>
        <ul class="brief-points">${points}</ul>
        ${assumption}
        ${links ? `<div class="brief-links">${links}</div>` : ""}
        <div class="card-actions">
          <button type="button" class="copy-btn" data-copy>Copy brief</button>
        </div>`;

      article.querySelector("[data-copy]").addEventListener("click", (ev) => {
        const text = [
          b.dateLabel || b.date,
          b.title,
          "",
          ...(b.points || []).map((p) => "• " + p),
          b.assumption ? "\nAssumption: " + b.assumption : "",
        ]
          .filter(Boolean)
          .join("\n");
        navigator.clipboard.writeText(text).then(() => {
          ev.target.textContent = "Copied";
          setTimeout(() => (ev.target.textContent = "Copy brief"), 1400);
        });
      });

      list.appendChild(article);
    });
  }

  function card(label, value, hint) {
    return `
      <div class="status-card">
        <p class="label">${esc(label)}</p>
        <p class="value">${esc(value)}</p>
        ${hint ? `<p class="hint">${esc(hint)}</p>` : ""}
      </div>`;
  }

  function formatWhen(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  function relative(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T12:00:00Z");
    if (Number.isNaN(d.getTime())) return "";
    const days = Math.round((Date.now() - d.getTime()) / 86400000);
    if (days <= 0) return "today";
    if (days === 1) return "1 day ago";
    if (days < 30) return days + " days ago";
    if (days < 60) return "about a month ago";
    return Math.round(days / 30) + " months ago";
  }

  function monthKey(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T12:00:00Z");
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, { month: "long", year: "numeric" });
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
