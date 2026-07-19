/* ───────────────────────────────────────────────────────────
   crashout counter — global edition

   READ  : anyone, any device, reads the shared gist directly.
           No token, no secret — the count is the same everywhere.
   WRITE : pressing the button POSTs to a tiny serverless function
           that holds the GitHub token as a hidden env var. You
           authorize with a secret word, saved once in this browser.
   ─────────────────────────────────────────────────────────── */

const LS_KEY    = "crashout.data.v1";
const LS_SECRET = "crashout.secret";
const GIST_FILE = "crashouts.json";
const DAY = 86_400_000;

/* global "counter start" — used only when nobody has ever crashed out yet, so
   every device counts from the same moment instead of its own first visit */
const GENESIS = Date.parse("2026-07-19T01:14:58Z");

/* the gist everyone reads from (public read, timestamps only) */
const READ_GIST = "0b17c23d12d2437e749005f2614e74bf";
/* the protected write endpoint (secret + token live server-side) */
const WRITE_ENDPOINT = "https://crashout-counter-api-anonymousrulzz-1818s-projects.vercel.app/api/crashout";

let crashouts = load();

/* ---------- persistence (local cache of the global ledger) ---------- */
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter(Number.isFinite).sort((a, b) => a - b) : [];
  } catch { return []; }
}
function cache() { localStorage.setItem(LS_KEY, JSON.stringify(crashouts)); }
function setLedger(list) {
  crashouts = [...new Set(list)].filter(Number.isFinite).sort((a, b) => a - b);
  cache();
}

/* ---------- elements ---------- */
const $ = (id) => document.getElementById(id);
const els = {
  d: $("d"), h: $("h"), m: $("m"), s: $("s"),
  frog: $("frog"),
  btn: $("crashoutBtn"),
  resisted: $("statResisted"),
  total: $("statTotal"),
  record: $("statRecord"),
  undo: $("undoBtn"),
  fx: $("fxLayer"),
  syncBtn: $("syncBtn"),
  modal: $("syncModal"),
  secretInput: $("secretInput"),
  saveSecretBtn: $("saveSecretBtn"),
  forgetBtn: $("forgetBtn"),
  syncStatus: $("syncStatus"),
};

/* ---------- time helpers ---------- */
function breakdown(ms) {
  ms = Math.max(0, ms);
  return {
    days: Math.floor(ms / DAY),
    hrs:  Math.floor((ms % DAY) / 3_600_000),
    mins: Math.floor((ms % 3_600_000) / 60_000),
    secs: Math.floor((ms % 60_000) / 1_000),
  };
}
function humanDuration(ms) {
  const b = breakdown(ms);
  if (b.days > 0) return `${b.days}d ${b.hrs}h`;
  if (b.hrs > 0)  return `${b.hrs}h ${b.mins}m`;
  if (b.mins > 0) return `${b.mins}m ${b.secs}s`;
  return `${b.secs}s`;
}

/* ---------- derived stats ---------- */
function lastCrashout() { return crashouts.length ? crashouts[crashouts.length - 1] : null; }
/* count from the last global crashout, or from GENESIS if nobody has yet — same on every device */
function streakStart() { return lastCrashout() ?? GENESIS; }

function avgInterval() {
  if (crashouts.length < 2) return DAY;
  const span = crashouts[crashouts.length - 1] - crashouts[0];
  return Math.max(60_000, span / (crashouts.length - 1));
}
function resistedCount() {
  const last = lastCrashout();
  if (last === null) return 0;
  return Math.max(0, Math.floor((Date.now() - last) / avgInterval()));
}
function longestStreakMs() {
  let best = 0;
  for (let i = 1; i < crashouts.length; i++) best = Math.max(best, crashouts[i] - crashouts[i - 1]);
  const last = lastCrashout();
  if (last !== null) best = Math.max(best, Date.now() - last);
  return best;
}

/* ---------- rendering ---------- */
function tick() {
  const b = breakdown(Date.now() - streakStart());
  els.d.textContent = b.days;
  els.h.textContent = b.hrs;
  els.m.textContent = b.mins;
  els.s.textContent = b.secs;
  if (crashouts.length) els.record.textContent = humanDuration(longestStreakMs());
}
function renderStats(animateResisted = false) {
  const total = crashouts.length;
  els.total.textContent = total;
  els.record.textContent = total ? humanDuration(longestStreakMs()) : "—";
  els.undo.hidden = total === 0 || !hasSecret();
  const target = resistedCount();
  if (animateResisted && target > 0) countUp(els.resisted, target);
  else els.resisted.textContent = target;
}
function countUp(node, target) {
  node.classList.add("counting");
  const dur = 1200, start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / dur);
    node.textContent = Math.round((1 - Math.pow(1 - t, 3)) * target);
    if (t < 1) requestAnimationFrame(step);
    else { node.textContent = target; setTimeout(() => node.classList.remove("counting"), 400); }
  }
  requestAnimationFrame(step);
}

