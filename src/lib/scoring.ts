/**
 * Scoring + ranking compartido entre el bot de settlement y el leaderboard
 * en vivo del frontend. Reglas:
 *
 *  - Resultado exacto: 3 puntos
 *  - Ganador correcto (incluye empate vs empate): 1 punto
 *  - De lo contrario: 0
 *
 * Ranking: score desc → exactos desc → inscribedAt asc (premia early adopters).
 */

export type Pick = { matchId: string; home: number; away: number }

export type MatchResult = {
  matchId: string
  home: number
  away: number
  status: 'pending' | 'live' | 'final'
}

export type Inscription = {
  pubkey: string
  picks: Pick[]
  inscribedAt: number
}

export type Ranking = {
  position: number
  pubkey: string
  score: number
  exact: number
  hits: number
  inscribedAt: number
}

export function scorePick(
  pick: Pick,
  result: MatchResult
): { points: number; exact: boolean; hit: boolean } {
  if (pick.home === result.home && pick.away === result.away) {
    return { points: 3, exact: true, hit: true }
  }
  const pickWinner = Math.sign(pick.home - pick.away)
  const resultWinner = Math.sign(result.home - result.away)
  if (pickWinner === resultWinner) return { points: 1, exact: false, hit: true }
  return { points: 0, exact: false, hit: false }
}

export function rankInscriptions(inscriptions: Inscription[], results: MatchResult[]): Ranking[] {
  const byId = new Map(results.filter((r) => r.status === 'final').map((r) => [r.matchId, r]))
  const scored = inscriptions.map((ins) => {
    let score = 0
    let exact = 0
    let hits = 0
    for (const pick of ins.picks) {
      const r = byId.get(pick.matchId)
      if (!r) continue
      const { points, exact: isExact, hit } = scorePick(pick, r)
      score += points
      if (isExact) exact++
      if (hit) hits++
    }
    return { pubkey: ins.pubkey, score, exact, hits, inscribedAt: ins.inscribedAt }
  })
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.exact - a.exact ||
      a.inscribedAt - b.inscribedAt
  )
  return scored.map((s, i) => ({
    position: i + 1,
    pubkey: s.pubkey,
    score: s.score,
    exact: s.exact,
    hits: s.hits,
    inscribedAt: s.inscribedAt,
  }))
}
