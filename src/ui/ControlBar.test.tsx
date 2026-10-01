// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { Lightbulb } from 'lucide-react'
import { afterEach, expect, it } from 'vitest'
import { BarButton, ControlBar } from './ControlBar'

afterEach(cleanup)

it('그룹 이름과 버튼 이름', () => {
  render(
    <ControlBar label="수 이동">
      <BarButton icon={Lightbulb} label="힌트" pressed={false} />
      <BarButton label="기보 전체 보기 (3 / 10)">
        <span>3 / 10</span>
      </BarButton>
      <BarButton icon={Lightbulb} label="무르기" caption />
    </ControlBar>,
  )
  expect(screen.getByRole('group', { name: '수 이동' })).toBeInTheDocument()
  expect(screen.getByRole('group', { name: '수 이동' })).toHaveAttribute('data-control-bar')
  expect(screen.getByRole('button', { name: '힌트' })).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getByRole('button', { name: '기보 전체 보기 (3 / 10)' })).toHaveTextContent('3 / 10')
  expect(screen.getByRole('button', { name: '무르기' })).toHaveTextContent('무르기')
})
