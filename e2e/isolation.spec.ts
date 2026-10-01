import { expect, test } from '@playwright/test'

test('교차 출처 격리가 켜져 멀티스레드 엔진이 뜬다', async ({ page }) => {
  await page.goto('/game/classic/opera-game')
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true)
  await page.getByRole('button', { name: '엔진 라인', exact: true }).click()
  await expect(page.getByRole('list', { name: '엔진 라인' }).getByRole('listitem').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('싱글스레드로 동작')).toHaveCount(0)
})
