(async function () {
  const themeToggle = document.getElementById("theme-toggle");
  const stored = localStorage.getItem("signal-theme");
  if (stored === "dark" || (!stored && matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.documentElement.setAttribute("data-theme", "dark");
  }

  themeToggle.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    if (isDark) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("signal-theme", "light");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("signal-theme", "dark");
    }
  });

  const res = await fetch("data/briefs.json", { cache: "no-store" });
  const data = await res.json();

  document.getElementById("last-updated").textContent =
    "Updated " + formatWhen(data.updatedAt);

  const status = data.status || {};
  document.getElementById("status-bar").innerHTML = [
    card("Flagship model", status.model || "—", status.modelHint),
    card("Desktop app", status.desktop || "—", status.desktopHint),
    card("Next model signal", status.nextModel || "—", status.nextModelHint),
    card("Cadence", status.cadence || "—", status.cadenceHint),
  ].join("");

  const ref = data.reference || {};
  document.getElementById("ref-list").innerHTML = Object.entries(ref)
    .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`)
    .join("");

  const list = document.getElementById("brief-list");
  const briefs = data.briefs || [];
  list.innerHTML = briefs
    .map((b, i) => {
      const points = (b.points || [])
        .map((p) => `<li>${escapeHtml(p)}</li>`)
        .join("");
      const assumption = b.assumption
        ? `<div class="assumption"><strong>Assumption.</strong> ${escapeHtml(b.assumption)}</div>`
        : "";
      return `
        <article class="brief-card${i === 0 ? " latest" : ""}">
          <div class="brief-meta">
            <span class="brief-date">${escapeHtml(b.dateLabel || b.date)}</span>
            ${b.tag ? `<span class="brief-tag">${escapeHtml(b.tag)}</span>` : ""}
          </div>
          <h2 class="brief-title">${escapeHtml(b.title)}</h2>
          <ul class="brief-points">${points}</ul>
          ${assumption}
        </article>`;
    })
    .join("");

  function card(label, value, hint) {
    return `
      <div class="status-card">
        <p class="label">${escapeHtml(label)}</p>
        <p class="value">${escapeHtml(value)}</p>
        ${hint ? `<p class="hint">${escapeHtml(hint)}</p>` : ""}
      </div>`;
  }

  function formatWhen(iso) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
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

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
