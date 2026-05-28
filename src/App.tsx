const steps = [
  {
    n: 1,
    icon: '🪪',
    title: 'Conectá tu Nostr',
    body: 'Login con tu extensión (NIP-07) o tu signer remoto (NIP-46). Sin emails, sin passwords.',
  },
  {
    n: 2,
    icon: '⚡',
    title: 'Pagá 2100 sats',
    body: 'Una sola inscripción vía Zap. Tu pago queda asegurado en Nostr, sin que nadie custodie los fondos.',
  },
  {
    n: 3,
    icon: '🏆',
    title: 'Acertá y cobrá',
    body: 'Si ganás, el premio te llega directo a tu wallet Lightning. El pozo entero se reparte entre los primeros 3.',
  },
]

type MatchEvent = {
  date: string
  label: string
  detail?: string
  highlight?: boolean
  flags?: [string, string]
  teams?: [string, string]
  venue?: string
}

const timeline: MatchEvent[] = [
  {
    date: '11/06',
    label: 'Inauguración',
    flags: ['🇲🇽', '🇿🇦'],
    teams: ['México', 'Sudáfrica'],
    venue: 'Estadio Ciudad de México · 13:00 CDMX',
    highlight: true,
  },
  { date: '11/06 – 27/06', label: 'Fase de grupos', detail: '12 grupos de 4 · 72 partidos' },
  { date: '28/06 – 03/07', label: 'Dieciseisavos de final', detail: '32 → 16 equipos' },
  { date: '04/07 – 07/07', label: 'Octavos de final', detail: '16 → 8 equipos' },
  { date: '09/07 – 11/07', label: 'Cuartos de final', detail: '8 → 4 equipos' },
  { date: '14/07 – 15/07', label: 'Semifinales', detail: '4 → 2 equipos' },
  { date: '18/07', label: 'Tercer puesto' },
  {
    date: '19/07',
    label: 'Final',
    detail: 'MetLife Stadium · Nueva Jersey',
    highlight: true,
  },
]

const faqs = [
  {
    q: '¿Qué es un Zap?',
    a: 'Un Zap es un pago en sats (Bitcoin Lightning) asociado a una identidad o evento de Nostr. Permite enviar valor directamente entre usuarios sin intermediarios.',
  },
  {
    q: '¿Qué es Nostr?',
    a: 'Nostr es un protocolo abierto y descentralizado para comunicación social. Tu identidad es una clave criptográfica, no una cuenta en un servidor.',
  },
  {
    q: '¿Por qué "non-custodial"?',
    a: 'Porque Golazap nunca toca los fondos. La plataforma solo publica eventos firmados; los sats viven en un escrow programable hasta el final del Mundial.',
  },
  {
    q: '¿Quién decide los ganadores?',
    a: 'Un oráculo (idealmente un multisig de personas reconocidas de la comunidad) publica los resultados firmados de cada partido. El bot de settlement aplica las reglas de scoring de forma determinística.',
  },
  {
    q: '¿Cómo cobro si gano?',
    a: 'Recibís un token con tu premio en el evento de settlement. Lo reclamás desde tu wallet — al instante, sin pasar por la plataforma.',
  },
]

const bunting = [
  '🇦🇷','🇧🇷','🇲🇽','🇺🇸','🇨🇦','🇪🇸','🇩🇪','🇫🇷','🇮🇹','🇳🇱',
  '🇵🇹','🇺🇾','🇯🇵','🇰🇷','🇲🇦','🇸🇦','🇨🇮','🇨🇭','🇧🇪','🇪🇨',
  '🇸🇪','🇹🇷','🇦🇺','🇶🇦','🇮🇷','🇳🇿','🇸🇨','🇨🇿','🇪🇬','🇨🇻',
]

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-baseline gap-2 text-lg font-bold tracking-tight">
          <span className="text-2xl leading-none">⚽</span>
          <span className="font-display text-2xl tracking-wider">GOLAZAP</span>
          <span className="text-brand">⚡</span>
        </a>
        <nav className="hidden gap-8 text-sm text-zinc-400 md:flex">
          <a href="#como-funciona" className="hover:text-zinc-100">Cómo funciona</a>
          <a href="#calendario" className="hover:text-zinc-100">Calendario</a>
          <a href="#faq" className="hover:text-zinc-100">FAQ</a>
        </nav>
        <button
          type="button"
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-brand-dark"
        >
          Conectar Nostr
        </button>
      </div>
    </header>
  )
}

