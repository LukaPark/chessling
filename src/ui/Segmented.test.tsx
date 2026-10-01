// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Segmented } from './Segmented'

afterEach(cleanup)

it('라디오 그룹으로 선택을 알린다', () => {
  const onChange = vi.fn()
  render(
    <Segmented
      legend="플랫폼"
      name="p"
      value="chesscom"
      onChange={onChange}
      options={[
        { value: 'chesscom', label: 'Chess.com' },
        { value: 'lichess', label: 'Lichess' },
      ]}
    />,
  )
  expect(screen.getByRole('group', { name: '플랫폼' })).toBeInTheDocument()
  expect(screen.getByLabelText('Chess.com')).toBeChecked()
  fireEvent.click(screen.getByLabelText('Lichess'))
  expect(onChange).toHaveBeenCalledWith('lichess')
})
