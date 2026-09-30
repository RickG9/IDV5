import { useMemo, useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import type { Lang } from '../types'
import type { AnswerValue, GameEntry, Question, StatRow } from '../quiz/questions'
import { LIKERT } from '../quiz/questions'
import { GAMES, LEVELS } from '../quiz/games'
import { SURVIVORS } from '../data'
import { T } from '../i18n'

/** ARIA radiogroup keyboard pattern: one Tab stop, arrows move and select. */
function radioKeys(e: React.KeyboardEvent<HTMLElement>) {
  const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']
  if (!keys.includes(e.key)) return
  const radios = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role=radio]'))
  const i = radios.indexOf(document.activeElement as HTMLButtonElement)
  if (i < 0) return
  e.preventDefault()
  const next = radios[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + radios.length) % radios.length]
  next.focus()
  next.click()
}
const tabStop = (checked: boolean, idx: number, anyChecked: boolean) => (checked || (!anyChecked && idx === 0) ? 0 : -1)

interface Props { q: Question; value: AnswerValue; lang: Lang; onChange: (v: AnswerValue) => void }

export function QuestionView({ q, value, lang, onChange }: Props) {
  const answered = value !== undefined && !(Array.isArray(value) && value.length === 0) && value !== ''
  return (
    <section className="q" data-answered={answered}>
      <fieldset>
        <legend>
          {q.text[lang]}
          {q.optional && <span className="tag">{T.optional[lang]}</span>}
        </legend>
        {q.help && <p className="help">{q.help[lang]}</p>}
        {q.kind === 'single' && <Single q={q} value={value as string} lang={lang} onChange={onChange} />}
        {q.kind === 'multi' && <Multi q={q} value={(value as string[]) ?? []} lang={lang} onChange={onChange} />}
        {q.kind === 'likert' && <Scale labels={LIKERT.map((l) => l[lang])} value={value as number} onChange={onChange} />}
        {q.kind === 'rate' && (
          <>
            <Scale rate labels={['1', '2', '3', '4', '5']} value={value as number} onChange={onChange} />
            {q.anchors && <div className="anchors"><span>{q.anchors[0][lang]}</span><span>{q.anchors[1][lang]}</span></div>}
          </>
        )}
        {q.kind === 'survivors' && <SurvivorPicker value={(value as string[]) ?? []} lang={lang} onChange={onChange} />}
        {q.kind === 'stats' && <StatsTable value={(value as StatRow[]) ?? []} lang={lang} onChange={onChange} />}
        {q.kind === 'games' && <GamesPicker value={(value as GameEntry[]) ?? []} lang={lang} onChange={onChange} />}
        {q.kind === 'text' && (
          <textarea className="field" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} maxLength={1500}
            placeholder={lang === 'en' ? 'e.g. I used to main Rein in Overwatch, I like being the anchor…' : '例如：我以前在守望先锋主玩莱因哈特，喜欢当团队支柱……'} />
        )}
      </fieldset>
    </section>
  )
}

function Single({ q, value, lang, onChange }: { q: Question; value?: string; lang: Lang; onChange: (v: AnswerValue) => void }) {
  return (
    <div className={`opts ${q.options!.length > 4 ? 'cols' : ''}`} role="radiogroup" onKeyDown={radioKeys}>
      {q.options!.map((o, i) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} tabIndex={tabStop(value === o.id, i, value !== undefined)} className="opt"
          onClick={() => onChange(value === o.id ? undefined : o.id)}>
          <span className="mark" aria-hidden>{value === o.id && <Check />}</span>
          <span>{o.label[lang]}{o.hint && <span className="hint">{o.hint[lang]}</span>}</span>
        </button>
      ))}
    </div>
  )
}

function Multi({ q, value, lang, onChange }: { q: Question; value: string[]; lang: Lang; onChange: (v: AnswerValue) => void }) {
  const full = q.max !== undefined && value.length >= q.max
  return (
    <>
      {q.max && <p className="help">{T.pickUpTo[lang]} {q.max}</p>}
      <div className={`opts ${q.options!.length > 4 ? 'cols' : ''}`}>
        {q.options!.map((o) => {
          const on = value.includes(o.id)
          return (
            <button key={o.id} type="button" role="checkbox" aria-checked={on} className="opt" disabled={!on && full}
              onClick={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])}>
              <span className="mark" aria-hidden>{on && <Check />}</span>
              <span>{o.label[lang]}{o.hint && <span className="hint">{o.hint[lang]}</span>}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

function Scale({ labels, value, onChange, rate }: { labels: string[]; value?: number; onChange: (v: AnswerValue) => void; rate?: boolean }) {
  return (
    <div className={`scale ${rate ? 'rate' : ''}`} role="radiogroup" onKeyDown={radioKeys}>
      {labels.map((l, i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i + 1} tabIndex={tabStop(value === i + 1, i, value !== undefined)}
          onClick={() => onChange(value === i + 1 ? undefined : i + 1)}>{l}</button>
      ))}
    </div>
  )
}

function SurvivorPicker({ value, lang, onChange }: { value: string[]; lang: Lang; onChange: (v: AnswerValue) => void }) {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const n = q.trim().toLowerCase()
    return SURVIVORS.filter((s) => !n || s.name.en.toLowerCase().includes(n) || s.name.cn.includes(n))
  }, [q])
  return (
    <>
      <input className="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={lang === 'en' ? 'Search survivors…' : '搜索求生者……'} aria-label="Search survivors" />
      <div className="chips">
        {list.map((s) => {
          const on = value.includes(s.id)
          return (
            <button key={s.id} type="button" className="chip" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== s.id) : [...value, s.id])}>
              {s.name[lang]}
            </button>
          )
        })}
      </div>
    </>
  )
}

