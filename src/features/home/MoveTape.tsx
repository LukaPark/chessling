import { useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { moveNumberOf } from '../../chess/moveNumber'
import type { Ply } from '../../chess/types'
import * as h from '../../styles/features/home.css'
import { visuallyHidden } from '../../ui/a11y.css'
import { InkText } from '../../ui/InkText'

export function MoveTape({ plies, current, onPointerDown }: { plies: Ply[]; current: number; onPointerDown?: () => void }) {
  const ref = useRef<HTMLOListElement>(null)
  const reduce = useReducedMotion()
  useEffect(() => {
    const el = ref.current
    el?.scrollTo?.({ left: el.scrollWidth, behavior: reduce ? 'auto' : 'smooth' })
  }, [current, reduce])
  return (
    <ol ref={ref} className={h.tape} aria-label="재생 중인 기보" onPointerDown={onPointerDown}>
      {plies.slice(1, current + 1).map((p, idx) => {
        const i = idx + 1
        const { number, white } = moveNumberOf(plies[0].fen, i)
        const prefix = white ? `${number}.` : idx === 0 ? `${number}...` : ''
        return (
          <li key={i} className={h.tapeItem}>
            {prefix && <span className={h.tapeNo}>{prefix}</span>}
            <span>
              <span className={visuallyHidden}>{p.san}</span>
              <InkText text={p.san ?? ''} step={0.04} />
            </span>
          </li>
        )
      })}
    </ol>
  )
}
