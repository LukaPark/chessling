// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Reveal } from './Reveal'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('IntersectionObserver가 없으면 숨기지 않는다', () => {
  const saved = globalThis.IntersectionObserver
  // @ts-expect-error 테스트에서 일부러 제거
  delete globalThis.IntersectionObserver
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: window.innerHeight + 500 } as DOMRect)
  try {
    render(
      <Reveal>
        <p>내용</p>
      </Reveal>,
    )
    const wrapper = screen.getByText('내용').parentElement!
    expect(wrapper.style.opacity).not.toBe('0')
  } finally {
    globalThis.IntersectionObserver = saved
  }
})
