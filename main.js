/* Shared behaviour: mobile menu + animated skill map on the home hero. */

// ---- Mobile navigation ----
(function () {
  const btn = document.querySelector(".nav-toggle");
  const links = document.getElementById("navLinks");
  if (!btn || !links) return;
  btn.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    btn.setAttribute("aria-expanded", open);
  });
})();

// ---- Hero: floating skill constellation that reacts to the mouse ----
(function () {
  const canvas = document.getElementById("constellation");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const words = JSON.parse(canvas.dataset.words);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mouse = { x: -999, y: -999 };
  let W = 0, H = 0, nodes = [], raf = 0;

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = W < 700 ? 12 : words.length;
    nodes = words.slice(0, count).map((w) => ({
      w, x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: 3 + Math.random() * 3, hot: 0,
    }));
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.font = "600 13px Figtree, system-ui, sans-serif";
    // links between close nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 190) {
          ctx.strokeStyle = `rgba(150,170,255,${(1 - d / 190) * 0.35 + (a.hot + b.hot) * 0.2})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    for (const n of nodes) {
      const near = Math.hypot(n.x - mouse.x, n.y - mouse.y) < 140;
      n.hot += ((near ? 1 : 0) - n.hot) * 0.15;
      if (near) {
        ctx.strokeStyle = "rgba(255,200,87,.5)";
        ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      }
      ctx.fillStyle = near ? "#ffc857" : "#7be7da";
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r + n.hot * 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = near ? "#ffffff" : "rgba(210,218,255,.78)";
      ctx.fillText(n.w, n.x + 10, n.y + 4);
    }
  }

  function tick() {
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 10 || n.x > W - 90) n.vx *= -1;
      if (n.y < 10 || n.y > H - 10) n.vy *= -1;
    }
    draw();
    raf = requestAnimationFrame(tick);
  }

  const hero = canvas.parentElement;
  hero.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  hero.addEventListener("pointerleave", () => { mouse.x = mouse.y = -999; });
  window.addEventListener("resize", resize);
  resize();
  if (!reduce) tick();
})();
