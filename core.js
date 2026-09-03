/* FINNPUTER CORE - shared script.
   ONE LINE TO CHANGE when you deploy: API below. */
const API = "https://core-api-production-182c.up.railway.app";

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
  // Third entry is a title attribute: the question the page answers.
  //
  // Signals, Runners, Live buys and Smart money all read as "tokens to look
  // at" from the label alone, so a visitor clicks one, decides the site is
  // repeating itself, and leaves. The tooltip costs nothing and removes the
  // ambiguity for anyone who hesitates over a tab.
  const links = [
    ["/", "Home", "Start here"],
    ["/opportunities/", "Signals",
     "Which token are several rated wallets buying right now"],
    ["/runners/", "Runners", "What we scanned that later ran"],
    ["/buys/", "Live buys", "Every sighting this minute, unfiltered"],
    ["/smart-money/", "Smart money", "Which wallets are worth watching, and why"],
    ["/token/", "Token", "$FINNPUTER, fees and burn"],
    ["/how/", "How it works", "The method, end to end"],
  ];
  const nav = el("nav");
  // Mark, if the file exists. Falls back to the wordmark on 404 so a missing
  // image never leaves a broken icon in the header.
  const mark = '<a href="/" style="display:flex;align-items:center;gap:0">'
    + '<img class="mark" src="/assets/mark.png" alt="" '
    + 'onerror="this.remove()"><b>FINNPUTER</b></a>';
  nav.innerHTML = mark + links.slice(1).map(
    ([h, t, q]) => `<a href="${h}"${h === active ? ' class="on"' : ""}`
      + (q ? ` title="${q}"` : "") + `>${t}</a>`).join("") +
    '<a href="https://finnputerdex.com" title="Perpetuals, separate site">Perps</a>';
  if (active === "/") nav.querySelector("a").classList.add("on");

  // The mark link stays visible at every width; everything else collapses
  // behind the burger on a phone.
  nav.querySelector("a").classList.add("always");

  const burger = el("button", "burger");
  burger.type = "button";
  burger.setAttribute("aria-label", "Menu");
  burger.textContent = "\u2261";
  burger.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    burger.textContent = open ? "\u00d7" : "\u2261";
  });
  nav.insertBefore(burger, nav.children[1]);

  $(".wrap").prepend(nav);

  const f = el("footer");
  f.innerHTML = '<span>FINNPUTER CORE / read only / nothing here moves funds</span>' +
    '<span><a href="/how/">How it works</a> / ' +
    '<a href="https://x402.finnputerdex.com">Agent API</a> / ' +
    '<a href="https://hub.finnputerdex.com">Ecosystem</a></span>';
  $(".wrap").appendChild(f);
}

/* ---- chain marks -------------------------------------------
   Badge first, real logo if one has been dropped in. The image sits ON the
   badge, so a missing file leaves the badge rather than a broken icon. */
const CHAIN_LABEL = { solana: "SOL", base: "BASE", robinhood: "RH",
                      stable: "USDT", ethereum: "ETH" };
const CHAIN_NAME  = { solana: "Solana", base: "Base", robinhood: "Robinhood",
                      stable: "Stable", ethereum: "Ethereum" };

