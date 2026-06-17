/**
 * useLoadData — main data hook
 * Sin localStorage. Todos los datos se obtienen en tiempo real:
 *  - Convocatorias y Sesiones → Google Apps Script Web App
 *  - Respuestas formulario    → Google Sheets CSV publicado
 */

import { useState, useEffect, useCallback } from "react";
import { fetchFormResponses, filterByDateRange, type FormResponse } from "@/lib/sheets-service";
import {
  fetchAllData,
  type StoredCallUp,
  type StoredSession,
} from "@/lib/store";
import {
  calcSessionMetrics,
  calcACWRSeries,
  calcPlayerCallUpMetrics,
  type SessionMetrics,
  type PlayerCallUpMetrics,
} from "@/lib/metrics";

// ─── Hook: lista de convocatorias ─────────────────────────────────────────────

export function useCallUps() {
  const [callUps, setCallUps] = useState<StoredCallUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { callUps: data } = await fetchAllData();
      setCallUps(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { callUps, loading, error, refresh };
}

// ─── Hook: dashboard de una convocatoria ──────────────────────────────────────

export interface CallUpDashboard {
  callUp: StoredCallUp | undefined;
  sessions: StoredSession[];
  responses: FormResponse[];
  sessionMetrics: SessionMetrics[];
  acwrSeries: ReturnType<typeof calcACWRSeries>;
  players: string[];
  playerMetrics: PlayerCallUpMetrics[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useCallUpDashboard(callUpId: string | undefined): CallUpDashboard {
  const [callUp, setCallUp] = useState<StoredCallUp | undefined>();
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (forceRefresh = false) => {
      setLoading(true);
      setError(null);
      try {
        // 1. Obtener convocatorias y sesiones desde Apps Script
        const { callUps, sessions: allSessions } = await fetchAllData();
        const cu = callUpId ? callUps.find((c) => c.id === callUpId) : undefined;
        setCallUp(cu);

        const sess = allSessions
          .filter((s) => s.callUpId === callUpId)
          .sort((a, b) => a.date.localeCompare(b.date) || a.dayLabel.localeCompare(b.dayLabel));
        setSessions(sess);

        // 2. Obtener respuestas del formulario desde el CSV publicado
        const allResponses = await fetchFormResponses(forceRefresh);
        const filtered = cu
          ? filterByDateRange(allResponses, cu.startDate, cu.endDate)
          : allResponses;
        setResponses(filtered);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    [callUpId],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  // Métricas derivadas
  const sessionMetrics = calcSessionMetrics(sessions, responses);
  const teamUASeries = sessionMetrics.map((sm) => ({ date: sm.date, ua: sm.fatigaXTiempo }));
  const acwrSeries = calcACWRSeries(teamUASeries);
  const uniquePlayers = Array.from(new Set(responses.map((r) => r.jugador))).sort();
  const playerMetrics = uniquePlayers.map((jugador) =>
    calcPlayerCallUpMetrics(jugador, sessions, responses),
  );

  return {
    callUp,
    sessions,
    responses,
    sessionMetrics,
    acwrSeries,
    players: uniquePlayers,
    playerMetrics,
    loading,
    error,
    refresh: () => load(true),
  };
}
