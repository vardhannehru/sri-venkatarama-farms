const SHEET_NAME = 'Sales Register';

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const sheetName = String(payload.sheetName || SHEET_NAME);
    const headers = Array.isArray(payload.headers) ? payload.headers : [];
    const rows = Array.isArray(payload.rows) ? payload.rows : [];

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);

    sheet.clearContents();

    if (headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }

    if (rows.length) {
      sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }

    sheet.autoResizeColumns(1, Math.max(headers.length, rows[0]?.length || 1));

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true, rows: rows.length })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, message: String(error) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
