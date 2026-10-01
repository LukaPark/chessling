// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import type { GameReview } from '../../engine/review'
import { ReviewSummary } from './ReviewSummary'

afterEach(cleanup)

const review: GameReview = {
  version: 2,
  depth: 14,
  positions: [],
  labels: [null],
  accuracy: { white: 91.26, black: null },
}

it('양쪽 정확도를 이름과 큰 숫자로 따로 보여준다', () => {
  render(<ReviewSummary review={review} startTurn="w" onRerun={() => {}} />)
  const white = screen.getByText('91.3%')
  expect(white).toHaveAttribute('data-accuracy', 'white')
  expect(screen.getByText('-')).toHaveAttribute('data-accuracy', 'black')
  expect(screen.getByText(/백 정확도/)).toBeInTheDocument()
  expect(screen.getByText(/흑 정확도/)).toBeInTheDocument()
})
