import { expect, test, type Page } from '@playwright/test'

const SIZES = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
]

async function barBox(page: Page, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0))
  const box = await page.getByRole('group', { name }).boundingBox()
  if (!box) throw new Error(`${name} 막대를 찾을 수 없습니다`)
  return box
}

test.describe('md 이상 대국 화면의 하단 조작 막대', () => {
  test.use({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' })

  test('뷰어: 수를 넘겨도 막대가 움직이지 않고 화면 안에 있다', async ({ page }) => {
    await page.goto('/game/classic/opera-game')
    await expect(page.getByRole('heading', { name: /Paul Morphy/ })).toBeVisible()
    const first = await barBox(page, '수 이동')
    expect(first.y + first.height).toBeLessThanOrEqual(720)

    const next = page.getByRole('group', { name: '수 이동' }).getByRole('button', { name: '다음 수' })
    for (let i = 1; i <= 15; i++) {
      await next.click()
      await expect(page.getByRole('button', { name: new RegExp(`기보 전체 보기 \\(${i} /`) })).toBeVisible()
      const box = await barBox(page, '수 이동')
      expect(box.y, `${i}수째 막대 위치`).toBe(first.y)
      expect(box.y + box.height, `${i}수째 막대 아래 끝`).toBeLessThanOrEqual(720)
    }
  })

  for (const size of SIZES) {
    test(`뷰어 ${size.width}×${size.height}: 막대가 처음부터 화면 안에 보인다`, async ({ page }) => {
      await page.setViewportSize(size)
      await page.goto('/game/classic/opera-game')
      await expect(page.getByRole('heading', { name: /Paul Morphy/ })).toBeVisible()
      const box = await barBox(page, '수 이동')
      expect(box.y + box.height).toBeLessThanOrEqual(size.height)
    })
  }

  test('분기 대국: 막대가 처음부터 화면 안에 보인다', async ({ page }) => {
    await page.goto('/game/classic/opera-game')
    await expect(page.getByRole('heading', { name: /Paul Morphy/ })).toBeVisible()
    const next = page.getByRole('group', { name: '수 이동' }).getByRole('button', { name: '다음 수' })
    for (let i = 1; i <= 4; i++) {
      await next.click()
      await expect(page.getByRole('button', { name: new RegExp(`기보 전체 보기 \\(${i} /`) })).toBeVisible()
    }
    await page.getByRole('button', { name: '여기서 분기', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: '시작' }).click()
    await expect(page).toHaveURL(/\/play\//)
    await expect(page.getByText('내 차례')).toBeVisible()

    for (const size of SIZES) {
      await page.setViewportSize(size)
      await expect(page.getByText('내 차례')).toBeVisible()
      const box = await barBox(page, '대국 조작')
      expect(box.y + box.height, `${size.width}×${size.height}`).toBeLessThanOrEqual(size.height)
    }
  })
})
