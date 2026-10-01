import { useEffect, useState } from 'react'
import { useEngines } from '../../app/EngineContext'
import { terminalScore } from '../../engine/review'
import type { EngineLine } from '../../engine/UciEngine'

const LIVE_DEPTH = 18
const DEBOUNCE_MS = 150

export function useLiveAnalysis(fen: string | null, enabled: boolean): { lines: EngineLine[]; error: unknown } {
  const { analysis } = useEngines()
  const [lines, setLines] = useState<EngineLine[]>([])
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    setLines([])
    if (!fen || !enabled || terminalScore(fen)) return
    let active = true
    const timer = setTimeout(() => {
      analysis
        .analyze(fen, { depth: LIVE_DEPTH, multiPv: 3 }, (ls) => {
          if (active) setLines(ls)
        })
        .then((r) => {
          if (active && !r.cancelled) {
            setLines(r.lines)
            setError(null)
          }
        })
        .catch((e) => {
          if (active) setError(e)
        })
    }, DEBOUNCE_MS)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [fen, enabled, analysis])

  // 페이지를 떠나면 진행 중인 탐색을 멈춘다. (리뷰 시작은 latest-wins가 알아서 이전 탐색을 끊으므로 여기서 멈추지 않는다)
  useEffect(() => () => analysis.stop(), [analysis])

  return { lines, error }
}
