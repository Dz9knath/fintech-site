// Reel 2 Real console: reads the app's Firebase project (travel-app-d799b), configured in ../firebase-config.js.
// Until that config is filled in, it runs on demo data so the layout can be reviewed.
import { APP_FIREBASE_CONFIG } from "../firebase-config.js";

const FB = "https://www.gstatic.com/firebasejs/10.12.2/";
const REEL_STATUSES = [
  { k: "queued", label: "Queued", c: "gray" },
  { k: "processing", label: "Processing", c: "blue" },
  { k: "ready", label: "Ready", c: "green" },
  { k: "needsInput", label: "Needs input", c: "sun" },
  { k: "failed", label: "Failed", c: "red" },
];
const PRICING = [
  { k: "pending", label: "Pending", c: "gray" },
  { k: "pricing", label: "Pricing", c: "blue" },
  { k: "priced", label: "Priced", c: "green" },
  { k: "failed", label: "Failed", c: "red" },
];
export const SECTIONS = [
  { k: "pipeline", label: "Reel pipeline" },
  { k: "users", label: "Users & trips" },
  { k: "waitlist", label: "Waitlist" },
  { k: "announcement", label: "Announcement" },
];

// ─── helpers ───
function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e[k] = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
function ago(ms) {
  if (!ms) return "—";
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m} min ago`;
  const hr = Math.floor(m / 60); if (hr < 24) return `${hr} h ago`;
  const d = Math.floor(hr / 24); return d < 30 ? `${d} d ago` : new Date(ms).toLocaleDateString();
}
const fmtN = n => n == null ? "—" : Number(n).toLocaleString();
function money(v, cur) {
  if (v == null) return "—";
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: cur || "USD", maximumFractionDigits: 0 }).format(v); }
  catch { return `${Math.round(v)} ${cur || ""}`; }
}
const pill = (list, k) => { const s = list.find(x => x.k === k) || { label: k || "—", c: "gray" }; return h("span", { class: "pill c-" + s.c }, s.label); };
const shortId = id => id ? (id.length > 10 ? id.slice(0, 6) + "…" : id) : "—";
const dayStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
function niceError(e) {
  const code = e && (e.code || "");
  if (/permission-denied/.test(code)) return "Permission denied. Either this account isn't an admin yet, or the database rules from PR #49 aren't deployed.";
  if (/failed-precondition/.test(code) && /index/i.test(e.message || "")) return "A database index is missing or still building (it's in PR #49). Try again in a few minutes after deploying.";
  if (/unavailable/.test(code)) return "Can't reach the database right now. Check your connection.";
  return (e && e.message) || String(e);
}

// ─── live data: the app's Firebase project ───
async function firebaseApi(cfg) {
  const [appM, authM, fs, fnM] = await Promise.all([
    import(FB + "firebase-app.js"), import(FB + "firebase-auth.js"),
    import(FB + "firebase-firestore.js"), import(FB + "firebase-functions.js"),
  ]);
  const app = appM.getApps().find(a => a.name === "r2r") || appM.initializeApp(cfg, "r2r");
  const auth = authM.getAuth(app), db = fs.getFirestore(app), fns = fnM.getFunctions(app);
  const { collection, collectionGroup, query, where, orderBy, limit, getDocs, getDoc, doc, getCountFromServer, onSnapshot, setDoc, deleteDoc, serverTimestamp, Timestamp } = fs;
  const ms = v => (v && typeof v.toMillis === "function") ? v.toMillis() : null;
  const count = async q => (await getCountFromServer(q)).data().count;
  const reels = () => collectionGroup(db, "sharedItems");
  const trips = () => collectionGroup(db, "trips");
  const reelFrom = d => {
    const x = d.data();
    return { id: d.id, uid: d.ref.parent.parent.id, status: x.status, platform: x.sourcePlatform, url: x.originalUrl,
      caption: x.caption, error: x.errorMessage, hint: x.userHint, author: x.authorName, tripId: x.tripId || null, createdAt: ms(x.createdAt) };
  };
  const tripFrom = (id, x) => ({
    id, destination: x.destination ? [x.destination.name, x.destination.country].filter(Boolean).join(", ") : null,
    place: x.specificPlace, activity: x.activity, confidence: x.confidence, pricingStatus: x.pricingStatus,
    pricingError: x.pricingError, estimate: x.estimateSummary || null, travelers: x.travelers,
    days: x.tripLengthDays, style: x.travelStyle, createdAt: ms(x.createdAt), aiGenerated: x.isLikelyAiGenerated,
  });
  return {
    live: true,
    onAuth(cb) {
      return authM.onAuthStateChanged(auth, async u => {
        if (!u) return cb(null);
        const t = await u.getIdTokenResult(true);
        cb({ email: u.email, uid: u.uid, admin: t.claims.admin === true });
      });
    },
    signIn: (e, p) => authM.signInWithEmailAndPassword(auth, e, p),
    signOut: () => authM.signOut(auth),
    async counts() {
      const [users, reelsN, tripsN, waitlist, ...rest] = await Promise.all([
        count(collection(db, "users")), count(reels()), count(trips()), count(collection(db, "waitlist")),
        ...REEL_STATUSES.map(s => count(query(reels(), where("status", "==", s.k)))),
        ...PRICING.map(s => count(query(trips(), where("pricingStatus", "==", s.k)))),
      ]);
      const reelStatus = {}, pricing = {};
      REEL_STATUSES.forEach((s, i) => reelStatus[s.k] = rest[i]);
      PRICING.forEach((s, i) => pricing[s.k] = rest[REEL_STATUSES.length + i]);
      return { users, reels: reelsN, trips: tripsN, waitlist, reelStatus, pricing };
    },
    async reelTimes(days) {
      const since = Timestamp.fromMillis(dayStart(Date.now() - (days - 1) * 864e5));
      const snap = await getDocs(query(reels(), where("createdAt", ">=", since), orderBy("createdAt", "desc"), limit(5000)));
      return snap.docs.map(d => ms(d.get("createdAt"))).filter(Boolean);
    },
    watchReels(status, cb, onErr) {
      const q = status
        ? query(reels(), where("status", "==", status), orderBy("createdAt", "desc"), limit(100))
        : query(reels(), orderBy("createdAt", "desc"), limit(100));
      return onSnapshot(q, s => cb(s.docs.map(reelFrom)), onErr);
    },
    async attention(n) {
      const s = await getDocs(query(reels(), where("status", "in", ["failed", "needsInput"]), orderBy("createdAt", "desc"), limit(n)));
      return s.docs.map(reelFrom);
    },
    async recentUsers(n) {
      const s = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"), limit(n)));
      const rows = s.docs.map(d => ({ uid: d.id, homeCity: d.get("homeCity"), createdAt: ms(d.get("createdAt")) }));
      await Promise.all(rows.map(async r => {
        try { const p = await getDoc(doc(db, "publicProfiles", r.uid)); r.username = p.exists() ? p.get("username") : null; }
        catch { r.username = null; } // a missing profile only hides the username
      }));
      return rows;
    },
    usersSince: since => count(query(collection(db, "users"), where("createdAt", ">=", Timestamp.fromMillis(since)))),
    // users/{uid}/premiumInterest/current, written by the app's notePremiumInterest function (PR #50)
    async premium() {
      const col = collectionGroup(db, "premiumInterest"), wk = Date.now() - 7 * 864e5, wk2 = Date.now() - 14 * 864e5;
      const [total, thisWeek, lastWeek] = await Promise.all([
        count(col),
        count(query(col, where("firstAt", ">=", Timestamp.fromMillis(wk)))),
        count(query(col, where("firstAt", ">=", Timestamp.fromMillis(wk2)), where("firstAt", "<", Timestamp.fromMillis(wk)))),
      ]);
      return { total, thisWeek, lastWeek };
    },
    async getTrip(uid, id) {
      const s = await getDoc(doc(db, "users", uid, "trips", id));
      return s.exists() ? tripFrom(s.id, s.data()) : null;
    },
    async retry(kind, uid, id) { await fnM.httpsCallable(fns, "adminRetry")({ kind, uid, id }); },
    async listUsers() {
      const s = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"), limit(200)));
      const rows = s.docs.map(d => ({ uid: d.id, homeCity: d.get("homeCity"), currency: d.get("currency"), createdAt: ms(d.get("createdAt")) }));
      await Promise.all(rows.map(async r => {
        try { const p = await getDoc(doc(db, "publicProfiles", r.uid)); r.username = p.exists() ? p.get("username") : null; }
        catch { r.username = null; } // a missing profile only hides the username
      }));
      return rows;
    },
    async getUser(uid) {
      const [p, pub, t, l, r] = await Promise.all([
        getDoc(doc(db, "users", uid)),
        getDoc(doc(db, "publicProfiles", uid)).catch(() => null),
        getDocs(query(collection(db, "users", uid, "trips"), orderBy("createdAt", "desc"), limit(100))),
        getDocs(collection(db, "users", uid, "lists")),
        getCountFromServer(collection(db, "users", uid, "sharedItems")),
      ]);
      const x = p.exists() ? p.data() : {};
      return {
        uid, username: pub && pub.exists() ? pub.get("username") : null,
        profile: { homeCity: x.homeCity, homeAirport: x.homeAirport, currency: x.currency, travelers: x.defaultTravelers,
          days: x.defaultTripLengthDays, style: x.travelStyle, passport: x.passportCountry, createdAt: ms(x.createdAt) },
        trips: t.docs.map(d => tripFrom(d.id, d.data())),
        lists: l.docs.map(d => ({ id: d.id, name: d.get("name"), emoji: d.get("emoji") })),
        reels: r.data().count,
      };
    },
    async listWaitlist() {
      const s = await getDocs(query(collection(db, "waitlist"), orderBy("createdAt", "desc"), limit(5000)));
      return s.docs.map(d => ({ id: d.id, email: d.get("email"), source: d.get("source"), createdAt: ms(d.get("createdAt")) }));
    },
    deleteWaitlist: id => deleteDoc(doc(db, "waitlist", id)),
    async getAnnouncement() {
      const s = await getDoc(doc(db, "config", "announcement"));
      if (!s.exists()) return null;
      const x = s.data();
      return { text: x.text, active: x.active, audience: x.audience, updatedAt: ms(x.updatedAt), updatedBy: x.updatedBy };
    },
    saveAnnouncement: a => setDoc(doc(db, "config", "announcement"), {
      text: a.text, active: a.active, audience: a.audience, updatedAt: serverTimestamp(), updatedBy: auth.currentUser.uid,
    }),
  };
}

// ─── demo data: same interface, in memory ───
function demoApi() {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const now = Date.now();
  const PLACES = [["Cappadocia", "Türkiye", "Hot air balloons"], ["Tokyo", "Japan", "Ramen in Shinjuku"], ["Oslob", "Philippines", "Whale sharks"],
    ["Lagos", "Portugal", "Cliff jumping"], ["Uluwatu", "Indonesia", "Sunset dinner"], ["Mexico City", "Mexico", "Street food"],
    ["Rovaniemi", "Finland", "Northern lights"], ["Amalfi", "Italy", "Boat day"], ["Banff", "Canada", "Lake Louise hike"], ["Marrakech", "Morocco", "Souks"]];
  const NAMES = ["sam.travels", "lena_k", "marco.goes", "aisha", "tomasz", "jules", "nora.b", "kai", "priya", "omar.r", "eva", "leo.w"];
  const CITIES = [["Prague", "CZK"], ["Berlin", "EUR"], ["London", "GBP"], ["New York", "USD"], ["Dubai", "AED"], ["New Delhi", "INR"]];
  const users = NAMES.map((n, i) => { const c = pick(CITIES); return { uid: "demo" + (1000 + i), username: n, homeCity: c[0], currency: c[1], createdAt: now - (i * 1.7 + rnd()) * 864e5 }; });
  const reels = [], tripsBy = {};
  for (let i = 0; i < 46; i++) {
    const u = pick(users), p = pick(PLACES), t = now - (i * 0.16 + rnd() * 0.12) * 864e5;
    const r = rnd(), status = i < 2 ? "processing" : i === 2 ? "queued" : r < 0.1 ? "failed" : r < 0.17 ? "needsInput" : "ready";
    const id = "r" + (5000 + i);
    reels.push({ id, uid: u.uid, status, platform: rnd() < 0.6 ? "instagram" : "tiktok", url: `https://www.instagram.com/reel/${id}`,
      caption: `${p[2]} ✨ #${p[0].toLowerCase().replace(/\s/g, "")}`, error: status === "failed" ? pick(["Could not read the video's caption.", "AI detection timed out."]) : null,
      hint: null, author: null, tripId: status === "ready" ? id : null, createdAt: t });
    if (status === "ready") {
      const pr = rnd() < 0.08 ? "failed" : i < 5 ? "pricing" : "priced";
      const typical = Math.round(600 + rnd() * 2400);
      (tripsBy[u.uid] ||= []).push({ id, destination: `${p[0]}, ${p[1]}`, place: p[0], activity: p[2], confidence: Math.round((0.7 + rnd() * 0.3) * 100) / 100,
        pricingStatus: pr, pricingError: pr === "failed" ? "Currency conversion failed." : null,
        estimate: pr === "priced" ? { low: Math.round(typical * 0.75), typical, high: Math.round(typical * 1.4), currency: u.currency, source: "estimated" } : null,
        travelers: 2, days: 5, style: "midRange", createdAt: t });
    }
  }
  const waitlist = Array.from({ length: 31 }, (_, i) => ({ id: "w" + i, email: `${pick(["alex", "maya", "chris", "dana", "ivan", "zoe", "ben", "lucy", "tariq", "mia"])}${i % 9 === 0 ? "" : i}@${pick(["gmail.com", "outlook.com", "tetr.com", "proton.me"])}`, source: rnd() < 0.85 ? "website" : "app", createdAt: now - (i * 0.4 + rnd() * 0.3) * 864e5 }));
  waitlist.push({ ...waitlist[3], id: "wdup", createdAt: now - 0.1 * 864e5 }); // a duplicate, so de-duplication shows
  let announcement = { text: "Reel 2 Real launches Tuesday, 10 November!", active: true, audience: "both", updatedAt: now - 3 * 3600e3, updatedBy: "demo-ben" };
  const watchers = new Set();
  const emit = () => watchers.forEach(w => w());
  // keep the demo feeling live: processing reels finish, a new one arrives now and then
  setInterval(() => {
    const p = reels.find(r => r.status === "processing");
    if (p) { p.status = "ready"; }
    const q = reels.find(r => r.status === "queued"); if (q) q.status = "processing";
    if (rnd() < 0.5) { const u = pick(users), pl = pick(PLACES), id = "r" + Math.floor(rnd() * 1e6); reels.unshift({ id, uid: u.uid, status: "queued", platform: "instagram", url: `https://www.instagram.com/reel/${id}`, caption: `${pl[2]} 🌍`, error: null, createdAt: Date.now() }); }
    emit();
  }, 6000);
  const wait = v => new Promise(r => setTimeout(() => r(v), 180));
  const by = (a, f) => a.reduce((m, x) => (m[f(x)] = (m[f(x)] || 0) + 1, m), {});
  return {
    live: false,
    onAuth(cb) { cb({ email: "demo@reel2real.app", uid: "demo-ben", admin: true }); return () => {}; },
    signOut: async () => {},
    async counts() {
      const all = Object.values(tripsBy).flat();
      return wait({ users: users.length, reels: reels.length, trips: all.length, waitlist: waitlist.length, reelStatus: by(reels, r => r.status), pricing: by(all, t => t.pricingStatus) });
    },
    reelTimes: async days => wait(reels.filter(r => r.createdAt >= dayStart(Date.now() - (days - 1) * 864e5)).map(r => r.createdAt)),
    watchReels(status, cb) {
      const w = () => cb(reels.filter(r => !status || r.status === status).slice(0, 100).map(r => ({ ...r })));
      watchers.add(w); setTimeout(w, 120); return () => watchers.delete(w);
    },
    attention: async n => wait(reels.filter(r => r.status === "failed" || r.status === "needsInput").slice(0, n).map(r => ({ ...r }))),
    recentUsers: async n => wait(users.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, n)),
    usersSince: async since => wait(users.filter(u => u.createdAt >= since).length),
    premium: async () => wait({ total: 23, thisWeek: 9, lastWeek: 5 }),
    getTrip: async (uid, id) => wait((tripsBy[uid] || []).find(t => t.id === id) || null),
    async retry(kind, uid, id) {
      if (kind === "sharedItem") { const r = reels.find(x => x.id === id && x.uid === uid); if (!r || r.status !== "failed") throw new Error("Only failed work can be retried."); r.status = "queued"; r.error = null; }
      else { const t = (tripsBy[uid] || []).find(x => x.id === id); if (!t || t.pricingStatus !== "failed") throw new Error("Only failed work can be retried."); t.pricingStatus = "pending"; t.pricingError = null; }
      emit(); return wait();
    },
    listUsers: async () => wait(users.map(u => ({ ...u }))),
    async getUser(uid) {
      const u = users.find(x => x.uid === uid); if (!u) return null;
      return wait({ uid, username: u.username, profile: { homeCity: u.homeCity, homeAirport: "PRG", currency: u.currency, travelers: 2, days: 5, style: "midRange", passport: "CZ", createdAt: u.createdAt },
        trips: (tripsBy[uid] || []).slice(), lists: [{ id: "wishlist", name: "Wishlist", emoji: "✨" }, { id: "summer", name: "Summer 2027", emoji: "☀️" }], reels: reels.filter(r => r.uid === uid).length });
    },
    listWaitlist: async () => wait(waitlist.slice().sort((a, b) => b.createdAt - a.createdAt)),
    async deleteWaitlist(id) { const i = waitlist.findIndex(w => w.id === id); if (i >= 0) waitlist.splice(i, 1); return wait(); },
    getAnnouncement: async () => wait({ ...announcement }),
    async saveAnnouncement(a) { announcement = { ...a, updatedAt: Date.now(), updatedBy: "demo-ben" }; return wait(); },
  };
}

