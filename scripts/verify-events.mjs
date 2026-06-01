import { SimplePool } from 'nostr-tools/pool'
import { nip19 } from 'nostr-tools'

const POOL_COORD = '30750:0000000000000000000000000000000000000000000000000000000000000000:golazap-wc2026-test'
const WOS_PUBKEY = 'be1d89794bf92de5dd64c1e60f6a2c70c140abac9932418fee30c5c637fe9479'
const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
]

const pool = new SimplePool()

async function querySafe(filter, timeoutMs = 8000) {
  return Promise.race([
    pool.querySync(RELAYS, filter),
    new Promise((resolve) => setTimeout(() => resolve([]), timeoutMs)),
  ])
}

console.log('🔎 Buscando kind 1750 (pronósticos) con a-tag del pool...')
const predictions = await querySafe({ kinds: [1750], '#a': [POOL_COORD] })
console.log(`   Encontrados: ${predictions.length}`)
for (const ev of predictions) {
  const npub = nip19.npubEncode(ev.pubkey)
  const nevent = nip19.neventEncode({ id: ev.id, relays: RELAYS, author: ev.pubkey, kind: 1750 })
  const note = nip19.noteEncode(ev.id)
  const picks = ev.tags.filter(t => t[0] === 'pick')
  const paymentHash = ev.tags.find(t => t[0] === 'payment_hash')?.[1]
  console.log(`   ┌─ at=${new Date(ev.created_at * 1000).toISOString()}`)
  console.log(`   │  npub:    ${npub}`)
  console.log(`   │  note:    ${note}`)
  console.log(`   │  picks:   ${picks.length} · payment_hash: ${paymentHash?.slice(0, 16)}...`)
  console.log(`   │  links:`)
  console.log(`   │    https://nostr.band/${npub}`)
  console.log(`   │    https://nostr.band/${note}`)
  console.log(`   │    https://njump.me/${nevent}`)
  console.log(`   └─`)
}

console.log('\n🔎 Buscando kind 9735 (zap receipts) hacia el wallet de WoS...')
const receipts = await querySafe({ kinds: [9735], '#p': [WOS_PUBKEY] }, 5000)
console.log(`   Encontrados (últimos 5): ${Math.min(receipts.length, 5)}`)
receipts
  .sort((a, b) => b.created_at - a.created_at)
  .slice(0, 5)
  .forEach((ev) => {
    const description = ev.tags.find(t => t[0] === 'description')?.[1]
    let zapReq = null
    try { zapReq = JSON.parse(description) } catch {}
    const aTag = zapReq?.tags?.find(t => t[0] === 'a')?.[1]
    console.log(`   - at=${new Date(ev.created_at * 1000).toISOString()} a-tag=${aTag ?? '(none)'}`)
  })

console.log('\n🔎 Específicamente, zap receipts con a-tag de nuestro pool...')
const ourReceipts = receipts.filter((ev) => {
  const description = ev.tags.find(t => t[0] === 'description')?.[1]
  try {
    const zapReq = JSON.parse(description)
    return zapReq.tags?.some((t) => t[0] === 'a' && t[1] === POOL_COORD)
  } catch {
    return false
  }
})
console.log(`   Encontrados: ${ourReceipts.length}`)
for (const ev of ourReceipts) {
  const description = ev.tags.find(t => t[0] === 'description')?.[1]
  const zapReq = JSON.parse(description)
  console.log(`   - zapper=${zapReq.pubkey.slice(0, 12)} at=${new Date(ev.created_at * 1000).toISOString()}`)
}

pool.close(RELAYS)
process.exit(0)
