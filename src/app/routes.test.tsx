// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'

afterEach(cleanup)

it('없는 경로는 NotFound', () => {
  renderRoute('/nope')
  expect(screen.getByRole('heading', { name: '페이지를 찾을 수 없어요' })).toBeInTheDocument()
})

it('라이선스 페이지', async () => {
  renderRoute('/licenses')
  expect(await screen.findByRole('heading', { name: '라이선스' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'GPL-3.0-or-later' })).toBeInTheDocument()
})

it('라이선스 페이지에 기물 세트 저작자와 라이선스를 적는다', async () => {
  renderRoute('/licenses')
  await screen.findByRole('heading', { name: '라이선스' })
  for (const [name, license] of [
    ['cburnett', 'GPL-2.0-or-later'],
    ['Merida', 'GPL-2.0-or-later'],
    ['Chessnut', 'Apache-2.0'],
    ['Fantasy', 'MIT'],
  ]) {
    const item = screen.getByText(new RegExp(`${name} 기물`)).closest('li')!
    expect(item).toHaveTextContent(license)
  }
  const texts = screen.getAllByRole('link', { name: '라이선스 전문' }).map((a) => a.getAttribute('href'))
  expect(texts).toEqual(expect.arrayContaining(['/licenses/chessnut-Apache-2.0.txt', '/licenses/fantasy-MIT.txt']))
})