// ─── the console UI ───
let api = null, me = null, root = null, section = "pipeline", unsub = null, bootP = null;
const authSubs = new Set();

// Loads the data layer once; every view and dashboard window waits on this
export function boot() {
  if (!bootP) bootP = (async () => {
    api = APP_FIREBASE_CONFIG ? await firebaseApi(APP_FIREBASE_CONFIG) : demoApi();
    await new Promise(resolve => {
      let first = true;
      api.onAuth(u => { me = u; if (first) { first = false; resolve(); } else authSubs.forEach(f => f()); });
    });
  })();
  return bootP;
}
export const onAuthChange = f => { authSubs.add(f); return () => authSubs.delete(f); };
export const authInfo = () => ({ live: !!(api && api.live), email: me && me.email, admin: !!(me && me.admin) });
export const signOut = () => api && api.signOut();

// A full backend page (Reel pipeline, Users & trips, Waitlist, Announcement, or the sign-in form)
export async function renderSection(el, key) {
  root = el; section = key;
  if (!api) root.replaceChildren(h("div", { class: "loading" }, "Loading…"));
  try { await boot(); }
  catch (e) { root.replaceChildren(h("div", { class: "err-banner" }, "Couldn't load the app data: " + niceError(e))); return; }
  if (root === el && section === key) render();
}

