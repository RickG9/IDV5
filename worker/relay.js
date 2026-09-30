/**
 * Manor Casebook AI relay — a pass-through Cloudflare Worker.
 *
 * Why: OpenCode Go (and some other providers) don't allow direct browser calls (no CORS),
 * and OpenCode Go wants a custom User-Agent, which browsers can't set.
 * The relay forwards the request unchanged, adds CORS + User-Agent, and stores nothing:
 * each user's API key travels in their own request and is never logged or kept.
 *
 * Deploy (free): `npx wrangler deploy` from this folder, then paste the workers.dev URL
 * into Manor Casebook → Settings → Relay URL.
 */

// Only these upstreams may be reached through the relay.
const ALLOWED = [
  'https://opencode.ai/zen/go/v1',
  'https://opencode.ai/zen/v1',
  'https://api.deepseek.com/v1',
  'https://api.deepseek.com',
  'https://openrouter.ai/api/v1',
  'https://dashscope.aliyuncs.com/compatible-mode/v1',
  'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
]

// Optionally restrict which sites may use the relay (comma-separated origins in the ORIGINS env var).
function corsHeaders(origin, env) {
  const allowed = (env.ORIGINS || '*').split(',').map((s) => s.trim())
  const allow = allowed.includes('*') || allowed.includes(origin) ? origin || '*' : allowed[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-target-base, x-opencode-session',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const cors = corsHeaders(origin, env)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    const url = new URL(request.url)
    // Chat-completions models (DeepSeek, GLM, Kimi…) and Responses-API models (Muse Spark, GPT, Grok).
    const PATHS = { '/v1/chat/completions': '/chat/completions', '/v1/responses': '/responses' }
    const suffix = PATHS[url.pathname]
    if (request.method !== 'POST' || !suffix) {
      return new Response('Manor Casebook relay: POST /v1/chat/completions or /v1/responses only.', { status: 404, headers: cors })
    }
    const base = (request.headers.get('x-target-base') || '').replace(/\/+$/, '')
    if (!ALLOWED.includes(base)) {
      return new Response(JSON.stringify({ error: `Upstream not allowed: ${base}` }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    const headers = new Headers({
      'Content-Type': 'application/json',
      Authorization: request.headers.get('Authorization') || '',
      'User-Agent': 'manor-casebook/1.0',
    })
    const session = request.headers.get('x-opencode-session')
    if (session) headers.set('x-opencode-session', session)
    // The response body is streamed straight back, so long reasoning never idles out.
    const upstream = await fetch(base + suffix, { method: 'POST', headers, body: await request.text() })
    const out = new Headers(cors)
    out.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json')
    out.set('Cache-Control', 'no-store')
    return new Response(upstream.body, { status: upstream.status, headers: out })
  },
}
