import { describe, expect, it } from 'vitest'
import { buildProfile } from './profile'
import type { Settings, TrialResults } from './profile'
import { rankAll } from './score'
import { buildPool, learningPath, teamComp, whyNot } from './plan'
import { MATRIX, STATS, SURVIVORS } from '../data'
import type { Answers } from '../quiz/questions'

const base: Settings = { challenge: false, ownedOnly: false, useVibe: false }

function run(a: Answers, t: TrialResults = {}, s: Settings = base) {
  const p = buildProfile(a, t, s)
  return { p, ranked: rankAll(p, SURVIVORS, STATS) }
}
const top = (r: ReturnType<typeof run>, n = 5) => r.ranked.slice(0, n).map((x) => x.s)
const show = (label: string, r: ReturnType<typeof run>) =>
  console.log(`\n${label}\n` + r.ranked.slice(0, 6).map((x, i) => `${i + 1}. ${x.s.name.en.padEnd(18)} ${x.score.toFixed(1)}  fit ${x.fit.toFixed(0)} meta ${x.meta.toFixed(0)}  | ${x.reasons.slice(0, 2).map((y) => y.text.en).join(' / ')}`).join('\n'))

// Personas are generic archetypes of players; none of them tunes the weights.
const PERSONAS: Record<string, Answers> = {
  decoder: {
    queue: 'solo', mode: 'ranked', rank: 't5-6', experience: 'e2',
    jobs: ['decode'], 'job-chase': 1, 'job-love': 5, 'hide-ok': 5, highlight: 'ghost', button: ['decode'],
    'chase-style': ['stealth'], risk: 'safe', complexity: 'one', voice: 'quick',
  },
  rescuer: {
    queue: 'premade', mode: 'ranked', rank: 'peak', experience: 'e4',
    jobs: ['rescue'], 'job-rescue': 5, highlight: 'double', button: ['armor', 'stun'], 'scn-chair': 'go', 'scn-gates': 'back',
    'chase-style': ['tank', 'mobility'], risk: 'mixed', voice: 'voice', 'r-map': 5, 'r-sense': 5, 'r-timing': 4, 'r-aim': 4,
  },
  healer: {
    queue: 'solo', mode: 'quick', rank: 'none', experience: 'e0',
    jobs: ['support'], 'job-support': 5, highlight: 'heal', button: ['heal'], 'support-style': ['heal', 'revive'],
    'chase-style': ['tank'], risk: 'safe', complexity: 'one', mistake: 'forgive',
  },
  stunner: {
    queue: 'duo', mode: 'ranked', rank: 't7', experience: 'e3',
    jobs: ['disrupt', 'kite'], 'job-chase': 5, highlight: 'stun3', button: ['stun'], 'chase-style': ['stun', 'trick'],
    risk: 'flashy', complexity: 'many', 'r-timing': 5, 'r-aim': 4, 'r-map': 4,
  },
  newShooter: {
    queue: 'solo', mode: 'both', rank: 'none', experience: 'e0',
    jobs: ['kite', 'disrupt'], 'job-chase': 4, highlight: 'stun3', button: ['stun', 'speed'], 'chase-style': ['mobility', 'stun'],
    risk: 'flashy', 'r-aim': 5, 'r-timing': 4, 'r-map': 1,
    games: [{ id: 'cs', level: 4 }, { id: 'pubg', level: 4 }],
  },
  kiterVeteran: {
    queue: 'solo', mode: 'ranked', rank: 'peak', experience: 'e4',
    jobs: ['kite'], 'job-chase': 5, highlight: 'kite5', 'chase-style': ['looping', 'displacement'], risk: 'flashy', grind: 5,
    'r-map': 5, 'r-sense': 5, 'r-timing': 5, 'r-mech': 5, 'r-multi': 5, carry: 5,
  },
}

