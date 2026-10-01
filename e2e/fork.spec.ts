import { expect, test } from '@playwright/test'
import { clickSquare } from './helpers'

test('명국에서 분기해 한 수 두고, 새로고침해도 이어진다', async ({ page }) => {
  await page.goto('/game/classic/opera-game')
  await expect(page.getByRole('heading', { name: /Paul Morphy/ })).toBeVisible()
  // 1. e4 e5 2. Nf3 d6 → 백 차례. 카운터로 확인하며 한 수씩 넘긴다
  const next = page.getByRole('group', { name: '수 이동' }).getByRole('button', { name: '다음 수' })
  for (let i = 1; i <= 4; i++) {
    await next.click()
    await expect(page.getByRole('button', { name: new RegExp(`기보 전체 보기 \\(${i} /`) })).toBeVisible()
  }
  await page.getByRole('button', { name: '여기서 분기', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: '시작' }).click()
  await expect(page).toHaveURL(/\/play\//)

  await clickSquare(page, 'd2')
  await clickSquare(page, 'd4')
  await page.getByRole('button', { name: '기보', exact: true }).click()
  await expect(page.getByTestId('play-moves').getByRole('listitem')).toHaveCount(2, { timeout: 30_000 }) // 내 수 + 엔진 응수
  await expect(page.getByText('내 차례')).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: '기보', exact: true }).click()
  await expect(page.getByTestId('play-moves').getByRole('listitem')).toHaveCount(2)
  await expect(page.getByTestId('play-moves')).toContainText('d4')

  await page.goto('/forks')
  await expect(page.getByRole('heading', { name: /Paul Morphy/ })).toBeVisible()
})
