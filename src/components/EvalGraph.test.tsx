// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { EvalGraph } from './EvalGraph'

afterEach(cleanup)

it('포지션마다 클릭 영역이 있고 클릭하면 이동한다', () => {
  const onSelect = vi.fn()
  render(<EvalGraph scores={[{ cp: 0 }, { cp: 50 }, null]} current={1} onSelect={onSelect} />)
  const graph = screen.getByRole('img', { name: '평가 그래프' })
  expect(graph).toBeInTheDocument()
  expect(graph.querySelectorAll('[aria-label]')).toHaveLength(0)
  fireEvent.click(graph.querySelector('[data-ply="2"]')!)
  expect(onSelect).toHaveBeenCalledWith(2)
})

it('포지션이 하나뿐이면 그리지 않는다', () => {
  const { container } = render(<EvalGraph scores={[{ cp: 0 }]} current={0} onSelect={() => {}} />)
  expect(container).toBeEmptyDOMElement()
})

it('reveal이어도 클릭 영역은 그대로 동작한다', () => {
  const onSelect = vi.fn()
  render(<EvalGraph scores={[{ cp: 0 }, { cp: 50 }, { cp: -20 }]} current={0} onSelect={onSelect} reveal />)
  fireEvent.click(screen.getByRole('img', { name: '평가 그래프' }).querySelector('[data-ply="1"]')!)
  expect(onSelect).toHaveBeenCalledWith(1)
})
