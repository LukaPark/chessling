import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameSummary } from '../../chess/types'
import { listLichessGames } from '../../sources/lichess'

export function useLichessGames(username: string) {
  const [games, setGames] = useState<GameSummary[]>([])
  const [nextUntil, setNextUntil] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [errorCount, setErrorCount] = useState(0)
  const lastUntil = useRef<number | undefined>(undefined)
  const committed = useRef<GameSummary[]>([])
  const controller = useRef<AbortController | null>(null)

  const load = useCallback(
    async (until: number | undefined) => {
      controller.current?.abort()
      const ac = new AbortController()
      controller.current = ac
      const { signal } = ac
      lastUntil.current = until
      // 이 페이지 이전까지 확정된 대국. 재시도하면 부분 수신분을 버리고 여기서 다시 시작한다.
      const base = committed.current
      const received: GameSummary[] = []
      setLoading(true)
      setError(null)
      try {
        const page = await listLichessGames(username, {
          until,
          signal,
          onGame: (g) => {
            if (signal.aborted) return
            received.push(g)
            setGames([...base, ...received])
          },
        })
        if (!signal.aborted) {
          committed.current = [...base, ...received]
          setNextUntil(page.nextUntil)
        }
      } catch (e) {
        if (!signal.aborted) {
          setError(e)
          setErrorCount((n) => n + 1)
        }
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    },
    [username],
  )

  useEffect(() => {
    committed.current = []
    setGames([])
    setNextUntil(null)
    void load(undefined)
    return () => controller.current?.abort()
  }, [load])

  return {
    games,
    loading,
    error,
    errorCount,
    hasMore: nextUntil !== null,
    loadMore: () => nextUntil !== null && void load(nextUntil),
    retry: () => void load(lastUntil.current),
  }
}
