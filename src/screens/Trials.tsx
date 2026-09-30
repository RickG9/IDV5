import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lang } from '../types'
import type { TrialResults } from '../engine/profile'
import { reactionToScore, timingToScore } from '../engine/profile'
import { T } from '../i18n'

type SetTrial = (patch: Partial<TrialResults>) => void
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }

export function Trials({ lang, trials, onSet, onDone }: { lang: Lang; trials: TrialResults; onSet: SetTrial; onDone: () => void }) {
  return (
    <div className="trials">
      <div className="act-head">
        <h2 className="display">{T.trials[lang]}</h2>
        <p>{T.trialsIntro[lang]}</p>
      </div>
      <ReactionTrial lang={lang} value={trials.reactionMs} onSet={onSet} />
      <TimingTrial lang={lang} value={trials.timingErrMs} onSet={onSet} />
      <AimTrial lang={lang} value={trials.aimScore} onSet={onSet} />
      <MultiTrial lang={lang} value={trials.multitaskScore} onSet={onSet} />
      <div className="quiz-nav" style={{ justifyContent: 'flex-end' }}>
        <button className="btn primary" onClick={onDone}>{T.continue[lang]}</button>
      </div>
    </div>
  )
}

function Frame({ title, desc, children, result }: { title: string; desc: string; children: React.ReactNode; result?: React.ReactNode }) {
  return (
    <section className="q">
      <h3 className="q-title">{title}</h3>
      <p className="help">{desc}</p>
      {children}
      {result}
    </section>
  )
}

// ───────────── Reaction: click the instant the arena lights up ─────────────
function ReactionTrial({ lang, value, onSet }: { lang: Lang; value?: number; onSet: SetTrial }) {
  const [phase, setPhase] = useState<'idle' | 'wait' | 'go' | 'early'>('idle')
  const [times, setTimes] = useState<number[]>([])
  const t0 = useRef(0)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const arm = () => {
    setPhase('wait')
    timer.current = window.setTimeout(() => { t0.current = performance.now(); setPhase('go') }, 1200 + Math.random() * 2600)
  }
  const press = () => {
    if (phase === 'idle' || phase === 'early') { arm(); return }
    if (phase === 'wait') { window.clearTimeout(timer.current); setPhase('early'); return }
    const dt = performance.now() - t0.current
    const next = [...times, dt]
    setTimes(next)
    if (next.length >= 5) { onSet({ reactionMs: Math.round(median(next)) }); setTimes([]); setPhase('idle') } else arm()
  }
  const label = { idle: lang === 'en' ? 'Tap to start' : '点击开始', wait: lang === 'en' ? 'Wait for it…' : '等待……', go: lang === 'en' ? 'NOW' : '点！', early: lang === 'en' ? 'Too early — tap to retry' : '太早了——点击重试' }[phase]
  return (
    <Frame title={T.trialReaction[lang]} desc={lang === 'en' ? 'Five rounds. Tap the arena the moment it changes colour. Score = median.' : '共五轮。区域变色的瞬间点击。取中位数。'}
      result={value ? <div className="trial-result"><span className="muted">{lang === 'en' ? 'Median reaction' : '反应中位数'}</span><strong>{value} ms · {reactionToScore(value).toFixed(1)}/10</strong></div> : null}>
      <div className={`arena ${phase === 'go' ? 'go' : phase === 'early' ? 'early' : ''}`} role="button" tabIndex={0}
        onPointerDown={(e) => { e.preventDefault(); press() }} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press() } }}>
        <div>
          <div className="big">{label}</div>
          {times.length > 0 && <div className="muted small">{times.length}/5 · {Math.round(times.at(-1)!)} ms</div>}
        </div>
      </div>
    </Frame>
  )
}

