import { expect, test } from '@playwright/test'
import { CORS, LICHESS_GAME, SCHOLAR_PGN } from './fixtures'
import { mockLichessTop } from './helpers'

test('Lichess 대국을 불러와 전체 리뷰한다', async ({ page }) => {
  await page.route('https://lichess.org/api/games/user/**', (route) =>
    route.fulfill({ status: 200, headers: CORS, contentType: 'application/x-ndjson', body: JSON.stringify(LICHESS_GAME) + '\n' }),
  )
  await page.route('https://lichess.org/game/export/**', (route) =>
    route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ ...LICHESS_GAME, pgn: SCHOLAR_PGN }) }),
  )

  await mockLichessTop(page)
  await page.goto('/')
  await page.locator('label', { hasText: 'Lichess' }).click()
  await page.getByLabel('아이디').fill('tester')
  await page.getByRole('button', { name: '불러오기' }).click()
  await page.getByRole('link', { name: /tester.*vs.*rival/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByRole('button', { name: '기보 전체', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Qxf7#' })).toBeVisible()

  await page.getByRole('button', { name: '리뷰 실행' }).click()
  await expect(page.getByText(/백 정확도/)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('img', { name: '평가 그래프' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Nf6/ })).toHaveAttribute('data-label', 'blunder')
})
