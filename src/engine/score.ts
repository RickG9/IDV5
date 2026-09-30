import { DEMANDS, KITE_STYLES, SUPPORT_STYLES, TRAITS } from '../types'
import type { Bi, Demand, Survivor, Trait } from '../types'
import type { Profile } from './profile'
import { clamp } from './profile'

// ─────────────────────────── roster statistics ───────────────────────────

export interface RosterStats {
  mean: Record<string, number>
  sd: Record<string, number>
  /** 20th percentile of each feature: what even the "easy" survivors ask of you. */
  p20: Record<string, number>
}

const featureKeys = [...TRAITS.map((t) => `t:${t}`), ...DEMANDS.map((d) => `d:${d}`), 'skillFloor', 'skillCeiling', 'forgiveness']

function feature(s: Survivor, k: string): number {
  if (k.startsWith('t:')) return s.traits[k.slice(2) as Trait]
  if (k.startsWith('d:')) return s.demands[k.slice(2) as Demand]
  return (s as unknown as Record<string, number>)[k]
}

export function rosterStats(roster: Survivor[]): RosterStats {
  const mean: Record<string, number> = {}
  const sd: Record<string, number> = {}
  const p20: Record<string, number> = {}
  for (const k of featureKeys) {
    const xs = roster.map((s) => feature(s, k))
    const m = xs.reduce((a, b) => a + b, 0) / xs.length
    const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length
    mean[k] = m
    sd[k] = Math.max(Math.sqrt(v), 0.75)
    p20[k] = [...xs].sort((a, b) => a - b)[Math.floor(xs.length * 0.2)] ?? 0
  }
  return { mean, sd, p20 }
}

const z = (st: RosterStats, s: Survivor, k: string) => (feature(s, k) - st.mean[k]) / st.sd[k]

/** Standardised vector used for "plays like" similarity. */
function vector(st: RosterStats, s: Survivor): number[] {
  const v = featureKeys.map((k) => z(st, s, k))
  for (const k of KITE_STYLES) v.push(s.kiteStyles.includes(k) ? 0.8 : 0)
  for (const k of SUPPORT_STYLES) v.push(s.supportStyles.includes(k) ? 0.6 : 0)
  for (const r of ['Decode', 'Contain', 'Assist', 'Rescue'] as const) v.push(s.roles.includes(r) ? 1 : 0)
  return v
}

export function similarity(st: RosterStats, a: Survivor, b: Survivor): number {
  const x = vector(st, a), y = vector(st, b)
  let d = 0, nx = 0, ny = 0
  for (let i = 0; i < x.length; i++) { d += x[i] * y[i]; nx += x[i] ** 2; ny += y[i] ** 2 }
  return d / (Math.sqrt(nx * ny) || 1)
}

// ─────────────────────────── reasons ───────────────────────────

export type ReasonKind = 'play' | 'style' | 'skill' | 'growth' | 'queue' | 'taste' | 'evidence' | 'meta' | 'mastery'
export interface Reason {
  kind: ReasonKind
  w: number // signed contribution (for sorting)
  text: Bi
}

