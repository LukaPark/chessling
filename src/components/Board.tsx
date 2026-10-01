import { Chessground } from '@lichess-org/chessground'
import type { Api } from '@lichess-org/chessground/api'
import '@lichess-org/chessground/assets/chessground.base.css'
import '@lichess-org/chessground/assets/chessground.cburnett.css'
import type { DrawShape } from '@lichess-org/chessground/draw'
import type { Key } from '@lichess-org/chessground/types'
import { useEffect, useRef } from 'react'
import { turnOf } from '../chess/pgn'
import type { Color } from '../chess/types'
import { boardHost, boardRoot } from '../styles/features/board.css'

export interface BoardProps {
  fen: string
  orientation: Color
  lastMoveUci?: string | null
  check?: boolean
  shapes?: DrawShape[]
  movable?: { color: Color; dests: Map<Key, Key[]>; onMove: (from: Key, to: Key) => void } | null
}

export function Board({ fen, orientation, lastMoveUci, check, shapes, movable }: BoardProps) {
  const host = useRef<HTMLDivElement>(null)
  const api = useRef<Api | null>(null)
  const onMoveRef = useRef(movable?.onMove)
  onMoveRef.current = movable?.onMove

  useEffect(() => {
    if (!host.current) return
    api.current = Chessground(host.current, {
      animation: { duration: 150 },
      movable: { free: false, showDests: true, events: { after: (orig, dest) => onMoveRef.current?.(orig, dest) } },
    })
    return () => {
      api.current?.destroy()
      api.current = null
    }
  }, [])

  useEffect(() => {
    api.current?.set({
      fen,
      orientation,
      check: !!check,
      turnColor: turnOf(fen) === 'w' ? 'white' : 'black',
      lastMove: lastMoveUci ? [lastMoveUci.slice(0, 2) as Key, lastMoveUci.slice(2, 4) as Key] : undefined,
      movable: movable ? { color: movable.color, dests: movable.dests } : { color: undefined, dests: new Map() },
    })
  }, [fen, orientation, check, lastMoveUci, movable?.color, movable?.dests])

  useEffect(() => {
    api.current?.setAutoShapes(shapes ?? [])
  }, [shapes])

  return (
    <div className={boardRoot}>
      <div ref={host} className={boardHost} />
    </div>
  )
}
