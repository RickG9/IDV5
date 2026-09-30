import { useLayoutEffect, useRef, useState } from 'react'
import type { Lang } from '../types'
import type { Act } from '../quiz/questions'
import { ACTS } from '../quiz/questions'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']

/** The evening's programme as one unbroken row; a light marks where "now" is. */
export function ActRow(props: { acts: Act[]; current: number; lang: Lang; onJump?: (i: number) => void; maxReached: number }) {
  const listRef = useRef<HTMLOListElement>(null)
  const [light, setLight] = useState({ left: 0, width: 0 })
  useLayoutEffect(() => {
    const measure = () => {
      const el = listRef.current?.children[props.current] as HTMLElement | undefined
      if (el) setLight({ left: el.offsetLeft + el.offsetWidth * 0.3, width: el.offsetWidth * 0.4 })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [props.current, props.acts.length])
  return (
    <nav className="acts" aria-label="Acts">
      <ol ref={listRef}>
        {props.acts.map((a, i) => {
          const def = ACTS.find((x) => x.id === a)!
          const state = i < props.current ? 'done' : i === props.current ? 'now' : 'later'
          return (
            <li key={a} data-state={state}>
              <button disabled={!props.onJump || i > props.maxReached} onClick={() => props.onJump?.(i)} aria-current={i === props.current ? 'step' : undefined}>
                <span className="num">{ROMAN[i]}</span>
                <span className="name">{def.title[props.lang]}</span>
              </button>
            </li>
          )
        })}
      </ol>
      <span className="track" aria-hidden />
      <span className="light" aria-hidden style={{ width: light.width, transform: `translateX(${light.left}px)` }} />
    </nav>
  )
}
