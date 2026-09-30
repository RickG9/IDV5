export type Lang = 'en' | 'cn'
export type Bi = { en: string; cn: string }
export type BiList = { en: string[]; cn: string[] }

export type Role = 'Decode' | 'Contain' | 'Assist' | 'Rescue'

/** What a survivor contributes to a match (0-10, roster average ~5). */
export const TRAITS = [
  'kite', 'decode', 'rescue', 'support', 'disrupt', 'info',
  'survivability', 'selfSufficiency', 'teamDependency', 'earlyGame', 'lateGame',
] as const
export type Trait = (typeof TRAITS)[number]

/** What a survivor demands from the player (0-10). */
export const DEMANDS = [
  'mechanics', 'aim', 'timing', 'reaction', 'mapKnowledge', 'gameSense', 'multitask', 'comms',
] as const
export type Demand = (typeof DEMANDS)[number]

export const KITE_STYLES = ['looping', 'mobility', 'stun', 'stealth', 'tank', 'displacement', 'trick'] as const
export type KiteStyle = (typeof KITE_STYLES)[number]
export const SUPPORT_STYLES = ['heal', 'shield', 'speed', 'info', 'rescue-assist', 'decode-buff', 'hunter-debuff', 'revive'] as const
export type SupportStyle = (typeof SUPPORT_STYLES)[number]

export type Bracket = 'low' | 'mid' | 'high' | 'pro'

export interface Survivor {
  id: string
  name: Bi
  roles: Role[]
  officialDifficulty: number // 1-3 in 0.5 steps (CN wiki)
  release: string // YYYY-MM-DD (CN)
  kit: Bi
  traits: Record<Trait, number>
  demands: Record<Demand, number>
  skillFloor: number
  skillCeiling: number
  forgiveness: number
  kiteStyles: KiteStyle[]
  supportStyles: SupportStyle[]
  archetypes: string[]
  meta: Record<Bracket, number> & { notes: string; changes: string } // 1-5
  queue: { solo: number; premade: number } // 1-5
  quickMatch: number // 1-5
  strengths: BiList
  weaknesses: BiList
  sentiment: Bi
  tips: BiList
  synergy: { id: string; reason: string }[]
  matchups: { good: { hunter: string; reason: string }[]; bad: { hunter: string; reason: string }[] }
  vibe: string[]
  sources: string[]
  confidence: number // 1-5
  provisional?: boolean
}

export interface Hunter {
  id: string
  name: Bi
  tags: string[]
  summary: Bi
  sources: string[]
  punishes?: string[]
  strugglesVs?: string[]
  counteredBy?: string[] // survivor ids commonly cited as good against this hunter
  strongVs?: string[] // survivor ids this hunter commonly beats
  meta?: Record<string, number>
}

/** -2 very bad for survivor … +2 very good for survivor */
export interface MatchupCell {
  rating: -2 | -1 | 0 | 1 | 2
  reason: string
  sourced: boolean
}

export interface SkinEntry {
  name: Bi
  tier: string // e.g. S, A, B, C, D, Unique, Limited
  reception: 'loved' | 'liked' | 'mixed' | 'disliked' | 'unknown'
  note: string
  obtain: string
  server: 'both' | 'cn' | 'global'
}
export interface SkinProfile {
  id: string
  counts: Record<string, number>
  total: number
  notable: SkinEntry[]
  summary: Bi
  sources: string[]
  asOf: string
}
