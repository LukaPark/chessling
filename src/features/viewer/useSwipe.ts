import { useRef, type TouchEvent } from 'react'

export function useSwipe({ onPrev, onNext, threshold = 40 }: { onPrev: () => void; onNext: () => void; threshold?: number }) {
  const start = useRef<{ x: number; y: number } | null>(null)
  return {
    onTouchStart: (e: TouchEvent) => {
      const t = e.touches[0]
      start.current = t ? { x: t.clientX, y: t.clientY } : null
    },
    onTouchEnd: (e: TouchEvent) => {
      const s = start.current
      start.current = null
      const t = e.changedTouches[0]
      if (!s || !t) return
      const dx = t.clientX - s.x
      const dy = t.clientY - s.y
      if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) return
      if (dx < 0) onNext()
      else onPrev()
    },
  }
}
