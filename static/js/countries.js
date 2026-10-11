/* Countries page: search, sort and colour each country card. */
(function () {
  const grid = document.getElementById("countryGrid");
  const cards = Array.from(grid.children);
  const search = document.getElementById("cSearch");
  const sort = document.getElementById("cSort");

  // give each card its own pair of colours (based on its position in the alphabet)
  const palette = [["#5b3df5", "#0fb5a3"], ["#ff5d8f", "#ffc857"], ["#0f1535", "#5b3df5"], ["#0fb5a3", "#3b82f6"], ["#f97316", "#ff5d8f"]];
  cards.forEach((card, i) => {
    const art = card.querySelector(".country-art");
    art.style.setProperty("--c1", palette[i % palette.length][0]);
    art.style.setProperty("--c2", palette[i % palette.length][1]);
  });

  function update() {
    const q = search.value.trim().toLowerCase();
    const key = sort.value;
    const shown = cards.filter((c) => c.dataset.name.toLowerCase().includes(q));
    cards.forEach((c) => (c.hidden = !shown.includes(c)));
    shown.sort((a, b) => key === "name"
      ? a.dataset.name.localeCompare(b.dataset.name)
      : Number(b.dataset[key]) - Number(a.dataset[key]));
    shown.forEach((c) => grid.appendChild(c));
    document.getElementById("noCountry").hidden = shown.length > 0;
  }
  search.addEventListener("input", update);
  sort.addEventListener("change", update);
  update();
})();