export const TRAIT_LABEL: Record<Trait, Bi> = {
  kite: { en: 'kiting the hunter', cn: '牵制监管者' },
  decode: { en: 'decoding', cn: '破译' },
  rescue: { en: 'rescuing', cn: '救人' },
  support: { en: 'supporting teammates', cn: '辅助队友' },
  disrupt: { en: 'disrupting the hunter', cn: '干扰监管者' },
  info: { en: 'scouting and information', cn: '侦查与信息' },
  survivability: { en: 'staying alive', cn: '生存能力' },
  selfSufficiency: { en: 'playing without team help', cn: '独立作战' },
  teamDependency: { en: 'coordinated team play', cn: '团队配合' },
  earlyGame: { en: 'early-game impact', cn: '前期影响力' },
  lateGame: { en: 'endgame impact', cn: '后期影响力' },
}
export const DEMAND_LABEL: Record<Demand, Bi> = {
  mechanics: { en: 'execution', cn: '操作' },
  aim: { en: 'aim', cn: '瞄准' },
  timing: { en: 'timing', cn: '时机把握' },
  reaction: { en: 'reaction speed', cn: '反应速度' },
  mapKnowledge: { en: 'map knowledge', cn: '地图理解' },
  gameSense: { en: 'game sense', cn: '意识' },
  multitask: { en: 'multitasking', cn: '多线操作' },
  comms: { en: 'team communication', cn: '团队沟通' },
}
export const STYLE_LABEL: Record<string, Bi> = {
  looping: { en: 'looping', cn: '绕点' }, mobility: { en: 'mobility', cn: '位移' }, stun: { en: 'stuns', cn: '控制' },
  stealth: { en: 'stealth', cn: '隐匿' }, tank: { en: 'tanking', cn: '抗伤' }, displacement: { en: 'teleports/swaps', cn: '传送换位' },
  trick: { en: 'tricks', cn: '诡计' }, heal: { en: 'healing', cn: '治疗' }, shield: { en: 'shields', cn: '护盾' },
  speed: { en: 'speed buffs', cn: '加速' }, info: { en: 'information', cn: '信息' }, 'rescue-assist': { en: 'rescue help', cn: '协助救人' },
  'decode-buff': { en: 'decode buffs', cn: '破译增益' }, 'hunter-debuff': { en: 'hunter debuffs', cn: '削弱监管者' }, revive: { en: 'revives', cn: '拉起队友' },
}

const IMPORTANCE: Record<Demand, number> = { mechanics: 1, aim: 0.9, timing: 0.9, reaction: 0.8, mapKnowledge: 0.85, gameSense: 0.8, multitask: 0.7, comms: 0.7 }
const MECHANICAL: Demand[] = ['aim', 'timing', 'reaction', 'mechanics', 'multitask']

// ─────────────────────────── scoring ───────────────────────────

export interface Breakdown {
  play: number; style: number; skill: number; mastery: number; queue: number; evidence: number; taste: number
}
export interface ScoredSurvivor {
  s: Survivor
  fitRaw: number
  fit: number // 0-100
  meta: number // 0-100
  score: number // 0-100 final
  breakdown: Breakdown
  gaps: { d: Demand; gap: number }[]
  reasons: Reason[]
}

const logistic = (x: number) => 100 / (1 + Math.exp(-x))
const f1 = (n: number) => (Math.round(n * 10) / 10).toString()

export function metaScore(p: Profile, s: Survivor): number {
  const ranked = (s.meta[p.bracket] - 1) / 4
  const quick = (s.quickMatch - 1) / 4
  let m = p.mode === 'ranked' ? ranked : p.mode === 'quick' ? quick : (ranked + quick) / 2
  if (s.provisional) m = 0.5 + (m - 0.5) * 0.4 // too new to trust
  return m * 100
}

