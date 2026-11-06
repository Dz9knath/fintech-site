# Waitlist setup (Google Sheet, about 5 minutes)

The website is static, so it needs somewhere to send sign-ups. This uses a Google Sheet you own.

1. Create a new Google Sheet named "Reel 2 Real waitlist".
2. In the sheet: Extensions, Apps Script. Delete the sample code and paste in `apps-script.gs`. Save.
3. Deploy, New deployment, type "Web app". Execute as: **Me**. Who has access: **Anyone**. Deploy, then approve the permissions.
4. Copy the web app URL (it ends in `/exec`).
5. Put that URL in `WAITLIST_ENDPOINT` in the page scripts (main site and `/darkroom/`), rebuild, and push. Until it is set, sign-ups are saved in the visitor's own browser only and the form says so.

Each sign-up becomes a row: time, name, email, Instagram, source. Duplicate emails are ignored.
Note: the browser cannot read the script's reply, so the site treats "request sent" as success.

## If rows do not appear
1. In the script editor choose `testSetup` in the function dropdown and press Run. A row should appear in the `Waitlist` tab. If it errors, the message says why (usually: the script was created outside the sheet, so paste the sheet id into `SHEET_ID`).
2. After any change: Deploy > Manage deployments > pencil icon > Version: New version > Deploy. The link stays the same.
3. Opening the `/exec` link in a browser now shows `{"ok":true,"sheet":"<your sheet name>"}` when everything is connected.
