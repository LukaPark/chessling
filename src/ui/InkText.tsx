import { motion, useReducedMotion } from 'motion/react'
import { cx } from './cx'
import * as s from './inkText.css'

/** 글자가 왼쪽부터 청색 그라디언트로 드러났다가 잉크색으로 정착한다. 시각 전용(aria-hidden) */
export function InkText({ text, step = 0.12, delay = 0, className }: { text: string; step?: number; delay?: number; className?: string }) {
  const reduce = useReducedMotion()
  if (reduce) {
    return (
      <span aria-hidden="true" className={className}>
        {text}
      </span>
    )
  }
  return (
    <span aria-hidden="true" className={cx(s.root, className)}>
      {Array.from(text).map((ch, i) => {
        const at = delay + i * step
        return (
          <span key={i} className={s.char}>
            <motion.span className={s.ink} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.55, delay: at + 0.12 }}>
              {ch}
            </motion.span>
            <motion.span
              className={s.glow}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.67, times: [0, 0.18, 1], delay: at }}
            >
              {ch}
            </motion.span>
          </span>
        )
      })}
    </span>
  )
}
