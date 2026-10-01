import { useCallback, useEffect, useRef, useState } from 'react'
import { useEngines } from '../../app/EngineContext'
import { useStore } from '../../app/StoreContext'
import { refKey, type GameRef } from '../../chess/gameRef'
import type { Ply } from '../../chess/types'
import { buildReview, REVIEW_DEPTH, REVIEW_VERSION, reviewGame, type GameReview, type ReviewedPosition } from '../../engine/review'

export type ReviewState =
  | { status: 'idle' }
  | { status: 'running'; done: number; total: number; partial: ReviewedPosition[] }
  | { status: 'done'; review: GameReview }
  // attempt: 실패할 때마다 증가. ErrorView(60초 잠금은 인스턴스 단위)를 key로 다시 마운트하는 데 쓴다.
  | { status: 'error'; error: unknown; attempt: number }

// cacheable=false: 진행 중인 대국은 수가 늘어나므로 리뷰를 캐시에 남기지 않는다.
export function useReview(ref: GameRef | null, plies: Ply[] | null, cacheable = true) {
  const store = useStore()
  const { analysis } = useEngines()
  const [state, setState] = useState<ReviewState>({ status: 'idle' })
  const abortRef = useRef<AbortController | null>(null)
  const attemptRef = useRef(0)
  const key = ref ? refKey(ref) : null
  const pliesLength = plies?.length ?? null
  // 캐시를 다시 판정할 때 쓴다. plies 참조가 바뀌어도 캐시 로드를 다시 돌리지 않도록 ref로 둔다.
  const pliesRef = useRef(plies)
  pliesRef.current = plies

  useEffect(() => {
    setState({ status: 'idle' })
    if (!key) return
    let alive = true
    void store.reviews.get(key).then((cached) => {
      const current = pliesRef.current
      if (!alive || !cached || !current) return
      if (cached.review.version !== REVIEW_VERSION || cached.review.positions.length !== pliesLength) return
      // 판정 기준이 바뀌어도 버전을 올리지 않도록, 저장된 엔진 점수로 판정·정확도를 다시 계산한다.
      setState({ status: 'done', review: buildReview(current, cached.review.positions, cached.review.depth) })
    })
    return () => {
      alive = false
      abortRef.current?.abort()
    }
  }, [key, store, pliesLength])

  const start = useCallback(async () => {
    if (!key || !plies) return
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setState({ status: 'running', done: 0, total: plies.length, partial: [] })
    try {
      const review = await reviewGame(analysis, plies, {
        depth: REVIEW_DEPTH,
        signal: ac.signal,
        onProgress: (done, total, positions) => {
          if (!ac.signal.aborted) setState({ status: 'running', done, total, partial: [...positions] })
        },
      })
      if (ac.signal.aborted) return
      if (cacheable) await store.reviews.put({ key, depth: review.depth, review, createdAt: Date.now() })
      setState({ status: 'done', review })
    } catch (error) {
      if (!ac.signal.aborted) setState({ status: 'error', error, attempt: ++attemptRef.current })
    }
  }, [key, plies, analysis, store, cacheable])

  return { state, start }
}
