import { Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Icon } from '../ui/Icon'
import * as s from '../ui/feedback.css'

export function Banner({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) {
  return (
    <div role="status" className={s.banner[tone]}>
      <Icon icon={tone === 'warn' ? TriangleAlert : Info} size={18} className={s.icon} />
      <span>{children}</span>
    </div>
  )
}
