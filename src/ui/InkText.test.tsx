// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { InkText } from './InkText'

afterEach(cleanup)

it('글자를 모두 그리고 접근성 트리에서는 숨긴다', () => {
  const { container } = render(<InkText text="직접 참여" />)
  const root = container.firstElementChild!
  expect(root).toHaveAttribute('aria-hidden', 'true')
  expect(root.textContent).toContain('직')
  expect(root.textContent).toContain('여')
})
