// @vitest-environment jsdom
import { cleanup, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { classics } from '../../sources/classics'
import { renderRoute } from '../../test/renderRoute'

afterEach(cleanup)

it('연도순으로 명경기를 나열한다', async () => {
  renderRoute('/classics')
  const list = await screen.findByRole('list', { name: '명경기 목록' })
  const links = within(list).getAllByRole('link')
  expect(links.map((a) => a.textContent)).toEqual(classics.map((c) => c.title))
  expect(links[0]).toHaveAttribute('href', `/game/classic/${classics[0].slug}`)
})
