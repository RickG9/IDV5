import { useMemo, useRef, useState } from 'react'
import { Download, Pencil, Sparkles } from 'lucide-react'
import { toPng } from 'html-to-image'
import type { Lang } from '../types'
import type { AppState } from '../state'
import type { Profile } from '../engine/profile'
import { buildProfile } from '../engine/profile'
import { rankAll } from '../engine/score'
import type { ScoredSurvivor } from '../engine/score'
import { buildPool, learningPath, teamComp, whyNot } from '../engine/plan'
import { DATA_AS_OF, MATRIX, STATS, SURVIVORS } from '../data'
import { T } from '../i18n'
import { Rule } from '../components/Ornament'
import { Dossier, MatchupLists, Meter, Roles, SkinsPanel } from '../components/Dossier'
import { narrate } from '../ai/client'

const QUEUE_LABEL = { solo: { en: 'solo-queue', cn: '野排' }, duo: { en: 'duo', cn: '双排' }, premade: { en: 'premade', cn: '开黑' } }
const BRACKET_LABEL = { low: { en: 'Tier I–IV', cn: '一至四阶' }, mid: { en: 'Tier V–VI', cn: '五至六阶' }, high: { en: 'Tier VII+', cn: '七阶及以上' }, pro: { en: 'competitive', cn: '比赛' } }

