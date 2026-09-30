import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppState } from './state'
import { initialState, loadState, saveState } from './state'
import type { Act, AnswerValue, Question } from './quiz/questions'
import { ACTS, QUESTIONS } from './quiz/questions'
import { Topbar } from './components/Topbar'
import { Programme } from './screens/Programme'
import { Quiz } from './screens/Quiz'
import { Trials } from './screens/Trials'
import { Verdict } from './screens/Verdict'
import { Atlas, Matrix } from './screens/Atlas'
import { Settings } from './screens/Settings'
import { T } from './i18n'
import { DATA_AS_OF } from './data'

export default function App() {
  const [st, setSt] = useState<AppState>(loadState)
  const set = useCallback((p: Partial<AppState>) => setSt((s) => ({ ...s, ...p })), [])
  useEffect(() => saveState(st), [st])
  useEffect(() => {
    document.documentElement.dataset.theme = st.theme
    document.documentElement.lang = st.lang === 'cn' ? 'zh-CN' : 'en'
    document.title = `${T.title[st.lang]} · ${T.titleAlt[st.lang]}`
  }, [st.theme, st.lang])

  const questionsFor = useCallback((a: Act): Question[] =>
    QUESTIONS.filter((q) => q.act === a && (st.depth === 'full' || q.quick) && (!q.showIf || q.showIf(st.answers)))
      // Core (quick) questions lead each act; deep-dive ones follow in authoring order.
      .sort((x, y) => Number(y.quick) - Number(x.quick)), [st.depth, st.answers])
  const acts = useMemo(() => ACTS.map((a) => a.id).filter((a) => questionsFor(a).length > 0), [questionsFor])

  const onAnswer = (id: string, v: AnswerValue) => setSt((s) => {
    const answers = { ...s.answers }
    if (v === undefined) delete answers[id]
    else answers[id] = v
    return { ...s, answers }
  })

  const onFinishAct = (a: Act) => {
    const i = acts.indexOf(a)
    if (a === 'hands' && st.answers.trials === 'yes') { set({ screen: 'trials', actIndex: i + 1 }); return }
    if (i >= acts.length - 1) { set({ screen: 'verdict', billed: true, maxAct: acts.length - 1 }); window.scrollTo({ top: 0 }); return }
    set({ actIndex: i + 1 })
  }

  const hasProgress = Object.keys(st.answers).length > 0
  return (
    <div className="app">
      <Topbar lang={st.lang} theme={st.theme} billed={st.billed} screen={st.screen} onLang={() => set({ lang: st.lang === 'en' ? 'cn' : 'en' })} onTheme={(theme) => set({ theme })}
        go={(screen) => { set({ screen }); window.scrollTo({ top: 0 }) }} />
      <main className="sheet">
        {st.screen === 'programme' && (
          <Programme lang={st.lang} depth={st.depth} acts={acts} hasProgress={hasProgress} billed={st.billed} onBill={() => set({ screen: 'verdict' })}
            onDepth={(depth) => set({ depth })}
            onBegin={() => set({ screen: 'quiz' })}
            onRestart={() => { if (window.confirm(T.confirmRestart[st.lang])) set({ answers: {}, trials: {}, actIndex: 0, maxAct: 0, billed: false, aiAdjust: undefined, metaWeight: null, challenge: false, ownedOnly: false, useVibe: false, screen: 'quiz' }) }}
            onRoster={() => set({ screen: 'atlas' })} />
        )}
        {st.screen === 'quiz' && <Quiz st={st} lang={st.lang} acts={acts} questionsFor={questionsFor} set={set} onAnswer={onAnswer} onFinishAct={onFinishAct} />}
        {st.screen === 'trials' && (
          <Trials lang={st.lang} trials={st.trials} onSet={(p) => setSt((s) => ({ ...s, trials: { ...s.trials, ...p } }))}
            onDone={() => set({ screen: st.actIndex >= acts.length ? 'verdict' : 'quiz' })} />
        )}
        {st.screen === 'verdict' && <Verdict st={st} set={set} lang={st.lang} />}
        {st.screen === 'atlas' && <Atlas lang={st.lang} />}
        {st.screen === 'matrix' && <Matrix lang={st.lang} />}
        {st.screen === 'settings' && <Settings lang={st.lang} ai={st.ai} onChange={(ai) => set({ ai })} />}
      </main>
      <footer className="footer">
        {T.title[st.lang]} · {T.dataAsOf[st.lang]} {DATA_AS_OF} · {st.lang === 'en'
          ? 'Fan-made tool. Identity V is © NetEase; no game art is hosted here.'
          : '玩家自制工具。第五人格版权归网易所有；本站不托管任何游戏美术资源。'}
        {' '}<button className="linkish" style={{ display: 'inline', padding: 0 }} onClick={() => { if (window.confirm(T.confirmRestart[st.lang])) setSt({ ...initialState, lang: st.lang, theme: st.theme, ai: st.ai }) }}>{T.restart[st.lang]}</button>
      </footer>
    </div>
  )
}
