import { useState } from 'react'
import type { Lang } from '../types'
import type { AiConfig } from '../state'
import { AI_PRESETS } from '../state'
import { T } from '../i18n'
import { chat } from '../ai/client'

export function Settings({ lang, ai, onChange }: { lang: Lang; ai: AiConfig; onChange: (a: AiConfig) => void }) {
  const [status, setStatus] = useState('')
  const preset = AI_PRESETS[ai.provider]
  const test = async () => {
    setStatus('…')
    try {
      const out = await chat({ ...ai, effort: 'low' }, [{ role: 'user', content: 'Reply with exactly: OK' }], { maxTokens: 20 })
      setStatus(`✓ ${out.trim().slice(0, 60)}`)
    } catch (e) { setStatus((e as Error).message) }
  }
  return (
    <div className="settings">
      <header className="act-head"><h2 className="display">{T.aiTitle[lang]}</h2><p>{T.aiIntro[lang]}</p></header>
      <label>{lang === 'en' ? 'Provider' : '服务商'}
        <select className="field" value={ai.provider} onChange={(e) => { const p = e.target.value as AiConfig['provider']; onChange({ ...ai, provider: p, baseUrl: AI_PRESETS[p].baseUrl || ai.baseUrl, model: AI_PRESETS[p].model || ai.model, api: 'auto' }) }}>
          <option value="opencode-go">OpenCode Go (Muse Spark, DeepSeek, GLM, Kimi…)</option>
          <option value="deepseek">DeepSeek</option>
          <option value="openrouter">OpenRouter</option>
          <option value="custom">{lang === 'en' ? 'Custom OpenAI-compatible' : '自定义（OpenAI 兼容）'}</option>
        </select>
      </label>
      <label>{lang === 'en' ? 'API key (stored only in this browser)' : 'API 密钥（仅保存在本浏览器）'}
        <input className="field" type="password" autoComplete="off" value={ai.key} onChange={(e) => onChange({ ...ai, key: e.target.value.trim() })} placeholder="sk-…" />
      </label>
      <label>{lang === 'en' ? 'Model' : '模型'}
        <input className="field" value={ai.model} onChange={(e) => onChange({ ...ai, model: e.target.value.trim() })} placeholder="muse-spark-1.3-contributor" list="model-list" />
        <datalist id="model-list">
          <option value="muse-spark-1.3-contributor" />
          <option value="deepseek-v4-pro" />
          <option value="deepseek-v4-flash" />
          <option value="glm-5.3" />
          <option value="kimi-k3" />
        </datalist>
      </label>
      <div className="row-actions" style={{ marginTop: 0 }}>
        <label style={{ flex: 1 }}>{lang === 'en' ? 'Reasoning effort' : '推理强度'}
          <select className="field" value={ai.effort} onChange={(e) => onChange({ ...ai, effort: e.target.value as AiConfig['effort'] })}>
            <option value="xhigh">{lang === 'en' ? 'Extra high (best, slowest)' : '极高（最好，最慢）'}</option>
            <option value="high">{lang === 'en' ? 'High' : '高'}</option>
            <option value="medium">{lang === 'en' ? 'Medium' : '中'}</option>
            <option value="low">{lang === 'en' ? 'Low (fastest)' : '低（最快）'}</option>
          </select>
        </label>
        <label style={{ flex: 1 }}>{lang === 'en' ? 'API style' : '接口类型'}
          <select className="field" value={ai.api} onChange={(e) => onChange({ ...ai, api: e.target.value as AiConfig['api'] })}>
            <option value="auto">{lang === 'en' ? 'Automatic' : '自动'}</option>
            <option value="responses">Responses API</option>
            <option value="chat">Chat completions</option>
          </select>
        </label>
      </div>
      <label>{lang === 'en' ? 'Base URL' : '接口地址'}
        <input className="field" value={ai.baseUrl} onChange={(e) => onChange({ ...ai, baseUrl: e.target.value.trim() })} />
      </label>
      <label>{lang === 'en' ? 'Relay URL' : '中转地址'}{preset.needsRelay ? (lang === 'en' ? ' (required for OpenCode Go)' : '（OpenCode Go 必填）') : ''}
        <input className="field" value={ai.relay} onChange={(e) => onChange({ ...ai, relay: e.target.value.trim() })} placeholder="https://manor-relay.<you>.workers.dev" />
      </label>
      <p className="faint small">
        {lang === 'en'
          ? 'OpenCode Go does not allow direct browser calls, so requests go through a tiny pass-through relay you deploy once (free Cloudflare Worker, code in /worker in the repo). The relay never stores your key. When running locally with `npm run dev`, use relay URL "/relay" instead.'
          : 'OpenCode Go 不允许浏览器直接调用，因此请求需经过一个你自行部署的中转（免费的 Cloudflare Worker，代码在仓库 /worker 中）。中转不会保存你的密钥。本地运行 `npm run dev` 时，中转地址填 "/relay"。'}
      </p>
      <div className="row-actions">
        <button className="btn primary" onClick={test} disabled={!ai.key}>{lang === 'en' ? 'Test connection' : '测试连接'}</button>
        <button className="btn" onClick={() => onChange({ ...ai, key: '' })}>{lang === 'en' ? 'Forget key' : '清除密钥'}</button>
        {status && <span className="muted small" role="status">{status}</span>}
      </div>
    </div>
  )
}
