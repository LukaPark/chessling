// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

// motion의 useReducedMotion은 matchMedia를 처음 한 번만 읽어 캐시하므로 훅 자체를 제어한다
const reduced = vi.hoisted(() => ({ value: false }))
vi.mock('motion/react', async (orig) => ({
  ...(await orig<typeof import('motion/react')>()),
  useReducedMotion: () => reduced.value,
}))
import { Disclosure } from './Disclosure'

afterEach(cleanup)

it('기본은 닫힘이고 누르면 펼친다', () => {
  const onOpenChange = vi.fn()
  render(
    <Disclosure title="기보 전체" onOpenChange={onOpenChange} testId="moves">
      <button type="button">e4</button>
    </Disclosure>,
  )
  const trigger = screen.getByRole('button', { name: '기보 전체' })
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByTestId('moves')).toHaveAttribute('aria-hidden', 'true')
  expect(screen.queryByRole('button', { name: 'e4' })).toBeNull()
  fireEvent.click(trigger)
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  expect(onOpenChange).toHaveBeenCalledWith(true)
  expect(screen.getByRole('button', { name: 'e4' })).toBeInTheDocument()
})

it('제어 모드', () => {
  render(
    <Disclosure title="엔진 라인" open onOpenChange={() => {}}>
      내용
    </Disclosure>,
  )
  expect(screen.getByRole('button', { name: '엔진 라인' })).toHaveAttribute('aria-expanded', 'true')
})

it('모션 감소 설정이면 높이 애니메이션 없이 곧바로 최종 상태가 된다', async () => {
  reduced.value = true
  try {
    render(
      <Disclosure title="엔진 라인" testId="c">
        내용
      </Disclosure>,
    )
    fireEvent.click(screen.getByRole('button', { name: '엔진 라인' }))
    const content = screen.getByTestId('c')
    expect(content).toHaveAttribute('aria-hidden', 'false')
    // 애니메이션이면 0.32초가 걸린다. 모션 감소는 다음 프레임 안에 끝나야 한다.
    await waitFor(
      () => {
        expect(content.style.height).toBe('auto')
        expect(content.style.opacity).toBe('1')
      },
      { timeout: 150 },
    )
  } finally {
    reduced.value = false
  }
})
