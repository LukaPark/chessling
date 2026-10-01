import { ChevronDown } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useId, useState, type ReactNode } from 'react'
import * as s from './disclosure.css'
import { Icon } from './Icon'
import { EASE } from './motion'

export function Disclosure({
  title,
  children,
  defaultOpen = false,
  open: controlled,
  onOpenChange,
  testId,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  testId?: string
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const open = controlled ?? uncontrolled
  const id = useId()
  const reduce = useReducedMotion()
  const toggle = () => {
    const next = !open
    if (controlled === undefined) setUncontrolled(next)
    onOpenChange?.(next)
  }
  return (
    <section className={s.root}>
      <button type="button" className={s.trigger} aria-expanded={open} aria-controls={id} onClick={toggle}>
        <span>{title}</span>
        <Icon icon={ChevronDown} size={18} className={open ? s.chevronOpen : s.chevron} />
      </button>
      <motion.div
        id={id}
        className={s.content}
        initial={false}
        animate={open ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
        transition={reduce ? { duration: 0 } : { height: { duration: 0.32, ease: EASE }, opacity: { duration: 0.18 } }}
        aria-hidden={!open}
        inert={!open}
        data-testid={testId}
      >
        <div className={s.inner}>{children}</div>
      </motion.div>
    </section>
  )
}