function render() {
  if (unsub) { unsub(); unsub = null; }
  if (section === "signin") {
    if (me) { location.hash = ""; return; }
    return renderLogin();
  }
  if (!me) return renderLogin();
  if (!me.admin) return renderNotAdmin();
  const main = h("div", { class: "cmain" });
  if (!api.live) main.append(demoBanner());
  root.replaceChildren(main);
  ({ pipeline: renderPipeline, users: renderUsers, waitlist: renderWaitlist, announcement: renderAnnouncement })[section](main);
}
const demoBanner = () => h("div", { class: "demo-banner" }, h("b", {}, "Demo data."),
  " Not connected to the app yet. Paste the app's Firebase config into console.js once PR #49 is deployed.");

function box(title, sub) {
  const head = h("div", { class: "chead" }, h("h2", {}, title, sub ? h("span", { class: "sub" }, sub) : null));
  const body = h("div", { class: "cbody" });
  const b = h("section", { class: "cbox" }, head, body);
  return { el: b, head, body, add: (...x) => head.append(...x) };
}

function renderLogin() {
  const msg = h("div", { class: "msg" });
  const email = h("input", { type: "email", placeholder: "Email", autocomplete: "username", required: true });
  const pass = h("input", { type: "password", placeholder: "Password", autocomplete: "current-password", required: true });
  const btn = h("button", { class: "primary", type: "submit" }, "Sign in");
  const form = h("form", { onsubmit: async e => {
    e.preventDefault(); btn.disabled = true; msg.textContent = "";
    try { await api.signIn(email.value.trim(), pass.value); }
    catch (err) { msg.textContent = /invalid-credential|wrong-password|user-not-found/.test(err.code || "") ? "Wrong email or password." : niceError(err); }
    btn.disabled = false;
  } }, email, pass, msg, btn);
  root.replaceChildren(h("div", { class: "login" }, h("h2", {}, "Sign in to the app backend"), h("p", {}, "Use your Reel 2 Real admin account. The board works without this."), form));
}

