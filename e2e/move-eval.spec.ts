import { expect, test, type Page } from '@playwright/test'
import { clickSquare } from './helpers'

/** 오페라 게임 1. e4 e5 2. Nf3 d6 뒤(백 차례)에서 분기하고 3. d4를 둔다 */
async function forkAndPlayD4(page: Page) {
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

  await clickSquare(page, 'd2')
  await clickSquare(page, 'd4')
  const card = page.getByRole('region', { name: '수 평가' })
  await expect(card).toContainText('3. d4')
  // 실제 Stockfish가 두 포지션을 분석할 때까지 넉넉히 기다린다
  await expect(card).not.toContainText('평가하는 중…', { timeout: 60_000 })
  await expect(card.locator('p').first()).toHaveText(/3\. d4\s*·\s*(탁월|좋은 수|최선|우수|좋음|놓침|부정확|실수|블런더)/)
  return card
}

test('분기 대국에서 내 수를 두면 평가 카드가 나오고, 끄면 사라진다', async ({ page }) => {
  const card = await forkAndPlayD4(page)
  // md 이상: 카드는 보드 옆 열에 있어, 카드가 있든 없든 보드와 조작 막대 위치가 같다
  const layout = async () => {
    await page.evaluate(() => window.scrollTo(0, 0))
    return {
      board: await page.locator('cg-board').boundingBox(),
      bar: await page.getByRole('group', { name: '대국 조작' }).boundingBox(),
    }
  }
  const withCard = await layout()
  const cardBox = (await card.boundingBox())!
  expect(cardBox.x).toBeGreaterThanOrEqual(withCard.board!.x + withCard.board!.width)

  const toggle = page.getByRole('button', { name: '수 평가' })
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect(card).toHaveCount(0)
  expect(await layout()).toEqual(withCard)

  // 새로고침하면 지난 평가는 지워진다
  await toggle.click()
  await page.reload()
  await expect(page.getByText('내 차례')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('region', { name: '수 평가' })).toHaveCount(0)
})

test.describe('375px', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })

  test('평가 카드는 보드 아래에 있고 가로 스크롤이 없다', async ({ page }) => {
    const card = await forkAndPlayD4(page)
    const board = (await page.locator('cg-board').boundingBox())!
    const cardBox = (await card.boundingBox())!
    expect(cardBox.y).toBeGreaterThanOrEqual(board.y + board.height)
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
    expect(m.sw).toBeLessThanOrEqual(m.cw)
  })
})
