(async function () {
  const $ = (id) => document.getElementById(id);

  const PRIORITY = ["all", "elonmusk", "AlexFinn", "MKBHD", "sama", "karpathy", "xai", "SpaceXSI", "grok"];

  let data = null;
  let activeAuthor = "all";
  let activeTab = "for-you";

  try {
    const res = await fetch("data/posts.json", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    data = await res.json();
  } catch {
    try {
      const res2 = await fetch("data/briefs.json", { cache: "no-store" });
      if (res2.ok) {
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
      }
    } catch {}
  }

  if (!data) {
    $("loading").textContent = "Could not load posts.";
    return;
  }

  $("last-updated").textContent = "Updated " + formatWhen(data.updatedAt);
  $("loading").hidden = true;

  const authorsInData = unique(
    (data.posts || []).map((p) => (p.handle || "").replace(/^@/, "")).filter(Boolean)
  );
  const chips = ["all", ...PRIORITY.filter((h) => h !== "all" && authorsInData.includes(h)), ...authorsInData.filter((h) => !PRIORITY.includes(h))];

  const bar = $("author-bar");
  bar.innerHTML = chips
    .map((h) => {
      const label = h === "all" ? "All" : "@" + h;
      return `<button type="button" class="chip${h === "all" ? " active" : ""}" data-author="${esc(h)}">${esc(label)}</button>`;
    })
    .join("");

  bar.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-author]");
    if (!btn) return;
    activeAuthor = btn.dataset.author;
    bar.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === btn));
    render();
  });

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
    const posts = data.posts || [];
    let filtered = posts;

    if (activeAuthor !== "all") {
      filtered = filtered.filter((p) => (p.handle || "").replace(/^@/, "") === activeAuthor);
    }

    if (activeTab === "following") {
      filtered = filtered.filter((p) => {
        const h = (p.handle || "").replace(/^@/, "");
        return PRIORITY.includes(h);
      });
    }

    filtered = [...filtered].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    const timeline = $("timeline");
    $("empty").hidden = filtered.length > 0;

    if (!filtered.length) {
      timeline.innerHTML = "";
      return;
    }

    timeline.innerHTML = filtered
      .map((p) => {
        const handle = (p.handle || "").replace(/^@/, "");
        const initial = (p.author || handle || "?").charAt(0).toUpperCase();
        const time = relative(p.date);
        const topic = p.topic ? `<span class="post-topic">${esc(p.topic)}</span>` : "";

        return `
        <article class="post">
          <div class="avatar" aria-hidden="true">${esc(initial)}</div>
          <div class="post-body">
            <div class="post-header">
              <span class="post-name">${esc(p.author || handle)}</span>
              <span class="post-handle">@${esc(handle)}</span>
              <span class="post-time">${esc(time)}</span>
            </div>
            ${topic}
            <p class="post-text">${esc(p.text || "")}</p>
            <div class="post-actions">
              ${
                p.url
                  ? `<a class="action open" href="${esc(p.url)}" target="_blank" rel="noopener">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      Open on X
                    </a>`
                  : ""
              }
            </div>
          </div>
        </article>`;
      })
      .join("");
  }

  function unique(arr) {
    return [...new Set(arr)];
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatWhen(iso) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    } catch {
      return iso.slice(0, 10);
    }
  }

  function relative(dateStr) {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr + "T12:00:00Z");
      const now = new Date();
      const diff = Math.floor((now - d) / 86400000);
      if (diff <= 0) return "Today";
      if (diff === 1) return "1d";
      if (diff < 7) return diff + "d";
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  }
})();
