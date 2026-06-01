/**
 * NIP-57 inscription flow helpers.
 * Step 1+2 del MVP: armar 9734, pedir invoice al LNURL, mostrar al jugador.
 * La verificación del 9735 + persistencia del 1750 va en el step 3 (backend).
 */

export const POOL_CONFIG = {
  // WoS de testing — verificada con Zaps (NIP-57) activos
  lightningAddress: 'reversemouth34@walletofsatoshi.com',
  amountSats: 2, // TODO: volver a 2100 cuando salgamos de testing
  // TODO: npub del organizador (placeholder hasta que generemos las keys del pool)
  organizerPubkey: '0000000000000000000000000000000000000000000000000000000000000000',
  poolId: 'golazap-wc2026-test',
  relays: [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.primal.net',
  ],
} as const

export type LnurlInfo = {
  callback: string
  maxSendable: number
  minSendable: number
  metadata: string
  tag: 'payRequest'
  allowsNostr?: boolean
  nostrPubkey?: string
}

export type EventTemplate = {
  kind: number
  pubkey: string
  created_at: number
  content: string
  tags: string[][]
}

export type SignedEvent = EventTemplate & {
  id: string
  sig: string
}

export async function resolveLightningAddress(address: string): Promise<LnurlInfo> {
  const [name, domain] = address.split('@')
  if (!name || !domain) throw new Error(`Lightning Address inválida: ${address}`)
  const url = `https://${domain}/.well-known/lnurlp/${name}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`No pude resolver el LNURL (${res.status})`)
  const data = (await res.json()) as LnurlInfo
  if (data.tag !== 'payRequest') throw new Error('El endpoint no es un payRequest LNURL')
  return data
}

export function buildZapRequest(opts: {
  playerPubkey: string
  recipientPubkey: string
  amountSats: number
  poolCoord: string
  relays: readonly string[]
  comment?: string
}): EventTemplate {
  return {
    kind: 9734,
    pubkey: opts.playerPubkey,
    created_at: Math.floor(Date.now() / 1000),
    content: opts.comment ?? 'Golazap · inscripción',
    tags: [
      ['relays', ...opts.relays],
      ['amount', String(opts.amountSats * 1000)],
      ['p', opts.recipientPubkey],
      ['a', opts.poolCoord],
    ],
  }
}

export async function fetchInvoice(opts: {
  lnurlInfo: LnurlInfo
  signedZapRequest: SignedEvent
  amountMsats: number
}): Promise<{ pr: string }> {
  const params = new URLSearchParams({
    amount: String(opts.amountMsats),
    nostr: JSON.stringify(opts.signedZapRequest),
  })
  const url = `${opts.lnurlInfo.callback}?${params}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Error al pedir invoice (${res.status})`)
  const data = await res.json()
  if (!data.pr) throw new Error(`Respuesta sin invoice: ${JSON.stringify(data)}`)
  return data
}

export function poolCoord() {
  return `30750:${POOL_CONFIG.organizerPubkey}:${POOL_CONFIG.poolId}`
}
