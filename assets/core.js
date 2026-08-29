/* FINNPUTER CORE - shared script.
   ONE LINE TO CHANGE when you deploy: API below. */
const API = "https://core-api.finnputerdex.com";

/* Your Telegram bot username, without the @. Used for the handoff links. */
const BOT = "FinnputerTradeBot";

const $  = s => document.querySelector(s);
const el = (t, c) => { const n = document.createElement(t); if (c) n.className = c; return n; };
const qs = k => new URLSearchParams(location.search).get(k) || "";
const short = m => m ? m.slice(0, 4) + "..." + m.slice(-4) : "";
const usd = n => n == null ? "n/a" :
  n >= 1e9 ? "$" + (n / 1e9).toFixed(1) + "B" : n >= 1e6 ? "$" + (n / 1e6).toFixed(2) + "M" :
  n >= 1e3 ? "$" + Math.round(n / 1e3) + "k" : "$" + Math.round(n);
const ago = t => { if (!t) return "n/a"; const s = Math.floor(Date.now() / 1000 - t);
  return s < 60 ? s + "s" : s < 3600 ? Math.floor(s / 60) + "m"
       : s < 86400 ? Math.floor(s / 3600) + "h" : Math.floor(s / 86400) + "d"; };
const scanLink = (a, chain) => (chain === "base")
  ? "https://basescan.org/address/" + a : "https://solscan.io/account/" + a;

async function api(path, opts) {
  const r = await fetch(API + path,
    Object.assign({ headers: { "content-type": "application/json" } }, opts || {}));
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

/* ---- chrome ------------------------------------------------ */
function chrome_(active) {
  document.body.insertAdjacentHTML("afterbegin",
    '<div class="aurora"><i></i><i></i><i></i></div><div class="grain"></div>');
  const links = [
    ["/", "Home"], ["/opportunities/", "Opportunities"], ["/smart-money/", "Smart money"],
    ["/token/", "Token"], ["/how/", "How it works"],
  ];
  const nav = el("nav");
  nav.innerHTML = '<a href="/"><b>FINNPUTER</b></a>' + links.slice(1).map(
    ([h, t]) => `<a href="${h}"${h === active ? ' class="on"' : ""}>${t}</a>`).join("") +
    '<a href="https://finnputerdex.com">Perps</a>';
  if (active === "/") nav.querySelector("a").classList.add("on");
  $(".wrap").prepend(nav);

  const f = el("footer");
  f.innerHTML = '<span>FINNPUTER CORE / read only / nothing here moves funds</span>' +
    '<span><a href="/how/">How it works</a> / ' +
    '<a href="https://x402.finnputerdex.com">Agent API</a> / ' +
    '<a href="https://hub.finnputerdex.com">Ecosystem</a></span>';
  $(".wrap").appendChild(f);
}

/* ---- shared renderers -------------------------------------- */
function emptyBox(title, body) {
  const d = el("div", "empty");
  d.innerHTML = `<b>${title}</b>${body}`;
  return d;
}

function bar(label, val, max) {
  const na = val == null;
  const row = el("div", "bar" + (na ? " na" : ""));
  row.innerHTML = `<span>${label}</span><i><b></b></i><u>${na ? "n/a" : val}</u>`;
  requestAnimationFrame(() => {
    row.querySelector("b").style.width = na ? "100%" : Math.min(100, 100 * val / max) + "%";
  });
  return row;
}

function oppCard(o) {
  const c = el("div", "card");
  c.addEventListener("mousemove", e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", (e.clientX - r.left) + "px");
    c.style.setProperty("--my", (e.clientY - r.top) + "px");
  });
  const col = o.opportunity >= 75 ? "var(--green)" : o.opportunity >= 55 ? "var(--gold)" : "var(--red)";
  const top = el("div", "card-top");
  top.innerHTML =
    `<div><div class="sym">${o.symbol || short(o.mint)}</div>
       <div class="mint">${short(o.mint)}</div></div>
     <div class="score" style="color:${col}">${o.opportunity}<small>OPPORTUNITY</small></div>`;
  c.append(top);

  const bars = el("div", "bars");
  bars.append(bar("smart money", o.smart_money, 35));
  bars.append(bar("safety", o.safety, 35));
  bars.append(bar("liquidity", o.liquidity, 15));
  bars.append(bar("momentum", o.momentum, 15));
  c.append(bars);

  const meta = el("div", "meta");
  const add = (t, cls) => { const s = el("span", "tag" + (cls ? " " + cls : "")); s.textContent = t; meta.append(s); };
  if (o.chain && o.chain !== "solana") add(o.chain);
  add(`${o.wallet_count} wallets`, "good");
  add(`avg score ${o.avg_wallet_score}`);
  if (o.market_cap) add(usd(o.market_cap));
  if (o.risk_score != null) add(`risk ${o.risk_score}`,
    o.risk_score >= 50 ? "bad" : o.risk_score >= 25 ? "warn" : "good");
  (o.unmeasured || []).forEach(u => add(u + " unmeasured", "warn"));
  ((o.detail || {}).hard_fails || []).forEach(h => add(h, "bad"));
  c.append(meta);

  const links = el("div");
  links.style.cssText = "margin-top:12px;font-family:var(--mono);font-size:11px";
  links.innerHTML = `<a href="/token/?m=${encodeURIComponent(o.mint)}" style="color:var(--dim)">Full scan</a>`;
  c.append(links);
  c.append(handoff(o.mint));
  return c;
}

