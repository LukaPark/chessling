// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { pgnToPlies } from '../chess/pgn'
import { MoveList } from './MoveList'

afterEach(cleanup)
const plies = pgnToPlies('1. e4 e5 2. Nf3 *')

it('수 번호와 수를 그리고 클릭하면 해당 인덱스를 알린다', () => {
  const onSelect = vi.fn()
  render(<MoveList plies={plies} current={3} onSelect={onSelect} />)
  expect(screen.getByText('1.')).toBeInTheDocument()
  expect(screen.getByText('2.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Nf3' })).toHaveAttribute('aria-current', 'step')
  fireEvent.click(screen.getByRole('button', { name: 'e5' }))
  expect(onSelect).toHaveBeenCalledWith(2)
})

it('등급 기호와 클래스', () => {
  render(<MoveList plies={plies} current={0} onSelect={() => {}} labels={[null, 'best', 'good', 'blunder']} />)
  expect(screen.getByRole('button', { name: 'Nf3??' })).toHaveAttribute('data-label', 'blunder')
  expect(screen.getByRole('button', { name: 'Nf3??' })).toHaveAttribute('title', '블런더')
  expect(screen.getByRole('button', { name: 'e4★' })).toHaveAttribute('data-label', 'best')
  expect(screen.getByRole('button', { name: 'e5' })).toHaveAttribute('data-label', 'good')
  expect(screen.getByRole('button', { name: 'e5' })).toHaveAttribute('title', '좋음')
})

it('흑 차례로 시작하면 N... 표기', () => {
  const blackFirst = pgnToPlies('[SetUp "1"]\n[FEN "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 5"]\n\n5... e5 6. Nf3 *')
  render(<MoveList plies={blackFirst} current={0} onSelect={() => {}} />)
  expect(screen.getByText('5...')).toBeInTheDocument()
  expect(screen.getByText('6.')).toBeInTheDocument()
})

it('onSelect가 없으면 누를 수 없는 목록으로 그린다', () => {
  render(<MoveList plies={plies} current={3} labels={[null, 'best', null, 'blunder']} />)
  expect(screen.queryAllByRole('button')).toHaveLength(0)
  expect(screen.getByText('Nf3')).toHaveAttribute('aria-current', 'step')
  expect(screen.getByText('Nf3')).toHaveAttribute('data-label', 'blunder')
  expect(screen.getByText('??')).toBeInTheDocument()
})

it('퀴즈가 있는 수는 data-quiz와 읽을 이름으로 알린다', () => {
  render(<MoveList plies={plies} current={0} onSelect={() => {}} quizPlies={new Set([3])} />)
  expect(screen.getByRole('button', { name: 'Nf3 (퀴즈 있음)' })).toHaveAttribute('data-quiz', '')
  expect(screen.getByRole('button', { name: 'e5' })).not.toHaveAttribute('data-quiz')
})
