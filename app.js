(async function () {
  const $ = (id) => document.getElementById(id);
  const STORAGE = {
    theme: "signal-theme",
    density: "signal-density",
    focus: "signal-focus",
    seen: "signal-seen-updated",
    collapsed: "signal-collapsed",
  };

  // Theme
  const storedTheme = localStorage.getItem(STORAGE.theme);
  if (storedTheme === "dark" || (!storedTheme && matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
  $("theme-toggle").addEventListener("click", () => {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    if (dark) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem(STORAGE.theme, "light");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem(STORAGE.theme, "dark");
    }
  });

  // Density + focus prefs
  if (localStorage.getItem(STORAGE.density) === "compact") {
    document.documentElement.setAttribute("data-density", "compact");
    $("btn-density").textContent = "Compact";
    $("btn-density").classList.add("active-toggle");
  }
  if (localStorage.getItem(STORAGE.focus) === "on") {
    document.documentElement.setAttribute("data-focus", "on");
    $("btn-focus").classList.add("active-toggle");
  }

  $("btn-density").addEventListener("click", toggleDensity);
  $("btn-focus").addEventListener("click", toggleFocus);

  function toggleDensity() {
    const compact = document.documentElement.getAttribute("data-density") === "compact";
    if (compact) {
      document.documentElement.removeAttribute("data-density");
      localStorage.setItem(STORAGE.density, "comfort");
      $("btn-density").textContent = "Comfort";
      $("btn-density").classList.remove("active-toggle");
    } else {
      document.documentElement.setAttribute("data-density", "compact");
      localStorage.setItem(STORAGE.density, "compact");
      $("btn-density").textContent = "Compact";
      $("btn-density").classList.add("active-toggle");
    }
  }

  function toggleFocus() {
    const on = document.documentElement.getAttribute("data-focus") === "on";
    if (on) {
      document.documentElement.removeAttribute("data-focus");
      localStorage.setItem(STORAGE.focus, "off");
      $("btn-focus").classList.remove("active-toggle");
    } else {
      document.documentElement.setAttribute("data-focus", "on");
      localStorage.setItem(STORAGE.focus, "on");
      $("btn-focus").classList.add("active-toggle");
    }
  }

  let data;
  try {
    const res = await fetch("data/briefs.json", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    data = await res.json();
  } catch {
    $("last-updated").textContent = "Could not load data";
    $("empty").hidden = false;
    $("empty").textContent = "Failed to load briefs.json.";
    return;
  }

  $("last-updated").textContent = "Updated " + formatWhen(data.updatedAt);

  // New since last visit
  const seen = localStorage.getItem(STORAGE.seen);
  if (data.updatedAt && seen && data.updatedAt !== seen) {
    $("new-banner").hidden = false;
    $("new-banner-text").textContent = "Board updated since your last visit · " + formatWhen(data.updatedAt);
  } else if (!seen && data.updatedAt) {
    localStorage.setItem(STORAGE.seen, data.updatedAt);
  }
  $("mark-seen").addEventListener("click", () => {
    localStorage.setItem(STORAGE.seen, data.updatedAt || "");
    $("new-banner").hidden = true;
    toast("Marked as seen");
  });

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

  const watch = data.watchNext || [];
  $("watch-list").innerHTML = watch.map((w) => `<li>${esc(w)}</li>`).join("");

  const allBriefs = data.briefs || [];
  const tags = ["all", ...unique(allBriefs.map((b) => b.tag).filter(Boolean))];
  const tagCounts = {};
  allBriefs.forEach((b) => {
    tagCounts[b.tag || ""] = (tagCounts[b.tag || ""] || 0) + 1;
  });

  $("filters").innerHTML = tags
    .map((t) => {
      const label = t === "all" ? "All" : t;
      const count = t === "all" ? allBriefs.length : tagCounts[t] || 0;
      return `<button type="button" class="chip${t === "all" ? " active" : ""}" data-filter="${esc(t)}">${esc(label)}<span class="count">${count}</span></button>`;
    })
    .join("");

  // Stats
  const modelShip = allBriefs.find((b) => b.tag === "Model");
  $("stats").innerHTML = `
    <span><strong>${allBriefs.length}</strong> briefs tracked</span>
    <span>Latest model note · <strong>${esc(modelShip ? modelShip.dateLabel || modelShip.date : "—")}</strong></span>
    <span>Flagship · <strong>${esc(status.model || "—")}</strong></span>
  `;

  let filter = "all";
  let query = "";
  let expandedAll = true;
  let collapsed = loadCollapsed();

  $("filters").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    filter = btn.dataset.filter;
    $("filters").querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === btn));
    updateClear();
    render();
  });

  let searchTimer;
  $("search").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      query = e.target.value.trim().toLowerCase();
      updateClear();
      render();
    }, 100);
  });

  $("clear-filters").addEventListener("click", () => {
    filter = "all";
    query = "";
    $("search").value = "";
    $("filters").querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c.dataset.filter === "all"));
    updateClear();
    render();
  });

  $("expand-all").addEventListener("click", () => {
    expandedAll = !expandedAll;
    if (expandedAll) {
      collapsed = {};
      $("expand-all").textContent = "Collapse";
    } else {
      allBriefs.forEach((b) => {
        if (b.date) collapsed[b.date] = true;
      });
      $("expand-all").textContent = "Expand";
    }
    saveCollapsed();
    render();
  });
  $("expand-all").textContent = "Collapse";

  $("btn-export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "signal-brief-" + (data.updatedAt || "export").slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Downloaded JSON");
  });

  // Back to top
  const toTop = $("to-top");
  window.addEventListener("scroll", () => {
    toTop.hidden = window.scrollY < 400;
  });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  // Keyboard
  document.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    const typing = tag === "INPUT" || tag === "TEXTAREA";
    if (e.key === "/" && !typing) {
      e.preventDefault();
      $("search").focus();
      $("search").select();
    }
    if (e.key === "Escape") {
      if (document.activeElement === $("search") && $("search").value) {
        $("search").value = "";
        query = "";
        updateClear();
        render();
      } else if (document.documentElement.getAttribute("data-focus") === "on") {
        toggleFocus();
      } else {
        $("search").blur();
      }
    }
    if (typing) return;
    if (e.key === "f" || e.key === "F") toggleFocus();
    if (e.key === "d" || e.key === "D") toggleDensity();
    if (e.key === "e" || e.key === "E") $("expand-all").click();
  });

  render();
  // Deep link after render
  requestAnimationFrame(() => {
    const hash = location.hash.replace(/^#/, "");
    if (hash) openHash(hash);
  });
  window.addEventListener("hashchange", () => openHash(location.hash.replace(/^#/, "")));

  function openHash(hash) {
    if (!hash) return;
    const el = document.getElementById("brief-" + hash);
    if (!el) return;
    collapsed[hash] = false;
    saveCollapsed();
    render();
    const again = document.getElementById("brief-" + hash);
    if (again) {
      again.classList.add("target");
      again.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => again.classList.remove("target"), 2200);
    }
  }

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

      const isCollapsed = !!collapsed[b.date];
      const isUnread = seen && data.updatedAt && b.date && isNewerOrSameDay(b.date, seen);
      const article = document.createElement("article");
      article.className =
        "brief-card" +
        (i === 0 && filter === "all" && !query ? " latest" : "") +
        (isCollapsed ? " collapsed" : "") +
        (isUnread && i === 0 ? " unread" : "");
      article.id = "brief-" + (b.date || i);

      const points = (b.points || [])
        .map((p) => `<li>${highlight(esc(p), query)}</li>`)
        .join("");
      const assumption = b.assumption
        ? `<div class="assumption"><strong>Assumption.</strong> ${highlight(esc(b.assumption), query)}</div>`
        : "";
      const links = (b.links || [])
        .map((l) => `<a href="${esc(l.href)}" rel="noopener" target="_blank">${esc(l.label)}</a>`)
        .join("");

      article.innerHTML = `
        <div class="brief-meta">
          <span class="brief-date">${esc(b.dateLabel || b.date)}</span>
          <span class="brief-ago">${relative(b.date)}</span>
          ${b.tag ? `<span class="brief-tag">${esc(b.tag)}</span>` : ""}
          ${isUnread && i === 0 ? `<span class="pill-new">Updated</span>` : ""}
        </div>
        <h2 class="brief-title"><button type="button" data-toggle title="Expand or collapse">${highlight(esc(b.title), query)}</button></h2>
        <ul class="brief-points">${points}</ul>
        ${assumption}
        ${links ? `<div class="brief-links">${links}</div>` : ""}
        <div class="card-actions">
          <button type="button" data-copy>Copy</button>
          <button type="button" data-link>Link</button>
          <button type="button" data-toggle>${isCollapsed ? "Expand" : "Collapse"}</button>
        </div>`;

      article.querySelectorAll("[data-toggle]").forEach((btn) => {
        btn.addEventListener("click", () => {
          collapsed[b.date] = !collapsed[b.date];
          saveCollapsed();
          render();
        });
      });

      article.querySelector("[data-copy]").addEventListener("click", () => {
        const text = [
          b.dateLabel || b.date,
          b.title,
          "",
          ...(b.points || []).map((p) => "• " + p),
          b.assumption ? "\nAssumption: " + b.assumption : "",
        ]
          .filter(Boolean)
          .join("\n");
        navigator.clipboard.writeText(text).then(() => toast("Copied brief"));
      });

      article.querySelector("[data-link]").addEventListener("click", () => {
        const url = location.origin + location.pathname + "#" + b.date;
        navigator.clipboard.writeText(url).then(() => toast("Link copied"));
        history.replaceState(null, "", "#" + b.date);
      });

      list.appendChild(article);
    });
  }

  function updateClear() {
    $("clear-filters").hidden = filter === "all" && !query;
  }

  function loadCollapsed() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.collapsed) || "{}");
    } catch {
      return {};
    }
  }
  function saveCollapsed() {
    localStorage.setItem(STORAGE.collapsed, JSON.stringify(collapsed));
  }

  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.hidden = true;
    }, 1600);
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

  function isNewerOrSameDay(dateStr, seenIso) {
    try {
      return new Date(dateStr + "T23:59:59Z") >= new Date(seenIso);
    } catch {
      return false;
    }
  }

  function unique(arr) {
    return [...new Set(arr)];
  }

  function highlight(htmlEscaped, q) {
    if (!q) return htmlEscaped;
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    try {
      return htmlEscaped.replace(new RegExp("(" + safe + ")", "ig"), "<mark class=\"hit\">$1</mark>");
    } catch {
      return htmlEscaped;
    }
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