describe('personas', () => {
  it('decoder gets decode-focused survivors', () => {
    const r = run(PERSONAS.decoder); show('decoder', r)
    const t = top(r, 3)
    expect(t.filter((s) => s.traits.decode >= 7 || s.roles.includes('Decode')).length).toBeGreaterThanOrEqual(2)
  })
  it('rescuer gets rescuers', () => {
    const r = run(PERSONAS.rescuer); show('rescuer', r)
    expect(top(r, 3).filter((s) => s.traits.rescue >= 7).length).toBeGreaterThanOrEqual(2)
  })
  it('new solo healer gets forgiving healers', () => {
    const r = run(PERSONAS.healer); show('healer', r)
    const t = top(r, 3)
    expect(t.filter((s) => s.traits.support >= 7).length).toBeGreaterThanOrEqual(2)
    expect(t.every((s) => s.skillFloor <= 6)).toBe(true)
  })
  it('stunner gets disruptors', () => {
    const r = run(PERSONAS.stunner); show('stunner', r)
    expect(top(r, 3).filter((s) => s.traits.disrupt >= 7 || s.kiteStyles.includes('stun')).length).toBeGreaterThanOrEqual(2)
  })
  it('new player is not handed high-floor survivors unless challenged', () => {
    const r = run(PERSONAS.newShooter); show('newShooter', r)
    expect(top(r, 5).filter((s) => s.skillFloor >= 8).length).toBeLessThanOrEqual(1)
    const rc = run(PERSONAS.newShooter, {}, { ...base, challenge: true }); show('newShooter (challenge)', rc)
    const hard = (x: typeof r) => x.ranked.slice(0, 8).reduce((a, y) => a + y.s.skillFloor, 0)
    expect(hard(rc)).toBeGreaterThanOrEqual(hard(r))
  })
  it('veteran kiter gets high-ceiling kiters', () => {
    const r = run(PERSONAS.kiterVeteran); show('kiterVeteran', r)
    expect(top(r, 3).filter((s) => s.traits.kite >= 7).length).toBeGreaterThanOrEqual(2)
  })
  it('a disliked survivor never appears in the top 5', () => {
    const r0 = run(PERSONAS.decoder)
    const first = r0.ranked[0].s.id
    const r = run({ ...PERSONAS.decoder, disliked: [first] })
    expect(top(r, 5).map((s) => s.id)).not.toContain(first)
  })
  it('meta weight moves meta-strong survivors up', () => {
    const a = run(PERSONAS.stunner, {}, { ...base, metaWeight: 0 })
    const b = run(PERSONAS.stunner, {}, { ...base, metaWeight: 0.5 })
    const avgMeta = (x: typeof a) => x.ranked.slice(0, 5).reduce((s, y) => s + y.meta, 0) / 5
    expect(avgMeta(b)).toBeGreaterThanOrEqual(avgMeta(a))
  })
  it('trials override self-ratings', () => {
    const slow = buildProfile({ 'r-reaction': 5 }, { reactionMs: 420 }, base)
    const fast = buildProfile({ 'r-reaction': 1 }, { reactionMs: 200 }, base)
    expect(fast.ability.reaction).toBeGreaterThan(slow.ability.reaction)
  })
  it('plans are well-formed', () => {
    const r = run(PERSONAS.rescuer)
    const pool = buildPool(r.ranked, STATS, MATRIX, 4)
    expect(new Set(pool.map((x) => x.r.s.id)).size).toBe(pool.length)
    const path = learningPath(r.p, SURVIVORS, STATS)
    expect(path.at(-1)?.stage).toBe('target')
    const comp = teamComp(r.ranked[0].s, SURVIVORS, r.p)
    expect(comp.members.length).toBe(4)
    expect(whyNot(r.ranked, 3).length).toBeLessThanOrEqual(3)
    console.log('\npool', pool.map((x) => `${x.r.s.name.en} (${x.why.en})`).join(' | '))
    console.log('path', path.map((x) => `${x.stage}:${x.r.s.name.en}`).join(' → '))
    console.log('comp', comp.members.map((m) => m.name.en).join(', '))
  })
})
