// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { COMMENT_CLAMP_CHARS, CommentText } from './CommentText'

it('가정 수순을 변화 수순으로 표시한다', () => {
  const { container } = render(<CommentText text="받으면 [[9...cxd5 10. exd5]]로 줄이 열려요." />)
  expect(container.querySelector('[data-variation]')?.textContent).toBe('9...cxd5 10. exd5')
  expect(screen.getByText(/로 줄이 열려요/)).toBeInTheDocument()
})

it('짧은 글은 접지 않는다', () => {
  render(<CommentText text="킹을 피신시켰어요." />)
  expect(screen.queryByRole('button', { name: '더 보기' })).toBeNull()
})

it('긴 글은 접고 더 보기로 펼친다', () => {
  render(<CommentText text={'가'.repeat(COMMENT_CLAMP_CHARS + 1)} />)
  const more = screen.getByRole('button', { name: '더 보기' })
  expect(more).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(more)
  expect(screen.getByRole('button', { name: '접기' })).toHaveAttribute('aria-expanded', 'true')
})