function chainChip(chain, opts) {
  const c = (chain || "solana").toLowerCase();
  const known = CHAIN_LABEL[c] !== undefined;
  const o = opts || {};
  const wrap = el("span", "chip" + (o.size ? " " + o.size : ""));
  const dot = el("i", "c-" + (known ? c : "unknown"));
  dot.textContent = known ? CHAIN_LABEL[c].slice(0, 2) : "?";

  // Try the real logo. If it is not there, the badge stays as it is.
  const probe = new Image();
  probe.onload = () => {
    dot.style.backgroundImage = `url(/assets/chains/${c}.png)`;
    dot.textContent = "";
  };
  probe.src = `/assets/chains/${c}.png`;

  wrap.append(dot);
  if (o.label !== false) {
    const t = el("span");
    t.textContent = o.full ? (CHAIN_NAME[c] || c) : (CHAIN_LABEL[c] || c);
    wrap.append(t);
  }
  return wrap;
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

function plainFinding(o) {
  const n = o.wallet_count || 0;
  const parts = [];

  let first = n
    ? `${n} wallet${n === 1 ? "" : "s"} we rate bought this`
    : "No rated wallet bought this";

  // The window comes from the buys themselves, which sit in detail. The
  // API already returns detail as an object; there are no top level
  // first_buy/last_buy fields and reaching for them would have made this
  // line silently never appear.
  const d = o.detail || {};
  const fb = d.first_buy, lb = d.last_buy;
  if (n && fb && lb && lb >= fb) {
    const mins = Math.max(1, Math.round((lb - fb) / 60));
    first += ` within ${mins} min`;
  }
  parts.push(first);

  if (o.avg_wallet_score) parts.push(`average wallet score ${o.avg_wallet_score}`);

  // Only what was verified. unmeasured lists what was not, and a check that
  // could not run must never read as one that passed.
  const un = (o.unmeasured || []).map(x => String(x).toLowerCase());
  if (un.includes("safety")) parts.push("contract not checked on this chain");
  else if ((o.safety || 0) >= 28) parts.push("contract clean");
  else if (o.safety) parts.push("contract has flags");

  return parts.join(", ") + ".";
}

function oppCard(o) {
  const c = el("div", "card");
  c.addEventListener("mousemove", e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", (e.clientX - r.left) + "px");
    c.style.setProperty("--my", (e.clientY - r.top) + "px");
  });
  const top = el("div", "card-top");
  top.innerHTML =
    `<div><div class="sym">${o.symbol || short(o.mint)}</div>
       <div class="mint">${short(o.mint)}</div></div>`;
  c.append(top);

  // What was measured, in a sentence, instead of a number out of 100.
  //
  // The card led with a big "61 OPPORTUNITY" and four bars. Nobody could say
  // what 61 meant, and the number does not predict the outcome: SOLCAT
  // scored 61 and ran 25.8x, Pumpcat scored 72 and fell 71%. Of twelve
  // runners that had a score, the best was 67 and the median 53.
  //
  // The inputs behind it are checkable and are the interesting part, so the
  // card says those. The score stays in the API and keeps doing its job as
  // an internal filter.
  const finding = el("div", "finding");
  finding.textContent = plainFinding(o);
  c.append(finding);

  const meta = el("div", "meta");
  const add = (t, cls) => { const s = el("span", "tag" + (cls ? " " + cls : "")); s.textContent = t; meta.append(s); };
  // Always shown, including Solana. Once four chains are live, "no chain
  // mark" is ambiguous rather than implied.
  const cw = el("span", "tag");
  cw.style.cssText = "display:inline-flex;align-items:center;padding:3px 9px 3px 5px";
  cw.append(chainChip(o.chain, { size: "sm" }));
  meta.append(cw);
  add(`${o.wallet_count} wallets`, "good");
  add(`avg score ${o.avg_wallet_score}`);
  if (o.market_cap) add(usd(o.market_cap));
  // What it has done SINCE we first saw it.
  //
  // The card showed one market cap and no reference, so a reader could not
  // tell a token still sitting at its entry from one that had already
  // tripled. The opportunities page carries this and the home cards did not,
  // which made the same signal look different in two places.
  // The entry figure is called_mcap, sealed in puterproof at the moment the
  // signal fired. There is no first_mcap on this feed; I reached for that
  // name first and the line would simply never have appeared.
  if (o.called_mcap && o.market_cap && o.called_mcap > 0) {
    const mult = o.market_cap / o.called_mcap;
    if (mult >= 1.1) add(`${mult.toFixed(1)}x since`, "good");
    else if (mult <= 0.9) add(`${((mult - 1) * 100).toFixed(0)}% since`, "bad");
  }
  // 100 = safe, 0 = worst, the same scale on every chain. This badge read it
  // upside down: it painted a 92 red and a 10 green, so the safest tokens on
  // the board wore the danger colour. Same inversion as the "risk 92/100"
  // label on the opportunities page, and the same cause: a score that counts
  // safety upward being read as if it counted danger upward.
  // Did this one go out, or is it site-only.
  //
  // The site lists from 45 and the channel posts from 70, so most cards here
  // never became a message. Without saying which, a reader who follows the
  // channel cannot reconcile the two lists at all.
  if (o.posted_at) {
    add("sent to channel" + (o.posted_mcap ? " at " + usd(o.posted_mcap) : ""),
        "good");
  } else {
    add("site only", "");
  }
  if (o.risk_score != null) add(`safety ${o.risk_score}`,
    o.risk_score >= 75 ? "good" : o.risk_score >= 50 ? "warn" : "bad");
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
/* The early buyers of a token, not a scan of the token.
   The record page used to send tgScan for a button that promised the
   buyers, so the bot answered with an ordinary token scan and the
   number on the page stayed unopenable. */
const tgBuyers = mint => `https://t.me/${BOT}?start=corew_${mint}`;
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

/* A pasted contract address is a question about one token, not a query.
   Somebody who found a token elsewhere and wants to know whether we have
   seen it should get that answer here, in the box that is already on the
   page, rather than having to scroll the runner list and hope.

   Three answers are possible and all three are useful: we scanned it and
   it ran, we scanned it and nothing has happened yet, or we have never
   seen it. The third is the one that sends somebody into the bot with a
   token they were already interested in. */
const ADDR_RE = /^(0x[0-9a-fA-F]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})$/;

