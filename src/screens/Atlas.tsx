import { useMemo, useState } from 'react'
import type { Lang, Role } from '../types'
import { HUNTERS, MATRIX, SURVIVORS } from '../data'
import { T } from '../i18n'
import { Dossier, Roles } from '../components/Dossier'

const ROLES: Role[] = ['Contain', 'Rescue', 'Assist', 'Decode']

export function Atlas({ lang }: { lang: Lang }) {
  const [q, setQ] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [sort, setSort] = useState<'release' | 'name' | 'floor' | 'meta'>('release')
  const [open, setOpen] = useState<string | null>(null)
  const list = useMemo(() => {
    const n = q.trim().toLowerCase()
    const xs = SURVIVORS.filter((s) => (!role || s.roles.includes(role)) && (!n || s.name.en.toLowerCase().includes(n) || s.name.cn.includes(n)))
    const by = { release: () => 0, name: (a: typeof xs[0], b: typeof xs[0]) => a.name[lang].localeCompare(b.name[lang]), floor: (a: typeof xs[0], b: typeof xs[0]) => a.skillFloor - b.skillFloor, meta: (a: typeof xs[0], b: typeof xs[0]) => b.meta.high - a.meta.high }[sort]
    return sort === 'release' ? xs : [...xs].sort(by)
  }, [q, role, sort, lang])
  const openS = SURVIVORS.find((s) => s.id === open)
  return (
    <div>
      <header className="act-head"><h2 className="display">{T.roster[lang]}</h2><p>{SURVIVORS.length} {T.survivors[lang]}</p></header>
      <div className="atlas-tools">
        <input className="search" style={{ maxWidth: 280, marginTop: 0 }} type="search" placeholder={lang === 'en' ? 'Search…' : '搜索……'} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        <div className="chips" style={{ marginTop: 0 }}>
          <button className="chip" aria-pressed={role === ''} onClick={() => setRole('')}>{lang === 'en' ? 'All' : '全部'}</button>
          {ROLES.map((r) => <button key={r} className="chip" aria-pressed={role === r} onClick={() => setRole(r)}>{T.roles[r][lang]}</button>)}
        </div>
        <select className="field" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort">
          <option value="release">{lang === 'en' ? 'Release order' : '上线顺序'}</option>
          <option value="name">{lang === 'en' ? 'Name' : '名称'}</option>
          <option value="floor">{lang === 'en' ? 'Easiest first' : '由易到难'}</option>
          <option value="meta">{lang === 'en' ? 'Strongest at high rank' : '高分段强度'}</option>
        </select>
      </div>
      {openS && <Dossier s={openS} lang={lang} showSkins onClose={() => setOpen(null)} />}
      <div className="atlas">
        {list.map((s) => (
          <button key={s.id} onClick={() => { setOpen(open === s.id ? null : s.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }} aria-expanded={open === s.id}>
            <span className="nm">{s.name[lang]}</span>
            <span className="cn">{s.name[lang === 'en' ? 'cn' : 'en']}</span>
            <Roles s={s} lang={lang} />
          </button>
        ))}
      </div>
    </div>
  )
}

export function Matrix({ lang }: { lang: Lang }) {
  const [hover, setHover] = useState('')
  return (
    <div>
      <header className="act-head">
        <h2 className="display">{T.matrix[lang]}</h2>
        <p>{lang === 'en' ? 'Every survivor against every hunter. Solid cells are community-sourced; faded cells are estimated from kit mechanics.' : '每名求生者对每名监管者。实色为社区来源，淡色为根据技能机制推算。'}</p>
      </header>
      <div className="legend">
        <span><i style={{ background: 'color-mix(in srgb, var(--good) 70%, transparent)' }} />{lang === 'en' ? 'Strong' : '强势'}</span>
        <span><i style={{ background: 'color-mix(in srgb, var(--good) 32%, transparent)' }} />{lang === 'en' ? 'Favoured' : '占优'}</span>
        <span><i style={{ background: 'color-mix(in srgb, var(--bad) 32%, transparent)' }} />{lang === 'en' ? 'Unfavoured' : '劣势'}</span>
        <span><i style={{ background: 'color-mix(in srgb, var(--bad) 70%, transparent)' }} />{lang === 'en' ? 'Hard counter' : '被克制'}</span>
      </div>
      <p className="muted small" aria-live="polite" style={{ minHeight: '2.6em' }}>{hover}</p>
      <div className="matrix-wrap">
        <table className="matrix">
          <thead>
            <tr><th scope="col"><span className="visually-hidden">Survivor</span></th>{HUNTERS.map((h) => <th key={h.id} scope="col">{h.name[lang]}</th>)}</tr>
          </thead>
          <tbody>
            {SURVIVORS.map((s) => (
              <tr key={s.id}>
                <th scope="row">{s.name[lang]}</th>
                {HUNTERS.map((h) => {
                  const c = MATRIX.cells[s.id]?.[h.id]
                  const sym = !c || c.rating === 0 ? '' : c.rating > 0 ? '+'.repeat(c.rating) : '−'.repeat(-c.rating)
                  const label = `${s.name[lang]} vs ${h.name[lang]}: ${c?.reason ?? ''}${c && !c.sourced ? ` (${T.estimated[lang]})` : ''}`
                  return (
                    <td key={h.id} data-r={c?.rating ?? 0} data-s={String(c?.sourced ?? false)} title={label} aria-label={label}
                      onMouseEnter={() => setHover(label)} onClick={() => setHover(label)}>{sym}</td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
