import { HeartHandshake, KeyRound, LifeBuoy, Footprints } from 'lucide-react'
import type { Role } from '../types'

/** Letterpress fleuron used between billing lines (gothic printing). */
export function Fleuron() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" fill="currentColor">
      <path d="M24 6c2.6 5 7.4 7.6 12.2 7.2-3.4 2.4-5.2 6-4.8 10.2-2.6-2.8-5.2-4-7.4-4s-4.8 1.2-7.4 4c.4-4.2-1.4-7.8-4.8-10.2C16.6 13.6 21.4 11 24 6Z" />
      <path d="M24 42c-2.6-5-7.4-7.6-12.2-7.2 3.4-2.4 5.2-6 4.8-10.2 2.6 2.8 5.2 4 7.4 4s4.8-1.2 7.4-4c-.4 4.2 1.4 7.8 4.8 10.2C31.4 34.4 26.6 37 24 42Z" opacity=".55" />
      <circle cx="24" cy="24" r="2.6" />
    </svg>
  )
}

export function Rule() {
  return (
    <div className="rule" aria-hidden="true">
      <Fleuron />
    </div>
  )
}

export const ROLE_ICON: Record<Role, typeof KeyRound> = {
  Decode: KeyRound,
  Contain: Footprints,
  Assist: HeartHandshake,
  Rescue: LifeBuoy,
}