async function lookupAddress(addr) {
  /* An address on Solana is base58 and 32 to 44 characters, and so is a
     wallet. They cannot be told apart by shape, so both have to be asked.

     The first version asked only the token endpoint. Pasting a wallet on
     the smart money page therefore came back "nothing recorded for this
     one, open it in the bot", which is wrong twice: it is not a token, and
     a wallet cannot be scanned in the bot. A confident wrong answer is
     worse than a slow one, so this asks both and says plainly when neither
     knows the address. */
  traceReset("LOOKING UP");
  const shortAddr = addr.slice(0, 6) + "…" + addr.slice(-4);
  traceAdd("checking the archive for " + shortAddr);

  const usd = v => v >= 1e6 ? "$" + (v / 1e6).toFixed(2) + "M"
                 : v >= 1e3 ? "$" + Math.round(v / 1e3) + "k"
                 : "$" + Math.round(v || 0);
  const done = () => {
    $("#traceTitle").textContent = "DONE";
    const dot = $("#trace .dot"); if (dot) dot.style.animation = "none";
  };

  let w = null, t = null;
  try { w = await api("/v1/wallet/" + addr); } catch (e) { w = null; }

  // A wallet we have scored answers the question on its own.
  if (w && w.known) {
    traceAdd("wallet found", true);
    const bits = ["Puter Score " + w.puter_score];
    if (w.label) bits.push(String(w.label).replace(/_/g, " "));
    traceAdd(bits.join(" · "));
    const line = [];
    if (w.winners) line.push(w.winners + " tokens");
    if (w.best_call >= 2) line.push("best call " + Number(w.best_call).toFixed(1) + "x");
    if (w.total_call >= 2) line.push(Math.round(w.total_call) + "x total");
    if (line.length) traceAdd(line.join(" · "));
    const a = el("a", "hint");
    a.href = "/wallet/?a=" + addr;
    a.textContent = "Full record →";
    $("#traceBody").appendChild(a);
    done();
    return;
  }

  try { t = await api("/v1/token/" + addr); } catch (e) { t = null; }

  if (t && t.scanned_at && t.peak_mcap > 0 && t.multiple >= 2) {
    traceAdd("scanned, and it ran", true);
    traceAdd("$" + (t.symbol || "?") + " · lowest seen at " + usd(t.first_mcap)
             + " · peaked at " + usd(t.peak_mcap) + " · "
             + Number(t.multiple).toFixed(1) + "x");
    if (t.wallets_seeded) {
      traceAdd(t.wallets_seeded + " early buyers recorded and scored");
    }
  } else if (t && t.scanned_at) {
    traceAdd("scanned, no run recorded", true);
    traceAdd("$" + (t.symbol || "?") + " · lowest seen at " + usd(t.first_mcap)
             + ". Nothing has happened since, which is not a verdict, only "
             + "what the record currently holds.");
  } else {
    /* Neither knows it, and we do not know which of the two it is. Saying
       so is the honest answer; guessing "token" and offering a scan was
       the bug this replaced. */
    traceAdd("nothing on file for " + shortAddr, true);
    traceAdd("No token scan and no wallet record. If this is a wallet, it "
             + "has not turned up early in anything we have recorded yet, "
             + "which is not a verdict on the wallet.");
    const a = el("a", "hint");
    a.href = "https://t.me/" + BOT + "?start=core_" + addr;
    a.target = "_blank";
    a.textContent = "If it is a token, scan it in the bot →";
    $("#traceBody").appendChild(a);
  }
  done();
}

function mountCommand(onResults) {
  const run = async text => {
    if (!text.trim()) return;
    // An address is a lookup, not a question for the language model.
    const t = text.trim();
    if (ADDR_RE.test(t)) { await lookupAddress(t); return; }
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


/* ---- live ticker -------------------------------------------
   Fed from real endpoints. If nothing has happened yet it stays hidden:
   a ticker scrolling zeroes is worse than no ticker at all. */
async function loadTicker() {
  const box = document.querySelector("#ticker");
  if (!box) return;
  const items = [];

  try {
    const d = await api("/v1/opportunities?limit=6");
    (d.opportunities || []).forEach(o => {
      items.push(`<span><b>${o.wallet_count} wallets</b> converging on `
        + `${o.symbol || short(o.mint)} &middot; opportunity <u>${o.opportunity}</u></span>`);
    });
  } catch (e) {}

  try {
    const p = await api("/v1/proof");
    (p.proofs || []).slice(0, 6).forEach(x => {
      const m = x.multiple || 1;
      if (m >= 1.2) {
        items.push(`<span>sealed <b>${x.symbol || short(x.mint)}</b> at `
          + `${usd(x.mcap_at_call)} &middot; peak <u>${m.toFixed(2)}x</u></span>`);
      }
    });
  } catch (e) {}

  try {
    const s = await api("/v1/stats");
    if (s.wallets_scored) {
      items.push(`<span><b>${s.wallets_scored}</b> wallets scored &middot; `
        // The bar comes from the API, not from a second copy here. It was
        // hardcoded to 80 in three files while the watchlist that decides
        // anything uses 75, so the site could report zero elite wallets while
        // the engine was watching a hundred.
        + `<b>${s.wallets_elite || 0}</b> above ${s.elite_score || 75}</span>`);
    }
    if (s.runners_seeded) {
      items.push(`<span><b>${s.runners_seeded}</b> runners witnessed and seeded</span>`);
    }
  } catch (e) {}

  if (!items.length) return;   // nothing real yet, stay hidden

  const live = '<span class="ticker-live"><span class="dot"></span>LIVE</span>';
  // Doubled so the marquee loops without a visible seam.
  document.querySelector("#tickerIn").innerHTML =
    live + items.join("") + live + items.join("");
  box.classList.add("on");
}