// ───────────── Timing: stop the needle in the zone's centre (calibration) ─────────────
function TimingTrial({ lang, value, onSet }: { lang: Lang; value?: number; onSet: SetTrial }) {
  const [running, setRunning] = useState(false)
  const [zone, setZone] = useState({ c: 0.6, w: 0.12 })
  const [errs, setErrs] = useState<number[]>([])
  const [pos, setPos] = useState(0)
  const raf = useRef(0)
  const start = useRef(0)
  const speed = useRef(0.9) // track-widths per second
  const posRef = useRef(0)
  const loop = useCallback((t: number) => {
    const x = (((t - start.current) / 1000) * speed.current) % 2
    const p = x > 1 ? 2 - x : x
    posRef.current = p
    setPos(p)
    raf.current = requestAnimationFrame(loop)
  }, [])
  const round = (n: number) => {
    speed.current = 0.8 + n * 0.12
    setZone({ c: 0.25 + Math.random() * 0.55, w: Math.max(0.06, 0.13 - n * 0.008) })
    start.current = performance.now()
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const press = () => {
    if (!running) { setErrs([]); round(0); setRunning(true); raf.current = requestAnimationFrame(loop); return }
    const errMs = (Math.abs(posRef.current - zone.c) / speed.current) * 1000
    const next = [...errs, errMs]
    setErrs(next)
    if (next.length >= 8) {
      cancelAnimationFrame(raf.current); setRunning(false)
      onSet({ timingErrMs: Math.round(next.reduce((a, b) => a + b, 0) / next.length) })
    } else round(next.length)
  }
  return (
    <Frame title={T.trialTiming[lang]} desc={lang === 'en' ? 'Like a cipher calibration: stop the needle as close to the centre of the green zone as you can. Eight rounds, getting faster.' : '类似密码机校准：尽量让指针停在绿色区域正中。共八轮，速度递增。'}
      result={value !== undefined ? <div className="trial-result"><span className="muted">{lang === 'en' ? 'Average error' : '平均误差'}</span><strong>{value} ms · {timingToScore(value).toFixed(1)}/10</strong></div> : null}>
      <div className="arena" role="button" tabIndex={0} onPointerDown={(e) => { e.preventDefault(); press() }}
        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); press() } }}>
        <div style={{ width: '100%', display: 'grid', justifyItems: 'center', gap: 14 }}>
          <div className="dial" aria-hidden>
            <span className="zone" style={{ left: `${(zone.c - zone.w / 2) * 100}%`, width: `${zone.w * 100}%` }} />
            <span className="needle" style={{ left: `${pos * 100}%` }} />
          </div>
          <div className="big">{running ? `${errs.length + 1}/8` : (lang === 'en' ? 'Tap to start' : '点击开始')}</div>
          {errs.length > 0 && <div className="muted small">{Math.round(errs.at(-1)!)} ms {lang === 'en' ? 'off centre' : '偏差'}</div>}
        </div>
      </div>
    </Frame>
  )
}

// ───────────── Aim: hit drifting targets fast ─────────────
function AimTrial({ lang, value, onSet }: { lang: Lang; value?: number; onSet: SetTrial }) {
  const N = 15
  const [target, setTarget] = useState<{ x: number; y: number; vx: number; vy: number; r: number } | null>(null)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [pos, setPos] = useState({ x: 50, y: 50 })
  const times = useRef<number[]>([])
  const shown = useRef(0)
  const raf = useRef(0)
  const tg = useRef(target)
  tg.current = target
  const spawn = (n: number) => {
    const speed = 6 + n * 0.9 // % of arena per second
    const a = Math.random() * Math.PI * 2
    const t = { x: 12 + Math.random() * 76, y: 15 + Math.random() * 70, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: Math.max(22, 44 - n * 1.4) }
    setTarget(t); setPos({ x: t.x, y: t.y }); shown.current = performance.now()
  }
  useEffect(() => {
    if (!target) return
    let last = performance.now()
    const step = (t: number) => {
      const dt = (t - last) / 1000; last = t
      const c = tg.current
      if (c) {
        let { x, y, vx, vy } = c
        x += vx * dt; y += vy * dt
        if (x < 6 || x > 94) vx = -vx
        if (y < 8 || y > 92) vy = -vy
        c.x = Math.max(6, Math.min(94, x)); c.y = Math.max(8, Math.min(92, y)); c.vx = vx; c.vy = vy
        setPos({ x: c.x, y: c.y })
      }
      raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [target])
  const hit = () => {
    times.current.push(performance.now() - shown.current)
    const h = hits + 1
    setHits(h)
    if (h >= N) {
      setTarget(null)
      const avg = times.current.reduce((a, b) => a + b, 0) / times.current.length
      const speedScore = Math.max(0, Math.min(100, 100 - (avg - 420) / 9))
      const acc = h / (h + misses)
      onSet({ aimScore: Math.round(speedScore * (0.55 + 0.45 * acc)) })
    } else spawn(h)
  }
  const begin = () => { times.current = []; setHits(0); setMisses(0); spawn(0) }
  return (
    <Frame title={T.trialAim[lang]} desc={lang === 'en' ? `Hit ${N} drifting targets as fast as you can. They get smaller and faster. Misses cost accuracy.` : `尽快击中 ${N} 个漂移目标，目标会越来越小、越来越快。点空会降低准确率。`}
      result={value !== undefined ? <div className="trial-result"><span className="muted">{lang === 'en' ? 'Aim score' : '瞄准分'}</span><strong>{value}/100</strong></div> : null}>
      <div className="arena" onPointerDown={(e) => { if (target && e.target === e.currentTarget) setMisses((m) => m + 1) }}>
        {!target && <button className="btn primary" onClick={begin}>{hits >= N ? T.again[lang] : T.start[lang]}</button>}
        {target && (
          <button className="target" aria-label="Target" style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: target.r, height: target.r }}
            onPointerDown={(e) => { e.stopPropagation(); hit() }} />
        )}
        {target && <span className="muted small" style={{ position: 'absolute', top: 8, right: 12 }}>{hits}/{N} · {lang === 'en' ? 'misses' : '失误'} {misses}</span>}
      </div>
    </Frame>
  )
}

