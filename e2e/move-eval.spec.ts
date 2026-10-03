import { expect, test } from '@playwright/test'
import { clickSquare } from './helpers'

test('분기 대국에서 내 수를 두면 평가 카드가 나오고, 끄면 사라진다', async ({ page }) => {
  await page.goto('/game/classic/opera-game')
  await expect(page.getByRole('heading', { name: /Paul Morphy/ })).toBeVisible()
  // 1. e4 e5 2. Nf3 d6 → 백 차례
  const next = page.getByRole('group', { name: '수 이동' }).getByRole('button', { name: '다음 수' })
  for (let i = 1; i <= 4; i++) {
    await next.click()
    await expect(page.getByRole('button', { name: new RegExp(`기보 전체 보기 \\(${i} /`) })).toBeVisible()
  }
  await page.getByRole('button', { name: '여기서 분기', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: '시작' }).click()
  await expect(page).toHaveURL(/\/play\//)
  await expect(page.getByText('내 차례')).toBeVisible()

  await clickSquare(page, 'd2')
  await clickSquare(page, 'd4')
  const card = page.getByRole('region', { name: '수 평가' })
  await expect(card).toContainText('3. d4')
  // 실제 Stockfish가 두 포지션을 분석할 때까지 넉넉히 기다린다
  await expect(card).not.toContainText('평가하는 중…', { timeout: 60_000 })
  await expect(card.locator('p').first()).toHaveText(/3\. d4\s*·\s*(탁월|좋은 수|최선|우수|좋음|놓침|부정확|실수|블런더)/)

  const toggle = page.getByRole('button', { name: '수 평가' })
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect(card).toHaveCount(0)
})
