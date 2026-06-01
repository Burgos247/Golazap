/**
 * Golazap settlement bot — calcula scoring, ranking y payouts.
 *
 * Lee:
 *   bot/data/inscriptions.json  (output del oracle listener)
 *   bot/data/results.json       (resultados oficiales — manual o desde kind 30751)
 *
 * Calcula:
 *   - Score por jugador (3 pts exacto, 1 pt ganador correcto)
 *   - Ranking con tiebreakers: score desc → exactos desc → inscribedAt asc
 *   - Pozo total = participantes × amountSats
 *   - Payouts 50/30/20 a los top 3
 *
 * Para cada ganador:
 *   - Fetcha su kind 0 metadata desde relays
 *   - Extrae su lud16 / lud06
 *   - Resuelve el LNURL y pide invoice por su porción del pozo
 *
 * Persiste:
 *   bot/data/settlement.json
 *
 * NO ejecuta el pago Lightning — eso requiere conexión a la hot wallet real.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { SimplePool } from 'nostr-tools/pool'
import { nip19 } from 'nostr-tools'

import { POOL_CONFIG, poolCoord, resolveLightningAddress, fetchInvoice } from '../src/lib/inscription'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, 'data')
const INSCRIPTIONS_FILE = resolve(DATA_DIR, 'inscriptions.json')
const RESULTS_FILE = resolve(DATA_DIR, 'results.json')
const SETTLEMENT_FILE = resolve(DATA_DIR, 'settlement.json')

const POT_SPLIT = [0.5, 0.3, 0.2] as const

type Pick = { matchId: string; home: number; away: number }
type Inscription = {
  pubkey: string
  paymentHash: string
  amountSats: number
  picks: Pick[]
  inscribedAt: number
}
type MatchResult = { matchId: string; home: number; away: number; status: string }
type Ranking = {
  position: number
  pubkey: string
  npub: string
  score: number
  exact: number
  hits: number
  inscribedAt: number
}
type Payout = {
  position: number
  pubkey: string
  npub: string
  score: number
  amountSats: number
  lud16?: string
  invoice?: string
  invoiceError?: string
}

function scorePick(pick: Pick, result: MatchResult): { points: number; exact: boolean; hit: boolean } {
  if (pick.home === result.home && pick.away === result.away) {
    return { points: 3, exact: true, hit: true }
  }
  const pickWinner = Math.sign(pick.home - pick.away)
  const resultWinner = Math.sign(result.home - result.away)
  if (pickWinner === resultWinner) return { points: 1, exact: false, hit: true }
  return { points: 0, exact: false, hit: false }
}

function rankInscriptions(inscriptions: Inscription[], results: MatchResult[]): Ranking[] {
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
    npub: nip19.npubEncode(s.pubkey),
    score: s.score,
    exact: s.exact,
    hits: s.hits,
    inscribedAt: s.inscribedAt,
  }))
}

async function fetchLud16(pool: SimplePool, pubkey: string): Promise<string | undefined> {
  const events = await pool.querySync([...POOL_CONFIG.relays], { kinds: [0], authors: [pubkey] }, { maxWait: 4000 })
  if (events.length === 0) return undefined
  const latest = events.sort((a, b) => b.created_at - a.created_at)[0]
  try {
    const meta = JSON.parse(latest.content)
    return meta.lud16 ?? meta.lightning_address
  } catch {
    return undefined
  }
}

async function buildPayout(
  pool: SimplePool,
  winner: Ranking,
  amountSats: number
): Promise<Payout> {
  const base: Payout = {
    position: winner.position,
    pubkey: winner.pubkey,
    npub: winner.npub,
    score: winner.score,
    amountSats,
  }
  const lud16 = await fetchLud16(pool, winner.pubkey)
  if (!lud16) return { ...base, invoiceError: 'sin lud16 en kind 0 del ganador' }

  base.lud16 = lud16
  try {
    const lnurl = await resolveLightningAddress(lud16)
    if (!lnurl.allowsNostr || !lnurl.nostrPubkey) {
      return { ...base, invoiceError: 'LNURL del ganador no soporta Zaps' }
    }
    const amountMsats = amountSats * 1000
    if (amountMsats < lnurl.minSendable || amountMsats > lnurl.maxSendable) {
      return { ...base, invoiceError: `monto fuera del rango LNURL (${lnurl.minSendable}-${lnurl.maxSendable} msat)` }
    }
    // Para el invoice del payout NO usamos NIP-57 zap (queremos un pago directo).
    // Simplemente pedimos un invoice estándar al callback.
    const params = new URLSearchParams({ amount: String(amountMsats), comment: `Golazap payout · pos #${winner.position}` })
    const res = await fetch(`${lnurl.callback}?${params}`)
    if (!res.ok) return { ...base, invoiceError: `error LNURL (${res.status})` }
    const data = (await res.json()) as { pr?: string; reason?: string }
    if (!data.pr) return { ...base, invoiceError: data.reason ?? 'sin invoice en respuesta' }
    return { ...base, invoice: data.pr }
  } catch (e) {
    return { ...base, invoiceError: (e as Error).message }
  }
}

async function main() {
  console.log('💰 Golazap settlement · arrancando...')
  console.log(`   Pool: ${poolCoord()}`)

  const inscriptions = JSON.parse(readFileSync(INSCRIPTIONS_FILE, 'utf8')) as Inscription[]
  const results = JSON.parse(readFileSync(RESULTS_FILE, 'utf8')) as MatchResult[]
  console.log(`   Participantes: ${inscriptions.length}`)
  console.log(`   Resultados (finales): ${results.filter((r) => r.status === 'final').length}/${results.length}`)

  const totalPot = inscriptions.length * POOL_CONFIG.amountSats
  console.log(`   Pozo total: ${totalPot} sats`)

  const rankings = rankInscriptions(inscriptions, results)
  console.log('\n📊 Ranking:')
  for (const r of rankings) {
    console.log(`   #${r.position} ${r.npub.slice(0, 20)}... · ${r.score} pts · ${r.exact} exactos · ${r.hits} aciertos`)
  }

  const top3 = rankings.slice(0, 3)
  const pool = new SimplePool()

  console.log('\n💸 Calculando payouts (50/30/20)...')
  const payouts: Payout[] = []
  for (let i = 0; i < top3.length; i++) {
    const amount = Math.floor(totalPot * POT_SPLIT[i])
    console.log(`   Procesando #${i + 1}: ${amount} sats → ${top3[i].npub.slice(0, 20)}...`)
    const payout = await buildPayout(pool, top3[i], amount)
    payouts.push(payout)
    if (payout.invoice) {
      console.log(`     ✓ invoice generado (${payout.invoice.slice(0, 32)}...)`)
    } else {
      console.log(`     ✗ ${payout.invoiceError}`)
    }
  }

  const settlement = {
    pool: poolCoord(),
    participants: inscriptions.length,
    potSats: totalPot,
    split: POT_SPLIT,
    settledAt: Math.floor(Date.now() / 1000),
    rankings,
    payouts,
  }

  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(SETTLEMENT_FILE, JSON.stringify(settlement, null, 2))
  console.log(`\n💾 Settlement plan guardado en ${SETTLEMENT_FILE}`)

  pool.close([...POOL_CONFIG.relays])
}

main().catch((e) => {
  console.error('💥 settle crash:', e)
  process.exit(1)
})
