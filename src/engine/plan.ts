import type { Bi, Demand, Role, Survivor } from '../types'
import type { Profile } from './profile'
import type { RosterStats, ScoredSurvivor } from './score'
import { DEMAND_LABEL, rankAll, similarity } from './score'
import type { MatchupMatrix } from './matchups'

// ─────────────────────────── ranked pool ───────────────────────────

export interface PoolPick { r: ScoredSurvivor; why: Bi }

/**
 * Greedy pool: each pick maximises its own score plus what it adds to the pool —
 * a role the pool lacks, and cover against hunters the pool struggles with.
 * Near-duplicates are discouraged so a single ban can't wipe the pool.
 */
export function buildPool(ranked: ScoredSurvivor[], st: RosterStats, mx: MatchupMatrix | null, size: number): PoolPick[] {
  const cands = ranked.slice(0, 18)
  const pool: PoolPick[] = []
  if (!cands.length) return pool
  pool.push({ r: cands[0], why: { en: 'Your best overall fit.', cn: '综合最适合你。' } })
  while (pool.length < size) {
    let best: { r: ScoredSurvivor; v: number; why: Bi } | null = null
    const roles = new Set(pool.flatMap((p) => p.r.s.roles))
    for (const c of cands) {
      if (pool.some((p) => p.r.s.id === c.s.id)) continue
      let v = c.score
      const whyParts: Bi[] = []
      const newRoles = c.s.roles.filter((r) => !roles.has(r))
      if (newRoles.length) { v += 5; whyParts.push({ en: `adds ${newRoles.join('/')}`, cn: `补充${newRoles.map(roleCn).join('/')}定位` }) }
      if (mx) {
        let cover = 0
        for (const h of Object.keys(mx.cells[c.s.id] ?? {})) {
          const poolWorst = Math.min(...pool.map((p) => mx.cells[p.r.s.id]?.[h]?.rating ?? 0))
          const mine = mx.cells[c.s.id][h].rating
          if (poolWorst < 0 && mine > 0) cover += 1
        }
        v += Math.min(6, cover * 1.5)
        if (cover >= 2) whyParts.push({ en: `covers ${cover} hunters your pool struggles with`, cn: `能应对 ${cover} 个你的角色池难打的监管者` })
      }
      const maxSim = Math.max(...pool.map((p) => similarity(st, c.s, p.r.s)))
      if (maxSim > 0.8) v -= (maxSim - 0.8) * 40
      if (!best || v > best.v) best = { r: c, v, why: whyParts.length ? join(whyParts) : { en: 'Next-best fit with a different angle.', cn: '另一个角度的次优选择。' } }
    }
    if (!best) break
    pool.push({ r: best.r, why: best.why })
  }
  return pool
}

const roleCn = (r: Role | string) => ({ Decode: '破译', Contain: '牵制', Assist: '辅助', Rescue: '救援' }[r] ?? r)
function join(parts: Bi[]): Bi {
  const en = parts.map((p) => p.en).join('; ')
  const cn = parts.map((p) => p.cn).join('；')
  return { en: en[0].toUpperCase() + en.slice(1) + '.', cn: cn + '。' }
}

// ─────────────────────────── learning path ───────────────────────────

export interface PathStep { r: ScoredSurvivor; stage: 'start' | 'bridge' | 'target'; why: Bi; practise: Bi[] }

const PRACTISE: Record<Demand, Bi> = {
  mechanics: { en: 'Custom-match drills: camera control while looping, ability combos under pressure.', cn: '自定义练习：绕点时的视角控制、高压下的技能连招。' },
  aim: { en: 'Practise skillshots on a friend in custom matches; learn projectile lead on moving targets.', cn: '在自定义里找朋友练指向技能；学习移动目标的预判。' },
  timing: { en: 'Drill pallet-stun and ability timing against a friend hunter until it is automatic.', cn: '找朋友当监管者反复练砸板和技能时机，直到形成肌肉记忆。' },
  reaction: { en: 'Watch the hunter\'s wind-up animations; react to the animation, not the hit.', cn: '观察监管者的前摇动作，看动作反应而不是等挨刀。' },
  mapKnowledge: { en: 'Walk each map in custom mode: memorise strong loops, pallet chains and cipher spawns.', cn: '在自定义里逐张熟悉地图：记住强点、板区和密码机刷新点。' },
  gameSense: { en: 'Review your losses: when did you rescue, decode or leave, and was it right?', cn: '复盘败局：何时救人、修机或离开，决策对吗？' },
  multitask: { en: 'Play at a slower pace first — track one cooldown, then add the next.', cn: '先放慢节奏——先盯一个冷却，再逐个增加。' },
  comms: { en: 'Queue with friends on voice, or learn the quick-chat callouts.', cn: '和朋友开语音排，或熟练使用快捷消息报点。' },
}