function renderNotAdmin() {
  root.replaceChildren(h("div", { class: "login setup" }, h("h2", {}, "Not an admin yet"),
    h("p", {}, `${me.email} is signed in, but it doesn't have console access.`),
    h("ol", {}, h("li", {}, "In the app repo, from apps/api, run: ", h("code", {}, `node scripts/run-script.mjs scripts/set-admin.ts --project travel-app-d799b --email ${me.email}`)),
      h("li", {}, "Then sign out and back in.")),
    h("div", { class: "actions" }, h("button", { onclick: () => api.signOut() }, "Sign out"))));
}

// ─── dashboard windows ───
// Short cache so re-drawing the dashboard doesn't re-run every count query
const cache = new Map();
function cached(key, fn, ttl = 30_000) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.p;
  const p = fn(); cache.set(key, { at: Date.now(), p });
  p.catch(() => cache.delete(key));
  return p;
}
export function refreshWidgets() { cache.clear(); }

export async function widget(el, kind) {
  el.replaceChildren(h("div", { class: "loading" }, "Loading…"));
  try { await boot(); }
  catch (e) { el.replaceChildren(h("div", { class: "err-banner" }, niceError(e))); return; }
  if (!me) return el.replaceChildren(h("div", { class: "gate" }, h("p", {}, "Sign in with your admin account to see app data."),
    h("button", { class: "primary", onclick: () => { location.hash = "#signin"; } }, "Sign in")));
  if (!me.admin) return el.replaceChildren(h("div", { class: "gate" }, h("p", {}, `${me.email} isn't an admin yet.`),
    h("button", { onclick: () => { location.hash = "#signin"; } }, "How to fix")));
  ({ pipeline: wPipeline, reels: wReels, users: wUsers, premium: wPremium })[kind](el);
}
const fail = (el, e) => el.replaceChildren(h("div", { class: "err-banner" }, niceError(e)));

