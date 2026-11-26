(async function () {
  const $ = (id) => document.getElementById(id);

  // Load data
  let data;
  try {
    const res = await fetch("data/posts.json", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    data = await res.json();
  } catch (e) {
    // Fallback: try old briefs.json and map xPosts if present
    try {
      const res2 = await fetch("data/briefs.json", { cache: "no-store" });
      const old = await res2.json();
      data = {
        updatedAt: old.updatedAt,
        posts: (old.xPosts || []).map((p) => ({
          date: p.date,
          author: p.author,
          handle: p.handle,
          text: p.text,
          topic: p.topic,
          url: p.url,
        })),
      };
    } catch {
      $("last-updated").textContent = "Failed to load";
      $("loading").textContent = "Could not load posts.";
      return;
    }
  }

  $("last-updated").textContent = "Updated " + formatWhen(data.updatedAt);

  const posts = data.posts || [];
  let activeAuthor = "all";
  let activeTab = "for-you";

  // Build author chips
  const handles = ["all", ...unique(posts.map((p) => p.handle).filter(Boolean))];
  const authorBar = $("author-bar");
  authorBar.innerHTML = handles
    .map((h) => {
      const label = h === "all" ? "All" : "@" + h;
      return `<button type="button" class="chip${h === "all" ? " active" : ""}" data-author="${esc(h)}">${esc(label)}</button>`;
    })
    .join("");

  authorBar.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-author]");
    if (!btn) return;
    activeAuthor = btn.dataset.author;
    authorBar.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === btn));
    render();
  });

  // Tabs
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      activeTab = tab.dataset.tab;
      render();
    });
  });

  render();

  function render() {
    const list = $("timeline");
    $("loading").hidden = true;

    let filtered = posts.filter((p) => {
      if (activeAuthor !== "all" && p.handle !== activeAuthor) return false;
      return true;
    });

    // Simple "Following" bias: prioritize core accounts
    if (activeTab === "following") {
      const priority = new Set(["elonmusk", "AlexFinn", "MKBHD", "xai", "SpaceXSI", "grok"]);
      filtered = [...filtered].sort((a, b) => {
        const ap = priority.has(a.handle) ? 0 : 1;
        const bp = priority.has(b.handle) ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return (b.date || "").localeCompare(a.date || "");
      });
    } else {
      filtered = [...filtered].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    }

    $("empty").hidden = filtered.length > 0;

    list.innerHTML = filtered
      .map((p) => {
        const initial = (p.author || p.handle || "?").charAt(0).toUpperCase();
        const time = relative(p.date);
        return `
          <article class="post">
            <div class="avatar" aria-hidden="true">${esc(initial)}</div>
            <div class="post-body">
              <div class="post-header">
                <span class="post-name">${esc(p.author || p.handle)}</span>
                <span class="post-handle">@${esc(p.handle || "")}</span>
                <span class="post-time">${esc(time)}</span>
              </div>
              ${p.topic ? `<span class="post-topic">${esc(p.topic)}</span>` : ""}
              <p class="post-text">${esc(p.text || "")}</p>
              <div class="post-actions">
                ${
                  p.url
                    ? `<a class="action open" href="${esc(p.url)}" target="_blank" rel="noopener">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        Open
                      </a>`
                    : ""
                }
              </div>
            </div>
          </article>`;
      })
      .join("");
  }

  // Helpers
  function unique(arr) {
    return [...new Set(arr)];
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatWhen(iso) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso.slice(0, 16);
    }
  }

  function relative(dateStr) {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr + "T12:00:00Z");
      const now = new Date();
      const diff = Math.floor((now - d) / 86400000);
      if (diff <= 0) return "today";
      if (diff === 1) return "1d";
      if (diff < 7) return diff + "d";
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  }
})();
