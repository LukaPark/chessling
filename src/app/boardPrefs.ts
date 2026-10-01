import { useCallback, useSyncExternalStore } from 'react'
import { BOARD_THEMES, PIECE_SETS, type BoardTheme, type PieceSet } from '../styles/boardThemes'

export { BOARD_THEMES, PIECE_SETS, type BoardTheme, type PieceSet }

export const BOARD_KEY = 'chessling-board'
export const PIECES_KEY = 'chessling-pieces'
export const DEFAULT_BOARD: BoardTheme = 'cool'
export const DEFAULT_PIECES: PieceSet = 'cburnett'

function isOneOf<T extends string>(list: readonly T[], v: unknown): v is T {
  return typeof v === 'string' && (list as readonly string[]).includes(v)
}

function readStored<T extends string>(key: string, list: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return isOneOf(list, v) ? v : fallback
  } catch {
    return fallback
  }
}

function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // 저장할 수 없어도 이번 세션에는 적용한다
  }
}

export const readStoredBoard = (): BoardTheme => readStored(BOARD_KEY, BOARD_THEMES, DEFAULT_BOARD)
export const readStoredPieces = (): PieceSet => readStored(PIECES_KEY, PIECE_SETS, DEFAULT_PIECES)

// <html>의 data-board·data-pieces가 현재 값의 원천이다. 없거나 틀리면 저장값을 쓴다.
const currentBoard = (): BoardTheme => {
  const v = document.documentElement.dataset.board
  return isOneOf(BOARD_THEMES, v) ? v : readStoredBoard()
}
const currentPieces = (): PieceSet => {
  const v = document.documentElement.dataset.pieces
  return isOneOf(PIECE_SETS, v) ? v : readStoredPieces()
}

const listeners = new Set<() => void>()
function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const notify = () => listeners.forEach((fn) => fn())

export function applyBoardPrefs(board: BoardTheme, pieces: PieceSet): void {
  document.documentElement.dataset.board = board
  document.documentElement.dataset.pieces = pieces
}

export function useBoardPrefs(): {
  board: BoardTheme
  pieces: PieceSet
  setBoard: (b: BoardTheme) => void
  setPieces: (p: PieceSet) => void
} {
  const board = useSyncExternalStore(subscribe, currentBoard)
  const pieces = useSyncExternalStore(subscribe, currentPieces)
  const setBoard = useCallback((b: BoardTheme) => {
    store(BOARD_KEY, b)
    applyBoardPrefs(b, currentPieces())
    notify()
  }, [])
  const setPieces = useCallback((p: PieceSet) => {
    store(PIECES_KEY, p)
    applyBoardPrefs(currentBoard(), p)
    notify()
  }, [])
  return { board, pieces, setBoard, setPieces }
}
