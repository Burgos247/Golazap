import { useEffect, useMemo, useState } from 'react'
import { MATCHES, formatKickoff, groupByDay } from '../lib/matches'
import { buildPredictionEvent, publishToRelays, type Pick } from '../lib/picks'

type State =
  | { kind: 'editing' }
  | { kind: 'publishing' }
  | { kind: 'done'; ok: string[]; failed: { url: string; error: string }[] }
  | { kind: 'error'; message: string }

type Inputs = Record<string, { home: string; away: string }>

function emptyInputs(): Inputs {
  return Object.fromEntries(MATCHES.map((m) => [m.id, { home: '', away: '' }]))
}

function inputsToPicks(inputs: Inputs): Pick[] | { invalid: string } {
  const picks: Pick[] = []
  for (const m of MATCHES) {
    const { home, away } = inputs[m.id]
    if (home === '' || away === '') {
      return { invalid: `Falta completar ${m.home.name} vs ${m.away.name}` }
    }
    const h = Number(home)
    const a = Number(away)
    if (!Number.isInteger(h) || h < 0 || h > 20 || !Number.isInteger(a) || a < 0 || a > 20) {
      return { invalid: `Resultado inválido en ${m.home.name} vs ${m.away.name}` }
    }
    picks.push({ matchId: m.id, home: h, away: a })
  }
  return picks
}

export function PicksModal({
  paymentHash,
  onClose,
}: {
  paymentHash: string
  onClose: () => void
}) {
  const [inputs, setInputs] = useState<Inputs>(() => emptyInputs())
  const [state, setState] = useState<State>({ kind: 'editing' })
  const groups = useMemo(() => groupByDay(MATCHES), [])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape' && state.kind !== 'publishing') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, state.kind])

  const completed = MATCHES.filter((m) => inputs[m.id].home !== '' && inputs[m.id].away !== '').length

  function setScore(matchId: string, side: 'home' | 'away', value: string) {
    const clean = value.replace(/[^0-9]/g, '').slice(0, 2)
    setInputs((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [side]: clean } }))
  }

  async function publish() {
    const res = inputsToPicks(inputs)
    if ('invalid' in res) {
      setState({ kind: 'error', message: res.invalid })
      return
    }
    try {
      if (!window.nostr) throw new Error('Necesitás una extensión Nostr.')
      setState({ kind: 'publishing' })
      const playerPubkey = await window.nostr.getPublicKey()
      const template = buildPredictionEvent({
        playerPubkey,
        paymentHash,
        picks: res,
      })
      const signed = await window.nostr.signEvent(template)
      const publishRes = await publishToRelays(signed)
      if (publishRes.ok.length === 0) {
        throw new Error('Ningún relay aceptó el evento. Probá de nuevo.')
      }
      setState({ kind: 'done', ok: publishRes.ok, failed: publishRes.failed })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setState({ kind: 'error', message })
    }
  }

  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm md:p-8"
      onClick={() => state.kind !== 'publishing' && onClose()}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header sticky */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-t-2xl border-b border-zinc-900 bg-zinc-950/95 px-6 py-4 backdrop-blur">
          <div>
            <h3 className="font-display text-3xl tracking-wide">PRONÓSTICOS</h3>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              {completed} / {MATCHES.length} cargados
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={state.kind === 'publishing'}
            className="text-zinc-500 hover:text-zinc-200 disabled:opacity-50"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="space-y-8 px-6 py-6">
          {state.kind === 'done' ? (
            <DoneState ok={state.ok} failed={state.failed} onClose={onClose} />
          ) : (
            <>
              <p className="text-sm text-zinc-400">
                Cargá el resultado que pensás para cada partido. Si publicás, queda firmado con tu npub y nadie lo puede cambiar.
              </p>
              {groups.map(({ day, items }) => (
                <div key={day}>
                  <h4 className="mb-3 font-display text-lg tracking-wide text-brand">
                    {day.toUpperCase()}
                  </h4>
                  <div className="space-y-2">
                    {items.map((m) => (
                      <div
                        key={m.id}
                        className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-zinc-900 bg-zinc-950 px-4 py-3 md:gap-6"
                      >
                        <div className="flex items-center justify-end gap-2 text-right">
                          <span className="text-sm font-medium md:text-base">{m.home.name}</span>
                          <span className="text-2xl">{m.home.flag}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            inputMode="numeric"
                            value={inputs[m.id].home}
                            onChange={(e) => setScore(m.id, 'home', e.target.value)}
                            disabled={state.kind === 'publishing'}
                            className="h-12 w-12 rounded-lg border border-zinc-800 bg-zinc-900 text-center font-mono text-xl font-bold text-brand focus:border-brand focus:outline-none"
                            placeholder="–"
                          />
                          <span className="text-zinc-600">·</span>
                          <input
                            inputMode="numeric"
                            value={inputs[m.id].away}
                            onChange={(e) => setScore(m.id, 'away', e.target.value)}
                            disabled={state.kind === 'publishing'}
                            className="h-12 w-12 rounded-lg border border-zinc-800 bg-zinc-900 text-center font-mono text-xl font-bold text-brand focus:border-brand focus:outline-none"
                            placeholder="–"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{m.away.flag}</span>
                          <span className="text-sm font-medium md:text-base">{m.away.name}</span>
                          <span className="ml-auto hidden text-xs text-zinc-500 md:inline">
                            {formatKickoff(m.kickoff)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {state.kind === 'error' && (
                <div className="rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-300">
                  {state.message}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer sticky */}
        {state.kind !== 'done' && (
          <div className="sticky bottom-0 flex items-center gap-4 rounded-b-2xl border-t border-zinc-900 bg-zinc-950/95 px-6 py-4 backdrop-blur">
            <div className="flex-1 text-xs text-zinc-500">
              Firmado con NIP-07 · publicado en {`Damus, nos.lol, Primal`}
            </div>
            <button
              onClick={publish}
              disabled={state.kind === 'publishing' || completed < MATCHES.length}
              className="rounded-full bg-brand px-6 py-3 font-semibold text-zinc-950 shadow-lg shadow-brand/30 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {state.kind === 'publishing' ? 'Publicando…' : '⚡ Publicar pronósticos'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function DoneState({
  ok,
  failed,
  onClose,
}: {
  ok: string[]
  failed: { url: string; error: string }[]
  onClose: () => void
}) {
  return (
    <div className="space-y-4 text-center">
      <div className="text-6xl">🏁</div>
      <p className="font-display text-3xl text-brand">¡PRONÓSTICOS PUBLICADOS!</p>
      <p className="text-sm text-zinc-400">
        Quedaron firmados con tu npub en {ok.length} relay{ok.length === 1 ? '' : 's'}.
      </p>
      {failed.length > 0 && (
        <details className="rounded-lg border border-yellow-900/60 bg-yellow-950/30 p-3 text-left text-xs text-yellow-300">
          <summary className="cursor-pointer font-semibold">
            {failed.length} relay{failed.length === 1 ? '' : 's'} fallaron
          </summary>
          <ul className="mt-2 space-y-1">
            {failed.map((f) => (
              <li key={f.url}>
                <span className="font-mono">{f.url}</span>: {f.error}
              </li>
            ))}
          </ul>
        </details>
      )}
      <button
        onClick={onClose}
        className="rounded-full bg-zinc-800 px-6 py-2 text-sm font-semibold hover:bg-zinc-700"
      >
        Cerrar
      </button>
    </div>
  )
}
