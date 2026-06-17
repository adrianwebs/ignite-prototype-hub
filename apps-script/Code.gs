// ============================================================
// SE-FS Load — Apps Script Web App
// Pega este código en: Google Sheet → Extensiones → Apps Script
//
// Despliega como Web App:
//   - Ejecutar como: Tú (your account)
//   - Quién tiene acceso: Cualquier persona
// ============================================================

const SS = SpreadsheetApp.getActiveSpreadsheet();
const SHEET_CALLUPS = "Convocatorias";
const SHEET_SESSIONS = "Sesiones";

// ─── GET: devuelve todas las convocatorias y sesiones ────────

function doGet() {
  const callUps = sheetToObjects(SHEET_CALLUPS);
  const sessions = sheetToObjects(SHEET_SESSIONS);

  const payload = JSON.stringify({ callUps, sessions });
  return ContentService
    .createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── POST: guarda o elimina una convocatoria o sesión ────────

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON" });
  }

  const { action, entity, data } = body;
  // action: "upsert" | "delete"
  // entity: "callup" | "session"

  const sheetName = entity === "callup" ? SHEET_CALLUPS : SHEET_SESSIONS;
  const sheet = SS.getSheetByName(sheetName);
  if (!sheet) return jsonResponse({ ok: false, error: "Sheet not found: " + sheetName });

  if (action === "upsert") {
    upsertRow(sheet, data);
    return jsonResponse({ ok: true });
  }

  if (action === "delete") {
    deleteRow(sheet, data.id);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: false, error: "Unknown action: " + action });
}

// ─── Helpers ─────────────────────────────────────────────────

function sheetToObjects(name) {
  const sheet = SS.getSheetByName(name);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(String);
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = String(row[i] ?? ""); });
    return obj;
  }).filter(r => r.id); // skip empty rows
}

function upsertRow(sheet, data) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const lastRow = sheet.getLastRow();

  // Search for existing row by id
  if (lastRow > 1) {
    const idCol = headers.indexOf("id") + 1;
    const ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues().flat().map(String);
    const idx = ids.indexOf(String(data.id));
    if (idx !== -1) {
      // Update existing row
      const row = headers.map(h => data[h] ?? "");
      sheet.getRange(idx + 2, 1, 1, headers.length).setValues([row]);
      return;
    }
  }

  // Append new row
  const row = headers.map(h => data[h] ?? "");
  sheet.appendRow(row);
}

function deleteRow(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const idCol = headers.indexOf("id") + 1;
  const ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues().flat().map(String);
  const idx = ids.indexOf(String(id));

  if (idx !== -1) {
    sheet.deleteRow(idx + 2);
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