function statList(list, counts) {
  const total = list.reduce((s, x) => s + (counts[x.k] || 0), 0) || 1;
  return list.map(s => h("div", { class: "statrow" },
    h("span", { class: "lbl" }, pill(list, s.k)), h("span", { class: "bar" }, h("i", { class: "bg-" + s.c, style: `width:${(100 * (counts[s.k] || 0) / total).toFixed(1)}%` })),
    h("span", { class: "num" }, fmtN(counts[s.k] || 0))));
}

function wPipeline(el) {
  Promise.all([cached("counts", () => api.counts()), cached("attention", () => api.attention(4))]).then(([c, att]) => {
    const list = h("div", {});
    if (!att.length) list.append(h("div", { class: "mut", style: "padding:6px 0" }, "Nothing needs attention."));
    att.forEach(r => {
      const say = h("span", { class: "mut", style: "font-size:.8rem" });
      list.append(h("div", { class: "attn" },
        pill(REEL_STATUSES, r.status),
        h("span", { class: "cap", title: r.error || r.caption || "" }, r.caption || r.url || "—"),
        h("span", { class: "mut when" }, ago(r.createdAt)),
        r.status === "failed" ? h("button", { class: "sm", onclick: async e => {
          e.currentTarget.disabled = true;
          try { await api.retry("sharedItem", r.uid, r.id); say.textContent = "re-queued"; refreshWidgets(); }
          catch (err) { say.textContent = niceError(err); e.currentTarget.disabled = false; }
        } }, "Retry") : null, say));
    });
    el.replaceChildren(
      h("div", { class: "two" },
        h("div", {}, h("h3", { class: "sec", style: "margin:0 0 2px" }, "Reels"), ...statList(REEL_STATUSES, c.reelStatus)),
        h("div", {}, h("h3", { class: "sec", style: "margin:0 0 2px" }, "Trip pricing"), ...statList(PRICING, c.pricing))),
      h("h3", { class: "sec", style: "margin:12px 0 4px" }, "Needs attention"), list);
  }).catch(e => fail(el, e));
}

function drawChart(times, days) {
  const starts = Array.from({ length: days }, (_, i) => dayStart(Date.now() - (days - 1 - i) * 864e5));
  const counts = starts.map(d => times.filter(t => t >= d && t < d + 864e5).length);
  const max = Math.max(1, ...counts), peak = counts.indexOf(Math.max(...counts));
  const chart = h("div", { class: "chart", role: "img", "aria-label": `Reels shared per day, last ${days} days` });
  const xs = h("div", { class: "chart-x" });
  starts.forEach((d, i) => {
    const label = new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
    chart.append(h("div", { class: "col" },
      (i === peak || i === days - 1) && counts[i] ? h("span", { class: "val", style: `bottom:${(100 * counts[i] / max).toFixed(1)}%` }, counts[i]) : null,
      h("i", { style: `height:${(100 * counts[i] / max).toFixed(1)}%` }),
      h("span", { class: "tip" }, `${label}: ${counts[i]} reel${counts[i] === 1 ? "" : "s"}`)));
    xs.append(h("span", {}, i % 2 === (days - 1) % 2 ? new Date(d).toLocaleDateString(undefined, { day: "numeric" }) : ""));
  });
  return [chart, xs];
}

