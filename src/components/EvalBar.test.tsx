// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { EvalBar } from './EvalBar'

afterEach(cleanup)

it('동점이면 50%와 0.00', () => {
  render(<EvalBar score={{ cp: 0 }} orientation="white" />)
  expect(screen.getByRole('meter', { name: '평가' })).toHaveAttribute('aria-valuenow', '50')
  expect(screen.getByText('0.00')).toBeInTheDocument()
})

it('메이트는 100%와 M2', () => {
  render(<EvalBar score={{ mate: 2 }} orientation="black" />)
  expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '100')
  expect(screen.getByText('M2')).toBeInTheDocument()
})

it('점수가 없으면 …', () => {
  render(<EvalBar score={null} orientation="white" />)
  expect(screen.getByText('…')).toBeInTheDocument()
})