export function learningPath(p: Profile, roster: Survivor[], st: RosterStats): PathStep[] {
  const comfort = rankAll({ ...p, challenge: false }, roster, st)
  const growth = rankAll({ ...p, challenge: true }, roster, st)
  const cScore = new Map(comfort.map((r) => [r.s.id, r.score]))
  // Target: the best "growth" survivor that is held back mostly by skill gaps.
  const heldBack = growth.filter((r) => r.score - (cScore.get(r.s.id) ?? 0) > 2 && r.s.skillFloor >= 5)
  const target = heldBack[0] ?? growth[0]
  const targetComfort = comfort.find((r) => r.s.id === target.s.id)!
  const easy = comfort.filter((r) => r.s.id !== target.s.id && r.s.skillFloor <= 4.5 && r.s.forgiveness >= 6)
  const start = [...easy].sort((a, b) => (b.score + similarity(st, b.s, target.s) * 20) - (a.score + similarity(st, a.s, target.s) * 20))[0] ?? comfort[0]
  const bridgeCands = comfort.filter((r) => ![target.s.id, start.s.id].includes(r.s.id)
    && r.s.skillFloor > start.s.skillFloor - 0.5 && r.s.skillFloor < target.s.skillFloor)
  const bridge = [...bridgeCands].sort((a, b) => (similarity(st, b.s, target.s) * 30 + b.score) - (similarity(st, a.s, target.s) * 30 + a.score))[0]

  const practise = (r: ScoredSurvivor) => {
    const gs = DEMAND_KEYS.map((d) => ({ d, g: r.s.demands[d] - (d === 'comms' ? 5 : p.ability[d]) })).filter((x) => x.g > 0.5).sort((a, b) => b.g - a.g).slice(0, 2)
    return gs.map((x) => ({ en: `${cap(DEMAND_LABEL[x.d].en)}: ${PRACTISE[x.d].en}`, cn: `${DEMAND_LABEL[x.d].cn}：${PRACTISE[x.d].cn}` }))
  }
  const steps: PathStep[] = [{ r: start, stage: 'start', why: { en: `Easy to pick up (skill floor ${start.s.skillFloor}/10) and teaches habits you'll need for ${target.s.name.en}.`, cn: `容易上手（入门难度 ${start.s.skillFloor}/10），能培养玩${target.s.name.cn}所需的习惯。` }, practise: practise(start) }]
  if (bridge && similarity(st, bridge.s, target.s) > 0.2) steps.push({ r: bridge, stage: 'bridge', why: { en: `Shares a lot with ${target.s.name.en} but is more forgiving.`, cn: `与${target.s.name.cn}有很多共通点，但更宽容。` }, practise: practise(bridge) })
  steps.push({ r: targetComfort, stage: 'target', why: { en: `Your strongest long-term fit once the skills are there (ceiling ${target.s.skillCeiling}/10).`, cn: `技术到位后最适合你的长期主玩（上限 ${target.s.skillCeiling}/10）。` }, practise: practise(targetComfort) })
  return steps
}
const DEMAND_KEYS: Demand[] = ['mechanics', 'aim', 'timing', 'reaction', 'mapKnowledge', 'gameSense', 'multitask', 'comms']
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

// ─────────────────────────── team comp ───────────────────────────

export interface Comp { members: Survivor[]; note: Bi }

/** Teammates around a main: synergy links first, then fill missing roles with strong picks at the bracket. */
export function teamComp(main: Survivor, roster: Survivor[], p: Profile): Comp {
  const byId = new Map(roster.map((s) => [s.id, s]))
  const team: Survivor[] = [main]
  const has = (r: Role) => team.some((s) => s.roles.includes(r))
  const syn = (s: Survivor) => (main.synergy.some((x) => x.id === s.id) ? 2 : 0) + (s.synergy.some((x) => x.id === main.id) ? 1.5 : 0)
  while (team.length < 4) {
    let best: Survivor | null = null, bv = -Infinity
    for (const s of roster) {
      if (team.includes(s)) continue
      let v = syn(s) * 2 + s.meta[p.bracket] * 0.8
      for (const r of s.roles) if (!has(r)) v += r === 'Rescue' || r === 'Contain' ? 3 : 2
      if (p.queue === 'solo') v += s.queue.solo * 0.4
      if (v > bv) { bv = v; best = s }
    }
    if (!best) break
    team.push(best)
  }
  const links = main.synergy.filter((x) => byId.has(x.id) && team.some((t) => t.id === x.id))
  return {
    members: team,
    note: links.length
      ? { en: links.map((l) => `${byId.get(l.id)!.name.en}: ${l.reason}`).join(' · '), cn: links.map((l) => `${byId.get(l.id)!.name.cn}：${l.reason}`).join(' · ') }
      : { en: 'Balanced around your pick: kiter, rescuer, and support/decoder.', cn: '围绕你的角色平衡搭配：牵制、救援、辅助/破译。' },
  }
}

// ─────────────────────────── why not ───────────────────────────

/** Survivors with strong playstyle fit that fell out of the top picks, and the main reason. */
export function whyNot(ranked: ScoredSurvivor[], topN: number): { r: ScoredSurvivor; reason: Bi }[] {
  const top = ranked.slice(0, topN)
  const rest = ranked.slice(topN)
  const minTopPlay = Math.min(...top.map((r) => r.breakdown.play))
  return rest
    .filter((r) => r.breakdown.play >= minTopPlay * 0.9 && r.breakdown.play > 0.3)
    .slice(0, 3)
    .map((r) => ({ r, reason: (r.reasons.find((x) => x.w < 0)?.text) ?? { en: 'Close — just edged out by the picks above.', cn: '很接近——只是略逊于上面的选择。' } }))
}
