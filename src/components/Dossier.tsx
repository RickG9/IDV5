import { ThumbsDown, ThumbsUp, X } from 'lucide-react'
import type { Lang, Survivor } from '../types'
import { T } from '../i18n'
import { hunterById, MATRIX, skinsById } from '../data'
import { ROLE_ICON } from './Ornament'
import type { ScoredSurvivor } from '../engine/score'

const host = (u: string) => { try { return new URL(u).hostname.replace('www.', '') } catch { return u.slice(0, 40) } }

export function Roles({ s, lang }: { s: Survivor; lang: Lang }) {
  return (
    <div className="roles">
      {s.roles.map((r) => { const I = ROLE_ICON[r]; return <span key={r} className="role"><I aria-hidden />{T.roles[r][lang]}</span> })}
      <span className="role">{T.difficulty[lang]} {s.officialDifficulty}/3</span>
    </div>
  )
}

export function Meter({ label, v, max = 10, alt }: { label: string; v: number; max?: number; alt?: boolean }) {
  return (
    <div className="meter">
      <span>{label}</span>
      <span className={`bar ${alt ? 'alt' : ''}`}><i style={{ width: `${(v / max) * 100}%` }} /></span>
      <span>{Math.round(v * 10) / 10}</span>
    </div>
  )
}

export function MatchupLists({ s, lang, limit = 6 }: { s: Survivor; lang: Lang; limit?: number }) {
  const row = MATRIX.cells[s.id] ?? {}
  const cells = Object.entries(row).map(([h, c]) => ({ h, ...c }))
  const sortKey = (c: (typeof cells)[number]) => Math.abs(c.rating) + (c.sourced ? 2.5 : 0)
  const good = cells.filter((c) => c.rating > 0).sort((a, b) => sortKey(b) - sortKey(a)).slice(0, limit)
  const bad = cells.filter((c) => c.rating < 0).sort((a, b) => sortKey(b) - sortKey(a)).slice(0, limit)
  const item = (c: (typeof cells)[number], kind: 'good' | 'bad') => (
    <li key={c.h} className={kind}>
      {kind === 'good' ? <ThumbsUp aria-hidden /> : <ThumbsDown aria-hidden />}
      <span><strong>{hunterById[c.h]?.name[lang] ?? c.h}</strong> — {c.reason} {!c.sourced && <em>({T.estimated[lang]})</em>}</span>
    </li>
  )
  return (
    <div className="mu-grid">
      <div><h4>{T.good[lang]}</h4><ul className="mu-list">{good.map((c) => item(c, 'good'))}</ul></div>
      <div><h4>{T.bad[lang]}</h4><ul className="mu-list">{bad.map((c) => item(c, 'bad'))}</ul></div>
    </div>
  )
}

export function SkinsPanel({ id, lang, withNote }: { id: string; lang: Lang; withNote?: boolean }) {
  const sk = skinsById[id]
  if (!sk) return <p className="faint small">{T.noSkins[lang]}</p>
  return (
    <div>
      <p>{sk.summary[lang]}</p>
      <p className="faint small" style={{ marginTop: 6 }}>
        {Object.entries(sk.counts).map(([k, v]) => `${k} ×${v}`).join(' · ')}{sk.total ? ` · ${lang === 'en' ? 'total' : '共'} ${sk.total}` : ''}
      </p>
      <ul className="skins-list">
        {sk.notable.map((n, i) => (
          <li key={i}>
            <span className="tier">{n.tier}</span>
            <span>
              <strong style={{ color: 'var(--ink)' }}>{n.name[lang]}</strong>
              <span className={`rec ${n.reception}`}>{T.receptions[n.reception][lang]}</span>
              {n.server !== 'both' && <span className="rec">{n.server.toUpperCase()}</span>}
              <br />{n.note}{n.obtain && <span className="faint"> · {n.obtain}</span>}
            </span>
          </li>
        ))}
      </ul>
      {withNote && <p className="faint small" style={{ marginTop: 8 }}>{T.skinNote[lang]}</p>}
    </div>
  )
}

export function Dossier({ s, lang, scored, showSkins, onClose }: { s: Survivor; lang: Lang; scored?: ScoredSurvivor; showSkins: boolean; onClose?: () => void }) {
  return (
    <article className="dossier" aria-label={s.name[lang]}>
      <div className="dossier-head">
        <div>
          <h3>{s.name[lang]} <span className="cn" style={{ fontFamily: 'var(--display-cn)', fontSize: '0.4em', color: 'var(--ink-2)' }}>{s.name[lang === 'en' ? 'cn' : 'en']}</span></h3>
          <Roles s={s} lang={lang} />
        </div>
        {onClose && <button className="linkish" onClick={onClose} aria-label="Close"><X /></button>}
      </div>
      {s.provisional && <p className="notice">{T.provisional[lang]}</p>}
      <div className="dossier-cols">
        <div>
          <h4>{T.kit[lang]}</h4>
          <p>{s.kit[lang]}</p>
          {scored && (
            <div style={{ marginTop: 12 }}>
              <Meter label={T.match[lang]} v={scored.score} max={100} />
              <Meter label={T.fit[lang]} v={scored.fit} max={100} />
              <Meter label={T.meta[lang]} v={scored.meta} max={100} alt />
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <Meter label={T.skillFloor[lang]} v={s.skillFloor} alt />
            <Meter label={T.skillCeiling[lang]} v={s.skillCeiling} alt />
          </div>
        </div>
        <div>
          <h4>{T.strengths[lang]}</h4>
          <ul>{s.strengths[lang].map((x, i) => <li key={i}>{x}</li>)}</ul>
          <h4 style={{ marginTop: 12 }}>{T.weaknesses[lang]}</h4>
          <ul>{s.weaknesses[lang].map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
        <div>
          <h4>{T.community[lang]}</h4>
          <p>{s.sentiment[lang]}</p>
          <h4 style={{ marginTop: 12 }}>{T.tips[lang]}</h4>
          <ul>{s.tips[lang].map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
        <MatchupLists s={s} lang={lang} limit={5} />
      </div>
      {s.meta.changes && <p className="faint small" style={{ marginTop: 14 }}><strong>{T.recent[lang]}:</strong> {s.meta.changes}</p>}
      {s.meta.notes && <p className="faint small" style={{ marginTop: 4 }}>{s.meta.notes}</p>}
      {showSkins && (
        <div style={{ marginTop: 18 }}>
          <h4>{T.skins[lang]}</h4>
          <SkinsPanel id={s.id} lang={lang} withNote />
        </div>
      )}
      <p className="sources" style={{ marginTop: 16 }}>
        {T.sources[lang]} ({T.confidence[lang]} {s.confidence}/5): {s.sources.map((u, i) => <span key={u}>{i > 0 && ' · '}<a href={u} target="_blank" rel="noreferrer">{host(u)}</a></span>)}
      </p>
    </article>
  )
}
