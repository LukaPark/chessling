// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import type { Ply } from '../../chess/types'
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
  render(<ReviewSummary review={review} startTurn="w" plies={plies([])} result="*" onRerun={() => {}} />)
  const white = screen.getByText('91.3%')
  expect(white).toHaveAttribute('data-accuracy', 'white')
  expect(screen.getByText('-')).toHaveAttribute('data-accuracy', 'black')
  expect(screen.getByText(/백 정확도/)).toBeInTheDocument()
  expect(screen.getByText(/흑 정확도/)).toBeInTheDocument()
})

function plies(sans: string[]): Ply[] {
  const c = new Chess()
  const out: Ply[] = [{ san: null, uci: null, fen: c.fen() }]
  for (const s of sans) {
    const m = c.move(s)
    out.push({ san: m.san, uci: m.from + m.to, fen: c.fen() })
  }
  return out
}

it('정확도 위에 대국 요약 제목과 한 문장을 보여준다', () => {
  const fool = plies(['f3', 'e5', 'g4', 'Qh4#'])
  const cps = [0, 0, 0, -10000, -10000]
  const r: GameReview = {
    ...review,
    positions: cps.map((cp) => ({ score: { cp }, best: null, pv: [], second: null, legalMoves: 20 })),
    labels: [null, 'good', 'good', 'blunder', 'best'],
  }
  render(<ReviewSummary review={r} startTurn="w" plies={fool} result="0-1" mySide="b" onRerun={() => {}} />)
  const headline = screen.getByText(/2수.*체크메이트/)
  expect(headline).toHaveAttribute('data-summary', 'headline')
  expect(screen.getByText(/요\.$/, { selector: '[data-summary="line"]' })).toBeInTheDocument()
  // 요약이 정확도보다 앞에 온다
  expect(headline.compareDocumentPosition(screen.getByText(/백 정확도/)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})

it('요약할 수가 없으면 요약을 그리지 않는다', () => {
  render(<ReviewSummary review={review} startTurn="w" plies={plies([])} result="*" onRerun={() => {}} />)
  expect(document.querySelector('[data-summary]')).toBeNull()
})
