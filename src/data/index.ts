import type { Hunter, SkinProfile, Survivor } from '../types'
import survivorsJson from './survivors.json'
import huntersJson from './hunters.json'
import skinsJson from './skins.json'
import { rosterStats } from '../engine/score'
import { buildMatrix } from '../engine/matchups'

export const SURVIVORS = survivorsJson as unknown as Survivor[]
export const HUNTERS = huntersJson as unknown as (Hunter & { meta: Record<string, number>; punishes: string[]; strugglesVs: string[] })[]
export const SKINS = skinsJson as unknown as SkinProfile[]

export const survivorById = Object.fromEntries(SURVIVORS.map((s) => [s.id, s])) as Record<string, Survivor>
export const hunterById = Object.fromEntries(HUNTERS.map((h) => [h.id, h])) as Record<string, (typeof HUNTERS)[number]>
export const skinsById = Object.fromEntries(SKINS.map((s) => [s.id, s])) as Record<string, SkinProfile>

export const STATS = rosterStats(SURVIVORS)
export const MATRIX = buildMatrix(SURVIVORS, HUNTERS)

export const DATA_AS_OF = '2026-09-30'
