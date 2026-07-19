/* ───────────────────────────────────────────────────────────
   crashout counter
   Data saves in localStorage by default; optionally syncs to a
   private GitHub Gist so it can follow you across devices.
   ─────────────────────────────────────────────────────────── */

const LS_KEY   = "crashout.data.v1";
const LS_FIRST = "crashout.firstSeen";
const LS_TOKEN = "crashout.gh.token";
const LS_GIST  = "crashout.gh.gist";
const GIST_FILE = "crashouts.json";
const DAY = 86_400_000;

/* pre-provisioned gist (just needs a token to write to it) */
const DEFAULT_GIST = "0b17c23d12d2437e749005f2614e74bf";

let crashouts = load();

/* ---------- persistence ---------- */
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter(Number.isFinite).sort((a, b) => a - b) : [];
  } catch { return []; }
}
function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(crashouts));
  pushToGist();
}
function mergeTimestamps(a, b) {
  return [...new Set([...a, ...b])].filter(Number.isFinite).sort((x, y) => x - y);
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
  ghToken: $("ghToken"),
  ghGist: $("ghGist"),
  ghConnect: $("ghConnect"),
  ghDisconnect: $("ghDisconnect"),
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

/* first time this browser opened the app — so the clock ticks from day one */
function firstSeen() {
  let t = Number(localStorage.getItem(LS_FIRST));
  if (!Number.isFinite(t) || !t) { t = Date.now(); localStorage.setItem(LS_FIRST, String(t)); }
  return t;
}

/* ---------- derived stats ---------- */
function lastCrashout() { return crashouts.length ? crashouts[crashouts.length - 1] : null; }

/* the moment the current streak started counting from */
function streakStart() { return lastCrashout() ?? firstSeen(); }

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
  // keep "best streak" honest — the current run may already be the record
  if (crashouts.length) els.record.textContent = humanDuration(longestStreakMs());
}

function renderStats(animateResisted = false) {
  const total = crashouts.length;
  els.total.textContent = total;
  els.record.textContent = total ? humanDuration(longestStreakMs()) : "—";
  els.undo.hidden = total === 0;

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

/* ---------- the crashout event ---------- */
function crashout() {
  crashouts.push(Date.now());
  save();
  tick();
  renderStats(false);

  document.body.classList.remove("crying");
  void document.body.offsetWidth;
  document.body.classList.add("crying");

  els.frog.classList.remove("sob");
  void els.frog.offsetWidth;
  els.frog.classList.add("sob");
  setTimeout(() => els.frog.classList.remove("sob"), 1100);

  cry();
}

function cry() {
  const rect = els.frog.getBoundingClientRect();
  const eyeY = rect.top + rect.height * 0.42;
  const leftEye = rect.left + rect.width * 0.4;
  const rightEye = rect.left + rect.width * 0.62;

  for (let i = 0; i < 16; i++) {
    const drop = document.createElement("span");
    drop.className = "tear";
    const eye = i % 2 ? leftEye : rightEye;
    drop.style.left = eye + (Math.random() * 16 - 8) + "px";
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

/* ---------- GitHub Gist sync (optional) ---------- */
function ghToken() { return localStorage.getItem(LS_TOKEN) || ""; }
function ghGistId() { return localStorage.getItem(LS_GIST) || DEFAULT_GIST; }
function isConnected() { return !!ghToken(); }

async function ghApi(path, opts = {}) {
  const res = await fetch("https://api.github.com" + path, {
    ...opts,
    headers: {
      Authorization: "Bearer " + ghToken(),
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 120)}`);
  return res.json();
}

async function pullFromGist() {
  if (!isConnected()) return;
  const gist = await ghApi("/gists/" + ghGistId());
  const file = gist.files?.[GIST_FILE];
  if (!file) return;
  crashouts = mergeTimestamps(crashouts, JSON.parse(file.content || "[]"));
  localStorage.setItem(LS_KEY, JSON.stringify(crashouts));
}

let pushTimer = null;
function pushToGist() {
  if (!isConnected()) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    try {
      await ghApi("/gists/" + ghGistId(), {
        method: "PATCH",
        body: JSON.stringify({ files: { [GIST_FILE]: { content: JSON.stringify(crashouts) } } }),
      });
    } catch (err) { console.warn("gist push failed", err); }
  }, 400);
}

async function connectGist() {
  const token = els.ghToken.value.trim();
  const gistId = els.ghGist.value.trim();
  if (!token) return setStatus("paste a token first.", "err");

  setStatus("connecting…");
  localStorage.setItem(LS_TOKEN, token);
  if (gistId) localStorage.setItem(LS_GIST, gistId);

  try {
    await pullFromGist();
    pushToGist();
    tick();
    renderStats(false);
    reflectConnection();
    setStatus(`synced ✓ ${crashouts.length} crashouts backed up`, "ok");
  } catch (err) {
    localStorage.removeItem(LS_TOKEN);
    setStatus(String(err.message || err), "err");
    reflectConnection();
  }
}

function disconnectGist() {
  localStorage.removeItem(LS_TOKEN);
  reflectConnection();
  setStatus("disconnected. data stays in this browser.", "");
}

function setStatus(msg, kind = "") {
  els.syncStatus.textContent = msg;
  els.syncStatus.className = "modal__status" + (kind ? " " + kind : "");
}
function reflectConnection() {
  const on = isConnected();
  els.ghToken.value = ghToken();
  els.ghGist.value = ghGistId();
  els.ghDisconnect.hidden = !on;
  els.ghConnect.textContent = on ? "re-sync" : "connect";
  els.syncBtn.textContent = on ? "synced ☁" : "sync";
}

/* ---------- wiring ---------- */
els.btn.addEventListener("click", crashout);
els.frog.addEventListener("click", crashout);   // poke the frog too

els.undo.addEventListener("click", () => {
  if (!crashouts.length) return;
  crashouts.pop();
  save();
  tick();
  renderStats(false);
});

els.syncBtn.addEventListener("click", () => { reflectConnection(); setStatus(""); els.modal.showModal(); });
els.ghConnect.addEventListener("click", connectGist);
els.ghDisconnect.addEventListener("click", disconnectGist);

// pressing Enter in either field should connect, not silently close the modal
[els.ghToken, els.ghGist].forEach((input) =>
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); connectGist(); }
  })
);
// click outside the card to dismiss
els.modal.addEventListener("click", (e) => { if (e.target === els.modal) els.modal.close(); });

/* ---------- boot ---------- */
(async function boot() {
  reflectConnection();
  tick();
  renderStats(true);
  setInterval(tick, 1000);
  setInterval(() => { els.resisted.textContent = resistedCount(); }, 15_000);

  if (isConnected()) {
    try { await pullFromGist(); tick(); renderStats(true); }
    catch (err) { console.warn("initial pull failed", err); }
  }
})();
