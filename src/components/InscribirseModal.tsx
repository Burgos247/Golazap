import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  POOL_CONFIG,
  buildZapRequest,
  fetchInvoice,
  poolCoord,
  resolveLightningAddress,
} from '../lib/inscription'

type State =
  | { kind: 'idle' }
  | { kind: 'working'; step: string }
  | { kind: 'invoice'; pr: string }
  | { kind: 'paid' }
  | { kind: 'error'; message: string }

export function InscribirseModal({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function start() {
    try {
      if (!window.nostr) {
        throw new Error('Necesitás una extensión Nostr (Alby, nos2x). Instalala y refrescá.')
      }

      setState({ kind: 'working', step: 'Conectando con tu wallet Nostr…' })
      const playerPubkey = await window.nostr.getPublicKey()

      setState({ kind: 'working', step: 'Resolviendo el LNURL del pool…' })
      const lnurlInfo = await resolveLightningAddress(POOL_CONFIG.lightningAddress)
      if (!lnurlInfo.allowsNostr || !lnurlInfo.nostrPubkey) {
        throw new Error('El LNURL del pool no soporta Zaps (NIP-57). Activá Nostr en la wallet.')
      }
      const minSats = Math.ceil(lnurlInfo.minSendable / 1000)
      const maxSats = Math.floor(lnurlInfo.maxSendable / 1000)
      if (POOL_CONFIG.amountSats < minSats || POOL_CONFIG.amountSats > maxSats) {
        throw new Error(`El monto ${POOL_CONFIG.amountSats} sats está fuera del rango del LNURL (${minSats}-${maxSats}).`)
      }

      setState({ kind: 'working', step: 'Firmá el Zap Request con tu wallet…' })
      const zapRequest = buildZapRequest({
        playerPubkey,
        recipientPubkey: lnurlInfo.nostrPubkey,
        amountSats: POOL_CONFIG.amountSats,
        poolCoord: poolCoord(),
        relays: POOL_CONFIG.relays,
      })
      const signed = await window.nostr.signEvent(zapRequest)

      setState({ kind: 'working', step: 'Generando el invoice…' })
      const { pr } = await fetchInvoice({
        lnurlInfo,
        signedZapRequest: signed,
        amountMsats: POOL_CONFIG.amountSats * 1000,
      })

      setState({ kind: 'invoice', pr })

      if (window.webln) {
        try {
          await window.webln.enable()
          await window.webln.sendPayment(pr)
          setState({ kind: 'paid' })
        } catch {
          // si el usuario cancela o WebLN falla, dejamos el QR visible
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setState({ kind: 'error', message })
    }
  }

  function copyInvoice(pr: string) {
    navigator.clipboard.writeText(pr)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-200"
        >
          ✕
        </button>

        <h3 className="font-display text-3xl tracking-wide">
          INSCRIBIRME
        </h3>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
          {POOL_CONFIG.amountSats} sats · pool {POOL_CONFIG.poolId}
        </p>

        {state.kind === 'idle' && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-zinc-400">
              Vas a firmar un Zap Request (NIP-57) con tu extensión Nostr y pagar{' '}
              <span className="font-mono text-brand">{POOL_CONFIG.amountSats} sats</span> al vault del pool.
            </p>
            <button
              onClick={start}
              className="w-full rounded-full bg-brand py-3 font-semibold text-zinc-950 shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
            >
              ⚡ Firmar y pagar
            </button>
            <p className="text-center text-[11px] text-zinc-500">
              Necesitás Alby, nos2x o cualquier extensión que soporte NIP-07.
            </p>
          </div>
        )}

        {state.kind === 'working' && (
          <div className="mt-8 flex flex-col items-center gap-4 py-6">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-brand" />
            <p className="text-center text-sm text-zinc-300">{state.step}</p>
          </div>
        )}

        {state.kind === 'invoice' && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl bg-white p-4">
              <QRCodeSVG
                value={`lightning:${state.pr.toUpperCase()}`}
                size={256}
                marginSize={0}
                level="M"
                className="mx-auto h-auto w-full"
              />
            </div>
            <button
              onClick={() => copyInvoice(state.pr)}
              className="w-full rounded-full border border-zinc-700 py-3 text-sm font-semibold transition hover:bg-zinc-900"
            >
              {copied ? '✓ Invoice copiado' : '📋 Copiar invoice'}
            </button>
            <p className="text-center text-[11px] text-zinc-500">
              Escaneá con cualquier wallet Lightning. La inscripción se confirma al recibir el pago.
            </p>
          </div>
        )}

        {state.kind === 'paid' && (
          <div className="mt-8 space-y-4 text-center">
            <div className="text-6xl">🎉</div>
            <p className="font-display text-3xl text-brand">¡INSCRIPTO!</p>
            <p className="text-sm text-zinc-400">
              Cargá tus pronósticos antes del 11/06 12:00 CDMX (kickoff del partido inaugural).
            </p>
            <button
              onClick={onClose}
              className="rounded-full bg-zinc-800 px-6 py-2 text-sm font-semibold hover:bg-zinc-700"
            >
              Cerrar
            </button>
          </div>
        )}

        {state.kind === 'error' && (
          <div className="mt-6 space-y-3">
            <p className="rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-300">
              {state.message}
            </p>
            <button
              onClick={() => setState({ kind: 'idle' })}
              className="w-full rounded-full bg-zinc-800 py-2 text-sm font-semibold hover:bg-zinc-700"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
