const steps = [
  {
    n: 1,
    title: 'Conectá tu Nostr',
    body: 'Login con tu extensión (NIP-07) o tu signer remoto (NIP-46). Sin emails, sin passwords.',
  },
  {
    n: 2,
    title: 'Pagá 2100 sats',
    body: 'Una sola inscripción vía Zap. Tu pago queda asegurado on-chain de Nostr, sin que nadie custodie los fondos.',
  },
  {
    n: 3,
    title: 'Acertá y cobrá',
    body: 'Si ganás, el premio te llega directo a tu wallet Lightning. El pozo entero se reparte entre los primeros 3.',
  },
]

const timeline = [
  { date: '02/06', label: 'Apertura inscripciones hackatón' },
  { date: '11/06', label: 'Arranca el Mundial 2026' },
  { date: '16/06', label: 'Deadline inscripciones' },
  { date: '23/06', label: 'Pitch final del hackatón' },
  { date: '19/07', label: 'Final del Mundial · settlement' },
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

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="text-brand">⚡</span>
          <span>Golazap</span>
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
          Conectar con Nostr
        </button>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden border-b border-zinc-900">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(250,204,21,0.25), transparent 40%), radial-gradient(circle at 80% 60%, rgba(250,204,21,0.15), transparent 50%)',
        }}
      />
      <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
        <span className="inline-block rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-xs font-medium text-zinc-400">
          Mundial 2026 · Hackathón #4 La Crypta
        </span>
        <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl">
          El prode del <span className="text-brand">Mundial</span><br />
          pagado con <span className="text-brand">Zaps</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-zinc-400 md:text-xl">
          Inscripción 2100 sats. El pozo entero va a los ganadores. Cero custodia, cero fees de plataforma.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <button
            type="button"
            className="rounded-full bg-brand px-6 py-3 font-semibold text-zinc-950 transition hover:bg-brand-dark"
          >
            Inscribirme
          </button>
          <a
            href="#como-funciona"
            className="rounded-full border border-zinc-800 px-6 py-3 font-semibold text-zinc-100 transition hover:bg-zinc-900"
          >
            Ver cómo funciona
          </a>
        </div>
      </div>
    </section>
  )
}

function Stats() {
  return (
    <section className="border-b border-zinc-900">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-px bg-zinc-900 md:grid-cols-3">
        <div className="bg-zinc-950 px-6 py-10 text-center">
          <div className="text-4xl font-bold text-brand md:text-5xl">2100 <span className="text-2xl text-zinc-500">sats</span></div>
          <div className="mt-2 text-sm text-zinc-400">Entrada por jugador</div>
        </div>
        <div className="bg-zinc-950 px-6 py-10 text-center">
          <div className="text-4xl font-bold text-brand md:text-5xl">0%</div>
          <div className="mt-2 text-sm text-zinc-400">Fee de plataforma</div>
        </div>
        <div className="bg-zinc-950 px-6 py-10 text-center">
          <div className="text-4xl font-bold text-brand md:text-5xl">100%</div>
          <div className="mt-2 text-sm text-zinc-400">Del pozo a los ganadores</div>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="border-b border-zinc-900 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Cómo funciona</h2>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Tres pasos. Sin formularios, sin tarjetas, sin trámites.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-zinc-900 bg-zinc-950 p-6 transition hover:border-zinc-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-brand text-brand">
                {s.n}
              </div>
              <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-zinc-400">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Calendar() {
  return (
    <section id="calendario" className="border-b border-zinc-900 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Calendario</h2>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Las fechas clave entre el hackatón y la final del Mundial.
        </p>
        <ol className="mt-12 space-y-4">
          {timeline.map((t) => (
            <li
              key={t.date}
              className="flex items-center gap-6 rounded-xl border border-zinc-900 bg-zinc-950 px-6 py-4"
            >
              <span className="font-mono text-lg font-semibold text-brand">{t.date}</span>
              <span className="text-zinc-300">{t.label}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section id="faq" className="border-b border-zinc-900 py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Preguntas frecuentes</h2>
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
        <Stats />
        <HowItWorks />
        <Calendar />
        <Faq />
      </main>
      <Footer />
    </div>
  )
}
