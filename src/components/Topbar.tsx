import { BookOpen, Grid3x3, Languages, ScrollText, Settings } from 'lucide-react'
import type { Lang } from '../types'
import type { Screen, Theme } from '../state'
import { T } from '../i18n'

const THEMES: Theme[] = ['gothic', 'modern', 'playful']

export function Topbar(props: {
  lang: Lang
  theme: Theme
  onLang: () => void
  onTheme: (t: Theme) => void
  go: (s: Screen) => void
  billed: boolean
  screen: Screen
}) {
  const { lang, theme } = props
  const idx = THEMES.indexOf(theme)
  return (
    <header className="topbar">
      <button className="brand" onClick={() => props.go('programme')}>
        {T.title[lang]}
        <small>{T.titleAlt[lang]}</small>
      </button>
      <nav aria-label="Site">
        {props.billed && <button className="linkish" aria-label={T.yourBill[lang]} aria-current={props.screen === 'verdict' ? 'page' : undefined} onClick={() => props.go('verdict')}><ScrollText aria-hidden /><span className="lbl">{T.yourBill[lang]}</span></button>}
        <button className="linkish" aria-label={T.roster[lang]} aria-current={props.screen === 'atlas' ? 'page' : undefined} onClick={() => props.go('atlas')}><BookOpen aria-hidden /><span className="lbl">{T.roster[lang]}</span></button>
        <button className="linkish" aria-label={T.matrix[lang]} aria-current={props.screen === 'matrix' ? 'page' : undefined} onClick={() => props.go('matrix')}><Grid3x3 aria-hidden /><span className="lbl">{T.matrix[lang]}</span></button>
        <button className="linkish" aria-label={T.settings[lang]} aria-current={props.screen === 'settings' ? 'page' : undefined} onClick={() => props.go('settings')}><Settings aria-hidden /><span className="lbl">{T.settings[lang]}</span></button>
        <button className="linkish" onClick={props.onLang} aria-label="Language"><Languages aria-hidden />{T.lang[lang]}</button>
        <div className="theme-slider">
          <span className="visually-hidden" id="theme-label">{T.theme[lang]}</span>
          <div
            className="theme-track"
            role="radiogroup"
            aria-labelledby="theme-label"
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') props.onTheme(THEMES[Math.min(2, idx + 1)])
              if (e.key === 'ArrowLeft') props.onTheme(THEMES[Math.max(0, idx - 1)])
            }}
          >
            <span className="theme-thumb" style={{ transform: `translateX(${idx * 100}%)` }} aria-hidden />
            {THEMES.map((t) => (
              <button key={t} role="radio" aria-checked={theme === t} tabIndex={theme === t ? 0 : -1} onClick={() => props.onTheme(t)}>
                {T.themes[t][lang]}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </header>
  )
}
