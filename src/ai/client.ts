import type { AiConfig } from '../state'
import type { AiAdjust, Profile } from '../engine/profile'
import type { ScoredSurvivor } from '../engine/score'
import { DEMANDS, KITE_STYLES, TRAITS } from '../types'
import type { Lang } from '../types'

type Msg = { role: 'system' | 'user' | 'assistant'; content: string }

let sessionId = ''
function session() {
  if (!sessionId) sessionId = 'manor-casebook-' + Math.random().toString(36).slice(2, 12)
  return sessionId
}

/** OpenAI-compatible chat call, optionally through the pass-through relay (see /worker). */
export async function chat(cfg: AiConfig, messages: Msg[], opts: { json?: boolean; maxTokens?: number } = {}): Promise<string> {
  if (!cfg.key) throw new Error('No API key set.')
  const base = cfg.baseUrl.replace(/\/+$/, '')
  const url = cfg.relay ? cfg.relay.replace(/\/+$/, '') + '/v1/chat/completions' : base + '/chat/completions'
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cfg.key}`,
    'x-opencode-session': session(), // required by OpenCode Go, ignored elsewhere
  }
  if (cfg.relay) headers['x-target-base'] = base
  const body: Record<string, unknown> = { model: cfg.model, messages, max_tokens: opts.maxTokens ?? 1600, temperature: 0.4 }
  if (opts.json) body.response_format = { type: 'json_object' }
  let res: Response
  try {
    res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  } catch {
    throw new Error(cfg.relay
      ? 'Could not reach the relay. Check the relay URL.'
      : 'The browser blocked the request (CORS). This provider needs the relay — see Settings.')
  }
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`)
  const data = JSON.parse(text)
  return data.choices?.[0]?.message?.content ?? ''
}

function extractJson(s: string) {
  const i = s.indexOf('{'), j = s.lastIndexOf('}')
  return JSON.parse(s.slice(i, j + 1))
}

/** Turn free-text background into bounded, typed nudges for the deterministic engine. */
export async function interpretFreeText(cfg: AiConfig, text: string): Promise<AiAdjust> {
  const sys = `You convert a gamer's free-text description into small adjustments for an Identity V survivor recommender.
Return ONLY JSON: {"desire": {trait: number}, "kite": {style: number}, "ability": {skill: number}, "summary": "one sentence"}
- desire traits (-0.5..0.5, what they want to do): ${TRAITS.join(', ')}
- kite styles (-0.5..0.5, how they like to survive chases): ${KITE_STYLES.join(', ')}
- ability skills (0..10 estimate, only if the text gives evidence): ${DEMANDS.join(', ')}
Only include keys the text clearly supports. Identity V map knowledge and game sense only come from Identity V experience; do not inflate them from other games.`
  const out = await chat(cfg, [{ role: 'system', content: sys }, { role: 'user', content: text.slice(0, 1500) }], { json: true, maxTokens: 600 })
  const j = extractJson(out)
  const pick = (o: unknown, keys: readonly string[]) =>
    Object.fromEntries(Object.entries((o as Record<string, number>) ?? {}).filter(([k, v]) => keys.includes(k) && typeof v === 'number'))
  return { desire: pick(j.desire, TRAITS), kite: pick(j.kite, KITE_STYLES), ability: pick(j.ability, DEMANDS), summary: String(j.summary ?? '') }
}

/** A personal write-up grounded strictly in the computed result. */
export async function narrate(cfg: AiConfig, lang: Lang, p: Profile, ranked: ScoredSurvivor[]): Promise<string> {
  const top = ranked.slice(0, 5).map((r) => ({
    name: r.s.name[lang], score: Math.round(r.score), fit: Math.round(r.fit), meta: Math.round(r.meta),
    reasons: r.reasons.slice(0, 5).map((x) => x.text[lang]),
    kit: r.s.kit[lang], tips: r.s.tips[lang].slice(0, 2),
  }))
  const profile = {
    queue: p.queue, mode: p.mode, bracket: p.bracket, newPlayer: p.isNew,
    wants: Object.entries(p.desire).filter(([, v]) => v > 0.3).map(([k]) => k),
    avoids: Object.entries(p.desire).filter(([, v]) => v < -0.3).map(([k]) => k),
    abilities: Object.fromEntries(Object.entries(p.ability).map(([k, v]) => [k, Math.round(v * 10) / 10])),
  }
  const sys = lang === 'cn'
    ? '你是第五人格求生者推荐工具"庄园档案"的解说员。只根据给定数据写作，不要编造数值或机制。用简体中文，约 250 字，语气像一位懂行的老玩家朋友：说明为什么头牌最适合，其他角色各自的定位，以及接下来练什么。'
    : 'You are the narrator of "Manor Casebook", an Identity V survivor recommender. Write ONLY from the given data; never invent numbers or mechanics. About 220 words, like a knowledgeable friend who plays the game: why the headliner fits best, what role the others play, and what to practise next.'
  return chat(cfg, [{ role: 'system', content: sys }, { role: 'user', content: JSON.stringify({ profile, top }) }], { maxTokens: 900 })
}