function wReels(el) {
  Promise.all([cached("counts", () => api.counts()), cached("times14", () => api.reelTimes(14))]).then(([c, times]) => {
    const mini = (k, v) => h("div", { class: "mini" }, h("div", { class: "v" }, fmtN(v)), h("div", { class: "k" }, k));
    el.replaceChildren(h("div", { class: "minis" }, mini("users", c.users), mini("reels", c.reels), mini("trips", c.trips), mini("waitlist", c.waitlist)), ...drawChart(times, 14));
  }).catch(e => fail(el, e));
}

function wUsers(el) {
  const wk = Date.now() - 7 * 864e5;
  Promise.all([cached("usersWeek", () => api.usersSince(wk)), cached("recentUsers", () => api.recentUsers(3))]).then(([n, rows]) => {
    el.replaceChildren(h("div", { class: "kv" }, h("b", {}, fmtN(n)), " new this week"),
      ...rows.map(u => h("div", { class: "line" }, h("span", {}, u.username ? "@" + u.username : h("span", { class: "mut" }, "no username")),
        h("span", { class: "mut" }, [u.homeCity, ago(u.createdAt)].filter(Boolean).join(" · ")))));
  }).catch(e => fail(el, e));
}

function wPremium(el) {
  cached("premium", () => api.premium()).then(p => {
    const d = p.thisWeek - p.lastWeek;
    el.replaceChildren(h("div", { class: "kv" }, h("b", {}, fmtN(p.total)), " people tapped Premium"),
      h("div", { class: "line" }, h("span", {}, `${fmtN(p.thisWeek)} this week`),
        h("span", { class: d > 0 ? "c-green" : d < 0 ? "c-red" : "mut" }, d === 0 ? "same as last week" : `${d > 0 ? "▲" : "▼"} ${Math.abs(d)} vs last week`)));
  }).catch(e => {
    // Until the app update that records Premium taps is deployed, the collection isn't readable
    if (/permission-denied/.test((e && e.code) || "")) el.replaceChildren(h("div", { class: "mut" }, "Not tracked yet. Starts once the app update with the Premium button is deployed."));
    else fail(el, e);
  });
}

// Reel pipeline
let pipeFilter = "", openReel = null;
function renderPipeline(main) {
  const b = box("Reel pipeline", "live, newest 100");
  const seg = h("div", { class: "seg" }, [{ k: "", label: "All" }, ...REEL_STATUSES].map(s =>
    h("button", { class: s.k === pipeFilter ? "on" : "", onclick: () => { pipeFilter = s.k; render(); } }, s.label)));
  b.add(seg);
  b.body.className = "cbody flush";
  b.body.append(h("div", { class: "loading" }, "Loading…"));
  main.append(b.el);
  let rows = [];
  const draw = () => {
    if (!rows.length) return b.body.replaceChildren(h("div", { class: "empty" }, "No reels here."));
    const tb = h("tbody");
    rows.forEach(r => {
      const isOpen = openReel === r.id + r.uid;
      tb.append(h("tr", { class: "row" + (isOpen ? " open" : ""), onclick: () => { openReel = isOpen ? null : r.id + r.uid; draw(); } },
        h("td", { class: "mut", style: "white-space:nowrap" }, ago(r.createdAt)),
        h("td", {}, pill(REEL_STATUSES, r.status)),
        h("td", { class: "clip" }, r.caption || r.url || "—"),
        h("td", { class: "mut hide-sm" }, r.platform || "—"),
        h("td", { class: "mono mut hide-sm" }, shortId(r.uid))));
      if (isOpen) tb.append(h("tr", {}, h("td", { colspan: 5 }, reelDetail(r))));
    });
    b.body.replaceChildren(h("table", { class: "tbl" },
      h("thead", {}, h("tr", {}, h("th", {}, "When"), h("th", {}, "Status"), h("th", {}, "Caption"), h("th", { class: "hide-sm" }, "From"), h("th", { class: "hide-sm" }, "User"))), tb));
  };
  unsub = api.watchReels(pipeFilter, r => { rows = r; draw(); }, e => b.body.replaceChildren(h("div", { class: "err-banner" }, niceError(e))));
}
function reelDetail(r) {
  const wrap = h("div", {});
  const f = (k, v) => h("div", { class: "f" }, h("div", { class: "k" }, k), h("div", { class: "v" }, v ?? "—"));
  const actions = h("div", { class: "actions" });
  const say = h("span", { class: "mut", style: "align-self:center;font-size:.85rem" });
  const retryBtn = (label, kind, id) => h("button", { class: "primary", onclick: async e => {
    e.stopPropagation(); e.currentTarget.disabled = true; say.textContent = "Re-queued, the pipeline is on it…";
    try { await api.retry(kind, r.uid, id); } catch (err) { say.textContent = niceError(err); e.currentTarget.disabled = false; }
  } }, label);
  if (r.status === "failed") actions.append(retryBtn("Retry detection", "sharedItem", r.id));
  actions.append(h("button", { onclick: e => { e.stopPropagation(); userToOpen = r.uid; location.hash = "#users"; } }, "Open user"), say);
  wrap.append(h("div", { class: "detail" },
    f("Link", r.url ? h("a", { href: r.url, target: "_blank", rel: "noopener" }, "Open reel ↗") : "—"),
    f("Caption", r.caption), f("Error", r.error), f("User hint", r.hint), f("User", h("span", { class: "mono" }, r.uid)), f("Reel ID", h("span", { class: "mono" }, r.id))));
  if (r.tripId) {
    const tripBox = h("div", { class: "detail" }, h("div", { class: "mut" }, "Loading trip…"));
    wrap.append(h("h3", { class: "sec" }, "Trip"), tripBox);
    api.getTrip(r.uid, r.tripId).then(t => {
      if (!t) return tripBox.replaceChildren(h("div", { class: "mut" }, "No trip doc."));
      tripBox.replaceChildren(f("Destination", t.destination), f("Specific place", t.place), f("Activity", t.activity),
        f("Confidence", t.confidence != null ? Math.round(t.confidence * 100) + "%" : null), f("Pricing", pill(PRICING, t.pricingStatus)),
        f("Estimate", t.estimate ? `${money(t.estimate.low, t.estimate.currency)} – ${money(t.estimate.high, t.estimate.currency)} (typical ${money(t.estimate.typical, t.estimate.currency)})` : null),
        f("Pricing error", t.pricingError));
      if (t.pricingStatus === "failed") actions.prepend(retryBtn("Retry pricing", "trip", t.id));
    }).catch(e => tripBox.replaceChildren(h("div", { class: "err-banner" }, niceError(e))));
  }
  wrap.append(actions);
  wrap.onclick = e => e.stopPropagation();
  return wrap;
}

