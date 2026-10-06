import { useEffect, useMemo, useRef, useState } from 'react'
import { useEngines } from '../../app/EngineContext'
import { pvToSan, turnOf } from '../../chess/pgn'
import type { Color, Ply } from '../../chess/types'
import { compose } from '../../engine/comment/compose'
import type { MoveLabel } from '../../engine/judge'
import { analyzePosition, judgePly, REVIEW_DEPTH, type ReviewedPosition } from '../../engine/review'

/** 리뷰 화면과 같은 판정이 나오도록 리뷰와 같은 깊이·MultiPV 2로 분석한다 */
export const MOVE_EVAL_DEPTH = REVIEW_DEPTH

const GOOD_ENOUGH = new Set<MoveLabel>(['brilliant', 'great', 'best'])

export type LatestEvaluation =
  | { index: number; status: 'pending' }
  | {
      index: number
      status: 'done'
      /** null이면 둘 수 있는 수가 하나뿐이라 판정하지 않았다 */
      label: MoveLabel | null
      betterUci: string | null
      betterSan: string | null
      comment: string | null
    }

interface Entry {
  /** 판정한 수(두기 전 포지션 + 수 + 둔 뒤 포지션). 무르고 다른 수순으로 같은 포지션에 와도(전위) 다른 수로 본다 */
  beforeFen: string
  uci: string
  fen: string
  /** 탐색이 취소됐거나 엔진 오류였다 */
  failed: boolean
  label: MoveLabel | null
  betterUci: string | null
  comment: string | null
  /** 코멘트 반복 방지용 틀 키 */
  keys: string[]
}

/** 플레이어가 둔 마지막 수의 인덱스 */
function latestPlayerPly(plies: Ply[], player: Color): number | null {
  const turn = player === 'white' ? 'w' : 'b'
  for (let i = plies.length - 1; i >= 1; i--) if (turnOf(plies[i - 1].fen) === turn) return i
  return null
}

function validEntry(entries: Map<number, Entry>, plies: Ply[], i: number): Entry | null {
  const e = entries.get(i)
  return e && i >= 1 && plies[i]?.fen === e.fen && plies[i].uci === e.uci && plies[i - 1].fen === e.beforeFen ? e : null
}

/**
 * 분기 대국에서 플레이어의 수를 리뷰와 같은 방식으로 판정한다(세션 동안만, 저장하지 않는다).
 * 내 차례에는 지금 포지션을 미리 분석하고, 수를 두면 그 뒤 포지션을 분석해 judgePly로 판정한다.
 * 분석 엔진(`analysis`)만 쓰므로 상대 엔진(`play`)의 응수를 기다리게 하지 않는다.
 */
