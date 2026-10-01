import { useCallback, useEffect, useRef, useState } from 'react'

export interface Autoplay {
  ply: number
  playing: boolean
  finished: boolean
  start: () => void
  pause: () => void
  play: () => void
  restart: () => void
}

export function useAutoplay(total: number, { intervalMs = 900, reduced = false }: { intervalMs?: number; reduced?: boolean } = {}): Autoplay {
  const [ply, setPly] = useState(reduced ? total : 0)
  const [playing, setPlaying] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setPly((p) => Math.min(total, p + 1)), intervalMs)
    return () => window.clearInterval(id)
  }, [playing, intervalMs, total])

  useEffect(() => {
    if (playing && ply >= total) setPlaying(false)
  }, [playing, ply, total])

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) setPlaying(false)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const start = useCallback(() => {
    if (started.current || reduced) return
    started.current = true
    setPlaying(true)
  }, [reduced])
  const pause = useCallback(() => setPlaying(false), [])
  const play = useCallback(() => {
    if (reduced) return
    started.current = true
    setPly((p) => (p >= total ? 0 : p))
    setPlaying(true)
  }, [reduced, total])
  const restart = useCallback(() => {
    if (reduced) return
    started.current = true
    setPly(0)
    setPlaying(true)
  }, [reduced])

  return { ply, playing, finished: ply >= total, start, pause, play, restart }
}
