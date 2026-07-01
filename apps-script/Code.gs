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

// ─── POST: guarda o elimina una convocatoria o sesión o respuesta ───

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON" });
  }

  const { action, entity, data } = body;
  // action: "upsert" | "delete"
  // entity: "callup" | "session" | "response"

  if (entity === "response") {
    const sheet = SS.getSheets()[0]; // Las respuestas están siempre en la primera hoja (gid=0)
    if (!sheet) return jsonResponse({ ok: false, error: "No responses sheet found" });

    if (action === "upsert") {
      upsertResponseRow(sheet, data);
      return jsonResponse({ ok: true });
    }
    if (action === "delete") {
      deleteResponseRow(sheet, data.jugador, data.fecha);
      return jsonResponse({ ok: true });
    }
  }

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

function upsertResponseRow(sheet, data) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    // Si la hoja está vacía, crear cabeceras
    const headers = ["Marca temporal", "JUGADOR", "¿Cómo te sientes después del entrenamiento/partido?", "¿Cómo de intenso fue el entrenamiento?", "Fecha"];
    if (values.length === 0) {
      sheet.appendRow(headers);
    }
    const row = [new Date().toLocaleString("es-ES"), data.jugador, data.fatigue, data.rpe, data.fecha];
    sheet.appendRow(row);
    return;
  }

  const headers = values[0].map(String);
  const jugadorCol = headers.findIndex(h => h.toUpperCase().includes("JUGADOR")) + 1;
  const fechaCol = headers.findIndex(h => h.toUpperCase().includes("FECHA")) + 1;
  const fatigueCol = headers.findIndex(h => h.includes("sientes") || h.includes("fatiga") || h.includes("Fatigue")) + 1;
  const rpeCol = headers.findIndex(h => h.includes("intenso") || h.includes("rpe") || h.includes("RPE")) + 1;

  const jCol = jugadorCol || 2;
  const fCol = fechaCol || 5;
  const fatCol = fatigueCol || 3;
  const rpCol = rpeCol || 4;

  const playerTarget = String(data.jugador).trim().toUpperCase();
  const dateTarget = String(data.fecha).trim();

  for (let i = 1; i < values.length; i++) {
    const rowDate = parseIsoDate(values[i][fCol - 1]);
    const rowPlayer = String(values[i][jCol - 1]).trim().toUpperCase();

    if (rowPlayer === playerTarget && rowDate === dateTarget) {
      sheet.getRange(i + 1, fatCol).setValue(data.fatigue);
      sheet.getRange(i + 1, rpCol).setValue(data.rpe);
      sheet.getRange(i + 1, 1).setValue(new Date().toLocaleString("es-ES"));
      return;
    }
  }

  // Si no existe, añadir nueva fila
  const newRow = new Array(headers.length || 5);
  newRow[0] = new Date().toLocaleString("es-ES");
  newRow[jCol - 1] = data.jugador;
  newRow[fatCol - 1] = data.fatigue;
  newRow[rpCol - 1] = data.rpe;
  newRow[fCol - 1] = data.fecha;
  sheet.appendRow(newRow);
}

function deleteResponseRow(sheet, jugador, fecha) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return;

  const headers = values[0].map(String);
  const jugadorCol = headers.findIndex(h => h.toUpperCase().includes("JUGADOR")) + 1;
  const fechaCol = headers.findIndex(h => h.toUpperCase().includes("FECHA")) + 1;

  const jCol = jugadorCol || 2;
  const fCol = fechaCol || 5;

  const playerTarget = String(jugador).trim().toUpperCase();
  const dateTarget = String(fecha).trim();

  for (let i = 1; i < values.length; i++) {
    const rowDate = parseIsoDate(values[i][fCol - 1]);
    const rowPlayer = String(values[i][jCol - 1]).trim().toUpperCase();

    if (rowPlayer === playerTarget && rowDate === dateTarget) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

function parseIsoDate(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const parts = str.split(" ")[0].split("/");
  if (parts.length === 3) {
    let d = parts[0], m = parts[1], y = parts[2];
    if (d.length === 4) { // YYYY/MM/DD
      return d + "-" + padZero(m) + "-" + padZero(y);
    }
    return y + "-" + padZero(m) + "-" + padZero(d);
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
  } catch (e) {}
  return str;
}

function padZero(n) {
  const s = String(n);
  return s.length === 1 ? "0" + s : s;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
