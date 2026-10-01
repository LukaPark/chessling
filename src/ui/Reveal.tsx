import { motion, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { EASE } from './motion'

const VARIANTS = {
  text: { hidden: { opacity: 0, y: 18 }, shown: { opacity: 1, y: 0, scale: 1 }, duration: 0.6 },
  graphic: { hidden: { opacity: 0, y: 28, scale: 0.985 }, shown: { opacity: 1, y: 0, scale: 1 }, duration: 0.76 },
} as const

/** 첫 화면 밖에 있던 요소만 뷰포트 하단 48px 안쪽에 들어올 때 한 번 등장한다 */
export function Reveal(props: RevealProps) {
  // IntersectionObserver가 없으면(구형 환경) useInView가 던지므로 등장 모션 없이 그대로 그린다
  if (typeof IntersectionObserver === 'undefined') return <div className={props.className}>{props.children}</div>
  return <ObservedReveal {...props} />
}

interface RevealProps {
  children: ReactNode
  variant?: keyof typeof VARIANTS
  index?: number
  className?: string
}

function ObservedReveal({
  children,
  variant = 'text',
  index = 0,
  className,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const inView = useInView(ref, { once: true, margin: '0px 0px -48px 0px' })
  const [armed, setArmed] = useState(false)
  const [shown, setShown] = useState(false)

  useLayoutEffect(() => {
    if (reduce || !ref.current || typeof IntersectionObserver === 'undefined') return
    if (ref.current.getBoundingClientRect().top > window.innerHeight - 48) setArmed(true)
  }, [reduce])
  useEffect(() => {
    if (inView) setShown(true)
  }, [inView])

  const v = VARIANTS[variant]
  const hidden = armed && !shown
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={hidden ? v.hidden : v.shown}
      transition={hidden ? { duration: 0 } : { duration: v.duration, ease: EASE, delay: Math.min(index * 0.08, 0.16) }}
      onFocusCapture={() => setShown(true)}
    >
      {children}
    </motion.div>
  )
}