// Users & trips
let userToOpen = null, userSearch = "";
function renderUsers(main) {
  if (userToOpen) return renderUser(main, userToOpen);
  const b = box("Users", "newest 200");
  const search = h("input", { placeholder: "Search username, city or user ID", value: userSearch });
  b.add(search);
  b.body.className = "cbody flush";
  b.body.append(h("div", { class: "loading" }, "Loading…"));
  main.append(b.el);
  api.listUsers().then(list => {
    const draw = () => {
      const q = userSearch.trim().toLowerCase();
      const rows = list.filter(u => !q || [u.username, u.homeCity, u.uid].some(x => x && x.toLowerCase().includes(q)));
      if (!rows.length) return b.body.replaceChildren(h("div", { class: "empty" }, "No users match."));
      b.body.replaceChildren(h("table", { class: "tbl" },
        h("thead", {}, h("tr", {}, h("th", {}, "User"), h("th", {}, "Home"), h("th", { class: "hide-sm" }, "Joined"), h("th", { class: "hide-sm" }, "ID"))),
        h("tbody", {}, rows.map(u => h("tr", { class: "row", onclick: () => { userToOpen = u.uid; render(); } },
          h("td", {}, u.username ? "@" + u.username : h("span", { class: "mut" }, "no username")),
          h("td", {}, [u.homeCity, u.currency].filter(Boolean).join(" · ") || "—"),
          h("td", { class: "mut hide-sm" }, ago(u.createdAt)),
          h("td", { class: "mono mut hide-sm" }, shortId(u.uid)))))));
    };
    search.oninput = () => { userSearch = search.value; draw(); };
    draw();
  }).catch(e => b.body.replaceChildren(h("div", { class: "err-banner" }, niceError(e))));
}
function renderUser(main, uid) {
  const b = box("User");
  b.add(h("button", { onclick: () => { userToOpen = null; render(); } }, "← All users"));
  b.body.append(h("div", { class: "loading" }, "Loading…"));
  main.append(b.el);
  api.getUser(uid).then(u => {
    if (!u) return b.body.replaceChildren(h("div", { class: "empty" }, "User not found."));
    b.head.querySelector("h2").replaceChildren(u.username ? "@" + u.username : "User", h("span", { class: "sub mono" }, u.uid));
    const f = (k, v) => h("div", { class: "f" }, h("div", { class: "k" }, k), h("div", { class: "v" }, v ?? "—"));
    const p = u.profile;
    b.body.replaceChildren(h("div", { class: "detail" },
      f("Home", [p.homeCity, p.homeAirport].filter(Boolean).join(" · ")), f("Currency", p.currency), f("Passport", p.passport),
      f("Defaults", p.travelers ? `${p.travelers} travelers · ${p.days} days · ${p.style}` : null), f("Joined", ago(p.createdAt)),
      f("Reels shared", fmtN(u.reels)), f("Lists", u.lists.length ? u.lists.map(l => `${l.emoji || ""} ${l.name}`.trim()).join(", ") : null)));
    const t = box("Trips", `${u.trips.length}`);
    t.body.className = "cbody flush";
    t.body.append(u.trips.length ? h("table", { class: "tbl" },
      h("thead", {}, h("tr", {}, h("th", {}, "Destination"), h("th", {}, "Pricing"), h("th", { class: "num" }, "Typical"), h("th", { class: "hide-sm" }, "Saved"))),
      h("tbody", {}, u.trips.map(x => h("tr", {},
        h("td", {}, x.destination || "—", x.activity ? h("div", { class: "mut", style: "font-size:.82rem" }, x.activity) : null),
        h("td", {}, pill(PRICING, x.pricingStatus)),
        h("td", { class: "num" }, x.estimate ? money(x.estimate.typical, x.estimate.currency) : "—"),
        h("td", { class: "mut hide-sm" }, ago(x.createdAt))))))
      : h("div", { class: "empty" }, "No trips yet."));
    main.append(t.el);
  }).catch(e => b.body.replaceChildren(h("div", { class: "err-banner" }, niceError(e))));
}

