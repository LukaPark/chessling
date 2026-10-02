// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { pgnToPlies } from '../../chess/pgn'
import { buildIndex } from '../../openings/buildIndex'
import { identifyOpening } from '../../openings/identify'
import type { OpeningData } from '../../openings/types'
import { OpeningPanel } from './OpeningPanel'

afterEach(cleanup)

const NAJDORF = '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6'
const { entries } = buildIndex([
  { eco: 'B20', name: 'Sicilian Defense', pgn: '1. e4 c5' },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation', pgn: NAJDORF },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation, English Attack', pgn: `${NAJDORF} 6. Be3` },
])
const DATA: OpeningData = {
  index: entries,
  ko: {
    families: { 'Sicilian Defense': { name: '시실리안 디펜스', idea: '계열 아이디어예요.', plans: { white: '백 계획이에요.', black: '흑 계획이에요.' } } },
    variations: { 'Sicilian Defense: Najdorf Variation': { name: '나이도르프 변화', summary: '변화 요약이에요.', line: `${NAJDORF} 6. Be3` } },
  },
}

describe('OpeningPanel', () => {
  it('계열·변화 설명과 대표 수순을 보여 주고, 버튼으로 연습과 이탈 분기를 부른다', () => {
    const plies = pgnToPlies(`${NAJDORF} 6. f3 *`)
    const track = identifyOpening(plies, DATA)!
    const onPractice = vi.fn()
    const onBranch = vi.fn()
    render(<OpeningPanel track={track} plies={plies} ply={10} onPractice={onPractice} onBranchAtDeviation={onBranch} />)
    expect(screen.getByText('B90 · 시실리안 디펜스: 나이도르프 변화 · Najdorf Variation')).toBeInTheDocument()
    expect(screen.getByText('계열 아이디어예요.')).toBeInTheDocument()
    expect(screen.getByText('백: 백 계획이에요.')).toBeInTheDocument()
    expect(screen.getByText('변화 요약이에요.')).toBeInTheDocument()
    expect(screen.getByLabelText('대표 수순')).toHaveTextContent('1.e4c52.Nf3d63.d4cxd44.Nxd4Nf65.Nc3a66.Be3')
    fireEvent.click(screen.getByRole('button', { name: '이 수순으로 연습' }))
    expect(onPractice).toHaveBeenCalledWith(track.byPly[10])
    fireEvent.click(screen.getByRole('button', { name: '이탈 지점에서 분기' }))
    expect(onBranch).toHaveBeenCalled()
  })

  it('이론에서 벗어나지 않았으면 이탈 분기 버튼을 숨긴다', () => {
    const plies = pgnToPlies(`${NAJDORF} 6. Be3 *`)
    const track = identifyOpening(plies, DATA)!
    render(<OpeningPanel track={track} plies={plies} ply={11} onPractice={() => {}} onBranchAtDeviation={() => {}} />)
    expect(screen.queryByRole('button', { name: '이탈 지점에서 분기' })).toBeNull()
  })
})