// ───────────── Multitask: calibrate while watching for the hunter ─────────────
function MultiTrial({ lang, value, onSet }: { lang: Lang; value?: number; onSet: SetTrial }) {
  const DURATION = 25000
  const [running, setRunning] = useState(false)
  const [pos, setPos] = useState(0)
  const [zone, setZone] = useState(0.5)
  const [cue, setCue] = useState<{ x: number; y: number; at: number } | null>(null)
  const [left, setLeft] = useState(DURATION)
  const stats = useRef({ calOk: 0, calTotal: 0, cueHit: 0, cueTotal: 0, cueTime: 0 })
  const raf = useRef(0)
  const t0 = useRef(0)
  const posRef = useRef(0)
  const zoneRef = useRef(0.5)
  const cueRef = useRef(cue)
  cueRef.current = cue
  const nextCue = useRef(0)

  const finish = useCallback(() => {
    cancelAnimationFrame(raf.current); setRunning(false); setCue(null)
    const s = stats.current
    const cal = s.calTotal ? s.calOk / s.calTotal : 0
    const cueRate = s.cueTotal ? s.cueHit / s.cueTotal : 0
    const cueSpeed = s.cueHit ? Math.max(0, Math.min(1, 1 - (s.cueTime / s.cueHit - 450) / 900)) : 0
    const volume = Math.min(1, s.calTotal / 14)
    onSet({ multitaskScore: Math.round(100 * (0.4 * cal * volume + 0.4 * cueRate + 0.2 * cueSpeed)) })
  }, [onSet])

  const loop = useCallback((t: number) => {
    const el = t - t0.current
    const x = ((el / 1000) * 0.75) % 2
    posRef.current = x > 1 ? 2 - x : x
    setPos(posRef.current)
    setLeft(Math.max(0, DURATION - el))
    const c = cueRef.current
    if (c && t - c.at > 1400) { setCue(null) }
    if (!c && t > nextCue.current) {
      stats.current.cueTotal++
      setCue({ x: Math.random() < 0.5 ? 8 + Math.random() * 14 : 78 + Math.random() * 14, y: 12 + Math.random() * 70, at: t })
      nextCue.current = t + 2200 + Math.random() * 2600
    }
    if (el >= DURATION) { finish(); return }
    raf.current = requestAnimationFrame(loop)
  }, [finish])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const begin = () => {
    stats.current = { calOk: 0, calTotal: 0, cueHit: 0, cueTotal: 0, cueTime: 0 }
    t0.current = performance.now(); nextCue.current = t0.current + 1800
    setRunning(true); raf.current = requestAnimationFrame(loop)
  }
  const calibrate = () => {
    if (!running) return
    stats.current.calTotal++
    if (Math.abs(posRef.current - zoneRef.current) < 0.08) stats.current.calOk++
    zoneRef.current = 0.2 + Math.random() * 0.6
    setZone(zoneRef.current)
  }
  return (
    <Frame title={T.trialMulti[lang]} desc={lang === 'en' ? 'Keep calibrating (tap the dial when the needle is in the zone) while watching the edges: when the red hunter mark appears, tap it quickly. 25 seconds.' : '持续校准（指针进入区域时点击刻度盘），同时留意两侧：红色监管者标记出现时迅速点击。持续 25 秒。'}
      result={value !== undefined ? <div className="trial-result"><span className="muted">{lang === 'en' ? 'Multitask score' : '多线分'}</span><strong>{value}/100</strong></div> : null}>
      <div className="arena" style={{ cursor: 'default' }}>
        {!running && <button className="btn primary" onClick={begin}>{value !== undefined ? T.again[lang] : T.start[lang]}</button>}
        {running && (
          <>
            <button type="button" className="dial" style={{ border: 0, cursor: 'pointer', width: 'min(60%, 360px)' }} onPointerDown={(e) => { e.preventDefault(); calibrate() }} aria-label="Calibrate">
              <span className="zone" style={{ left: `${(zone - 0.08) * 100}%`, width: '16%' }} />
              <span className="needle" style={{ left: `${pos * 100}%` }} />
            </button>
            <span className="muted small" style={{ position: 'absolute', top: 8, right: 12 }}>{Math.ceil(left / 1000)}s</span>
            {cue && (
              <button className="target" aria-label="Hunter" style={{ left: `${cue.x}%`, top: `${cue.y}%`, width: 34, height: 34, background: 'var(--bad)', boxShadow: '0 0 0 3px var(--bad)' }}
                onPointerDown={(e) => { e.stopPropagation(); stats.current.cueHit++; stats.current.cueTime += performance.now() - cue.at; setCue(null) }} />
            )}
          </>
        )}
      </div>
    </Frame>
  )
}
