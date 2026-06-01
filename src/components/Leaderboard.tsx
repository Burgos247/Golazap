import { useEffect, useMemo, useState } from 'react'
import { SimplePool, type SubCloser } from 'nostr-tools/pool'
import { verifyEvent } from 'nostr-tools/pure'
import { nip19 } from 'nostr-tools'
import { POOL_CONFIG, poolCoord } from '../lib/inscription'
import { RESULTS } from '../lib/results'
import { rankInscriptions, type Inscription, type Pick, type Ranking } from '../lib/scoring'

function shortenNpub(npub: string): string {
  return `${npub.slice(0, 12)}…${npub.slice(-6)}`
}

const MEDAL: Record<number, string | undefined> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export function Leaderboard({ onInscribir }: { onInscribir: () => void }) {
  const [inscriptions, setInscriptions] = useState<Map<string, Inscription>>(new Map())
  const [loading, setLoading] = useState(true)
  const [myPubkey, setMyPubkey] = useState<string | null>(null)

  useEffect(() => {
    if (window.nostr) {
      window.nostr.getPublicKey().then(setMyPubkey).catch(() => {})
    }
  }, [])

  useEffect(() => {
    const pool = new SimplePool()
    let closer: SubCloser | null = null

    closer = pool.subscribeMany(
      [...POOL_CONFIG.relays],
      { kinds: [1750], '#a': [poolCoord()] },
      {
        onevent(ev) {
          if (!verifyEvent(ev)) return
          const picks: Pick[] = ev.tags
            .filter((t) => t[0] === 'pick' && t.length >= 4)
            .map((t) => ({ matchId: t[1], home: Number(t[2]), away: Number(t[3]) }))
          if (picks.length === 0) return
          if (!ev.tags.some((t) => t[0] === 'payment_hash')) return

          setInscriptions((prev) => {
            const existing = prev.get(ev.pubkey)
            if (existing && existing.inscribedAt >= ev.created_at) return prev
            const next = new Map(prev)
            next.set(ev.pubkey, {
              pubkey: ev.pubkey,
              picks,
              inscribedAt: ev.created_at,
            })
            return next
          })
        },
        oneose() {
          setLoading(false)
        },
      }
    )

    return () => {
      closer?.close()
      pool.close([...POOL_CONFIG.relays])
    }
  }, [])

  const ranking = useMemo(
    () => rankInscriptions(Array.from(inscriptions.values()), RESULTS),
    [inscriptions]
  )

  const matchesResolved = RESULTS.filter((r) => r.status === 'final').length
  const totalPot = inscriptions.size * POOL_CONFIG.amountSats

  return (
    <section id="leaderboard" className="relative border-b border-zinc-900 py-24">
      <div className="absolute inset-0 bg-hex opacity-30" />
      <div className="relative mx-auto max-w-4xl px-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-5xl tracking-wide md:text-6xl">
            LEADERBOARD
          </h2>
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${
              loading
                ? 'border-zinc-700 bg-zinc-900 text-zinc-500'
                : 'border-green-800 bg-green-950/60 text-green-400'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                loading ? 'bg-zinc-600' : 'animate-pulse bg-green-400'
              }`}
            />
            {loading ? 'Cargando…' : 'Live'}
          </span>
        </div>

        <div className="mt-4 grid gap-px overflow-hidden rounded-xl border border-zinc-900 bg-zinc-900 sm:grid-cols-3">
          <Stat label="Participantes" value={String(inscriptions.size)} />
          <Stat label="Pozo" value={`${totalPot} sats`} />
          <Stat label="Partidos resueltos" value={`${matchesResolved} / ${RESULTS.length}`} />
        </div>

        <p className="mt-4 text-xs text-zinc-500">
          Ranking calculado en vivo desde eventos Nostr · 3 puntos resultado exacto · 1 punto ganador correcto · La adjudicación final usa la validación on-chain del bot.
        </p>

        {ranking.length > 0 ? (
          <ol className="mt-8 space-y-2">
            {ranking.slice(0, 10).map((r) => (
              <Row key={r.pubkey} ranking={r} highlighted={r.pubkey === myPubkey} />
            ))}
          </ol>
        ) : !loading ? (
          <EmptyState onInscribir={onInscribir} />
        ) : (
          <SkeletonRows />
        )}
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-950 px-4 py-4 text-center">
      <div className="scoreboard-digit text-3xl md:text-4xl">{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{label}</div>
    </div>
  )
}

function Row({ ranking, highlighted }: { ranking: Ranking; highlighted?: boolean }) {
  const isTop3 = ranking.position <= 3
  const medal = MEDAL[ranking.position]
  const npub = nip19.npubEncode(ranking.pubkey)
  return (
    <li
      className={`grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-xl border px-5 py-4 transition ${
        highlighted
          ? 'border-brand bg-brand/15 shadow-lg shadow-brand/10'
          : isTop3
          ? 'border-brand/40 bg-gradient-to-r from-brand/10 to-transparent'
          : 'border-zinc-900 bg-zinc-950'
      }`}
    >
      <div className="flex items-baseline gap-2">
        <span className="font-display text-2xl text-zinc-500 md:text-3xl">#{ranking.position}</span>
        {medal && <span className="text-2xl md:text-3xl">{medal}</span>}
      </div>
      <div className="min-w-0">
        <div className="truncate font-mono text-xs text-zinc-100 md:text-sm">
          {shortenNpub(npub)}
          {highlighted && (
            <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-[9px] font-bold uppercase text-zinc-950">vos</span>
          )}
        </div>
        <div className="text-xs text-zinc-500">
          {ranking.exact} exacto{ranking.exact === 1 ? '' : 's'} · {ranking.hits} aciertos
        </div>
      </div>
      <div className="text-right">
        <div className="scoreboard-digit text-3xl md:text-4xl">{ranking.score}</div>
        <div className="text-[10px] uppercase tracking-widest text-zinc-500">pts</div>
      </div>
    </li>
  )
}

function EmptyState({ onInscribir }: { onInscribir: () => void }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 p-10 text-center">
      <div className="text-5xl">⚽</div>
      <p className="mt-4 font-display text-2xl tracking-wide">SÉ EL PRIMERO</p>
      <p className="mt-2 text-sm text-zinc-400">
        Todavía no hay inscriptos en el pool. Sumate y arrancá el ranking.
      </p>
      <button
        onClick={onInscribir}
        className="mt-6 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-brand-dark"
      >
        ⚡ Inscribirme
      </button>
    </div>
  )
}

function SkeletonRows() {
  return (
    <div className="mt-8 space-y-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl border border-zinc-900 bg-zinc-950"
        />
      ))}
    </div>
  )
}
