import { DEMANDS, KITE_STYLES, SUPPORT_STYLES, TRAITS } from '../types'
import type { Bracket, Demand, KiteStyle, SupportStyle, Trait } from '../types'
import { questionById, QUESTIONS } from '../quiz/questions'
import type { Answers, Effect, GameEntry, StatRow } from '../quiz/questions'
import { gameById } from '../quiz/games'

export type Queue = 'solo' | 'duo' | 'premade'
export type Mode = 'ranked' | 'quick' | 'both'

export interface TrialResults {
  reactionMs?: number // median
  timingErrMs?: number // mean absolute error from window centre
  aimScore?: number // 0-100
  multitaskScore?: number // 0-100
}

/** Bounded adjustments suggested by the optional AI interpretation of free text. */
export interface AiAdjust {
  desire?: Partial<Record<Trait, number>>
  ability?: Partial<Record<Demand, number>>
  kite?: Partial<Record<KiteStyle, number>>
  summary?: string
}

export interface Obs { v: number; w: number; src: string }

export interface Profile {
  goals: string[]
  queue: Queue
  queueAnswered: boolean
  /** How many playstyle questions (Acts II–III) were answered: few answers → a less certain bill. */
  playAnswers: number
  mode: Mode
  bracket: Bracket
  isNew: boolean
  experience: number // 0-4
  desire: Record<Trait, number> // roughly [-1.5, 1.5]
  kite: Record<KiteStyle, number>
  support: Record<SupportStyle, number>
  ability: Record<Demand, number> // 0-10 estimate
  abilityConf: Record<Demand, number> // 0-1
  abilitySources: Record<Demand, Obs[]>
  ceiling: number // mastery appetite [-1, 1]
  forgive: number // wants forgiving kits [-1, 1]
  complexity: number // [-1, 1]
  metaWeight: number // 0-0.5, share of final score from meta
  vibe: Record<string, number>
  liked: string[]
  disliked: string[]
  owned: string[]
  stats: StatRow[]
  games: GameEntry[]
  challenge: boolean
  ownedOnly: boolean
  useVibe: boolean
}

export interface Settings {
  challenge: boolean
  ownedOnly: boolean
  useVibe: boolean
  metaWeight?: number // user override from the slider
}

const zero = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>

const RANK_BRACKET: Record<string, Bracket> = { none: 'low', 't1-4': 'low', 't5-6': 'mid', t7: 'high', peak: 'high', pro: 'pro' }
const EXP_LEVEL: Record<string, number> = { e0: 0, e1: 1, e2: 2, e3: 3, e4: 4 }

/** 1-5 self-rating to 0-10 ability. */
const rateToAbility = (r: number) => 1 + (r - 1) * 2.1 // 1→1, 3→5.2, 5→9.4

export function reactionToScore(ms: number) {
  // Browser click reaction incl. input latency: ~200ms elite, ~270 median, ~350 slow.
  return clamp(10 - (ms - 190) / 20, 0.5, 10)
}
export function timingToScore(errMs: number) {
  return clamp(10 - (errMs - 12) / 7, 0.5, 10)
}

export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))

