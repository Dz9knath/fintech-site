/**
 * Reel 2 Real waitlist: collects sign-ups from the website into a Google Sheet you own.
 * Setup is in waitlist/README.md.
 */
var SHEET_NAME = 'Waitlist';

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    var email = String(d.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return out_({ ok: false, error: 'bad email' });
    var lock = LockService.getScriptLock(); lock.waitLock(10000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) sh.appendRow(['Signed up', 'Name', 'Email', 'Instagram', 'Source']);
    var emails = sh.getLastRow() > 1 ? sh.getRange(2, 3, sh.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]).toLowerCase(); }) : [];
    if (emails.indexOf(email) === -1) sh.appendRow([new Date(), clean_(d.name), email, clean_(d.instagram), clean_(d.source)]);
    lock.releaseLock();
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

// a leading = + - @ would turn a cell into a formula, so neutralise it
function clean_(v) { v = String(v || '').slice(0, 80); return /^[=+\-@]/.test(v) ? "'" + v : v; }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