function BuntingStrip() {
  const doubled = [...bunting, ...bunting]
  return (
    <div className="overflow-hidden border-y border-zinc-900 bg-zinc-950 py-3">
      <div className="flex animate-marquee whitespace-nowrap">
        {doubled.map((flag, i) => (
          <span key={i} className="mx-3 text-2xl">{flag}</span>
        ))}
      </div>
    </div>
  )
}

function ScoreboardCard() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        <span>● Inauguración</span>
        <span>11 JUN · 13:00 CDMX</span>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="text-right">
          <div className="text-4xl leading-none">🇲🇽</div>
          <div className="mt-2 font-display text-2xl tracking-wider">MÉXICO</div>
        </div>
        <div className="font-display text-3xl text-zinc-600">VS</div>
        <div className="text-left">
          <div className="text-4xl leading-none">🇿🇦</div>
          <div className="mt-2 font-display text-2xl tracking-wider">SUDÁFRICA</div>
        </div>
      </div>
      <div className="mt-4 border-t border-zinc-900 pt-3 text-center text-xs text-zinc-500">
        Estadio Ciudad de México
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden border-b border-zinc-900">
      <div className="absolute inset-0 bg-pitch opacity-90" />
      <div className="absolute inset-0 bg-hex" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 85% 15%, rgba(250,204,21,0.18), transparent 45%), radial-gradient(circle at 10% 90%, rgba(34,197,94,0.18), transparent 50%)',
        }}
      />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-[1.4fr_1fr] md:items-center md:py-32">
        <div>
          <span className="inline-block rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand">
            Mundial 2026 · Hackathón #4 La Crypta
          </span>
          <h1 className="mt-6 font-display text-6xl leading-[0.95] tracking-wide md:text-8xl">
            EL <span className="text-brand">PRODE</span><br />
            DEL MUNDIAL<br />
            PAGADO CON <span className="text-brand">ZAPS</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-zinc-300 md:text-xl">
            Inscripción <span className="font-semibold text-brand">2100 sats</span>.
            El pozo entero a los ganadores. Cero custodia, cero fees.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <button
              type="button"
              className="rounded-full bg-brand px-6 py-3 font-semibold text-zinc-950 shadow-lg shadow-brand/20 transition hover:bg-brand-dark"
            >
              ⚡ Inscribirme
            </button>
            <a
              href="#como-funciona"
              className="rounded-full border border-zinc-700 bg-zinc-950/50 px-6 py-3 font-semibold text-zinc-100 backdrop-blur transition hover:bg-zinc-900"
            >
              Cómo funciona
            </a>
          </div>
        </div>
        <div className="md:justify-self-end md:max-w-sm">
          <ScoreboardCard />
        </div>
      </div>
    </section>
  )
}

