export type Team = {
  code: string
  name: string
  flag: string
}

export type Match = {
  id: string
  /** Unix seconds del kickoff (zona UTC). */
  kickoff: number
  home: Team
  away: Team
}

const t = (code: string, name: string, flag: string): Team => ({ code, name, flag })

/**
 * Primeros 5 días del Mundial 2026 (16 partidos).
 * Datos preliminares — actualizar cuando FIFA confirme horarios definitivos.
 */
export const MATCHES: Match[] = [
  // 11/06
  { id: 'wc26-d1-m1', kickoff: 1749643200, home: t('MEX', 'México', '🇲🇽'), away: t('RSA', 'Sudáfrica', '🇿🇦') },
  { id: 'wc26-d1-m2', kickoff: 1749668400, home: t('KOR', 'Corea del Sur', '🇰🇷'), away: t('CZE', 'República Checa', '🇨🇿') },

  // 12/06
  { id: 'wc26-d2-m1', kickoff: 1749740400, home: t('CAN', 'Canadá', '🇨🇦'), away: t('BIH', 'Bosnia', '🇧🇦') },
  { id: 'wc26-d2-m2', kickoff: 1749751200, home: t('USA', 'Estados Unidos', '🇺🇸'), away: t('PAR', 'Paraguay', '🇵🇾') },

  // 13/06
  { id: 'wc26-d3-m1', kickoff: 1749816000, home: t('QAT', 'Catar', '🇶🇦'), away: t('SUI', 'Suiza', '🇨🇭') },
  { id: 'wc26-d3-m2', kickoff: 1749837600, home: t('BRA', 'Brasil', '🇧🇷'), away: t('MAR', 'Marruecos', '🇲🇦') },
  { id: 'wc26-d3-m3', kickoff: 1749848400, home: t('AUS', 'Australia', '🇦🇺'), away: t('TUR', 'Turquía', '🇹🇷') },
  { id: 'wc26-d3-m4', kickoff: 1749848400, home: t('HAI', 'Haití', '🇭🇹'), away: t('SCO', 'Escocia', '🏴󠁧󠁢󠁳󠁣󠁴󠁿') },

  // 14/06
  { id: 'wc26-d4-m1', kickoff: 1749902400, home: t('GER', 'Alemania', '🇩🇪'), away: t('CUW', 'Curazao', '🇨🇼') },
  { id: 'wc26-d4-m2', kickoff: 1749913200, home: t('NED', 'Países Bajos', '🇳🇱'), away: t('JPN', 'Japón', '🇯🇵') },
  { id: 'wc26-d4-m3', kickoff: 1749927600, home: t('CIV', 'Costa de Marfil', '🇨🇮'), away: t('ECU', 'Ecuador', '🇪🇨') },
  { id: 'wc26-d4-m4', kickoff: 1749934800, home: t('SWE', 'Suecia', '🇸🇪'), away: t('TUN', 'Túnez', '🇹🇳') },

  // 15/06
  { id: 'wc26-d5-m1', kickoff: 1749988800, home: t('BEL', 'Bélgica', '🇧🇪'), away: t('EGY', 'Egipto', '🇪🇬') },
  { id: 'wc26-d5-m2', kickoff: 1749988800, home: t('ESP', 'España', '🇪🇸'), away: t('CPV', 'Cabo Verde', '🇨🇻') },
  { id: 'wc26-d5-m3', kickoff: 1750010400, home: t('IRN', 'Irán', '🇮🇷'), away: t('NZL', 'Nueva Zelanda', '🇳🇿') },
  { id: 'wc26-d5-m4', kickoff: 1750010400, home: t('KSA', 'Arabia Saudita', '🇸🇦'), away: t('URU', 'Uruguay', '🇺🇾') },
]

export function groupByDay(matches: Match[]): { day: string; items: Match[] }[] {
  const groups = new Map<string, Match[]>()
  const fmt = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  for (const m of matches) {
    const day = fmt.format(new Date(m.kickoff * 1000))
    if (!groups.has(day)) groups.set(day, [])
    groups.get(day)!.push(m)
  }
  return Array.from(groups, ([day, items]) => ({ day, items }))
}

export function formatKickoff(kickoffSeconds: number): string {
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(kickoffSeconds * 1000))
}
