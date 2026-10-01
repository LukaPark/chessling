import { createElement } from 'react'
import type { BoardProps } from '../components/Board'

export const boardProps: { current: BoardProps | null } = { current: null }

export function Board(props: BoardProps) {
  boardProps.current = props
  return createElement('div', { 'data-testid': 'board', 'data-fen': props.fen })
}
