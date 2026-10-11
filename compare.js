/* Role Compare page: choose up to three roles and compare them. */
(function () {
  const META = JSON.parse(document.getElementById("meta").textContent);
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => "$" + Number(n).toLocaleString("en-US");
  const defaults = ["Data Scientist", "Machine Learning Engineer", "Data Engineer"];

  ["r1", "r2", "r3"].forEach((id, i) => {
    const el = $(id);
    if (id === "r3") el.insertAdjacentHTML("beforeend", `<option value="">None</option>`);
    META.titles.forEach((t) => el.insertAdjacentHTML("beforeend", `<option>${esc(t)}</option>`));
    el.value = defaults[i];
    el.addEventListener("change", load);
  });
  META.countries.forEach((c) => $("rCountry").insertAdjacentHTML("beforeend", `<option value="${esc(c)}">${esc(META.flags[c] + " " + c)}</option>`));
  try {
    const saved = JSON.parse(localStorage.getItem("aijobatlas_profile") || "{}").country;
    if (META.countries.includes(saved)) $("rCountry").value = saved;
  } catch (e) { /* ignore */ }
  $("rCountry").addEventListener("change", load);

  const best = (arr, key, high = true) => {
    const v = arr.filter((r) => r.jobs).map((r) => r[key]);
    return v.length ? (high ? Math.max(...v) : Math.min(...v)) : null;
  };

  function card(r, top) {
    if (!r.jobs) return `<article class="cmp-card"><h3>${esc(r.role)}</h3><p class="msg">No postings for this role here.</p></article>`;
    const mark = (key, high = true) => (r[key] === top[key] && top.count > 1 ? "best" : "");
    const bars = (items, valKey, fmt) => {
      const max = Math.max(...items.map((i) => i[valKey]), 1);
      return items.map((i) => `<div class="hbar"><span class="lab">${esc(i.label)}</span>
        <span class="track"><span class="fill" style="width:${(i[valKey] / max) * 100}%"></span></span>
        <span class="val">${fmt(i)}</span></div>`).join("");
    };
    return `<article class="cmp-card">
      <h3>${esc(r.role)}</h3>
      <div class="stat"><span>Openings</span><strong>${r.jobs.toLocaleString()}</strong></div>
      <div class="stat"><span>Average salary</span><strong class="${mark("avg_salary")}">${money(r.avg_salary)}</strong></div>
      <div class="stat"><span>Median salary</span><strong>${money(r.median_salary)}</strong></div>
      <div class="stat"><span>Experience asked</span><strong>${r.avg_years} years</strong></div>
      <div class="stat"><span>Fully remote</span><strong class="${mark("remote_pct")}">${r.remote_pct}%</strong></div>
      <div class="stat"><span>Benefits score</span><strong class="${mark("benefits")}">${r.benefits} / 10</strong></div>
      <div class="stat"><span>Common education</span><strong>${esc(r.top_education)}</strong></div>
      <div class="stat"><span>Top industries</span><strong>${r.top_industries.map(esc).join(", ")}</strong></div>
      <h4>Salary by level</h4>${bars(r.levels, "value", (i) => money(i.value))}
      <h4>Skills asked for</h4>${bars(r.skills, "share", (i) => i.share + "%")}
      <p class="cmp-link"><a class="btn btn-small btn-outline" href="/finder?role=${encodeURIComponent(r.role)}">See these jobs</a></p>
    </article>`;
  }

  async function load() {
    const roles = ["r1", "r2", "r3"].map((id) => $(id).value).filter(Boolean);
    const unique = [...new Set(roles)];
    $("cmpMsg").textContent = unique.length < 2 ? "Choose at least two different roles to compare." : "";
    const url = `/api/compare?roles=${encodeURIComponent(unique.join(","))}&country=${encodeURIComponent($("rCountry").value)}`;
    const d = await (await fetch(url)).json();
    const top = {
      count: d.roles.filter((r) => r.jobs).length,
      avg_salary: best(d.roles, "avg_salary"), remote_pct: best(d.roles, "remote_pct"), benefits: best(d.roles, "benefits"),
    };
    $("cmpGrid").innerHTML = d.roles.map((r) => card(r, top)).join("");
  }
  load();
})();