function Stats() {
  const items = [
    { value: '2100', unit: 'SATS', label: 'Entrada por jugador' },
    { value: '0', unit: '%', label: 'Fee de plataforma' },
    { value: '100', unit: '%', label: 'Del pozo a los ganadores' },
  ]
  return (
    <section className="border-b border-zinc-900 bg-zinc-950">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-px bg-zinc-900 md:grid-cols-3">
        {items.map((s) => (
          <div key={s.label} className="bg-zinc-950 px-6 py-12 text-center">
            <div className="flex items-baseline justify-center gap-2">
              <span className="scoreboard-digit text-5xl md:text-6xl">{s.value}</span>
              <span className="font-display text-xl text-zinc-500 md:text-2xl">{s.unit}</span>
            </div>
            <div className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="relative border-b border-zinc-900 py-24">
      <div className="absolute inset-0 bg-hex opacity-40" />
      <div className="relative mx-auto max-w-6xl px-6">
        <h2 className="font-display text-5xl tracking-wide md:text-6xl">
          CÓMO FUNCIONA
        </h2>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Tres pasos. Sin formularios, sin tarjetas, sin trámites.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="group relative overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950 p-6 transition hover:border-brand/50"
            >
              <div className="absolute right-4 top-4 font-display text-5xl text-zinc-900 transition group-hover:text-zinc-800">
                {String(s.n).padStart(2, '0')}
              </div>
              <div className="text-3xl">{s.icon}</div>
              <h3 className="mt-4 font-display text-2xl tracking-wide">{s.title}</h3>
              <p className="mt-2 text-sm text-zinc-400">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FixtureRow({ ev }: { ev: MatchEvent }) {
  if (ev.flags && ev.teams) {
    return (
      <li className="overflow-hidden rounded-2xl border border-brand/40 bg-gradient-to-br from-pitch-dark to-zinc-950">
        <div className="flex items-center justify-between border-b border-brand/20 px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand">
          <span>{ev.label}</span>
          <span className="font-mono text-zinc-300">{ev.date}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-5">
          <div className="flex items-center justify-end gap-3">
            <span className="font-display text-xl tracking-wider md:text-2xl">{ev.teams[0]}</span>
            <span className="text-3xl md:text-4xl">{ev.flags[0]}</span>
          </div>
          <span className="font-display text-2xl text-zinc-600">VS</span>
          <div className="flex items-center gap-3">
            <span className="text-3xl md:text-4xl">{ev.flags[1]}</span>
            <span className="font-display text-xl tracking-wider md:text-2xl">{ev.teams[1]}</span>
          </div>
        </div>
        {ev.venue && (
          <div className="border-t border-brand/20 px-5 py-2 text-center text-xs text-zinc-400">
            {ev.venue}
          </div>
        )}
      </li>
    )
  }

  if (ev.highlight) {
    return (
      <li className="overflow-hidden rounded-2xl border border-brand/50 bg-gradient-to-r from-brand/10 via-zinc-950 to-zinc-950">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-6 py-5 md:gap-8">
          <span className="font-mono text-sm font-semibold text-brand md:text-base">{ev.date}</span>
          <span className="font-display text-2xl tracking-wide md:text-3xl">{ev.label} 🏆</span>
          <span className="hidden text-right text-sm text-zinc-400 md:block">{ev.detail}</span>
        </div>
        {ev.detail && (
          <div className="border-t border-brand/20 px-6 py-2 text-center text-xs text-zinc-400 md:hidden">
            {ev.detail}
          </div>
        )}
      </li>
    )
  }

  return (
    <li className="grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-1 rounded-xl border border-zinc-900 bg-zinc-950 px-6 py-4 md:grid-cols-[180px_1fr_auto]">
      <span className="font-mono text-sm font-semibold text-brand md:text-base">{ev.date}</span>
      <span className="font-display text-lg tracking-wide text-zinc-100 md:text-xl">{ev.label}</span>
      {ev.detail && (
        <span className="col-span-2 text-sm text-zinc-500 md:col-span-1 md:text-right">{ev.detail}</span>
      )}
    </li>
  )
}

function Calendar() {
  return (
    <section id="calendario" className="relative border-b border-zinc-900 py-24">
      <div className="absolute inset-0 bg-hex opacity-30" />
      <div className="relative mx-auto max-w-6xl px-6">
        <h2 className="font-display text-5xl tracking-wide md:text-6xl">
          CALENDARIO <span className="text-brand">DEL MUNDIAL</span>
        </h2>
        <p className="mt-3 max-w-2xl text-zinc-400">
          104 partidos. 48 selecciones. 3 países. Del 11 de junio al 19 de julio de 2026.
        </p>
        <ol className="mt-12 space-y-3">
          {timeline.map((ev) => <FixtureRow key={ev.date + ev.label} ev={ev} />)}
        </ol>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section id="faq" className="border-b border-zinc-900 py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-5xl tracking-wide md:text-6xl">
          PREGUNTAS <span className="text-brand">FRECUENTES</span>
        </h2>
        <div className="mt-10 space-y-3">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-xl border border-zinc-900 bg-zinc-950 px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer items-center justify-between font-medium text-zinc-100">
                {f.q}
                <span className="text-brand transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-zinc-400">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 text-sm text-zinc-500 md:flex-row md:justify-between">
        <span>Hecho para el Hackathón #4 de La Crypta · 2026</span>
        <div className="flex gap-6">
          <a href="https://hackaton.lacrypta.dev/hackathons/zaps" className="hover:text-zinc-200">La Crypta</a>
          <a href="https://github.com/Burgos247/Golazap" className="hover:text-zinc-200">GitHub</a>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <BuntingStrip />
        <Stats />
        <HowItWorks />
        <Calendar />
        <Faq />
      </main>
      <Footer />
    </div>
  )
}
