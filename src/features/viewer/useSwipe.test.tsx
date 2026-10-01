// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useSwipe } from './useSwipe'

afterEach(cleanup)

function Probe({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  const swipe = useSwipe({ onPrev, onNext })
  return <div data-testid="area" {...swipe} />
}

it('왼쪽 스와이프는 다음, 오른쪽은 이전, 세로·짧은 움직임은 무시', () => {
  const onPrev = vi.fn()
  const onNext = vi.fn()
  render(<Probe onPrev={onPrev} onNext={onNext} />)
  const area = screen.getByTestId('area')
  fireEvent.touchStart(area, { touches: [{ clientX: 300, clientY: 100 }] })
  fireEvent.touchEnd(area, { changedTouches: [{ clientX: 200, clientY: 110 }] })
  expect(onNext).toHaveBeenCalledTimes(1)
  fireEvent.touchStart(area, { touches: [{ clientX: 100, clientY: 100 }] })
  fireEvent.touchEnd(area, { changedTouches: [{ clientX: 180, clientY: 100 }] })
  expect(onPrev).toHaveBeenCalledTimes(1)
  fireEvent.touchStart(area, { touches: [{ clientX: 100, clientY: 100 }] })
  fireEvent.touchEnd(area, { changedTouches: [{ clientX: 120, clientY: 100 }] })
  fireEvent.touchStart(area, { touches: [{ clientX: 100, clientY: 100 }] })
  fireEvent.touchEnd(area, { changedTouches: [{ clientX: 160, clientY: 300 }] })
  expect(onNext).toHaveBeenCalledTimes(1)
  expect(onPrev).toHaveBeenCalledTimes(1)
})
