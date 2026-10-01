// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { EngineLines } from './EngineLines'

afterEach(cleanup)
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

it('점수와 SAN 수순', () => {
  render(
    <EngineLines
      fen={START}
      lines={[
        { depth: 18, multipv: 1, score: { cp: 30 }, pv: ['e2e4', 'e7e5'] },
        { depth: 18, multipv: 2, score: { cp: 20 }, pv: ['d2d4'] },
      ]}
    />,
  )
  expect(screen.getByText('+0.30')).toBeInTheDocument()
  expect(screen.getByText('e4 e5')).toBeInTheDocument()
  expect(screen.getByText('d4')).toBeInTheDocument()
})