// Waitlist
let dedupe = true, confirmDel = null;
function renderWaitlist(main) {
  const b = box("Waitlist");
  const toggle = h("label", { class: "switch" }, h("input", { type: "checkbox", checked: dedupe || null, onchange: e => { dedupe = e.target.checked; draw(); } }), h("span", { class: "t" }), "Hide duplicates");
  const exp = h("button", { class: "primary" }, "Export CSV");
  b.add(toggle, exp);
  b.body.className = "cbody flush";
  b.body.append(h("div", { class: "loading" }, "Loading…"));
  main.append(b.el);
  let list = [];
  const visible = () => {
    if (!dedupe) return list;
    const seen = new Set();
    // oldest sign-up wins, so the date shown is when they first joined
    return list.slice().reverse().filter(w => { const k = (w.email || "").toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).reverse();
  };
  const draw = () => {
    const rows = visible();
    b.head.querySelector("h2").replaceChildren("Waitlist", h("span", { class: "sub" }, `${fmtN(rows.length)} ${dedupe ? "people" : "sign-ups"}`));
    if (!rows.length) return b.body.replaceChildren(h("div", { class: "empty" }, "No sign-ups yet."));
    b.body.replaceChildren(h("table", { class: "tbl" },
      h("thead", {}, h("tr", {}, h("th", {}, "Email"), h("th", { class: "hide-sm" }, "Source"), h("th", {}, "Joined"), h("th", {}))),
      h("tbody", {}, rows.map(w => h("tr", {},
        h("td", {}, w.email), h("td", { class: "mut hide-sm" }, w.source || "—"), h("td", { class: "mut" }, ago(w.createdAt)),
        h("td", { class: "num" }, confirmDel === w.id
          ? h("span", { class: "confirm" },
            h("button", { class: "iconbtn yes", title: "Confirm delete", onclick: async () => { confirmDel = null; await api.deleteWaitlist(w.id).catch(e => alertRow(e)); list = list.filter(x => x.id !== w.id); draw(); } }, "✓"),
            h("button", { class: "iconbtn no", title: "Cancel", onclick: () => { confirmDel = null; draw(); } }, "✕"))
          : h("button", { class: "iconbtn", title: "Remove", onclick: () => { confirmDel = w.id; draw(); } }, "✕")))))));
  };
  const alertRow = e => b.body.prepend(h("div", { class: "err-banner" }, niceError(e)));
  exp.onclick = () => {
    const rows = visible();
    const csv = "email,source,joined\n" + rows.map(w => [w.email, w.source || "", w.createdAt ? new Date(w.createdAt).toISOString() : ""].map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = h("a", { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: `reel2real-waitlist-${new Date().toISOString().slice(0, 10)}.csv` });
    document.body.append(a); a.click(); a.remove();
  };
  api.listWaitlist().then(l => { list = l; draw(); }).catch(e => b.body.replaceChildren(h("div", { class: "err-banner" }, niceError(e))));
}

// Announcement
function renderAnnouncement(main) {
  const b = box("Announcement", "banner in the app and on the website");
  b.body.append(h("div", { class: "loading" }, "Loading…"));
  main.append(b.el);
  api.getAnnouncement().then(a => {
    a = a || { text: "", active: false, audience: "both" };
    const MAX = 200;
    const ta = h("textarea", { maxlength: String(MAX), placeholder: "e.g. We launch on Tuesday!" }); ta.value = a.text || "";
    const cnt = h("span", { class: "cnt" });
    const active = h("input", { type: "checkbox", checked: a.active || null });
    const aud = h("div", { class: "seg" });
    let audience = a.audience || "both";
    const drawAud = () => aud.replaceChildren(...[["app", "App"], ["site", "Website"], ["both", "Both"]].map(([k, l]) => h("button", { type: "button", class: k === audience ? "on" : "", onclick: () => { audience = k; drawAud(); } }, l)));
    drawAud();
    const preview = h("div", { class: "preview" });
    const msg = h("span", { class: "mut", style: "font-size:.85rem" });
    const update = () => { cnt.textContent = `${ta.value.length} / ${MAX}`; preview.className = "preview" + (active.checked && ta.value.trim() ? "" : " off"); preview.textContent = active.checked && ta.value.trim() ? ta.value : "Banner is off. Nothing is shown."; };
    ta.oninput = update; active.onchange = update; update();
    const save = h("button", { class: "primary", onclick: async () => {
      save.disabled = true; msg.textContent = "Saving…";
      try { await api.saveAnnouncement({ text: ta.value.trim(), active: active.checked, audience }); msg.textContent = "Saved. It's live."; }
      catch (e) { msg.textContent = niceError(e); }
      save.disabled = false;
    } }, "Save");
    b.body.replaceChildren(h("div", { class: "ann-form" },
      h("div", { class: "row" }, h("label", { class: "switch" }, active, h("span", { class: "t" }), "Show the banner"), cnt),
      ta,
      h("div", { class: "row" }, h("span", { class: "mut" }, "Show it in"), aud),
      h("div", {}, h("h3", { class: "sec", style: "margin:6px 0 6px" }, "Preview"), preview),
      h("div", { class: "row" }, save, msg),
      a.updatedAt ? h("div", { class: "mut", style: "font-size:.82rem" }, `Last changed ${ago(a.updatedAt)}`) : null));
  }).catch(e => b.body.replaceChildren(h("div", { class: "err-banner" }, niceError(e))));
}

export function leaveConsole() { if (unsub) { unsub(); unsub = null; } root = null; }
