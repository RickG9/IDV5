import type { Hunter, MatchupCell, Survivor } from '../types'

export interface MatchupMatrix {
  hunters: Hunter[]
  cells: Record<string, Record<string, MatchupCell>> // survivorId → hunterId → cell
}

/** Hunter tag vocabulary (from the hunter research file). */
export const HUNTER_TAGS = ['ranged', 'anti-stun', 'anti-loop', 'chip', 'terror', 'camp', 'mobility', 'reveal', 'area', 'multi-target', 'anti-heal', 'burst'] as const

export function normaliseHunterName(s: string) {
  return s.toLowerCase().replace(/["“”'’]/g, '').replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

type Rule = { when: (s: Survivor, h: Hunter) => boolean; d: number; en: string }
const has = (h: Hunter, t: string) => h.tags.includes(t)
const loopsOnly = (s: Survivor) => s.kiteStyles.includes('looping') && !['mobility', 'displacement', 'stun', 'tank'].some((k) => s.kiteStyles.includes(k as Survivor['kiteStyles'][number]))
// "Relies on" = the style is the survivor's primary one, or one of at most two.
const reliesOn = (s: Survivor, k: Survivor['kiteStyles'][number]) => s.kiteStyles[0] === k || (s.kiteStyles.includes(k) && s.kiteStyles.length <= 2)

const RULES: Rule[] = [
  { when: (s, h) => has(h, 'anti-stun') && reliesOn(s, 'stun'), d: -1, en: 'stun-reliant kit vs a stun-resistant hunter' },
  { when: (s, h) => has(h, 'ranged') && loopsOnly(s), d: -1, en: 'ranged attacks cut short the loops this survivor relies on' },
  { when: (s, h) => has(h, 'anti-loop') && loopsOnly(s), d: -1, en: 'hunter tools shut down pallet/window loops' },
  { when: (s, h) => has(h, 'chip') && s.supportStyles.includes('heal'), d: 1, en: 'healing undoes chip damage' },
  { when: (s, h) => has(h, 'reveal') && reliesOn(s, 'stealth'), d: -1, en: 'hunter can find hidden survivors' },
  { when: (s, h) => has(h, 'camp') && s.traits.rescue >= 8, d: 1, en: 'strong rescuer breaks chair camping' },
  { when: (s, h) => has(h, 'camp') && s.traits.rescue <= 3 && s.traits.kite <= 5, d: -0.5, en: 'little to offer against a camping hunter' },
  { when: (s, h) => has(h, 'terror') && s.traits.survivability >= 8, d: 1, en: 'extra durability softens terror-shock threats' },
  { when: (s, h) => has(h, 'mobility') && s.kiteStyles.includes('mobility'), d: 0.5, en: 'own mobility keeps pace with a mobile hunter' },
  { when: (s, h) => has(h, 'mobility') && loopsOnly(s), d: -0.5, en: 'mobile hunter closes gaps between loops' },
  { when: (s, h) => has(h, 'burst') && s.kiteStyles.includes('tank'), d: 1, en: 'tanky kit absorbs burst damage' },
  { when: (s, h) => has(h, 'multi-target') && s.traits.support >= 8, d: 0.5, en: 'team support helps when several survivors are hit' },
  { when: (s, h) => has(h, 'anti-heal') && s.supportStyles.includes('heal'), d: -1, en: 'hunter disrupts healing' },
]

export function buildMatrix(roster: Survivor[], hunters: Hunter[]): MatchupMatrix {
  const idByName = new Map<string, string>()
  for (const h of hunters) {
    idByName.set(normaliseHunterName(h.name.en), h.id)
    idByName.set(h.id, h.id)
  }
  const cells: MatchupMatrix['cells'] = {}
  for (const s of roster) {
    const row: Record<string, MatchupCell> = {}
    for (const h of hunters) {
      let d = 0
      const why: string[] = []
      for (const r of RULES) if (r.when(s, h)) { d += r.d; why.push(r.en) }
      const rating = Math.max(-2, Math.min(2, Math.round(d))) as MatchupCell['rating']
      row[h.id] = { rating: Math.abs(d) < 0.75 ? 0 : rating, reason: why.join('; ') || 'no notable interaction', sourced: false }
    }
    // Hunter-side community research: survivors commonly cited as counters / victims.
    for (const h of hunters) {
      if (h.counteredBy?.includes(s.id)) row[h.id] = { rating: 1, reason: `commonly cited as a counter to ${h.name.en}`, sourced: true }
      if (h.strongVs?.includes(s.id)) row[h.id] = { rating: -1, reason: `${h.name.en} is commonly cited as strong against them`, sourced: true }
    }
    // Survivor-side community research is the most specific and wins.
    for (const [list, sign] of [[s.matchups.good, 1], [s.matchups.bad, -1]] as const) {
      for (const m of list) {
        const id = idByName.get(normaliseHunterName(m.hunter))
        if (!id) continue
        const strong = /hard counter|very|extremely|completely|nightmare|shuts down|free win/i.test(m.reason)
        row[id] = { rating: (sign * (strong ? 2 : 1)) as MatchupCell['rating'], reason: m.reason, sourced: true }
      }
    }
    cells[s.id] = row
  }
  return { hunters, cells }
}
