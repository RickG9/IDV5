import type { Lang } from './types'
import type { Answers } from './quiz/questions'
import type { AiAdjust, TrialResults } from './engine/profile'

export type Theme = 'gothic' | 'modern' | 'playful'
export type Screen = 'programme' | 'quiz' | 'trials' | 'verdict' | 'atlas' | 'matrix' | 'settings'
export type Depth = 'quick' | 'full'

export interface AiConfig {
  provider: 'opencode-go' | 'deepseek' | 'openrouter' | 'custom'
  baseUrl: string
  model: string
  key: string
  relay: string // optional pass-through relay URL (needed for providers without browser CORS)
}

export interface AppState {
  lang: Lang
  theme: Theme
  screen: Screen
  depth: Depth
  actIndex: number
  answers: Answers
  trials: TrialResults
  challenge: boolean
  ownedOnly: boolean
  useVibe: boolean
  metaWeight: number | null // null = use the value implied by answers
  ai: AiConfig
  aiAdjust?: AiAdjust
}

export const AI_PRESETS: Record<AiConfig['provider'], { baseUrl: string; model: string; needsRelay: boolean }> = {
  'opencode-go': { baseUrl: 'https://opencode.ai/zen/go/v1', model: 'deepseek-v4-flash', needsRelay: true },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', needsRelay: false },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'deepseek/deepseek-chat', needsRelay: false },
  custom: { baseUrl: '', model: '', needsRelay: false },
}

export const initialState: AppState = {
  lang: 'en',
  theme: 'gothic',
  screen: 'programme',
  depth: 'quick',
  actIndex: 0,
  answers: {},
  trials: {},
  challenge: false,
  ownedOnly: false,
  useVibe: false,
  metaWeight: null,
  ai: { provider: 'opencode-go', ...AI_PRESETS['opencode-go'], key: '', relay: '' },
}

const KEY = 'manor-casebook:v1'

/** Browser storage is a convenience only: every read/write is guarded. */
export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const zh = typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh')
      return { ...initialState, lang: zh ? 'cn' : 'en' }
    }
    const saved = JSON.parse(raw) as Partial<AppState>
    return { ...initialState, ...saved, ai: { ...initialState.ai, ...(saved.ai ?? {}) }, screen: saved.screen === 'trials' ? 'quiz' : (saved.screen ?? 'programme') }
  } catch {
    return initialState
  }
}

export function saveState(s: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage unavailable (private mode) — the app still works */
  }
}
