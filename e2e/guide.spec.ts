import { expect, test } from '@playwright/test'

test('보드 가이드: 핵심 장면에 화살표가 그려지고, 토글로 끄고 켠다', async ({ page }) => {
  await page.goto('/game/classic/opera-game')
  const card = page.locator('section[aria-label="이번 수 판정"]')
  await expect(card).toBeVisible()
  await page.keyboard.press('Home')
  for (let i = 0; i < 13; i++) await page.keyboard.press('ArrowRight') // 7. Qb3(핵심 장면)

  const arrows = page.locator('cg-container svg.cg-shapes line')
  await expect(arrows).toHaveCount(2)

  const toggle = card.getByRole('button', { name: '가이드' })
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await toggle.click()
  await expect(arrows).toHaveCount(0)

  await page.reload()
  await expect(card).toBeVisible()
  await page.keyboard.press('Home')
  for (let i = 0; i < 13; i++) await page.keyboard.press('ArrowRight')
  await expect(card.getByRole('button', { name: '가이드' })).toHaveAttribute('aria-pressed', 'false')
  await expect(arrows).toHaveCount(0)
  await card.getByRole('button', { name: '가이드' }).click()
  await expect(arrows).toHaveCount(2)
})