const numOrUndef = (v: string) => (v === '' ? undefined : Math.max(0, Number(v)))

function StatsTable({ value, lang, onChange }: { value: StatRow[]; lang: Lang; onChange: (v: AnswerValue) => void }) {
  const set = (i: number, patch: Partial<StatRow>) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const cols: { k: keyof StatRow; en: string; cn: string; max: number }[] = [
    { k: 'games', en: 'Games', cn: '场次', max: 99999 },
    { k: 'winRate', en: 'Win / escape %', cn: '胜率/逃脱率 %', max: 100 },
    { k: 'kiteTime', en: 'Avg contain (s)', cn: '平均牵制(秒)', max: 600 },
    { k: 'decode', en: 'Avg decode %', cn: '平均破译 %', max: 500 },
    { k: 'rescues', en: 'Rescues / game', cn: '场均救人', max: 10 },
  ]
  return (
    <>
      <div className="table-wrap">
        <table className="stats-table">
          <thead>
            <tr>
              <th>{lang === 'en' ? 'Survivor' : '求生者'}</th>
              {cols.map((c) => <th key={c.k}>{c[lang]}</th>)}
              <th><span className="visually-hidden">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {value.map((r, i) => (
              <tr key={i}>
                <td>
                  <select value={r.id} onChange={(e) => set(i, { id: e.target.value })} aria-label="Survivor">
                    {SURVIVORS.map((s) => <option key={s.id} value={s.id}>{s.name[lang]}</option>)}
                  </select>
                </td>
                {cols.map((c) => (
                  <td key={c.k}>
                    <input type="number" inputMode="decimal" min={0} max={c.max} value={(r[c.k] as number | undefined) ?? ''} aria-label={c[lang]}
                      onChange={(e) => set(i, { [c.k]: numOrUndef(e.target.value) } as Partial<StatRow>)} />
                  </td>
                ))}
                <td><button type="button" className="linkish" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove row"><Trash2 /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row-actions">
        <button type="button" className="btn" onClick={() => onChange([...value, { id: SURVIVORS[0].id }])}><Plus aria-hidden />{lang === 'en' ? 'Add a survivor' : '添加求生者'}</button>
      </div>
    </>
  )
}

function GamesPicker({ value, lang, onChange }: { value: GameEntry[]; lang: Lang; onChange: (v: AnswerValue) => void }) {
  const byId = new Map(value.map((g) => [g.id, g]))
  const toggle = (id: string) => onChange(byId.has(id) ? value.filter((g) => g.id !== id) : [...value, { id, level: 2 }])
  const patch = (id: string, p: Partial<GameEntry>) => onChange(value.map((g) => (g.id === id ? { ...g, ...p } : g)))
  return (
    <div className="opts">
      {GAMES.map((g) => {
        const on = byId.get(g.id)
        return (
          <div key={g.id}>
            <button type="button" role="checkbox" aria-checked={!!on} className="opt" style={{ width: '100%' }} onClick={() => toggle(g.id)}>
              <span className="mark" aria-hidden>{on && <Check />}</span>
              <span>{g.name[lang]} <span className="hint" style={{ display: 'inline' }}>· {g.genre[lang]}</span></span>
            </button>
            {on && (
              <div className="row-actions" style={{ marginLeft: 28 }}>
                <select className="field" style={{ width: 'auto' }} value={on.level} onChange={(e) => patch(g.id, { level: Number(e.target.value) as GameEntry['level'] })} aria-label="Level">
                  {LEVELS.map((l, i) => <option key={i} value={i + 1}>{l[lang]}</option>)}
                </select>
                {g.roles && (
                  <select className="field" style={{ width: 'auto' }} value={on.role ?? ''} onChange={(e) => patch(g.id, { role: e.target.value || undefined })} aria-label="Role">
                    <option value="">{lang === 'en' ? 'Main role (optional)' : '主玩位置（可选）'}</option>
                    {g.roles.map((r) => <option key={r.id} value={r.id}>{r.label[lang]}</option>)}
                  </select>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
