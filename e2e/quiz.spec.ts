import { expect, test } from '@playwright/test'

/** 키보드로 시작 포지션에서 n수 앞으로 간다 */
async function goToPly(page: import('@playwright/test').Page, n: number) {
  await page.keyboard.press('Home')
  for (let i = 0; i < n; i++) await page.keyboard.press('ArrowRight')
}

test('명경기 퀴즈: 장면을 끝까지 풀고, 새로고침 뒤에도 푼 장면으로 남는다', async ({ page }) => {
  await page.goto('/game/classic/opera-game')
  const card = page.locator('section[aria-label="이번 수 판정"]')
  await expect(card).toBeVisible()

  // opera-finale: 15. Rxd7 Rxd7 뒤(28수) 백 차례, 3수 장면
  await goToPly(page, 28)
  await card.getByRole('button', { name: '이 장면 퀴즈 풀기' }).click()

  const quiz = page.locator('section[aria-label="퀴즈"]')
  await expect(quiz).toBeVisible()
  const input = quiz.getByLabel('수 입력 (예: Nf3)')
  for (const [i, san] of ['Bxd7+', 'Qb8+', 'Rd8#'].entries()) {
    // 앞 단계의 상대 응수가 끝나야 다음 수를 둘 수 있다
    if (i > 0) await expect(quiz.getByRole('img', { name: `3수 중 ${i + 1}번째` })).toBeVisible({ timeout: 15_000 })
    await input.fill(san)
    await quiz.getByRole('button', { name: '두기', exact: true }).click()
  }
  await expect(quiz).toContainText('정답이에요!', { timeout: 15_000 })
  await expect(quiz).toContainText('3수 중 3수를 한 번에 맞혔어요.')

  await page.reload()
  await expect(card).toBeVisible()
  await goToPly(page, 28)
  await expect(card.getByRole('button', { name: '퀴즈 다시 풀기' })).toBeVisible({ timeout: 10_000 })
  // 기보에서도 퀴즈가 있는 수를 읽어 준다
  await page.getByRole('button', { name: '기보 전체', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Bxd7+ (퀴즈 있음)' }).first()).toBeVisible()
})

test('명경기 퀴즈: 둘 수 없는 수는 알리고, 그만두면 시작 버튼이 돌아온다', async ({ page }) => {
  await page.goto('/game/classic/opera-game')
  const card = page.locator('section[aria-label="이번 수 판정"]')
  await expect(card).toBeVisible()
  await goToPly(page, 12) // opera-qb3: 6...Nf6 뒤
  await card.getByRole('button', { name: '이 장면 퀴즈 풀기' }).click()
  const quiz = page.locator('section[aria-label="퀴즈"]')
  await quiz.getByLabel('수 입력 (예: Nf3)').fill('Qq9')
  await quiz.getByRole('button', { name: '두기', exact: true }).click()
  await expect(quiz.getByRole('alert')).toHaveText('둘 수 없는 수예요')
  await quiz.getByRole('button', { name: '그만두기' }).click()
  await expect(quiz).toBeHidden()
  await expect(card.getByRole('button', { name: '이 장면 퀴즈 풀기' })).toBeVisible()
})
