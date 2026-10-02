import { expect, test } from '@playwright/test'

test('오페라 게임: 오프닝 이름이 보이고, 대표 수순으로 연습을 시작한다', async ({ page }) => {
  await page.goto('/game/classic/opera-game')
  const card = page.locator('section[aria-label="이번 수 판정"]')
  await expect(card).toBeVisible()
  await page.keyboard.press('Home')
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight') // 1.e4 e5 2.Nf3 d6
  await expect(card).toContainText('필리도르 디펜스', { timeout: 10_000 })
  await expect(card).toContainText('오프닝')

  await page.getByRole('button', { name: '오프닝', exact: true }).click()
  await page.getByRole('button', { name: '이 수순으로 연습' }).click()
  const dialog = page.getByRole('dialog', { name: '이 수순으로 연습하기' })
  await expect(dialog).toContainText('대표 수순: 1.e4 e5 2.Nf3 d6')
  await dialog.getByRole('button', { name: '시작' }).click()
  await expect(page).toHaveURL(/\/play\//)
})

test.describe('모바일', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })

  test('기보 시트의 오프닝 섹션을 펼쳐도 가로 스크롤이 생기지 않는다', async ({ page }) => {
    await page.goto('/game/classic/opera-game')
    const bar = page.getByRole('group', { name: '수 이동' })
    for (let i = 0; i < 4; i++) await bar.getByRole('button', { name: '다음 수' }).click()
    await bar.getByRole('button', { name: /^기보 전체 보기/ }).click() // 가운데 카운터로 기보 시트 열기
    await page.getByRole('dialog', { name: '기보' }).getByRole('button', { name: '오프닝', exact: true }).click()
    await expect(page.getByRole('button', { name: '이 수순으로 연습' })).toBeVisible()
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
    expect(m.sw).toBeLessThanOrEqual(m.cw)
  })
})
