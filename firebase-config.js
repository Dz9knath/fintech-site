// The one place the website learns about the app's Firebase project (travel-app-d799b).
// Web config values are public by design: security comes from the Firestore rules, not from hiding them.
//
// To connect (Caden, in the Firebase console for travel-app-d799b):
//   1. Project settings > Your apps > Web app (create one if needed) > copy the config object below.
//   2. Authentication > Sign-in method: enable Google and Email/Password.
//   3. Authentication > Settings > Authorized domains: add www.reel2real.app and dz9knath.github.io.
//   4. Deploy the rules in docs/BACKEND.md, then make the two admins with the set-admin script.
// Until then both /account and /admin run in a clearly labelled offline mode and touch no server.
export const APP_FIREBASE_CONFIG = null;
/* Example:
export const APP_FIREBASE_CONFIG = {
  apiKey: "...", authDomain: "travel-app-d799b.firebaseapp.com", projectId: "travel-app-d799b",
  storageBucket: "...", messagingSenderId: "...", appId: "..."
};
*/
