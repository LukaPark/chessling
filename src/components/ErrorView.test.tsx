// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PgnError } from '../chess/pgn'
import { HttpError } from '../sources/http'
import { ErrorView } from './ErrorView'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('ErrorView', () => {
  it('not_found', () => {
    render(<ErrorView error={new HttpError('not_found', 404, 'x')} />)
    expect(screen.getByText(/찾을 수 없어요/)).toBeInTheDocument()
  })

  it('rate_limited는 60초 동안 재시도 버튼을 막는다', () => {
    vi.useFakeTimers()
    const onRetry = vi.fn()
    render(<ErrorView error={new HttpError('rate_limited', 429, 'x')} onRetry={onRetry} />)
    const button = screen.getByRole('button', { name: '다시 시도' })
    expect(button).toBeDisabled()
    expect(screen.getByText(/60초 후/)).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(59_000)
    })
    expect(button).toBeDisabled()
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(button).toBeEnabled()
    fireEvent.click(button)
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('PGN 오류', () => {
    render(<ErrorView error={new PgnError('bad')} />)
    expect(screen.getByText(/기보를 읽을 수 없어요/)).toBeInTheDocument()
  })
})
