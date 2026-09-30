import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import type { Lang } from '../types'
import type { AppState } from '../state'
import type { Act, AnswerValue, Question } from '../quiz/questions'
import { ACTS } from '../quiz/questions'
import { QuestionView } from '../components/QuestionView'
import { ActRow } from '../components/ActRow'
import { T } from '../i18n'
import { interpretFreeText } from '../ai/client'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']

export function Quiz(props: {
  st: AppState
  lang: Lang
  acts: Act[]
  questionsFor: (a: Act) => Question[]
  set: (p: Partial<AppState>) => void
  onAnswer: (id: string, v: AnswerValue) => void
  onFinishAct: (a: Act) => void
}) {
  const { st, lang, acts } = props
  const i = Math.min(st.actIndex, acts.length - 1)
  const act = acts[i]
  const def = ACTS.find((a) => a.id === act)!
  const qs = props.questionsFor(act)
  const [maxReached, setMax] = useState(i)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiMsg, setAiMsg] = useState('')
  useEffect(() => { setMax((m) => Math.max(m, i)); window.scrollTo({ top: 0, behavior: 'smooth' }) }, [i])

  const last = i === acts.length - 1
  const freeText = (st.answers['games-text'] as string | undefined)?.trim()

  const interpret = async () => {
    if (!freeText) return
    setAiBusy(true); setAiMsg('')
    try {
      const adj = await interpretFreeText(st.ai, freeText)
      props.set({ aiAdjust: adj })
      setAiMsg(adj.summary || 'OK')
    } catch (e) { setAiMsg((e as Error).message) } finally { setAiBusy(false) }
  }

  return (
    <div>
      <ActRow acts={acts} current={i} lang={lang} maxReached={maxReached} onJump={(n) => props.set({ actIndex: n })} />
      <header className="act-head">
        <div className="flourish">{lang === 'en' ? `Act ${ROMAN[i]}` : `第${'一二三四五六七八'[i]}幕`}</div>
        <h2 className="display">{def.title[lang]}</h2>
        <p>{def.blurb[lang]}</p>
      </header>
      <div className="questions">
        {qs.map((q) => <QuestionView key={q.id} q={q} lang={lang} value={st.answers[q.id]} onChange={(v) => props.onAnswer(q.id, v)} />)}
        {act === 'stages' && freeText && (
          <div className="row-actions">
            <button className="btn" onClick={interpret} disabled={aiBusy || !st.ai.key} title={!st.ai.key ? T.aiNoKey[lang] : undefined}>
              <Sparkles aria-hidden />{aiBusy ? T.thinking[lang] : T.interpret[lang]}
            </button>
            {!st.ai.key && <span className="faint small">{T.aiNoKey[lang]}</span>}
            {aiMsg && <span className="muted small">{aiMsg}</span>}
          </div>
        )}
      </div>
      <nav className="quiz-nav">
        <button className="btn" onClick={() => (i === 0 ? props.set({ screen: 'programme' }) : props.set({ actIndex: i - 1 }))}><ArrowLeft aria-hidden />{T.back[lang]}</button>
        <span className="faint small">{qs.filter((q) => st.answers[q.id] !== undefined).length}/{qs.length} {T.answered[lang]}</span>
        <button className="btn primary" onClick={() => props.onFinishAct(act)}>
          {last ? T.toVerdict[lang] : T.next[lang]}<ArrowRight aria-hidden />
        </button>
      </nav>
    </div>
  )
}
