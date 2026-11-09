# Backend and privacy: how the site connects

One Firebase project holds everything: **travel-app-d799b** (Caden owns it). The website only talks to it from two places:

| Path | Who | What |
|---|---|---|
| `/account/` | anyone | Sign in or create an account (Google, email and password), verify email, reset password, sign out |
| `/admin/` | Ben and Caden only | The Cowork board and the Reel 2 Real console, behind a Google sign-in that needs the `admin` claim |

Both read their settings from `firebase-config.js`. While it says `null`, `/account/` shows "Accounts open when the app launches" and `/admin/` runs in this browser only; neither touches a server.

## Privacy model
- **Passwords:** never seen or stored by us. Firebase Authentication stores a salted hash. Google sign-in gives us an email and a name, never a password.
- **What the website stores per account:** nothing beyond the Firebase Auth record (email, uid, sign-up time). No profile document is created by the site; the app creates its own profile when someone first uses it, so the strict `users/{uid}` rules in the app repo stay untouched.
- **Admin data** (the board, presence, columns) lives in `adminTasks`, `adminPresence` and `adminMeta`, readable and writable only with the `admin` claim.
- **Region:** make sure Firestore is in an EU location (it cannot be changed after creation).
- The Firebase SDK loads only on `/account/` and `/admin/`, never on the main page, so ordinary visitors do not contact Google for it (they still do for fonts, see the privacy notice).
- Account deletion is by email for now. The app repo plans a Cloud Function for it; when it exists, add a Delete button to `/account/`.

## What Caden does (nothing here can be done from the website repo)
1. **Firebase console > Project settings > Your apps > Web app:** copy the config into `firebase-config.js` (public by design).
2. **Authentication > Sign-in method:** enable Google and Email/Password. Apple later (needs a paid Apple Developer account).
3. **Authentication > Settings > Authorized domains:** add `www.reel2real.app` and `dz9knath.github.io`.
4. **Rules:** add the block below to `firestore.rules` in the app repo as a PR titled `... [rules]` with emulator tests, as CLAUDE.md requires, and update `docs/data-model.md`. The console's reads (users, `sharedItems`, `trips`, `waitlist`) need admin read rules too; reconcile with PR #49, which may already add them.
5. **Make the two admins:** run the set-admin script for both Google accounts (it sets `{ admin: true }` as a custom claim). After that each admin signs out and in once.
6. **Protect the admin accounts:** both founders turn on Google 2-Step Verification. The admin page only accepts Google sign-in, so this covers it.
7. **Optional, recommended:** turn on Firebase App Check for Auth and Firestore to cut down on abuse of the public key; set a budget alert in Google Cloud.

```
function isAdmin() { return request.auth != null && request.auth.token.admin == true; }

match /adminTasks/{id}    { allow read, write: if isAdmin(); }
match /adminPresence/{id} { allow read, write: if isAdmin(); }
match /adminMeta/{id}     { allow read, write: if isAdmin(); }

// console (read-only for admins)
match /{path=**}/sharedItems/{id} { allow read: if isAdmin(); }
match /{path=**}/trips/{id}       { allow read: if isAdmin(); }
match /waitlist/{id}              { allow read: if isAdmin(); }
```
Rules tests must prove: a signed-out user and a signed-in non-admin are denied on every path above, and an admin is allowed.

## Moving the old board
The old Cowork board used its own project (`cowork-279b3`) with no sign-in. After the steps above, open `/admin/`, sign in, and choose **Import tasks from the old board** in the menu. Check the tasks, then delete the old project or lock its rules to `allow read, write: if false;`. Remove `OLD_BOARD_CONFIG` from `admin/index.html` afterwards.

The old repo (Dz9knath/Cowork) can be replaced by a single `index.html` that redirects to `https://www.reel2real.app/admin/`. The installed Android app must be reinstalled once from the new address, because an installed web app is tied to its address.
