// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Dialog } from './Dialog'

afterEach(cleanup)

it('열린 상태로 마운트되고 닫기·Esc로 onClose', () => {
  const onClose = vi.fn()
  render(
    <Dialog title="기보" onClose={onClose}>
      <p>내용</p>
    </Dialog>,
  )
  const dialog = screen.getByRole('dialog', { name: '기보' })
  expect(dialog).toHaveAttribute('open')
  fireEvent.click(screen.getByRole('button', { name: '닫기' }))
  expect(onClose).toHaveBeenCalledTimes(1)
  fireEvent(dialog, new Event('cancel', { cancelable: true }))
  expect(onClose).toHaveBeenCalledTimes(2)
})

it('닫히면 포커스가 열었던 버튼으로 돌아간다', () => {
  const opener = document.createElement('button')
  document.body.appendChild(opener)
  opener.focus()
  const { unmount } = render(
    <Dialog title="기보" onClose={() => {}}>
      <p>내용</p>
    </Dialog>,
  )
  screen.getByRole('button', { name: '닫기' }).focus()
  expect(document.activeElement).not.toBe(opener)
  unmount()
  expect(document.activeElement).toBe(opener)
  opener.remove()
})