export function buildProfile(answers: Answers, trials: TrialResults, settings: Settings, ai?: AiAdjust): Profile {
  const desire = zero(TRAITS)
  const kite = zero(KITE_STYLES)
  const support = zero(SUPPORT_STYLES)
  const sources = Object.fromEntries(DEMANDS.map((d) => [d, [] as Obs[]])) as Record<Demand, Obs[]>
  const vibe: Record<string, number> = {}
  let ceiling = 0
  let forgive = 0
  let complexity = 0
  const metaVotes: number[] = []

  const apply = (fx: Effect[] | undefined, scale: number, src: string) => {
    for (const e of fx ?? []) {
      switch (e.t) {
        case 'desire': desire[e.k] += e.d * scale; break
        case 'kite': kite[e.k] += e.d * scale; break
        case 'support': support[e.k] += e.d * scale; break
        case 'ability': sources[e.k].push({ v: e.v, w: e.w * Math.abs(scale), src }); break
        case 'ceiling': ceiling += e.d * scale; break
        case 'forgive': forgive += e.d * scale; break
        case 'complexity': complexity += e.d * scale; break
        case 'meta': metaVotes.push(e.v); break
        case 'vibe': vibe[e.k] = (vibe[e.k] ?? 0) + e.d * scale; break
      }
    }
  }

  for (const q of QUESTIONS) {
    const a = answers[q.id]
    if (a === undefined || a === null) continue
    if (q.showIf && !q.showIf(answers)) continue
    if (q.kind === 'single' && typeof a === 'string') {
      apply(q.options?.find((o) => o.id === a)?.fx, 1, q.id)
    } else if (q.kind === 'multi' && Array.isArray(a)) {
      // Spread the weight a little when several options are picked so one answer can't dominate.
      const n = a.length
      const scale = n <= 1 ? 1 : 1 / Math.sqrt(n) + 0.15
      for (const id of a as string[]) apply(q.options?.find((o) => o.id === id)?.fx, scale, q.id)
    } else if (q.kind === 'likert' && typeof a === 'number') {
      apply(q.fx, (a - 3) / 2, q.id)
    } else if (q.kind === 'rate' && typeof a === 'number' && q.ability) {
      sources[q.ability].push({ v: rateToAbility(a), w: 0.5, src: 'self' })
    }
  }

  // ── Identity V experience: IDV-specific skills come mostly from IDV itself.
  const experience = EXP_LEVEL[answers.experience as string] ?? 1
  const rank = (answers.rank as string) ?? 'none'
  const rankLevel = { none: 0, 't1-4': 1, 't5-6': 2, t7: 3, peak: 4, pro: 4.5 }[rank] ?? 0
  const idvSkill = clamp(1.5 + experience * 1.3 + rankLevel * 0.9, 1, 10)
  sources.mapKnowledge.push({ v: idvSkill, w: 0.9, src: 'experience' })
  sources.gameSense.push({ v: idvSkill, w: 0.7, src: 'experience' })
  sources.mechanics.push({ v: clamp(2 + experience * 1.1 + rankLevel * 0.8, 1, 10), w: 0.3, src: 'experience' })

  // ── Trials (browser mini-tests) are the strongest signal for what they measure.
  if (trials.reactionMs) sources.reaction.push({ v: reactionToScore(trials.reactionMs), w: 1.2, src: 'trial' })
  if (trials.timingErrMs !== undefined) sources.timing.push({ v: timingToScore(trials.timingErrMs), w: 1.2, src: 'trial' })
  if (trials.aimScore !== undefined) sources.aim.push({ v: trials.aimScore / 10, w: 1.2, src: 'trial' })
  if (trials.multitaskScore !== undefined) sources.multitask.push({ v: trials.multitaskScore / 10, w: 1.1, src: 'trial' })

  // ── Other games: transferable skills, scaled by level, discounted for IDV-specific ones.
  const games = (answers.games as GameEntry[] | undefined) ?? []
  for (const g of games) {
    const def = gameById[g.id]
    if (!def) continue
    const lvl = g.level ?? 2
    const frac = [0.25, 0.5, 0.8, 1][lvl - 1]
    for (const [k, top] of Object.entries(def.skills) as [Demand, number][]) {
      const v = 4 + (top - 4) * frac
      const specific = k === 'mapKnowledge' || k === 'gameSense'
      // An IDV-hunter background is IDV knowledge; other games only partly transfer.
      const w = def.id === 'idv-hunter' ? 0.7 * frac : (specific ? 0.15 : 0.45) * (0.5 + frac / 2)
      sources[k].push({ v, w, src: `game:${g.id}` })
    }
    const leanScale = 0.5 + frac / 2
    for (const [k, d] of Object.entries(def.leans?.desire ?? {}) as [Trait, number][]) desire[k] += d * leanScale
    for (const [k, d] of Object.entries(def.leans?.kite ?? {}) as [KiteStyle, number][]) kite[k] += d * leanScale
    const role = def.roles?.find((r) => r.id === g.role)
    for (const [k, d] of Object.entries(role?.leans.desire ?? {}) as [Trait, number][]) desire[k] += d * leanScale
    for (const [k, d] of Object.entries(role?.leans.kite ?? {}) as [KiteStyle, number][]) kite[k] += d * leanScale
  }

  // ── In-game stats: good contain times / decode say something about ability.
  const stats = (answers.stats as StatRow[] | undefined) ?? []
  const totalGames = stats.reduce((s, r) => s + (r.games ?? 0), 0)
  if (totalGames > 0) {
    const avg = (f: (r: StatRow) => number | undefined) => {
      let s = 0, w = 0
      for (const r of stats) { const v = f(r); if (v !== undefined && r.games) { s += v * r.games; w += r.games } }
      return w ? s / w : undefined
    }
    const kiteT = avg((r) => r.kiteTime)
    const conf = clamp(totalGames / 300, 0.15, 0.8)
    // ~20s average contain is solid mid-rank play, 40s+ is excellent.
    if (kiteT !== undefined) {
      sources.mapKnowledge.push({ v: clamp(2 + kiteT / 5, 1, 10), w: conf, src: 'stats' })
      sources.gameSense.push({ v: clamp(2.5 + kiteT / 6, 1, 10), w: conf * 0.6, src: 'stats' })
    }
    const wr = avg((r) => r.winRate)
    if (wr !== undefined) sources.gameSense.push({ v: clamp((wr - 20) / 5, 1, 10), w: conf * 0.6, src: 'stats' })
  }

  // ── Optional AI interpretation (bounded).
  if (ai) {
    for (const [k, d] of Object.entries(ai.desire ?? {}) as [Trait, number][]) desire[k] += clamp(d, -0.5, 0.5)
    for (const [k, d] of Object.entries(ai.kite ?? {}) as [KiteStyle, number][]) kite[k] += clamp(d, -0.5, 0.5)
    for (const [k, v] of Object.entries(ai.ability ?? {}) as [Demand, number][]) sources[k].push({ v: clamp(v, 0, 10), w: 0.3, src: 'ai' })
  }

  // Default prior so every ability has a value: an average player.
  const ability = zero(DEMANDS)
  const abilityConf = zero(DEMANDS)
  for (const d of DEMANDS) {
    const obs = sources[d]
    let s = 5 * 0.25, w = 0.25 // weak prior
    for (const o of obs) { s += o.v * o.w; w += o.w }
    ability[d] = clamp(s / w, 0, 10)
    abilityConf[d] = clamp((w - 0.25) / 1.5, 0, 1)
  }
  // Comms is also availability: premade voice players can run coordination-heavy picks.
  const queue = ((answers.queue as Queue) ?? 'duo') // unanswered → neutral middle, not solo
  if (queue === 'premade') ability.comms = Math.max(ability.comms, 7)

  const isNew = experience <= 1 && rankLevel <= 1
  // New players get a gentle push toward forgiving kits unless they asked otherwise.
  if (isNew) forgive += 0.3

  const metaWeight = settings.metaWeight ?? (metaVotes.length ? metaVotes.reduce((a, b) => a + b, 0) / metaVotes.length : 0.25)

  return {
    goals: (answers.goals as string[] | undefined)?.length ? (answers.goals as string[]) : ['main', 'pool', 'path', 'matchups'],
    queue,
    queueAnswered: answers.queue !== undefined,
    playAnswers: QUESTIONS.filter((q) => (q.act === 'role' || q.act === 'chase') && answers[q.id] !== undefined).length,
    mode: ((answers.mode as Mode) ?? 'both'),
    bracket: RANK_BRACKET[rank] ?? 'low',
    isNew,
    experience,
    desire,
    kite,
    support,
    ability,
    abilityConf,
    abilitySources: sources,
    ceiling: clamp(ceiling, -1.5, 1.5),
    forgive: clamp(forgive, -1.5, 1.5),
    complexity: clamp(complexity, -1, 1),
    metaWeight: clamp(metaWeight, 0, 0.5),
    vibe,
    liked: (answers.liked as string[]) ?? [],
    disliked: (answers.disliked as string[]) ?? [],
    owned: (answers.owned as string[]) ?? [],
    stats,
    games,
    challenge: settings.challenge,
    ownedOnly: settings.ownedOnly,
    useVibe: settings.useVibe,
  }
}

/** Count of questions answered, for progress display. */
export function answeredCount(answers: Answers) {
  return Object.keys(answers).filter((k) => questionById[k] && answers[k] !== undefined).length
}
