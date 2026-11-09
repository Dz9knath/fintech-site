// Sign-in gate for the admin area. The page shows nothing until a Google account with the `admin` claim is signed in.
// The real protection is the Firestore rules (see docs/BACKEND.md); this only keeps the UI honest.
const FB = "https://www.gstatic.com/firebasejs/10.12.2/";

export async function gate(cfg) {
  const [appM, authM, fs] = await Promise.all([import(FB + "firebase-app.js"), import(FB + "firebase-auth.js"), import(FB + "firebase-firestore.js")]);
  const app = appM.getApps().find(a => a.name === "r2r") || appM.initializeApp(cfg, "r2r");
  const auth = authM.getAuth(app), db = fs.getFirestore(app);

  const box = document.createElement("div");
  box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Admin sign in");
  box.style.cssText = "position:fixed;inset:0;z-index:1000;background:#04161c;color:#eaf6f8;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;padding:24px;text-align:center;font:16px/1.5 system-ui,sans-serif";
  document.body.append(box);
  const btn = (label, fn) => { const b = document.createElement("button"); b.textContent = label; b.onclick = fn; b.style.cssText = "padding:14px 26px;font:600 1rem system-ui;border-radius:10px;border:0;background:#ff6b4a;color:#1a0d08;cursor:pointer"; return b; };
  const p = (t, c) => { const e = document.createElement("p"); e.textContent = t; e.style.cssText = "margin:0;max-width:34ch;" + (c || ""); return e; };
  const h = t => { const e = document.createElement("h1"); e.textContent = t; e.style.cssText = "margin:0;font:700 1.5rem system-ui"; return e; };
  const show = (...kids) => box.replaceChildren(...kids);

  const signIn = async () => {
    try { await authM.signInWithPopup(auth, new authM.GoogleAuthProvider()); }
    catch (e) { if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") show(h("Could not sign in"), p(e.code || String(e)), btn("Try again", signIn)); }
  };

  return new Promise(resolve => {
    let done = false;
    authM.onAuthStateChanged(auth, async u => {
      if (done) { if (!u) location.reload(); return; } // signed out from the menu: start clean
      if (!u) { show(h("Reel 2 Real admin"), p("Sign in with your Google account. Only the two founders have access."), btn("Sign in with Google", signIn)); return; }
      const check = async () => {
        const t = await u.getIdTokenResult(true);
        if (t.claims.admin === true) { done = true; box.remove(); resolve({ db, fs, user: u }); return; }
        show(h("Not an admin"), p(u.email + " has no admin access. Ask Caden or Ben to run the set-admin script, then check again."),
          btn("Check again", check), Object.assign(btn("Sign out", () => authM.signOut(auth)), { style: "padding:10px 20px;border:1px solid #4a6a73;background:none;color:#eaf6f8;border-radius:10px;cursor:pointer;font:600 .95rem system-ui" }));
      };
      show(p("Checking access…"));
      check().catch(e => show(h("Could not check access"), p(String(e.code || e)), btn("Try again", check)));
    });
  });
}