export function Verdict({ st, set, lang }: { st: AppState; set: (p: Partial<AppState>) => void; lang: Lang }) {
  const profile: Profile = useMemo(() => buildProfile(st.answers, st.trials, {
    challenge: st.challenge, ownedOnly: st.ownedOnly, useVibe: st.useVibe, metaWeight: st.metaWeight ?? undefined,
  }, st.aiAdjust), [st.answers, st.trials, st.challenge, st.ownedOnly, st.useVibe, st.metaWeight, st.aiAdjust])
  const ranked = useMemo(() => rankAll(profile, SURVIVORS, STATS), [profile])
  const goals = new Set(profile.goals)
  const [open, setOpen] = useState<string | null>(null)
  const [aiText, setAiText] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiErr, setAiErr] = useState('')
  const billRef = useRef<HTMLDivElement>(null)

  const headliner = ranked[0]
  const support = ranked.slice(1, 6)
  const pool = useMemo(() => goals.has('pool') ? buildPool(ranked, STATS, MATRIX, profile.bracket === 'high' || profile.bracket === 'pro' ? 4 : 3) : [], [ranked])
  const path = useMemo(() => goals.has('path') ? learningPath(profile, SURVIVORS, STATS) : [], [profile])
  const comp = useMemo(() => goals.has('team') && headliner ? teamComp(headliner.s, SURVIVORS, profile) : null, [headliner, profile])
  const near = useMemo(() => whyNot(ranked, 6), [ranked])

  if (!headliner) return <p className="center muted">{lang === 'en' ? 'No survivors match the current filters.' : '没有符合当前筛选的求生者。'}</p>

  const topScore = headliner.score
  // Billing scale follows fit, but a name must never break mid-word on a narrow screen.
  const longestWord = (r: ScoredSurvivor) => Math.max(...r.s.name[lang].split(/\s+/).map((w) => (lang === 'cn' ? w.length * 1.7 : w.length)))
  const fitVw = (r: ScoredSurvivor) => (84 / (longestWord(r) * 0.62)).toFixed(2)
  const sizeFor = (r: ScoredSurvivor, base: number) => `min(${Math.max(1.5, base * Math.pow(r.score / topScore, 2.2)).toFixed(2)}rem, ${fitVw(r)}vw)`
  const metaPct = Math.round((st.metaWeight ?? profile.metaWeight) * 100)

  const exportPng = async () => {
    if (!billRef.current) return
    const bg = getComputedStyle(document.body).backgroundColor
    const url = await toPng(billRef.current, { pixelRatio: 2, backgroundColor: bg, cacheBust: true })
    const a = document.createElement('a')
    a.href = url
    a.download = `manor-casebook-${headliner.s.id}.png`
    a.click()
  }
  const askAi = async () => {
    setAiBusy(true); setAiErr('')
    try { setAiText(await narrate(st.ai, lang, profile, ranked)) } catch (e) { setAiErr((e as Error).message) } finally { setAiBusy(false) }
  }

  const pos = headliner.reasons.filter((r) => r.w > 0).slice(0, 4)
  const neg = headliner.reasons.filter((r) => r.w < 0).slice(0, 1)

  return (
    <div>
      <div className="bill-frame" ref={billRef}>
        <div className="bill">
          <div className="billing">
            <button onClick={() => setOpen(open === headliner.s.id ? null : headliner.s.id)} aria-expanded={open === headliner.s.id}>
              <span className="bill-name" style={{ fontSize: `min(9.5rem, ${fitVw(headliner)}vw)` }}>{headliner.s.name[lang]}</span>
              <span className="bill-cn" style={{ fontSize: 'clamp(1rem, 3vw, 1.6rem)' }}>{headliner.s.name[lang === 'en' ? 'cn' : 'en']}</span>
              <span className="bill-score">{Math.round(headliner.score)} {T.match[lang]} · {T.fit[lang]} {Math.round(headliner.fit)} · {T.meta[lang]} {Math.round(headliner.meta)}</span>
            </button>
          </div>
          <ul className="reasons">
            {pos.map((r, i) => <li key={i}>{r.text[lang]}</li>)}
            {neg.map((r, i) => <li key={`n${i}`} className="neg">{r.text[lang]}</li>)}
          </ul>
          <Rule />
          <div className="bill-with">{T.with[lang]}</div>
          <div className="billing">
            {support.map((r) => (
              <button key={r.s.id} onClick={() => setOpen(open === r.s.id ? null : r.s.id)} aria-expanded={open === r.s.id}>
                <span className="bill-name" style={{ fontSize: sizeFor(r, 4.6) }}>{r.s.name[lang]}</span>
                <span className="bill-score">{Math.round(r.score)} {T.match[lang]}</span>
              </button>
            ))}
          </div>
          <div className="bill-foot">
            <span>{lang === 'en' ? `Billed for a ${QUEUE_LABEL[profile.queue].en} ${BRACKET_LABEL[profile.bracket].en} player` : `为${BRACKET_LABEL[profile.bracket].cn}${QUEUE_LABEL[profile.queue].cn}玩家推荐`}</span>
            <span>{T.fit[lang]} {100 - metaPct}% · {T.meta[lang]} {metaPct}%{st.challenge ? ` · ${T.challenge[lang]}` : ''}</span>
            <span>{T.title[lang]} · {T.dataAsOf[lang]} {DATA_AS_OF}</span>
          </div>
        </div>
      </div>

      {open && (() => { const r = ranked.find((x) => x.s.id === open)!; return <Dossier s={r.s} scored={r} lang={lang} showSkins={goals.has('skins')} onClose={() => setOpen(null)} /> })()}

      <div className="controls" aria-label={T.controls[lang]}>
        <label>
          <span>{T.metaSlider[lang]}: {100 - metaPct} / {metaPct}</span>
          <input type="range" min={0} max={50} step={5} value={metaPct} onChange={(e) => set({ metaWeight: Number(e.target.value) / 100 })} aria-describedby="meta-hint" />
          <span id="meta-hint" className="faint small">{T.metaHint[lang]}</span>
        </label>
        <div style={{ display: 'grid', gap: 8 }}>
          <label className="toggle" title={T.challengeHint[lang]}><input type="checkbox" checked={st.challenge} onChange={(e) => set({ challenge: e.target.checked })} />{T.challenge[lang]}</label>
          <label className="toggle"><input type="checkbox" checked={st.ownedOnly} disabled={!profile.owned.length} onChange={(e) => set({ ownedOnly: e.target.checked })} />{T.ownedOnly[lang]}</label>
          <label className="toggle"><input type="checkbox" checked={st.useVibe} disabled={!Object.keys(profile.vibe).length} onChange={(e) => set({ useVibe: e.target.checked })} />{T.vibe[lang]}</label>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          <button className="btn" onClick={exportPng}><Download aria-hidden />{T.exportPng[lang]}</button>
          <button className="btn" onClick={() => set({ screen: 'quiz', actIndex: 0 })}><Pencil aria-hidden />{T.editAnswers[lang]}</button>
          <button className="btn" onClick={askAi} disabled={aiBusy || !st.ai.key} title={!st.ai.key ? T.aiNoKey[lang] : undefined}><Sparkles aria-hidden />{aiBusy ? T.thinking[lang] : T.narrate[lang]}</button>
        </div>
      </div>
      {aiErr && <p className="error center">{aiErr}</p>}
      {aiText && <div className="ai-out">{aiText}</div>}

      {goals.has('pool') && pool.length > 0 && (
        <section className="section">
          <h2 className="display">{T.pool[lang]}</h2>
          <p className="sub">{lang === 'en' ? 'Picked to cover each other: different roles, different hunter weaknesses, so one ban doesn\'t sink you.' : '互相补位：不同定位、不同的监管者弱点，一个被禁也不慌。'}</p>
          <div className="pool">
            {pool.map(({ r, why }) => (
              <div className="pool-item" key={r.s.id}>
                <h3>{r.s.name[lang]}<span className="cn">{r.s.name[lang === 'en' ? 'cn' : 'en']}</span></h3>
                <Roles s={r.s} lang={lang} />
                <Meter label={T.match[lang]} v={r.score} max={100} />
                <p className="muted small" style={{ marginTop: 8 }}>{why[lang]}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {goals.has('path') && path.length > 0 && (
        <section className="section">
          <h2 className="display">{T.path[lang]}</h2>
          <p className="sub">{lang === 'en' ? 'Start forgiving, finish where your fit is highest.' : '从容错高的角色起步，最终走向最适合你的角色。'}</p>
          <div className="path">
            {path.map((step) => (
              <div className="panel" key={step.stage}>
                <div className="stage">{T.stage[step.stage][lang]}</div>
                <h3>{step.r.s.name[lang]}<span className="cn">{step.r.s.name[lang === 'en' ? 'cn' : 'en']}</span></h3>
                <Meter label={T.skillFloor[lang]} v={step.r.s.skillFloor} alt />
                <p className="muted small" style={{ marginTop: 8 }}>{step.why[lang]}</p>
                {step.practise.length > 0 && <><div className="faint small" style={{ marginTop: 10 }}>{T.practise[lang]}</div><ul>{step.practise.map((x, i) => <li key={i}>{x[lang]}</li>)}</ul></>}
              </div>
            ))}
          </div>
        </section>
      )}

      {goals.has('team') && comp && (
        <section className="section">
          <h2 className="display">{T.comp[lang]}</h2>
          <p className="sub">{profile.queue === 'solo'
            ? (lang === 'en' ? 'In solo queue you can\'t choose teammates — these are the lobbies where your pick shines.' : '野排无法选择队友——以下是你的角色最能发挥的阵容。')
            : (lang === 'en' ? 'A lineup built around your headliner.' : '围绕头牌搭建的阵容。')}</p>
          <div className="comp">{comp.members.map((m) => <span key={m.id}>{m.name[lang]}</span>)}</div>
          <p className="muted center small" style={{ marginTop: 10 }}>{comp.note[lang]}</p>
        </section>
      )}

      {goals.has('matchups') && (
        <section className="section">
          <h2 className="display">{T.matchups[lang]}</h2>
          <p className="sub">{lang === 'en' ? `For ${headliner.s.name.en}. Community-sourced matchups are shown first; the rest are estimated from kit mechanics.` : `针对${headliner.s.name.cn}。优先显示社区来源的对局，其余根据技能机制推算。`}</p>
          <div className="panel"><MatchupLists s={headliner.s} lang={lang} limit={6} /></div>
        </section>
      )}

      {goals.has('skins') && (
        <section className="section">
          <h2 className="display">{T.skins[lang]}</h2>
          <p className="sub">{T.skinNote[lang]}</p>
          <div className="pool">
            {ranked.slice(0, 3).map((r) => (
              <div className="panel" key={r.s.id}><h3>{r.s.name[lang]}</h3><SkinsPanel id={r.s.id} lang={lang} /></div>
            ))}
          </div>
        </section>
      )}

      {near.length > 0 && (
        <section className="section">
          <h2 className="display">{T.whyNot[lang]}</h2>
          <div className="pool" style={{ marginTop: 16 }}>
            {near.map(({ r, reason }) => (
              <div className="pool-item" key={r.s.id}>
                <h3>{r.s.name[lang]}</h3>
                <Meter label={T.match[lang]} v={r.score} max={100} />
                <p className="muted small" style={{ marginTop: 8 }}>{reason[lang]}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
