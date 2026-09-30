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

/** Muse Spark, GPT and Grok models on OpenCode Go speak the OpenAI Responses API; the rest speak chat completions. */
export function usesResponsesApi(cfg: AiConfig) {
  if (cfg.api === 'responses') return true
  if (cfg.api === 'chat') return false
  return /^(muse-spark|gpt-|grok)/i.test(cfg.model)
}

/**
 * OpenAI-compatible call (chat completions or Responses API), optionally through the
 * pass-through relay (see /worker). Streams so long reasoning never hits an idle timeout;
 * `onDelta` receives text as it arrives.
 */
export async function chat(cfg: AiConfig, messages: Msg[], opts: { json?: boolean; maxTokens?: number; onDelta?: (text: string) => void } = {}): Promise<string> {
  if (!cfg.key) throw new Error('No API key set.')
  const responses = usesResponsesApi(cfg)
  const path = responses ? '/responses' : '/chat/completions'
  const base = cfg.baseUrl.replace(/\/+$/, '')
  const url = cfg.relay ? cfg.relay.replace(/\/+$/, '') + '/v1' + path : base + path
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cfg.key}`,
    'x-opencode-session': session(), // required by OpenCode Go, ignored elsewhere
  }
  if (cfg.relay) headers['x-target-base'] = base

  let body: Record<string, unknown>
  if (responses) {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n')
    body = {
      model: cfg.model,
      instructions: system || undefined,
      input: messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content })),
      reasoning: { effort: cfg.effort },
      stream: true,
    }
    if (opts.json) body.text = { format: { type: 'json_object' } }
  } else {
    body = { model: cfg.model, messages, max_tokens: opts.maxTokens ?? 4000, temperature: 0.4, stream: true }
    if (opts.json) body.response_format = { type: 'json_object' }
  }

  let res: Response
  try {
    res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  } catch {
    throw new Error(cfg.relay
      ? 'Could not reach the relay. Check the relay URL in Settings.'
      : 'The browser blocked the request (CORS). This provider needs the relay — see Settings.')
  }
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)

  // Server-sent events: collect text deltas from either API shape.
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = '', text = '', finalText = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let nl
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (!data || data === '[DONE]') continue
      let ev: Record<string, unknown>
      try { ev = JSON.parse(data) } catch { continue }
      let delta = ''
      if (responses) {
        if (ev.type === 'response.output_text.delta') delta = String(ev.delta ?? '')
        else if (ev.type === 'response.completed') finalText = outputText(ev.response)
        else if (ev.type === 'error' || ev.type === 'response.failed') throw new Error(JSON.stringify(ev).slice(0, 300))
      } else {
        const ch = (ev.choices as { delta?: { content?: string } }[] | undefined)?.[0]
        delta = ch?.delta?.content ?? ''
      }
      if (delta) { text += delta; opts.onDelta?.(text) }
    }
  }
  return text || finalText
}

function outputText(r: unknown): string {
  const out = (r as { output?: { type: string; content?: { text?: string }[] }[] })?.output ?? []
  return out.filter((o) => o.type === 'message').flatMap((o) => o.content ?? []).map((c) => c.text ?? '').join('')
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
  const out = await chat(cfg, [{ role: 'system', content: sys }, { role: 'user', content: text.slice(0, 1500) }], { json: true, maxTokens: 800 })
  const j = extractJson(out)
  const pick = (o: unknown, keys: readonly string[]) =>
    Object.fromEntries(Object.entries((o as Record<string, number>) ?? {}).filter(([k, v]) => keys.includes(k) && typeof v === 'number'))
  return { desire: pick(j.desire, TRAITS), kite: pick(j.kite, KITE_STYLES), ability: pick(j.ability, DEMANDS), summary: String(j.summary ?? '') }
}

/** A personal write-up grounded strictly in the computed result. */
export async function narrate(cfg: AiConfig, lang: Lang, p: Profile, ranked: ScoredSurvivor[], onDelta?: (t: string) => void): Promise<string> {
  const top = ranked.slice(0, 5).map((r) => ({
    name: r.s.name[lang], score: Math.round(r.score), fit: Math.round(r.fit), meta: Math.round(r.meta),
    reasons: r.reasons.slice(0, 5).map((x) => x.text[lang]),
    kit: r.s.kit[lang], tips: r.s.tips[lang].slice(0, 2), community: r.s.sentiment[lang],
  }))
  const profile = {
    queue: p.queue, mode: p.mode, bracket: p.bracket, newPlayer: p.isNew,
    wants: Object.entries(p.desire).filter(([, v]) => v > 0.3).map(([k]) => k),
    avoids: Object.entries(p.desire).filter(([, v]) => v < -0.3).map(([k]) => k),
    abilities: Object.fromEntries(Object.entries(p.ability).map(([k, v]) => [k, Math.round(v * 10) / 10])),
  }
  const sys = lang === 'cn'
    ? '你是第五人格求生者推荐工具"庄园档案"的解说员。只根据给定数据写作，不要编造数值或机制。用简体中文，约 250 字，语气像一位懂行的老玩家朋友：说明为什么头牌最适合，其他角色各自的定位，以及接下来练什么。不要使用 Markdown 标题。'
    : 'You are the narrator of "Manor Casebook", an Identity V survivor recommender. Write ONLY from the given data; never invent numbers or mechanics. About 220 words, like a knowledgeable friend who plays the game: why the headliner fits best, what role the others play, and what to practise next. No Markdown headings.'
  return chat(cfg, [{ role: 'system', content: sys }, { role: 'user', content: JSON.stringify({ profile, top }) }], { maxTokens: 1200, onDelta })
}
