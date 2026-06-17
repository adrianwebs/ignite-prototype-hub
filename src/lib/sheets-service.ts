/**
 * Google Sheets CSV service
 * Fetches and parses form responses from the published Google Sheets CSV.
 *
 * Sheet columns (Hoja 1):
 *   A: Marca temporal (timestamp)
 *   B: JUGADOR (player name)
 *   C: ¿Cómo te sientes después del entrenamiento/partido? (fatigue 1-10)
 *   D: ¿Cómo de intenso fue el entrenamiento? (rpe 1-10)
 *   E: Fecha (date of session)
 */

import { parseToIsoDate } from "./date-utils";

export interface FormResponse {
  timestamp: string;  // raw "Marca temporal"
  jugador: string;    // player name as typed
  fatigue: number;    // 1-10
  rpe: number;        // 1-10
  fecha: string;      // ISO date yyyy-mm-dd
}

// Published CSV URL — same spreadsheet ID, output=csv
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRa4rE-Hzk6fKAGlZmxPna-uKQfv-ufd9yxP3U3EmtHWzeuxBDVCyjNTMxJWurqY9JXxDN2zWznbr8C/pub?gid=0&single=true&output=csv";

// In-memory cache
let _cache: FormResponse[] | null = null;
let _cacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Parse a Spanish date string. Supports:
 *  - "dd/mm/yyyy"
 *  - "d/m/yyyy"
 *  - "yyyy-mm-dd"
 *  - Timestamps like "17/6/2026 10:00:00"
 */
function parseDate(raw: string): string {
  return parseToIsoDate(raw);
}

function parseNumber(raw: string): number {
  const n = parseFloat(raw.replace(",", ".").trim());
  return isNaN(n) ? 0 : Math.max(1, Math.min(10, Math.round(n)));
}

function parseCsv(text: string): FormResponse[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Skip header row
  const rows = lines.slice(1);

  return rows
    .map((line) => {
      // Handle quoted fields with commas
      const cols = splitCsvLine(line);
      if (cols.length < 5) return null;

      const [timestampRaw, jugador, fatigueRaw, rpeRaw, fechaRaw] = cols;

      const fatigue = parseNumber(fatigueRaw);
      const rpe = parseNumber(rpeRaw);
      const fecha = parseDate(fechaRaw || timestampRaw);

      if (!jugador.trim() || !fecha) return null;

      return {
        timestamp: timestampRaw.trim(),
        jugador: jugador.trim(),
        fatigue,
        rpe,
        fecha,
      } satisfies FormResponse;
    })
    .filter((r): r is FormResponse => r !== null);
}

/**
 * Splits a single CSV line respecting quoted fields.
 */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * Fetches form responses from the Google Sheets CSV.
 * Returns cached data if fresh enough.
 */
export async function fetchFormResponses(forceRefresh = false): Promise<FormResponse[]> {
  const now = Date.now();
  if (!forceRefresh && _cache && now - _cacheAt < CACHE_TTL_MS) {
    return _cache;
  }

  try {
    const res = await fetch(SHEET_CSV_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    _cache = parseCsv(text);
    _cacheAt = Date.now();
    return _cache;
  } catch (err) {
    console.warn("[sheets-service] Fetch failed, using cached data:", err);
    return _cache ?? [];
  }
}

/**
 * Filters responses that fall within a call-up date range.
 */
export function filterByDateRange(
  data: FormResponse[],
  startDate: string,
  endDate: string,
): FormResponse[] {
  return data.filter((r) => r.fecha >= startDate && r.fecha <= endDate);
}

/**
 * Returns unique player names from responses.
 */
export function uniquePlayerNames(data: FormResponse[]): string[] {
  return Array.from(new Set(data.map((r) => r.jugador)));
}

/**
 * Groups responses by jugador name.
 */
export function groupByPlayer(data: FormResponse[]): Record<string, FormResponse[]> {
  const map: Record<string, FormResponse[]> = {};
  for (const r of data) {
    if (!map[r.jugador]) map[r.jugador] = [];
    map[r.jugador].push(r);
  }
  return map;
}

/**
 * Groups responses by fecha.
 */
export function groupByDate(data: FormResponse[]): Record<string, FormResponse[]> {
  const map: Record<string, FormResponse[]> = {};
  for (const r of data) {
    if (!map[r.fecha]) map[r.fecha] = [];
    map[r.fecha].push(r);
  }
  return map;
}
