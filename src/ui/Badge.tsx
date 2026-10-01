import type { ReactNode } from 'react'
import * as s from './badge.css'

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'live' | 'win' | 'loss' | 'draw'; children: ReactNode }) {
  return (
    <span data-badge={tone} className={s.badge[tone]}>
      {tone === 'live' && <span className={s.dot} aria-hidden="true" />}
      {children}
    </span>
  )
}
