# ⚡ Golazap

> Prode del Mundial 2026 sobre **Nostr** y **Lightning**. Inscripción 2100 sats, el pozo entero a los ganadores, escrow auditable.

Proyecto para el [Hackathón #4 de La Crypta — Zaps](https://hackaton.lacrypta.dev/hackathons/zaps) (junio 2026).

---

## En 30 segundos

1. Te logueás con tu wallet Nostr (NIP-07 o NIP-46).
2. Pagás 2100 sats con un **Zap (NIP-57)**.
3. Cargás tus pronósticos; quedan firmados como **eventos Nostr inmutables**.
4. Al cierre del Mundial, un bot determinístico calcula el ranking y libera los premios a los **top 3 (50/30/20)** vía Lightning.

Todo es auditable: cada pronóstico, cada zap receipt y cada payout son eventos Nostr firmados que cualquiera puede verificar en relays públicos.

---

## Demo en 3 minutos

```bash
# Terminal 1 — Frontend
npm install
npm run dev
# Abrí http://localhost:5173 → click "Inscribirme"
# Firmá el Zap Request con Alby → pagá → cargá tus picks → publicar
```

```bash
# Terminal 2 — Oracle listener (validación + reconciliación)
npm run bot
# Vas a ver:
#   ✓ receipt: zapper=... amount=2sats hash=...
#   ✓ prediction: player=... picks=16 hash=...
#   🎯 INSCRIPCIÓN VÁLIDA
```

```bash
# Terminal 3 — Settlement (scoring + payouts)
npm run settle
# Vas a ver:
#   📊 Ranking:
#      #1 npub14ly2dhc... · 5 pts · 1 exactos · 3 aciertos
#   💸 Calculando payouts (50/30/20)...
#      ✓ invoice generado para el ganador
```

---

## Arquitectura

```
              ┌──────────────────────────────────────┐
              │  RELAYS NOSTR (damus, nos.lol)       │
              │  - kind 30750: pool definition       │
              │  - kind 1750: pronósticos firmados   │
              │  - kind 9735: zap receipts           │
              │  - kind 30751: resultados (oracle)   │
              │  - kind 1752: settlement (todo proof)│
              └────┬──────────────────────────────┬──┘
                   │                              │
       publish + read                  publish + read
                   │                              │
   ┌───────────────┴────────┐    ┌────────────────┴───────────┐
   │  FRONTEND React+Vite   │    │  BOTS (Node + tsx)         │
   │  - Login NIP-07/NIP-46 │    │  - Oracle listener         │
   │  - Modal inscripción   │    │     (valida + reconcilia)  │
   │  - Picks form (1750)   │    │  - Settlement              │
   │  - Leaderboard live    │    │     (score + invoice gen)  │
   └────────┬───────────────┘    └────────┬───────────────────┘
            │ Zap NIP-57                  │ LN payout
            ▼                             ▼
   ┌──────────────────────────────────────────────────┐
   │  HOT LIGHTNING WALLET (single-sig, capeada)      │
   │  Recibe Zaps, paga premios. Cap operativo: 210k. │
   └──────────────┬───────────────────────────────────┘
                  │ sweep on-chain del excedente
                  ▼
   ┌──────────────────────────────────────────────────┐
   │  COLD VAULT (multisig 2-de-3 onchain Bitcoin)    │
   │  3 npubs públicos de La Crypta. Recovery + cold. │
   └──────────────────────────────────────────────────┘
```

---

## Flow NIP-57 (inscripción)

```
[Jugador]                [WoS LNURL]              [Relays]               [Oracle bot]
   │                          │                       │                        │
   │── 1. login NIP-07 ──┐    │                       │                        │
   │                     │    │                       │                        │
   │── 2. armar 9734 ────┘    │                       │                        │
   │── 3. firmar 9734          │                       │                        │
   │                          │                       │                        │
   │── 4. GET LNURL ?nostr=9734 ►                     │                        │
   │◄── 5. invoice ────────────                       │                        │
   │     (desc_hash = SHA256(9734))                   │                        │
   │                          │                       │                        │
   │── 6. pagar invoice ─────►│                       │                        │
   │                          │── 7. publish 9735 ───►│                        │
   │                          │                       │── 8. backend ve 9735 ─►│ ✓ valida
   │                          │                       │                        │
   │── 9. armar 1750 con payment_hash                 │                        │
   │── 10. firmar 1750         │                       │                        │
   │── 11. publish 1750 ───────────────────────────────►                       │
   │                          │                       │── 12. ve 1750 ────────►│ ✓ reconcilia
```

---

## Custodia (honest section)

Lightning **no soporta multisig multi-party nativo** — cada nodo necesita single-sig para firmar HTLCs decenas de veces por hora. El vault público se implementa en dos capas:

| Capa | Operación | Custodia |
|---|---|---|
| **Hot LN wallet** | recibe Zaps, paga premios | single-sig del organizador, cap 210k sats |
| **Cold vault onchain** | guarda excedente, backup, recovery | multisig 2-de-3 entre 3 npubs públicos de La Crypta |

**Pérdida máxima ante un compromiso de la hot** = el cap (210k sats). Lo demás está en el cold, que requiere 2 firmas adicionales no del operador.

**No es non-custodial puro** — es **trust-minimized**. El cold vault distribuye la confianza en 3 humanos identificados con npubs auditables. El cap limita el daño potencial.

Para versiones futuras: integración con Cashu o Fedimint para escrow programático real.

---

## Quick start

### Requisitos

- Node 22+
- Extensión Nostr (Alby, nos2x) con WebLN si querés probar el pago automático
- Cualquier wallet Lightning para pagar el invoice manualmente

### Setup

```bash
git clone https://github.com/Burgos247/Golazap.git
cd Golazap
npm install
```

### Scripts

| Script | Para qué |
|---|---|
| `npm run dev` | Frontend en localhost:5173 (Vite + React + Tailwind v4) |
| `npm run build` | Build de producción |
| `npm run bot` | Oracle listener: valida y reconcilia receipts ↔ predicciones |
| `npm run bot:watch` | Igual pero con reload al editar |
| `npm run settle` | Calcula ranking + genera invoices de payout |
| `node scripts/verify-events.mjs` | Inspecciona eventos publicados en relays |

### Configuración del pool

Editá `src/lib/inscription.ts`:

```ts
export const POOL_CONFIG = {
  lightningAddress: 'reversemouth34@walletofsatoshi.com', // ← cambiá por la tuya
  amountSats: 2,                                          // ← 2100 en producción
  organizerPubkey: '...',                                  // ← npub hex del organizador
  poolId: 'golazap-wc2026-test',
  relays: ['wss://relay.damus.io', 'wss://nos.lol'],
}
```

---

## Estructura del repo

```
golazap/
├── src/                              # Frontend (Vite + React 19 + TS)
│   ├── App.tsx                       # Single-page landing
│   ├── components/
│   │   ├── InscribirseModal.tsx      # Flow NIP-57 (9734 + invoice)
│   │   ├── PicksModal.tsx            # Form de pronósticos (1750)
│   │   └── Leaderboard.tsx           # Ranking live desde relays
│   └── lib/
│       ├── inscription.ts            # POOL_CONFIG, helpers LNURL/9734
│       ├── picks.ts                  # buildPredictionEvent, publishToRelays
│       ├── scoring.ts                # scorePick, rankInscriptions (compartido)
│       ├── results.ts                # Resultados del Mundial (placeholder)
│       └── matches.ts                # Fixture del Mundial
├── bot/                              # Backend (Node + tsx)
│   ├── index.ts                      # Oracle listener (9735 + 1750)
│   ├── settle.ts                     # Scoring + invoice generation
│   └── data/                         # gitignored, output del bot
│       ├── inscriptions.json
│       ├── results.json
│       └── settlement.json
└── scripts/
    └── verify-events.mjs             # Auditor manual de eventos
```

---

## Eventos Nostr usados

### `kind 30750` — Pool definition (parameterized replaceable)

```json
{
  "kind": 30750,
  "tags": [
    ["d", "golazap-wc2026"],
    ["title", "Golazap · Prode Mundial 2026"],
    ["entry_fee", "2100", "sats"],
    ["custody", "hot-ln-cold-multisig-2of3"],
    ["lnurl", "lnurl1..."],
    ["payout", "50,30,20"],
    ["scoring", "exact:3,result:1"],
    ["deadline", "1749643200"],
    ["oracle", "<npub>"],
    ["match", "wc26-d1-m1", "MEX", "RSA", "1749643200"],
    ["relay", "wss://relay.damus.io"]
  ]
}
```

### `kind 1750` — Pronóstico del jugador

```json
{
  "kind": 1750,
  "tags": [
    ["a", "30750:<organizer>:golazap-wc2026"],
    ["payment_hash", "72b4e842ea7b9bf5..."],
    ["pick", "wc26-d1-m1", "2", "1"],
    ["pick", "wc26-d1-m2", "0", "0"]
  ]
}
```

### `kind 9735` — Zap receipt (NIP-57 standard)

Generado por el LNURL server (Wallet of Satoshi en el demo). El campo `description` contiene el `9734` firmado del jugador, que sirve como prueba de intención + monto.

### `kind 30751` — Match result (TBD, firmado por el oráculo)

```json
{
  "kind": 30751,
  "tags": [
    ["d", "wc26-d1-m1"],
    ["a", "30750:<organizer>:golazap-wc2026"],
    ["score", "2", "1"],
    ["status", "final"],
    ["source", "https://fifa.com/...", "fifa-api"]
  ]
}
```

### `kind 1752` — Settlement final (TBD)

```json
{
  "kind": 1752,
  "tags": [
    ["a", "30750:<organizer>:golazap-wc2026"],
    ["pot", "98700", "sats"],
    ["winner", "<npub1>", "27", "49350"],
    ["payout_proof", "<npub1>", "<preimage>"]
  ]
}
```

---

## Reglas de scoring

| Predicción vs Resultado | Puntos |
|---|---|
| Resultado exacto | **3** |
| Ganador correcto (incluye empate vs empate) | **1** |
| Ganador equivocado | 0 |

Tiebreakers: `score desc → resultados exactos desc → inscribedAt asc` (premia early adopters).

Pozo total = `N_participantes × entry_fee`. Split por defecto: **50/30/20** a los 3 primeros.

---

## Roadmap

### ✅ MVP del hackatón (lo que está en este repo)

- Landing mundialista con Hero, Stats, Cómo funciona, Calendario, **Leaderboard live**, FAQ
- Login Nostr (NIP-07) + soporte NIP-46 vía bunker
- Flow de inscripción NIP-57 completo end-to-end (9734 → invoice → WebLN/QR)
- UI de pronósticos firmados (kind 1750) con publish a relays
- Oracle listener: validación de bolt11 `description_hash`, firma del 9734, monto, reconciliación por `payment_hash`, persistencia
- Settlement bot: scoring determinístico, ranking con tiebreakers, fetch de `lud16` desde kind 0 del ganador, generación de invoice de payout

### ⏳ Próximos pasos (v1)

- [ ] Generar y publicar las keys reales del organizador y del oráculo
- [ ] Wallet adapter NWC para ejecutar payouts reales desde el bot
- [ ] Publicación firmada del `kind 30751` (resultados oficiales) y `kind 1752` (settlement)
- [ ] Coordinación de los 3 firmantes del cold vault + dirección on-chain pública
- [ ] Bot que lea API FIFA/SofaScore y publique resultados automáticos
- [ ] Volver el monto a 2100 sats (hoy en 2 para testing)
- [ ] README de despliegue (Vercel/Cloudflare Pages para la landing, VPS para el bot)

### 🚀 Después (v2)

- Cashu / Fedimint adapter como `EscrowProvider` alternativo (sin reescribir lógica de eventos)
- DLCs sobre Lightning cuando madure
- Multi-pool simultáneo (Premier, Champions, etc.)
- Mercados sub (próximo goleador, primer gol antes del minuto X)
- Pronósticos editables hasta el kickoff con append-only

---

## Créditos

Construido por [@Burgos247](https://github.com/Burgos247) para el Hackathón #4 de La Crypta · 2026.

Inspirado por la cultura del prode argentino y el ethos del soberano monetario.

Stack:

- [Nostr](https://nostr.com) protocol (NIP-01, NIP-07, NIP-46, NIP-57)
- [Lightning Network](https://lightning.network) + LNURL
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools)
- [Vite](https://vitejs.dev) + [React 19](https://react.dev) + [Tailwind v4](https://tailwindcss.com)
- [tsx](https://github.com/privatenumber/tsx) para los bots

Open source. Hacé lo que quieras con esto.
