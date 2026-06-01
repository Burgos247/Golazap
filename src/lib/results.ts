/**
 * Mirror de bot/data/results.json en TS para que el leaderboard del frontend
 * pueda calcular scoring en vivo. Cuando salgan los kind 30751 firmados por
 * el oráculo, este módulo se reemplaza por una suscripción a relays.
 */

import type { MatchResult } from './scoring'

export const RESULTS: MatchResult[] = [
  { matchId: 'wc26-d1-m1', home: 2, away: 1, status: 'final' },
  { matchId: 'wc26-d1-m2', home: 1, away: 1, status: 'final' },
  { matchId: 'wc26-d2-m1', home: 2, away: 0, status: 'final' },
  { matchId: 'wc26-d2-m2', home: 1, away: 1, status: 'final' },
  { matchId: 'wc26-d3-m1', home: 0, away: 3, status: 'final' },
]
