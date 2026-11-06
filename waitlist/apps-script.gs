/**
 * Reel 2 Real waitlist: collects sign-ups from the website into a Google Sheet you own.
 * Setup is in waitlist/README.md.
 */
var SHEET_NAME = 'Waitlist';
// Only needed if the script was created at script.google.com instead of from the sheet's Extensions > Apps Script:
// paste the long id from the sheet's URL (docs.google.com/spreadsheets/d/<ID>/edit) between the quotes.
var SHEET_ID = '';

function sheet_() {
  var ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Script is not attached to a sheet. Set SHEET_ID at the top of the script.');
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

// Run this once from the editor (Run > testSetup). A row should appear in the Waitlist tab; the log says what went wrong if not.
function testSetup() {
  var sh = sheet_(); sh.appendRow([new Date(), 'Test', 'test@example.com', '', 'testSetup']);
  Logger.log('OK: wrote a test row to "' + sh.getParent().getName() + '" > ' + SHEET_NAME);
}

// Opening the /exec link in a browser shows whether the sheet is reachable.
function doGet() { try { return out_({ ok: true, sheet: sheet_().getParent().getName() }); } catch (err) { return out_({ ok: false, error: String(err) }); } }

function doPost(e) {
  var lock = null;
  try {
    var d = JSON.parse(e.postData.contents);
    var email = String(d.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return out_({ ok: false, error: 'bad email' });
    lock = LockService.getScriptLock(); lock.waitLock(10000);
    var sh = sheet_();
    if (sh.getLastRow() === 0) sh.appendRow(['Signed up', 'Name', 'Email', 'Instagram', 'Source']);
    var emails = sh.getLastRow() > 1 ? sh.getRange(2, 3, sh.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]).toLowerCase(); }) : [];
    if (emails.indexOf(email) === -1) sh.appendRow([new Date(), clean_(d.name), email, clean_(d.instagram), clean_(d.source)]);
    return out_({ ok: true });
  } catch (err) {
    console.error(String(err)); // shows in Executions > Log
    return out_({ ok: false, error: String(err) });
  } finally { try { lock && lock.releaseLock(); } catch (x) { /* not held */ } }
}

// a leading = + - @ would turn a cell into a formula, so neutralise it
function clean_(v) { v = String(v || '').slice(0, 80); return /^[=+\-@]/.test(v) ? "'" + v : v; }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