/* ---------- the crashout animation ---------- */
function playCry() {
  document.body.classList.remove("crying");
  void document.body.offsetWidth;
  document.body.classList.add("crying");

  els.frog.classList.remove("sob");
  void els.frog.offsetWidth;
  els.frog.classList.add("sob");
  setTimeout(() => els.frog.classList.remove("sob"), 1100);

  const rect = els.frog.getBoundingClientRect();
  const eyeY = rect.top + rect.height * 0.42;
  const leftEye = rect.left + rect.width * 0.4;
  const rightEye = rect.left + rect.width * 0.62;
  for (let i = 0; i < 16; i++) {
    const drop = document.createElement("span");
    drop.className = "tear";
    drop.style.left = (i % 2 ? leftEye : rightEye) + (Math.random() * 16 - 8) + "px";
    drop.style.top = eyeY + "px";
    drop.style.setProperty("--dur", 0.9 + Math.random() * 0.6 + "s");
    drop.style.animationDelay = Math.random() * 0.5 + "s";
    els.fx.appendChild(drop);
    setTimeout(() => drop.remove(), 1800);
  }
  ["😭", "😢", "🫠"].forEach((emo, i) => {
    const e = document.createElement("span");
    e.className = "sob-emoji";
    e.textContent = emo;
    e.style.left = rect.left + rect.width * (0.3 + i * 0.2) + "px";
    e.style.top = rect.top + "px";
    e.style.setProperty("--fx", (Math.random() * 80 - 40) + "px");
    e.style.setProperty("--fr", (Math.random() * 60 - 30) + "deg");
    els.fx.appendChild(e);
    setTimeout(() => e.remove(), 1500);
  });
}

/* ---------- writing (through the protected endpoint) ---------- */
function secret() { return localStorage.getItem(LS_SECRET) || ""; }
function hasSecret() { return !!secret(); }

async function write(action) {
  const res = await fetch(WRITE_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, secret: secret(), at: Date.now() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `error ${res.status}`);
  if (Array.isArray(data.crashouts)) setLedger(data.crashouts);
  return data;
}

async function crashout() {
  if (!hasSecret()) { openSync("enter your secret word to start logging."); return; }
  playCry();                                   // optimistic — feels instant
  try {
    await write("log");
  } catch (err) {
    if (String(err.message).includes("secret")) openSync("that secret word didn't work. try again.");
    else console.warn("log failed", err);
  }
  tick();
  renderStats(false);
}

async function undo() {
  if (!crashouts.length || !hasSecret()) return;
  try { await write("undo"); tick(); renderStats(false); }
  catch (err) { console.warn("undo failed", err); }
}

/* ---------- reading (global, no auth) ---------- */
async function pull() {
  const res = await fetch("https://api.github.com/gists/" + READ_GIST, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error("read " + res.status);
  const gist = await res.json();
  const file = gist.files?.[GIST_FILE];
  if (!file) return;
  // the gist is the single source of truth — mirror it exactly, don't merge local
  setLedger(JSON.parse(file.content || "[]"));
}

/* ---------- settings modal ---------- */
function openSync(msg = "") { reflect(); setStatus(msg, msg ? "err" : ""); els.modal.showModal(); }
function setStatus(msg, kind = "") {
  els.syncStatus.textContent = msg;
  els.syncStatus.className = "modal__status" + (kind ? " " + kind : "");
}
function reflect() {
  els.secretInput.value = secret();
  els.forgetBtn.hidden = !hasSecret();
  els.saveSecretBtn.textContent = hasSecret() ? "update" : "save";
  els.syncBtn.textContent = hasSecret() ? "logging on ✓" : "unlock logging";
}
async function saveSecret() {
  const val = els.secretInput.value.trim();
  if (!val) return setStatus("type your secret word first.", "err");
  localStorage.setItem(LS_SECRET, val);
  setStatus("checking…");
  try {
    const data = await write("verify");
    reflect();
    renderStats(false);
    setStatus(`unlocked ✓ ${data.crashouts?.length ?? 0} crashouts on record`, "ok");
  } catch (err) {
    localStorage.removeItem(LS_SECRET);
    reflect();
    setStatus(String(err.message).includes("secret") ? "wrong secret word." : String(err.message), "err");
  }
}
function forgetSecret() { localStorage.removeItem(LS_SECRET); reflect(); renderStats(false); setStatus("logging locked on this device.", ""); }

/* ---------- wiring ---------- */
els.btn.addEventListener("click", crashout);
els.frog.addEventListener("click", crashout);
els.undo.addEventListener("click", undo);
els.syncBtn.addEventListener("click", () => openSync());
els.saveSecretBtn.addEventListener("click", saveSecret);
els.forgetBtn.addEventListener("click", forgetSecret);
els.secretInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); saveSecret(); } });
els.modal.addEventListener("click", (e) => { if (e.target === els.modal) els.modal.close(); });

/* ---------- boot ---------- */
(async function boot() {
  reflect();
  tick();
  renderStats(true);
  setInterval(tick, 1000);
  setInterval(() => { els.resisted.textContent = resistedCount(); }, 15_000);

  async function syncDown(animate) {
    try { await pull(); tick(); renderStats(animate); }
    catch (err) { console.warn("gist pull failed", err); }
  }
  await syncDown(true);
  setInterval(() => syncDown(false), 120_000);   // stay in step with other devices
})();
