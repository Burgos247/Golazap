/**
 * Golazap oracle bot — step 3.
 *
 * Escucha relays Nostr para:
 *  - kind 9735 (zap receipts) destinados al wallet del pool
 *  - kind 1750 (pronósticos) tagueados con el a-tag del pool
 *
 * Valida cada receipt:
 *  - firmado por el nostrPubkey del LNURL del pool
 *  - description contiene un 9734 firmado con sig válida
 *  - description_hash del bolt11 = sha256(description)
 *  - amount ≥ POOL_CONFIG.amountSats
 *  - a-tag del 9734 = poolCoord
 *
 * Reconcilia receipts y predicciones por payment_hash. Persiste a JSON.
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { SimplePool } from 'nostr-tools/pool'
import { verifyEvent, type Event as NostrEvent } from 'nostr-tools/pure'
import { decode as decodeBolt11 } from 'light-bolt11-decoder'

import { POOL_CONFIG, poolCoord, resolveLightningAddress } from '../src/lib/inscription'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, 'data')
const INSCRIPTIONS_FILE = resolve(DATA_DIR, 'inscriptions.json')

const POOL_A = poolCoord()
const MIN_MSATS = POOL_CONFIG.amountSats * 1000

type Inscription = {
  pubkey: string
  paymentHash: string
  amountSats: number
  picks: { matchId: string; home: number; away: number }[]
  receiptEventId: string
  predictionEventId: string
  inscribedAt: number
}

const receiptsByHash = new Map<string, NostrEvent>()
const predictionsByHash = new Map<string, NostrEvent>()
const validInscriptions = new Map<string, Inscription>()
const rejectionLog: { kind: number; id: string; reason: string }[] = []

function loadState() {
  if (!existsSync(INSCRIPTIONS_FILE)) return
  try {
    const data = JSON.parse(readFileSync(INSCRIPTIONS_FILE, 'utf8')) as Inscription[]
    for (const ins of data) validInscriptions.set(ins.pubkey, ins)
    console.log(`💾 Cargadas ${data.length} inscripciones previas`)
  } catch (e) {
    console.warn('⚠️  No pude cargar estado previo:', (e as Error).message)
  }
}

function saveState() {
  mkdirSync(DATA_DIR, { recursive: true })
  const data = Array.from(validInscriptions.values()).sort((a, b) => a.inscribedAt - b.inscribedAt)
  writeFileSync(INSCRIPTIONS_FILE, JSON.stringify(data, null, 2))
}

function reject(ev: NostrEvent, reason: string) {
  rejectionLog.push({ kind: ev.kind, id: ev.id, reason })
  console.log(`✗ rejected kind=${ev.kind} id=${ev.id.slice(0, 8)} reason="${reason}"`)
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex')
}

function findTag(ev: NostrEvent, name: string): string | undefined {
  return ev.tags.find((t) => t[0] === name)?.[1]
}

function bolt11Field(bolt11: string, name: string): string | undefined {
  const decoded = decodeBolt11(bolt11)
  const section = decoded.sections.find((s: { name: string }) => s.name === name)
  return section && 'value' in section ? String((section as { value: unknown }).value) : undefined
}

async function start() {
  console.log('⚡ Golazap oracle bot · arrancando...')
  console.log(`   Pool: ${POOL_A}`)
  console.log(`   Monto mínimo: ${POOL_CONFIG.amountSats} sats`)
  console.log(`   Lightning Address: ${POOL_CONFIG.lightningAddress}`)

  const lnurl = await resolveLightningAddress(POOL_CONFIG.lightningAddress)
  if (!lnurl.allowsNostr || !lnurl.nostrPubkey) {
    throw new Error('El LNURL del pool no soporta NIP-57.')
  }
  const recipientPubkey = lnurl.nostrPubkey
  console.log(`   LNURL nostrPubkey: ${recipientPubkey.slice(0, 16)}...`)
  console.log(`   Relays: ${POOL_CONFIG.relays.join(', ')}`)

  loadState()

  const pool = new SimplePool()
  console.log('\n👂 Escuchando relays (replay + live)...\n')

  // Filtramos receipts por #p (recipient = LNURL nostrPubkey) porque WoS no
  // copia el a-tag del zap request al nivel del receipt. La validación del
  // a-tag se hace después leyendo el zap request del campo description.
  const filters = [
    { kinds: [9735], '#p': [recipientPubkey] },
    { kinds: [1750], '#a': [POOL_A] },
  ]

  // Replay histórico con querySync (más robusto entre relays que subscribeMany)
  console.log('   ⏳ Replay histórico...')
  const historic = await pool.querySync([...POOL_CONFIG.relays], filters[0])
  const historicPredictions = await pool.querySync([...POOL_CONFIG.relays], filters[1])
  console.log(`   📦 Recibidos ${historic.length} receipts + ${historicPredictions.length} predicciones`)
  const since = Math.floor(Date.now() / 1000)
  for (const ev of historic) handleReceipt(ev, recipientPubkey)
  for (const ev of historicPredictions) handlePrediction(ev)
  console.log(`📡 EOSE — fin de replay. ${validInscriptions.size} inscripciones válidas, ${rejectionLog.length} rechazos.`)

  // Suscripción live para eventos nuevos
  pool.subscribeMany(
    [...POOL_CONFIG.relays],
    filters.map((f) => ({ ...f, since })),
    {
      onevent(ev) {
        if (ev.kind === 9735) handleReceipt(ev, recipientPubkey)
        else if (ev.kind === 1750) handlePrediction(ev)
      },
    }
  )
  console.log('🟢 Listener live activo. Ctrl+C para salir.\n')

  process.on('SIGINT', () => {
    console.log('\n\n📊 Resumen final:')
    console.log(`   Receipts válidos: ${receiptsByHash.size}`)
    console.log(`   Predicciones válidas: ${predictionsByHash.size}`)
    console.log(`   Inscripciones reconciliadas: ${validInscriptions.size}`)
    console.log(`   Rechazos: ${rejectionLog.length}`)
    pool.close([...POOL_CONFIG.relays])
    process.exit(0)
  })
}

function handleReceipt(ev: NostrEvent, expectedRecipient: string) {
  if (ev.pubkey !== expectedRecipient) return reject(ev, 'receipt sender ≠ LNURL nostrPubkey')

  const bolt11 = findTag(ev, 'bolt11')
  const description = findTag(ev, 'description')
  if (!bolt11) return reject(ev, 'missing bolt11 tag')
  if (!description) return reject(ev, 'missing description tag')

  let zapRequest: NostrEvent
  try {
    zapRequest = JSON.parse(description) as NostrEvent
  } catch {
    return reject(ev, 'description is not valid JSON')
  }

  if (zapRequest.kind !== 9734) return reject(ev, 'description is not a kind 9734')
  if (!verifyEvent(zapRequest)) return reject(ev, 'invalid signature in zap request')

  const reqA = zapRequest.tags.find((t) => t[0] === 'a')?.[1]
  // Silent skip: el wallet de WoS recibe muchos zaps de cosas no relacionadas
  // con nuestro pool. Solo nos interesan los que apuntan a poolCoord.
  if (reqA !== POOL_A) return

  let expectedHash: string, bolt11Hash: string | undefined
  try {
    expectedHash = sha256Hex(description)
    bolt11Hash = bolt11Field(bolt11, 'description_hash')
  } catch (e) {
    return reject(ev, `bolt11 decode error: ${(e as Error).message}`)
  }
  if (!bolt11Hash || bolt11Hash !== expectedHash) {
    return reject(ev, 'bolt11 description_hash ≠ sha256(description)')
  }

  const amountMsats = Number(bolt11Field(bolt11, 'amount') ?? 0)
  if (amountMsats < MIN_MSATS) {
    return reject(ev, `amount ${amountMsats} msats < ${MIN_MSATS} msats`)
  }

  const paymentHash = bolt11Field(bolt11, 'payment_hash')
  if (!paymentHash) return reject(ev, 'missing payment_hash in bolt11')

  receiptsByHash.set(paymentHash, ev)
  console.log(
    `✓ receipt: zapper=${zapRequest.pubkey.slice(0, 8)} ` +
      `amount=${amountMsats / 1000}sats hash=${paymentHash.slice(0, 12)}`
  )
  reconcile(paymentHash)
}

function handlePrediction(ev: NostrEvent) {
  if (!verifyEvent(ev)) return reject(ev, 'invalid signature')

  const paymentHash = findTag(ev, 'payment_hash')
  if (!paymentHash) return reject(ev, 'prediction missing payment_hash tag')

  const picks = ev.tags
    .filter((t) => t[0] === 'pick' && t.length >= 4)
    .map((t) => ({ matchId: t[1], home: Number(t[2]), away: Number(t[3]) }))

  if (picks.length === 0) return reject(ev, 'prediction without picks')

  predictionsByHash.set(paymentHash, ev)
  console.log(
    `✓ prediction: player=${ev.pubkey.slice(0, 8)} ` +
      `picks=${picks.length} hash=${paymentHash.slice(0, 12)}`
  )
  reconcile(paymentHash)
}

function reconcile(paymentHash: string) {
  const receipt = receiptsByHash.get(paymentHash)
  const prediction = predictionsByHash.get(paymentHash)
  if (!receipt || !prediction) return

  const description = findTag(receipt, 'description')!
  const zapRequest = JSON.parse(description) as NostrEvent
  if (zapRequest.pubkey !== prediction.pubkey) {
    return reject(prediction, `zap pubkey ${zapRequest.pubkey.slice(0, 8)} ≠ prediction pubkey ${prediction.pubkey.slice(0, 8)}`)
  }

  const bolt11 = findTag(receipt, 'bolt11')!
  const amountSats = Number(bolt11Field(bolt11, 'amount') ?? 0) / 1000

  const picks = prediction.tags
    .filter((t) => t[0] === 'pick' && t.length >= 4)
    .map((t) => ({ matchId: t[1], home: Number(t[2]), away: Number(t[3]) }))

  const inscription: Inscription = {
    pubkey: prediction.pubkey,
    paymentHash,
    amountSats,
    picks,
    receiptEventId: receipt.id,
    predictionEventId: prediction.id,
    inscribedAt: prediction.created_at,
  }

  const previous = validInscriptions.get(prediction.pubkey)
  if (previous && previous.inscribedAt >= prediction.created_at) {
    // ya tenemos una inscripción más reciente (o la misma) — ignoramos
    return
  }

  validInscriptions.set(prediction.pubkey, inscription)
  saveState()
  console.log(
    `\n🎯 INSCRIPCIÓN VÁLIDA · player=${prediction.pubkey.slice(0, 12)} ` +
      `picks=${picks.length} sats=${amountSats}\n`
  )
}

start().catch((e) => {
  console.error('💥 bot crash:', e)
  process.exit(1)
})