export function useMoveEvaluation({
  plies,
  playerColor,
  enabled,
  over,
  seed,
}: {
  plies: Ply[]
  playerColor: Color
  enabled: boolean
  /** 대국이 끝났으면(기권·무승부 포함) 다음 수를 위한 미리 분석을 하지 않는다 */
  over: boolean
  seed: string
}): { latest: LatestEvaluation | null; labels: (MoveLabel | null)[] } {
  const { analysis } = useEngines()
  const [entries, setEntries] = useState<Map<number, Entry>>(() => new Map())
  const entriesRef = useRef(entries)
  entriesRef.current = entries
  // 포지션 분석 결과는 FEN으로 캐시한다. 무르고 같은 수를 다시 두면 엔진을 다시 돌리지 않는다.
  const cache = useRef(new Map<string, ReviewedPosition>())
  const inflight = useRef(new Map<string, Promise<ReviewedPosition | null>>())
  // 이번 페이지 세션에 둔 수만 평가한다(새로고침하면 지워진다는 설계). 인덱스가 이 값 이상인 수가 이번 세션의 수이고,
  // 무르기로 그보다 앞으로 돌아가면 그 지점부터 다시 센다.
  const [sessionFrom, setSessionFrom] = useState(plies.length)
  if (plies.length < sessionFrom) setSessionFrom(plies.length)
  const floor = Math.min(sessionFrom, plies.length)

  // 무르기로 사라진 수의 판정을 지운다
  useEffect(() => {
    setEntries((prev) => {
      const stale = [...prev.keys()].filter((i) => !validEntry(prev, plies, i))
      if (stale.length === 0) return prev
      const next = new Map(prev)
      for (const i of stale) next.delete(i)
      return next
    })
  }, [plies])

  useEffect(() => {
    if (!enabled) return
    let active = true
    const isActive = () => active

    const start = (fen: string): Promise<ReviewedPosition | null> => {
      const p = analyzePosition(analysis, fen, { depth: MOVE_EVAL_DEPTH })
        .catch(() => null)
        .then((r) => {
          if (inflight.current.get(fen) === p) inflight.current.delete(fen)
          if (r) cache.current.set(fen, r)
          return r
        })
      inflight.current.set(fen, p)
      return p
    }
    // 분석 엔진은 새 탐색이 이전 탐색을 끊으므로, 한 번에 한 포지션씩 차례로 분석한다.
    const position = async (fen: string): Promise<ReviewedPosition | null> => {
      const cached = cache.current.get(fen)
      if (cached) return cached
      const shared = inflight.current.get(fen)
      if (shared) {
        // 이전 실행이 시작한 탐색을 이어받는다. 그 탐색이 취소됐으면 지금 실행에서 한 번 더 해 본다.
        const r = await shared
        if (r || !isActive()) return r
      }
      return start(fen)
    }

    const run = async () => {
      const latest = latestPlayerPly(plies, playerColor)
      const target = latest !== null && latest >= floor ? latest : null
      if (target !== null && !validEntry(entriesRef.current, plies, target)) {
        const before = await position(plies[target - 1].fen)
        const after = before && isActive() ? await position(plies[target].fen) : null
        if (!isActive()) return
        const entry = before && after ? judge(plies, target, before, after) : null
        setEntries((prev) => new Map(prev).set(target, entry ?? failedEntry(plies, target)))
      }
      // 내 차례면 지금 포지션을 미리 분석해 둔다
      const last = plies[plies.length - 1]
      if (isActive() && !over && turnOf(last.fen) === (playerColor === 'white' ? 'w' : 'b')) await position(last.fen)
    }

    /** 판정과 코멘트. 놓침(miss)은 상대 수 앞뒤 포지션이 캐시에 있어야 가릴 수 있다(없으면 previousLabel은 null) */
    const judge = (plies: Ply[], i: number, before: ReviewedPosition, after: ReviewedPosition): Entry => {
      const positions: ReviewedPosition[] = []
      positions[i - 1] = before
      positions[i] = after
      let previousLabel: MoveLabel | null = null
      const beforeOpponent = i >= 2 ? cache.current.get(plies[i - 2].fen) : undefined
      if (beforeOpponent) {
        positions[i - 2] = beforeOpponent
        const myPrevious = validEntry(entriesRef.current, plies, i - 2)?.label ?? null
        previousLabel = judgePly(plies, positions, i - 1, myPrevious)
      }
      const label = judgePly(plies, positions, i, previousLabel)
      const labels: (MoveLabel | null)[] = []
      labels[i - 1] = previousLabel
      labels[i] = label
      // 리뷰처럼 직전 3수에서 쓴 틀은 피한다. 상대 수에는 코멘트가 없으니 내 직전 수만 본다.
      const used = [i - 3, i - 2, i - 1].flatMap((k) => validEntry(entriesRef.current, plies, k)?.keys ?? [])
      const composed = label ? compose({ plies: plies.slice(0, i + 1), positions, labels, index: i, seed }, used) : null
      const played = plies[i].uci
      const mated = after.legalMoves === 0 && 'cp' in after.score && after.score.cp !== 0
      const better = label && !GOOD_ENOUGH.has(label) && !mated && before.best && before.best !== played ? before.best : null
      return {
        ...moveOf(plies, i),
        failed: false,
        label,
        betterUci: better,
        comment: composed?.comment.text ?? null,
        keys: composed?.keys ?? [],
      }
    }

    void run()
    return () => {
      active = false
    }
  }, [plies, playerColor, enabled, over, floor, seed, analysis])

  // 끄거나 페이지를 떠나면 진행 중인 평가 탐색을 멈춘다
  useEffect(() => {
    if (!enabled) return
    return () => analysis.stop()
  }, [enabled, analysis])

  return useMemo(() => {
    if (!enabled) return { latest: null, labels: [] }
    const labels: (MoveLabel | null)[] = plies.map((_, i) => validEntry(entries, plies, i)?.label ?? null)
    const target = latestPlayerPly(plies, playerColor)
    if (target === null || target < floor) return { latest: null, labels }
    const e = validEntry(entries, plies, target)
    if (!e) return { latest: { index: target, status: 'pending' }, labels }
    if (e.failed) return { latest: null, labels }
    const betterSan = e.betterUci ? (pvToSan(plies[target - 1].fen, [e.betterUci], 1)[0] ?? null) : null
    return {
      latest: { index: target, status: 'done', label: e.label, betterUci: e.betterUci, betterSan, comment: e.comment },
      labels,
    }
  }, [enabled, entries, plies, playerColor, floor])
}

function moveOf(plies: Ply[], i: number): Pick<Entry, 'beforeFen' | 'uci' | 'fen'> {
  return { beforeFen: plies[i - 1].fen, uci: plies[i].uci ?? '', fen: plies[i].fen }
}

function failedEntry(plies: Ply[], i: number): Entry {
  return { ...moveOf(plies, i), failed: true, label: null, betterUci: null, comment: null, keys: [] }
}