/* ---- handoff to the bot ------------------------------------
   The site finds and verifies. It never executes. When someone wants to act,
   they land in the bot with the trade set up, where identity and custody are
   already solved. No public endpoint here can spend anything. */
const tgScan = mint => `https://t.me/${BOT}?start=core_${mint}`;
const tgBuy  = (mint, amt) => `https://t.me/${BOT}?start=coreb-${amt}_${mint}`;

function handoff(mint, amounts){
  const box = el("div");
  box.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;align-items:center";
  (amounts || [0.1, 0.5, 1]).forEach(a => {
    const b = el("a", "hint");
    b.href = tgBuy(mint, a);
    b.target = "_blank"; b.rel = "noopener";
    b.style.cssText = "text-decoration:none;color:var(--green);border-color:rgba(25,232,160,.35)";
    b.textContent = `Buy ${a} SOL in bot`;
    box.append(b);
  });
  const s = el("a", "hint");
  s.href = tgScan(mint); s.target = "_blank"; s.rel = "noopener";
  s.style.textDecoration = "none";
  s.textContent = "Open in bot";
  box.append(s);
  const n = el("span");
  n.style.cssText = "font-family:var(--mono);font-size:10.5px;color:var(--faint);width:100%";
  n.textContent = "Opens Telegram with the trade set up. Nothing is bought until you confirm there.";
  box.append(n);
  return box;
}

/* ---- command bar ------------------------------------------- */
let traceLine = 0;
function traceReset(title) {
  traceLine = 0;
  $("#trace").classList.add("on");
  $("#traceTitle").textContent = title || "WORKING";
  $("#traceBody").innerHTML = "";
  const d = $("#trace .dot"); if (d) d.style.animation = "";
}
function traceAdd(text, said) {
  const d = el("div", said ? "said" : "");
  d.textContent = text;
  d.style.animationDelay = (traceLine++ * 90) + "ms";
  $("#traceBody").appendChild(d);
  $("#traceBody").scrollTop = 1e6;
}

function mountCommand(onResults) {
  const run = async text => {
    if (!text.trim()) return;
    $("#go").disabled = true;
    traceReset("WORKING");
    traceAdd("sending to FINNPUTER CORE");
    try {
      const d = await api("/v1/command", { method: "POST", body: JSON.stringify({ text }) });
      (d.steps || []).forEach(s => traceAdd(s));
      if (d.spoken) traceAdd(d.spoken, true);
      $("#traceTitle").textContent = "DONE";
      const dot = $("#trace .dot"); if (dot) dot.style.animation = "none";
      if (onResults) onResults(d);
    } catch (e) {
      traceAdd("CORE API did not answer. Check the service.", true);
      $("#traceTitle").textContent = "FAILED";
    }
    $("#go").disabled = false;
  };
  $("#go").addEventListener("click", () => run($("#q").value));
  $("#q").addEventListener("keydown", e => { if (e.key === "Enter") run($("#q").value); });
  document.querySelectorAll(".hint").forEach(h =>
    h.addEventListener("click", () => { $("#q").value = h.textContent; run(h.textContent); }));
  return run;
}

/* ---- effects ----------------------------------------------- */
function countUp(node, target) {
  const dur = 900, t0 = performance.now();
  (function tick(t) {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    node.textContent = Math.round(target * e).toLocaleString("en-US");
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}

function effects() {
  addEventListener("click", e => {
    if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    for (let i = 0; i < 7; i++) {
      const s = el("div", "spark");
      s.style.left = e.clientX + "px"; s.style.top = e.clientY + "px";
      document.body.append(s);
      const a = (Math.PI * 2 * i) / 7, d = 22 + Math.random() * 18;
      s.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 },
                 { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px) scale(0)`, opacity: 0 }],
        { duration: 480, easing: "cubic-bezier(.2,.8,.2,1)" }).onfinish = () => s.remove();
    }
  });
  const io = new IntersectionObserver(es => es.forEach((en, i) => {
    if (en.isIntersecting) { setTimeout(() => en.target.classList.add("in"), i * 90); io.unobserve(en.target); }
  }), { threshold: .08 });
  document.querySelectorAll(".reveal").forEach(n => io.observe(n));
}
