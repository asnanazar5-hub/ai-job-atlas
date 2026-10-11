/* Insights page: loads /api/stats and draws simple charts with HTML and SVG (no libraries). */
(function () {
  const META = JSON.parse(document.getElementById("meta").textContent);
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => "$" + Number(n).toLocaleString("en-US");
  const COLORS = ["#5b3df5", "#0fb5a3", "#ffc857", "#ff5d8f", "#3b82f6"];

  META.countries.forEach((c) => $("insCountry").insertAdjacentHTML("beforeend", `<option value="${esc(c)}">${esc(META.flags[c] + " " + c)}</option>`));

  // start with ?country=..., otherwise the country saved from the finder page
  const params = new URLSearchParams(location.search);
  let saved = "";
  try { saved = JSON.parse(localStorage.getItem("aijobatlas_profile") || "{}").country || ""; } catch (e) { /* ignore */ }
  const start = params.get("country") || saved;
  if (META.countries.includes(start)) $("insCountry").value = start;

  // horizontal bars: items = [{label, value, text?}]
  function bars(el, items, fmt, cls) {
    const max = Math.max(...items.map((i) => i.value), 1);
    el.innerHTML = items.map((i) => `<div class="hbar">
      <span class="lab" title="${esc(i.label)}">${esc(i.label)}</span>
      <span class="track"><span class="fill ${cls || ""}" data-w="${(i.value / max) * 100}"></span></span>
      <span class="val">${fmt(i)}</span></div>`).join("");
    requestAnimationFrame(() => el.querySelectorAll(".fill").forEach((f) => (f.style.width = f.dataset.w + "%")));
  }

  function donut(el, items) {
    const total = items.reduce((a, b) => a + b.value, 0) || 1;
    let angle = -Math.PI / 2, paths = "";
    items.forEach((it, i) => {
      const sweep = (it.value / total) * Math.PI * 2 - 0.02;
      const x1 = 85 + 70 * Math.cos(angle), y1 = 85 + 70 * Math.sin(angle);
      const x2 = 85 + 70 * Math.cos(angle + sweep), y2 = 85 + 70 * Math.sin(angle + sweep);
      paths += `<path d="M${x1} ${y1} A70 70 0 ${sweep > Math.PI ? 1 : 0} 1 ${x2} ${y2}" stroke="${COLORS[i % 5]}" stroke-width="26" fill="none"/>`;
      angle += (it.value / total) * Math.PI * 2;
    });
    el.innerHTML = `<svg viewBox="0 0 170 170" role="img" aria-label="Work mode split">${paths}</svg>
      <div class="legend">${items.map((it, i) => `<div><i style="background:${COLORS[i % 5]}"></i>${esc(it.label)}: <strong>${Math.round((it.value / total) * 100)}%</strong> (${it.value.toLocaleString()})</div>`).join("")}</div>`;
  }

  function line(el, items) {
    const W = 760, H = 220, pad = 34;
    const max = Math.max(...items.map((i) => i.value), 1);
    const x = (i) => pad + (i * (W - pad * 2)) / Math.max(items.length - 1, 1);
    const y = (v) => H - pad - (v / max) * (H - pad * 2);
    const pts = items.map((it, i) => `${x(i)},${y(it.value)}`).join(" ");
    const labels = items.map((it, i) => (i % Math.ceil(items.length / 8) === 0 ? `<text x="${x(i)}" y="${H - 8}" font-size="11" text-anchor="middle" fill="#5b668e">${esc(it.label)}</text>` : "")).join("");
    const dots = items.map((it, i) => `<circle cx="${x(i)}" cy="${y(it.value)}" r="3.5" fill="#5b3df5"><title>${esc(it.label)}: ${it.value} jobs</title></circle>`).join("");
    el.innerHTML = `<svg class="line-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Postings per month">
      <line x1="${pad}" y1="${H - pad}" x2="${W - pad}" y2="${H - pad}" stroke="#dde2f1"/>
      <polygon points="${pad},${H - pad} ${pts} ${W - pad},${H - pad}" fill="#ece8ff"/>
      <polyline points="${pts}" fill="none" stroke="#5b3df5" stroke-width="2.5"/>${dots}${labels}
      <text x="${pad}" y="16" font-size="11" fill="#5b668e">Peak: ${max} jobs in a month</text></svg>`;
  }

  async function load() {
    const country = $("insCountry").value;
    const res = await fetch("/api/stats" + (country ? "?country=" + encodeURIComponent(country) : ""));
    const d = await res.json();
    $("insTitle").textContent = country ? `Insights for ${country}` : "Insights for all countries";
    const k = d.kpi;
    $("kpis").innerHTML = [
      ["Job postings", k.jobs.toLocaleString()], ["Average salary", money(k.avg_salary)],
      ["Median salary", money(k.median_salary)], ["Fully remote", k.remote_pct + "%"], ["Hiring companies", k.companies],
    ].map(([a, b]) => `<div class="kpi"><span>${a}</span><strong>${b}</strong></div>`).join("");

    bars($("chTitles"), d.titles, (i) => `${i.value.toLocaleString()} jobs`);
    bars($("chLevels"), d.levels, (i) => money(i.value), "aqua");
    bars($("chSkills"), d.skills, (i) => i.share + "%", "rose");
    donut($("chModes"), d.modes);
    bars($("chEdu"), d.education, (i) => money(i.value), "aqua");
    bars($("chInd"), d.industries, (i) => i.value.toLocaleString());
    line($("chMonths"), d.months);
    $("countriesCard").hidden = !d.countries;
    if (d.countries) bars($("chCountries"), d.countries, (i) => money(i.value));
  }
  $("insCountry").addEventListener("change", () => {
    history.replaceState(null, "", $("insCountry").value ? "?country=" + encodeURIComponent($("insCountry").value) : location.pathname);
    load();
  });
  load();
})();
