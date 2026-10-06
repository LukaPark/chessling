import { useCallback, useSyncExternalStore } from 'react'

export const MOVE_EVAL_KEY = 'chessling-move-eval'

function readStored(): boolean {
  try {
    return localStorage.getItem(MOVE_EVAL_KEY) !== '0'
  } catch {
    return true
  }
}

let current: boolean | null = null
const listeners = new Set<() => void>()
const snapshot = () => (current ??= readStored())
function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** 분기 대국의 수 평가 토글. 기본은 켜짐이고, 저장할 수 없으면 이번 세션에만 적용한다 */
export function useMoveEvalPref(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, snapshot)
  const setOn = useCallback((v: boolean) => {
    current = v
    try {
      localStorage.setItem(MOVE_EVAL_KEY, v ? '1' : '0')
    } catch {
      // 저장할 수 없어도 이번 세션에는 적용한다
    }
    listeners.forEach((fn) => fn())
  }, [])
  return [on, setOn]
}

export function resetMoveEvalPrefForTest(): void {
  current = null
}
