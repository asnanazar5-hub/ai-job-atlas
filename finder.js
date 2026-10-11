/* Job Finder page
   - left pane: your choices + jobs (country you want first, then your own country, then the rest)
   - right pane: resume upload only
   - both panes scroll independently (see .pane in style.css)           */
(function () {
  const META = JSON.parse(document.getElementById("meta").textContent);
  const KEY = "aijobatlas_profile";
  const EX_KEY = "aijobatlas_extracted";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => "$" + Number(n).toLocaleString("en-US");

  // ---------- state ----------
  // country = country you want to work in, home = the country you are from
  const empty = { name: "", country: "", home: "", role: "", years: "", education: "", skills: [] };
  let profile = Object.assign({}, empty, JSON.parse(localStorage.getItem(KEY) || "{}"));
  if (!META.titles.includes(profile.role)) profile.role = ""; // older saved text is not a data role
  const params = new URLSearchParams(location.search);
  if (META.countries.includes(params.get("country"))) profile.country = params.get("country");
  const urlRole = params.get("role") || params.get("q");
  if (META.titles.includes(urlRole)) profile.role = urlRole;
  let page = 1, pages = 1, lastGroup = null, loading = false, jobsById = {};

  // ---------- fill dropdowns ----------
  const fill = (el, items, labelOf = (x) => x, valueOf = (x) => x) =>
    items.forEach((x) => el.insertAdjacentHTML("beforeend", `<option value="${esc(valueOf(x))}">${esc(labelOf(x))}</option>`));
  const countryLabel = (c) => `${META.flags[c] || ""} ${c}`.trim();
  fill($("fCountry"), META.countries, countryLabel);
  fill($("fHome"), META.countries, countryLabel);
  fill($("fRole"), META.titles);
  fill($("fLevel"), Object.keys(META.levels), (k) => META.levels[k]);
  fill($("fType"), Object.keys(META.types), (k) => META.types[k]);
  fill($("fIndustry"), META.industries);
  fill($("skillList"), META.skills);

  META.skills.forEach((s) => {
    $("skillChips").insertAdjacentHTML("beforeend", `<button type="button" class="chip" aria-pressed="false" data-skill="${esc(s)}">${esc(s)}</button>`);
  });
  $("skillChips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const s = chip.dataset.skill;
    profile.skills = profile.skills.includes(s) ? profile.skills.filter((x) => x !== s) : [...profile.skills, s];
    save(); paintForm(); loadJobs(true);
  });

  // type a skill and press Enter / Add (only skills used in the job data are accepted)
  function addTypedSkill() {
    const text = $("skillInput").value.trim();
    if (!text) return;
    const found = META.skills.find((s) => s.toLowerCase() === text.toLowerCase());
    if (!found) { toast(`"${text}" is not asked for in the jobs data. Pick one from the list`); return; }
    if (!profile.skills.includes(found)) profile.skills = [...profile.skills, found];
    $("skillInput").value = "";
    save(); paintForm(); loadJobs(true);
  }
  $("skillAdd").addEventListener("click", addTypedSkill);
  $("skillInput").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addTypedSkill(); } });

  // ---------- profile <-> form ----------
  function save() { localStorage.setItem(KEY, JSON.stringify(profile)); }

  function paintForm() {
    $("pName").value = profile.name;
    $("fCountry").value = profile.country;
    $("fHome").value = profile.home;
    $("fRole").value = profile.role;
    $("pYears").value = profile.years;
    $("pEdu").value = profile.education;
    document.querySelectorAll("#skillChips .chip").forEach((c) =>
      c.setAttribute("aria-pressed", profile.skills.includes(c.dataset.skill)));
    $("skillCount").textContent = profile.skills.length ? `(${profile.skills.length} selected)` : "";
  }

  const bind = (id, key, reload = true) => $(id).addEventListener("change", () => {
    profile[key] = $(id).value; save(); paintForm(); if (reload) loadJobs(true);
  });
  bind("pName", "name", false);
  bind("fCountry", "country"); bind("fHome", "home"); bind("fRole", "role");
  bind("pYears", "years"); bind("pEdu", "education");

  // Clear everything (both Clear buttons) so the next person can start fresh
  function clearAll() {
    profile = Object.assign({}, empty); save();
    ["fLevel", "fType", "fRemote", "fIndustry"].forEach((id) => ($(id).value = ""));
    $("fSort").value = "match"; $("skillInput").value = "";
    localStorage.removeItem(EX_KEY);
    $("extracted").innerHTML = ""; $("uploadMsg").textContent = ""; $("resumeFile").value = "";
    paintForm(); loadJobs(true);
    $("jobsPane").scrollTo({ top: 0 }); $("infoPane").scrollTo({ top: 0 });
    toast("Cleared. Ready for the next person");
  }
  $("clearJobs").addEventListener("click", clearAll);
  $("clearResume").addEventListener("click", clearAll);

  // ---------- mobile: switch between panes ----------
  function showPane(id) {
    document.querySelectorAll(".mobile-tabs button").forEach((b) => b.classList.toggle("is-active", b.dataset.pane === id));
    document.querySelectorAll(".pane").forEach((p) => p.classList.toggle("is-active", p.id === id));
  }
  document.querySelectorAll(".mobile-tabs button").forEach((b) => b.addEventListener("click", () => showPane(b.dataset.pane)));
  if (location.hash === "#resume") showPane("infoPane");

  // ---------- jobs ----------
  function query() {
    const p = new URLSearchParams();
    if (profile.country) p.set("country", profile.country);
    if (profile.home) p.set("home", profile.home);
    if (profile.role) { p.set("title", profile.role); p.set("role", profile.role); }
    if (profile.skills.length) p.set("skills", profile.skills.join(","));
    if (profile.years !== "") p.set("years", profile.years);
    if (profile.education) p.set("education", profile.education);
    [["level", "fLevel"], ["type", "fType"], ["remote", "fRemote"], ["industry", "fIndustry"], ["sort", "fSort"]]
      .forEach(([k, id]) => { if ($(id).value !== "") p.set(k, $(id).value); });
    p.set("page", page); p.set("per_page", 20);
    return p;
  }

  async function loadJobs(reset) {
    if (loading) return;
    loading = true;
    if (reset) { page = 1; lastGroup = null; jobsById = {}; $("jobList").innerHTML = ""; $("summary").textContent = "Loading jobs..."; }
    try {
      const res = await fetch("/api/jobs?" + query());
      const data = await res.json();
      pages = data.pages;
      renderSummary(data);
      renderJobs(data);
      $("moreBtn").hidden = page >= pages;
    } catch (err) {
      $("summary").textContent = "Could not load jobs. Is the server running?";
    }
    loading = false;
  }

  function renderSummary(d) {
    if (!d.total) { $("summary").textContent = "No jobs match these choices."; return; }
    const n = (x) => x.toLocaleString();
    const parts = [];
    if (profile.country) parts.push(`<strong>${n(d.in_country_total)}</strong> in ${esc(profile.country)} first`);
    if (profile.home && profile.home !== profile.country) parts.push(`<strong>${n(d.home_total)}</strong> in ${esc(profile.home)}`);
    if (parts.length) parts.push(`<strong>${n(d.other_total)}</strong> in other countries`);
    $("summary").innerHTML = parts.length
      ? parts.join(", then ")
      : `<strong>${n(d.total)}</strong> jobs. Choose the country you want to work in to see local jobs first`;
  }

  function groupOf(j) {
    if (!profile.country && !profile.home) return "all";
    return j.tier === 2 ? "want" : j.tier === 1 ? "near" : "other";
  }

  function renderJobs(d) {
    const list = $("jobList");
    if (!d.jobs.length && page === 1) {
      list.innerHTML = `<p class="empty">No jobs found. Try clearing a choice.</p>`;
      return;
    }
    let html = "";
    d.jobs.forEach((j) => {
      jobsById[j.id] = j;
      const g = groupOf(j);
      if (g !== lastGroup && g !== "all") {
        html += g === "want" ? `<div class="group-label home">Jobs in ${esc(profile.country)}</div>`
          : g === "near" ? `<div class="group-label near">Jobs in ${esc(profile.home)} (your country)</div>`
          : `<div class="group-label">Jobs in other countries</div>`;
      }
      lastGroup = g;
      html += jobCard(j);
    });
    list.insertAdjacentHTML("beforeend", html);
  }

  function jobCard(j) {
    const skills = j.skills.map((s) => `<span class="skill ${j.matched.includes(s) ? "hit" : ""}">${esc(s)}</span>`).join("");
    const ring = j.score !== null ? `<div class="match" style="--p:${j.score}" title="Match score"><b>${j.score}%</b></div>` : "";
    const cls = j.tier === 2 ? "home" : j.tier === 1 ? "near" : "";
    return `<button class="job ${cls}" data-id="${esc(j.id)}">
      <div>
        <h3>${esc(j.title)}</h3>
        <div class="co">${esc(j.company)} &middot; ${esc(j.industry)}</div>
      </div>
      <div class="pay">${money(j.salary_usd)}<small>per year</small></div>
      <div class="badges">
        <span class="badge ${j.tier === 2 ? "home" : j.tier === 1 ? "near" : "loc"}">${esc(j.flag)} ${esc(j.country)}</span>
        <span class="badge">${esc(j.level)}</span>
        <span class="badge">${esc(j.type)}</span>
        <span class="badge ${j.mode === "Remote" ? "remote" : ""}">${esc(j.mode)}</span>
      </div>
      <div class="badges">${skills}</div>
      ${ring}
    </button>`;
  }

  $("jobList").addEventListener("click", (e) => {
    const card = e.target.closest(".job");
    if (card) openJob(jobsById[card.dataset.id]);
  });
  $("moreBtn").addEventListener("click", () => { page += 1; loadJobs(false); });
  ["fLevel", "fType", "fRemote", "fIndustry", "fSort"].forEach((id) => $(id).addEventListener("change", () => loadJobs(true)));

  // ---------- job dialog ----------
  function openJob(j) {
    const local = j.currency !== "USD" ? `${j.salary_local.toLocaleString()} ${esc(j.currency)}` : "Same as USD";
    const where = j.tier === 2 ? " (country you want)" : j.tier === 1 ? " (your country)" : "";
    $("jobDialog").innerHTML = `<div class="dlg-in">
      <button class="dlg-close" aria-label="Close" onclick="this.closest('dialog').close()">&times;</button>
      <h2>${esc(j.title)}</h2>
      <p class="co">${esc(j.company)} &middot; ${esc(j.flag)} ${esc(j.country)}${where}</p>
      ${j.score !== null ? `<p class="msg"><strong>${j.score}% match</strong> with your details${j.matched.length ? ": " + j.matched.map(esc).join(", ") : ""}</p>` : ""}
      <div class="dlg-grid">
        <div><span>Salary (USD)</span><strong>${money(j.salary_usd)}</strong></div>
        <div><span>Salary (local currency)</span><strong>${local}</strong></div>
        <div><span>Experience level</span><strong>${esc(j.level)} (${j.years} years)</strong></div>
        <div><span>Education required</span><strong>${esc(j.education)}</strong></div>
        <div><span>Job type</span><strong>${esc(j.type)}</strong></div>
        <div><span>Work mode</span><strong>${esc(j.mode)}</strong></div>
        <div><span>Industry</span><strong>${esc(j.industry)}</strong></div>
        <div><span>Company size</span><strong>${{ S: "Small", M: "Medium", L: "Large" }[j.size] || esc(j.size)}</strong></div>
        <div><span>Posted</span><strong>${esc(j.posted)}</strong></div>
        <div><span>Apply by</span><strong>${esc(j.deadline)}</strong></div>
        <div><span>Benefits score</span><strong>${j.benefits} / 10</strong></div>
        <div><span>Candidate lives in</span><strong>${esc(j.residence)}</strong></div>
      </div>
      <h3>Skills required</h3>
      <div class="badges" style="margin-top:10px">${j.skills.map((s) => `<span class="skill ${j.matched.includes(s) ? "hit" : ""}">${esc(s)}</span>`).join("")}</div>
    </div>`;
    $("jobDialog").showModal();
  }
  $("jobDialog").addEventListener("click", (e) => { if (e.target === $("jobDialog")) $("jobDialog").close(); });

  // ---------- resume upload ----------
  const drop = $("drop"), fileInput = $("resumeFile");
  fileInput.addEventListener("change", () => fileInput.files[0] && upload(fileInput.files[0]));
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => e.dataTransfer.files[0] && upload(e.dataTransfer.files[0]));

  async function upload(file) {
    const msg = $("uploadMsg");
    msg.className = "msg"; msg.textContent = `Reading ${file.name}...`;
    $("extracted").innerHTML = "";
    const form = new FormData(); form.append("resume", file);
    try {
      const res = await fetch("/api/extract", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      msg.textContent = "";
      localStorage.setItem(EX_KEY, JSON.stringify(data));
      showExtracted(data);
      applyExtracted(data);
    } catch (err) {
      msg.className = "msg error"; msg.textContent = err.message;
    }
    fileInput.value = ""; // lets the same file be chosen again
  }

  const row = (label, value) => (value ? `<div><dt>${label}</dt><dd>${value}</dd></div>` : "");

  function showExtracted(d) {
    const skills = d.skills.length ? `<div class="chips">${d.skills.map((s) => `<span class="skill hit">${esc(s)}</span>`).join("")}</div>` : "";
    $("extracted").innerHTML = `<div class="ex-card">
      <h3>${esc(d.name) || "Information found in your resume"}</h3>
      <p class="msg">Read ${d.words} words from your resume.</p>
      <dl>
        ${row("Email", esc(d.email))}
        ${row("Phone", esc(d.phone))}
        ${row("Links", d.links.map(esc).join("<br>"))}
        ${row("Country", d.country ? `${esc(META.flags[d.country] || "")} ${esc(d.country)}` : "")}
        ${row("Education", [d.education, d.field].filter(Boolean).map(esc).join(" in "))}
        ${row("Institutions", d.institutions.map(esc).join("<br>"))}
        ${row("Experience", d.years ? `${d.years} years` : "Fresher or not stated")}
        ${row("Skills found", skills)}
        ${row("Suggested roles", d.roles.map(esc).join(", "))}
      </dl>
      <p class="ex-ok">Applied. The job section on the left now uses these details. You can change any of them there.</p>
    </div>`;
  }

  function applyExtracted(d) {
    const workIn = profile.country; // keep the country the user already chose to work in
    profile = Object.assign({}, empty);
    profile.name = d.name || "";
    if (d.country && META.countries.includes(d.country)) profile.home = d.country;
    profile.country = workIn || profile.home;
    if (d.role && META.titles.includes(d.role)) profile.role = d.role;
    profile.years = d.years || 0;
    if (d.education) profile.education = d.education;
    profile.skills = d.skills.filter((s) => META.skills.includes(s));
    save(); paintForm(); loadJobs(true);
    toast(profile.country ? `Showing jobs in ${profile.country} first` : "Resume read. Choose the country you want to work in");
  }

  function toast(text) {
    const t = $("toast"); t.textContent = text; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2800);
  }

  // ---------- start ----------
  const lastEx = localStorage.getItem(EX_KEY);
  if (lastEx) { try { showExtracted(JSON.parse(lastEx)); } catch (e) { /* ignore */ } }
  paintForm();
  loadJobs(true);
})();
