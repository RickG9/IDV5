import { ArrowRight, RotateCcw } from 'lucide-react'
import type { Lang } from '../types'
import type { Depth } from '../state'
import { T } from '../i18n'
import { Rule } from '../components/Ornament'
import { ActRow } from '../components/ActRow'
import type { Act } from '../quiz/questions'
import { DATA_AS_OF, HUNTERS, SURVIVORS } from '../data'

export function Programme(props: {
  lang: Lang
  depth: Depth
  acts: Act[]
  hasProgress: boolean
  onDepth: (d: Depth) => void
  onBegin: () => void
  onRestart: () => void
  onRoster: () => void
}) {
  const { lang } = props
  return (
    <div className="programme">
      <div className="masthead">
        <h1 className="display">{lang === 'en' ? 'Manor Casebook' : '庄园档案'}</h1>
        <p className="cn-title">{lang === 'en' ? '庄园档案' : 'MANOR CASEBOOK'}</p>
        <p className="tagline">{T.tagline[lang]}</p>
      </div>
      <Rule />
      <ActRow acts={props.acts} current={0} lang={lang} maxReached={0} />
      <div className="depth-pick" role="group" aria-label="Length">
        <button aria-pressed={props.depth === 'quick'} onClick={() => props.onDepth('quick')}>
          <strong>{T.quick[lang]}</strong><span>{T.quickHint[lang]}</span>
        </button>
        <button aria-pressed={props.depth === 'full'} onClick={() => props.onDepth('full')}>
          <strong>{T.full[lang]}</strong><span>{T.fullHint[lang]}</span>
        </button>
      </div>
      <div className="cta-row">
        <button className="cta" onClick={props.onBegin}>{props.hasProgress ? T.resume[lang] : T.begin[lang]}<ArrowRight aria-hidden /></button>
        {props.hasProgress && <button className="btn" onClick={props.onRestart}><RotateCcw aria-hidden />{T.restart[lang]}</button>}
      </div>
      <p className="faint small">
        {SURVIVORS.length} {T.survivors[lang]} · {HUNTERS.length} {T.hunters[lang]} · {T.dataAsOf[lang]} {DATA_AS_OF} ·{' '}
        <button className="linkish" style={{ display: 'inline', padding: 0 }} onClick={props.onRoster}>{T.roster[lang]}</button>
      </p>
    </div>
  )
}
