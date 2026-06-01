import { SimplePool } from 'nostr-tools/pool'
import { decode } from 'light-bolt11-decoder'
import type { EventTemplate, SignedEvent } from './inscription'
import { POOL_CONFIG, poolCoord } from './inscription'

export type Pick = {
  matchId: string
  home: number
  away: number
}

export function buildPredictionEvent(opts: {
  playerPubkey: string
  paymentHash: string
  picks: Pick[]
}): EventTemplate {
  return {
    kind: 1750,
    pubkey: opts.playerPubkey,
    created_at: Math.floor(Date.now() / 1000),
    content: '',
    tags: [
      ['a', poolCoord()],
      ['payment_hash', opts.paymentHash],
      ...opts.picks.map((p) => ['pick', p.matchId, String(p.home), String(p.away)]),
    ],
  }
}

export async function publishToRelays(event: SignedEvent): Promise<{
  ok: string[]
  failed: { url: string; error: string }[]
}> {
  const pool = new SimplePool()
  const results = await Promise.allSettled(
    pool.publish([...POOL_CONFIG.relays], event)
  )
  pool.close([...POOL_CONFIG.relays])

  const ok: string[] = []
  const failed: { url: string; error: string }[] = []
  results.forEach((res, i) => {
    const url = POOL_CONFIG.relays[i]
    if (res.status === 'fulfilled') ok.push(url)
    else failed.push({ url, error: String(res.reason) })
  })
  return { ok, failed }
}

export function paymentHashFromInvoice(bolt11: string): string {
  const decoded = decode(bolt11)
  const section = decoded.sections.find((s) => s.name === 'payment_hash')
  if (!section || !('value' in section)) {
    throw new Error('No pude extraer payment_hash del invoice')
  }
  return String(section.value)
}