export function scoreSurvivor(p: Profile, s: Survivor, st: RosterStats, roster: Survivor[]): ScoredSurvivor {
  const reasons: Reason[] = []
  const name = s.name

  // Queue shifts what "good" means: solo players need self-sufficiency.
  const desire = { ...p.desire }
  if (p.queue === 'solo') { desire.selfSufficiency += 0.6; desire.teamDependency -= 0.35 }
  if (p.queue === 'premade') { desire.teamDependency += 0.3 }

  // 1 ─ Playstyle fit: desire-weighted standardised traits.
  let num = 0, den = 0
  for (const t of TRAITS) {
    const d = desire[t]
    if (Math.abs(d) < 0.05) continue
    const zt = z(st, s, `t:${t}`)
    num += d * zt
    den += Math.abs(d)
    const c = d * zt
    if (d > 0.35 && zt > 0.45) reasons.push({ kind: 'play', w: c, text: {
      en: `You want ${TRAIT_LABEL[t].en} — ${name.en} rates ${f1(s.traits[t])}/10 there.`,
      cn: `你想要${TRAIT_LABEL[t].cn}——${name.cn}在这方面是 ${f1(s.traits[t])}/10。` } })
    else if (d > 0.35 && zt < -0.6) reasons.push({ kind: 'play', w: c, text: {
      en: `You want ${TRAIT_LABEL[t].en}, but ${name.en} is below average at it (${f1(s.traits[t])}/10).`,
      cn: `你想要${TRAIT_LABEL[t].cn}，但${name.cn}在这方面偏弱（${f1(s.traits[t])}/10）。` } })
    else if (d < -0.35 && zt > 0.6) reasons.push({ kind: 'play', w: c, text: {
      en: `You'd rather avoid ${TRAIT_LABEL[t].en}, and that's a big part of ${name.en}'s job.`,
      cn: `你不太想${TRAIT_LABEL[t].cn}，而这正是${name.cn}的主要工作。` } })
  }
  const play = den > 0 ? (num / (den + 0.5)) * 1.25 : 0

  // 2 ─ Style fit: preferred ways of surviving a chase / helping.
  const kMax = Math.max(0.5, ...Object.values(p.kite))
  const sMax = Math.max(0.5, ...Object.values(p.support))
  const kHits = s.kiteStyles.filter((k) => p.kite[k] > 0.25)
  const sHits = s.supportStyles.filter((k) => p.support[k] > 0.25)
  const kScore = s.kiteStyles.length ? s.kiteStyles.reduce((a, k) => a + p.kite[k], 0) / kMax / Math.sqrt(s.kiteStyles.length) : 0
  const sScore = s.supportStyles.length ? s.supportStyles.reduce((a, k) => a + p.support[k], 0) / sMax / Math.sqrt(s.supportStyles.length) : 0
  const style = clamp(kScore * 0.6 + sScore * 0.35, -1.5, 1.6)
  if (kHits.length) reasons.push({ kind: 'style', w: 0.4 * kHits.length, text: {
    en: `Survives chases the way you like: ${kHits.map((k) => STYLE_LABEL[k].en).join(', ')}.`,
    cn: `符合你喜欢的溜鬼方式：${kHits.map((k) => STYLE_LABEL[k].cn).join('、')}。` } })
  if (sHits.length) reasons.push({ kind: 'style', w: 0.3 * sHits.length, text: {
    en: `Helps the team the way you enjoy: ${sHits.map((k) => STYLE_LABEL[k].en).join(', ')}.`,
    cn: `以你喜欢的方式帮助队伍：${sHits.map((k) => STYLE_LABEL[k].cn).join('、')}。` } })

  // 3 ─ Skill fit: demands above your ability cost points; strengths put to work earn some.
  const teammatesComms = p.queue === 'solo' ? 3 : p.queue === 'duo' ? Math.min(p.ability.comms, 5.5) : p.ability.comms
  const gaps: { d: Demand; gap: number }[] = []
  let penalty = 0, leverage = 0
  for (const d of DEMANDS) {
    const have = d === 'comms' ? teammatesComms : p.ability[d]
    // Gaps are relative: if even the easiest survivors ask more than you have, that
    // baseline is shared by everyone and shouldn't sink every recommendation.
    const gap = s.demands[d] - Math.max(have, st.p20[`d:${d}`] ?? 0)
    if (gap > 0.75) {
      const pen = (gap - 0.75) ** 1.35 * IMPORTANCE[d] * 0.16
      penalty += pen
      gaps.push({ d, gap })
    }
    if (MECHANICAL.includes(d) && have > 5.5) leverage += (s.demands[d] / 10) * ((have - 5.5) / 4.5) * 0.45
  }
  if (p.isNew && s.skillFloor > 5) penalty += (s.skillFloor - 5) * 0.12 * (1 + Math.max(0, p.forgive))
  const growthScale = p.challenge ? 0.25 : 1
  const skill = clamp(-penalty * growthScale + leverage, -3, 1.2)
  gaps.sort((a, b) => b.gap - a.gap)
  for (const g of gaps.slice(0, 2)) {
    const have = g.d === 'comms' ? teammatesComms : p.ability[g.d]
    reasons.push(p.challenge
      ? { kind: 'growth', w: -0.15 * g.gap, text: {
          en: `Stretch goal: demands ${DEMAND_LABEL[g.d].en} ${f1(s.demands[g.d])}/10 (you: ~${f1(have)}).`,
          cn: `成长目标：需要${DEMAND_LABEL[g.d].cn} ${f1(s.demands[g.d])}/10（你约为 ${f1(have)}）。` } }
      : { kind: 'skill', w: -0.3 * g.gap, text: g.d === 'comms'
          ? { en: `Wants coordinated teammates (comms ${f1(s.demands.comms)}/10) — hard in ${p.queue === 'solo' ? 'solo queue' : 'your setup'}.`,
              cn: `需要队友配合（沟通需求 ${f1(s.demands.comms)}/10）——${p.queue === 'solo' ? '野排' : '你的组队方式'}下较难发挥。` }
          : { en: `Demands ${DEMAND_LABEL[g.d].en} ${f1(s.demands[g.d])}/10 — your estimate is ~${f1(have)}.`,
              cn: `需要${DEMAND_LABEL[g.d].cn} ${f1(s.demands[g.d])}/10——你的估值约为 ${f1(have)}。` } })
  }
  const best = MECHANICAL.filter((d) => p.ability[d] >= 7 && s.demands[d] >= 6.5).sort((a, b) => p.ability[b] - p.ability[a])
  if (best.length) reasons.push({ kind: 'skill', w: 0.5, text: {
    en: `Puts your ${best.map((d) => DEMAND_LABEL[d].en).join(' and ')} to work.`,
    cn: `能发挥你的${best.map((d) => DEMAND_LABEL[d].cn).join('和')}。` } })

  // 4 ─ Mastery appetite, forgiveness, kit complexity.
  const mastery = p.ceiling * z(st, s, 'skillCeiling') * 0.35 + p.forgive * z(st, s, 'forgiveness') * 0.35 + p.complexity * z(st, s, 'd:multitask') * 0.25
  if (p.ceiling > 0.4 && s.skillCeiling >= 8) reasons.push({ kind: 'mastery', w: 0.4, text: {
    en: `Very high skill ceiling (${f1(s.skillCeiling)}/10) — mastery keeps paying off.`,
    cn: `上限极高（${f1(s.skillCeiling)}/10）——越练越强。` } })
  if (p.forgive > 0.3 && s.forgiveness >= 7.5) reasons.push({ kind: 'mastery', w: 0.4, text: {
    en: `Forgiving: mistakes rarely snowball (${f1(s.forgiveness)}/10).`,
    cn: `容错高：失误不容易滚雪球（${f1(s.forgiveness)}/10）。` } })

  // 5 ─ Queue viability.
  const qv = p.queue === 'solo' ? s.queue.solo : p.queue === 'premade' ? s.queue.premade : (s.queue.solo + s.queue.premade) / 2
  const queue = (qv - 3) / 2
  if (p.queue === 'solo' && s.queue.solo >= 4) reasons.push({ kind: 'queue', w: 0.35, text: { en: 'Holds up well in solo queue with random teammates.', cn: '野排也能稳定发挥。' } })
  if (p.queue === 'solo' && s.queue.solo <= 2) reasons.push({ kind: 'queue', w: -0.35, text: { en: 'Struggles in solo queue — best with a coordinated team.', cn: '野排较难发挥——更适合有配合的队伍。' } })
  if (p.queue === 'premade' && s.queue.premade >= 5) reasons.push({ kind: 'queue', w: 0.35, text: { en: 'Shines in a voice premade.', cn: '在语音开黑中能大放异彩。' } })

  // 6 ─ Personal evidence: survivors you enjoyed / disliked / have stats on.
  let evidence = 0
  if (p.liked.includes(s.id)) { evidence += 0.7; reasons.push({ kind: 'evidence', w: 0.6, text: { en: 'You told us you enjoy playing them.', cn: '你说过你喜欢玩这个角色。' } }) }
  if (p.disliked.includes(s.id)) { evidence -= 2; reasons.push({ kind: 'evidence', w: -2, text: { en: 'You told us you disliked them.', cn: '你说过你不喜欢这个角色。' } }) }
  const likedOthers = roster.filter((r) => p.liked.includes(r.id) && r.id !== s.id)
  if (likedOthers.length) {
    const sims = likedOthers.map((r) => ({ r, v: similarity(st, s, r) })).sort((a, b) => b.v - a.v)
    const top = sims[0]
    evidence += Math.max(0, top.v) * 0.8
    if (top.v > 0.55) reasons.push({ kind: 'evidence', w: top.v * 0.6, text: { en: `Plays a lot like ${top.r.name.en}, which you enjoy.`, cn: `玩法与你喜欢的${top.r.name.cn}很相似。` } })
  }
  for (const r of roster.filter((r) => p.disliked.includes(r.id) && r.id !== s.id)) {
    const v = similarity(st, s, r)
    if (v > 0.5) evidence -= (v - 0.5) * 0.8
  }
  const row = p.stats.find((r) => r.id === s.id)
  if (row?.games && row.games >= 5 && row.winRate !== undefined) {
    const conf = clamp(row.games / 60, 0.1, 1)
    const perf = clamp((row.winRate - 50) / 20, -1, 1)
    evidence += perf * 0.6 * conf
    if (perf * conf > 0.25) reasons.push({ kind: 'evidence', w: perf * conf, text: { en: `Your own record: ${row.winRate}% over ${row.games} games.`, cn: `你的战绩：${row.games} 场，胜率 ${row.winRate}%。` } })
  }

  // 7 ─ Vibe (optional, deliberately small).
  let taste = 0
  if (p.useVibe) {
    const hits = s.vibe.filter((v) => (p.vibe[v] ?? 0) > 0)
    taste = Math.min(0.35, hits.length * 0.15)
    if (hits.length) reasons.push({ kind: 'taste', w: 0.1, text: { en: `Matches your taste: ${hits.join(', ')}.`, cn: `符合你的审美偏好：${hits.join('、')}。` } })
  }

  const breakdown: Breakdown = { play: play * 1.0, style: style * 0.5, skill: skill * 1.0, mastery: mastery * 0.6, queue: queue * 0.4, evidence: evidence * 0.8, taste }
  const fitRaw = Object.values(breakdown).reduce((a, b) => a + b, 0)
  const fit = logistic(fitRaw * 1.35 - 0.2)
  const meta = metaScore(p, s)
  const score = (1 - p.metaWeight) * fit + p.metaWeight * meta
  if (meta >= 75) reasons.push({ kind: 'meta', w: 0.3, text: { en: `Strong at your rank right now (meta ${Math.round(meta)}/100).`, cn: `当前在你的段位很强势（强度 ${Math.round(meta)}/100）。` } })
  if (meta <= 30 && p.metaWeight > 0.05) reasons.push({ kind: 'meta', w: -0.3, text: { en: `Weak in the current meta at your rank (${Math.round(meta)}/100).`, cn: `在你的段位当前版本偏弱（${Math.round(meta)}/100）。` } })

  reasons.sort((a, b) => Math.abs(b.w) - Math.abs(a.w))
  return { s, fitRaw, fit, meta, score, breakdown, gaps, reasons }
}

export function rankAll(p: Profile, roster: Survivor[], st: RosterStats): ScoredSurvivor[] {
  const pool = p.ownedOnly && p.owned.length ? roster.filter((s) => p.owned.includes(s.id)) : roster
  return pool.map((s) => scoreSurvivor(p, s, st, roster)).sort((a, b) => b.score - a.score)
}
