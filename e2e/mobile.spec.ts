import { expect, test } from '@playwright/test'
import { mockLichessTop } from './helpers'

test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })

test('모바일 뷰어: 하단 막대로 이동하고 힌트를 켜고 끈다', async ({ page }) => {
  await page.goto('/game/classic/opera-game')
  const bar = page.getByRole('group', { name: '수 이동' })
  await expect(bar).toBeVisible()
  const box = await bar.boundingBox()
  expect(box!.y + box!.height).toBeGreaterThan(812 - 4) // 화면 하단에 고정

  await bar.getByRole('button', { name: '다음 수' }).click()
  const card = page.locator('section[aria-label="이번 수 판정"]')
  await expect(card).toContainText('1. e4')

  const hint = bar.getByRole('button', { name: '힌트' })
  await expect(hint).toBeEnabled({ timeout: 30_000 })
  await hint.click()
  await expect(card).toContainText('다음 수 힌트:')
  await bar.getByRole('button', { name: '다음 수' }).click()
  await expect(hint).toHaveAttribute('aria-pressed', 'false')
})

test('모바일 뷰어: 리뷰 후 마지막 수에 판정이 붙는다', async ({ page }) => {
  await page.goto('/game/classic/opera-game')
  const card = page.locator('section[aria-label="이번 수 판정"]')
  await card.getByRole('button', { name: '리뷰 실행' }).click()
  await expect(page.getByText(/백 정확도/)).toBeVisible({ timeout: 90_000 })
  await page.getByRole('group', { name: '수 이동' }).getByRole('button', { name: '마지막' }).click()
  await expect(card).toContainText('17. Rd8#')
  await expect(card).toContainText(/탁월|좋은 수|최선|우수/)
})

test('다크 모드 선택이 새로고침 뒤에도 유지된다', async ({ page }) => {
  await mockLichessTop(page)
  await page.goto('/')
  // md 미만에서는 헤더 테마 토글을 숨기므로 설정 화면에서 고른다
  await expect(page.getByRole('button', { name: '다크 모드로 전환' })).toBeHidden()
  await page.getByRole('link', { name: '설정' }).click()
  await page.getByRole('group', { name: '화면' }).getByRole('radio', { name: '다크' }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test.describe('가로 스크롤 회귀', () => {
  test.use({ reducedMotion: 'reduce' })

  for (const [name, path] of [
    ['홈', '/'],
    ['뷰어', '/game/classic/opera-game'],
  ] as const) {
    test(`${name} 375px에서 가로 스크롤이 생기지 않는다`, async ({ page }) => {
      await mockLichessTop(page)
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      const m = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }))
      expect(m.sw).toBeLessThanOrEqual(m.cw)
    })
  }
})

test('설정: 헤더 톱니에서 보드·기물을 고르면 새로고침 뒤에도 유지된다', async ({ page }) => {
  await mockLichessTop(page)
  await page.goto('/')
  await page.getByRole('link', { name: '설정' }).click()
  await expect(page.getByRole('heading', { level: 1, name: '설정' })).toBeVisible()
  await expect(page.getByRole('link', { name: '설정' })).toHaveAttribute('aria-current', 'page')

  await page.getByRole('group', { name: '보드' }).getByRole('radio', { name: '그린' }).check()
  await page.getByRole('group', { name: '기물' }).getByRole('radio', { name: '메리다' }).check()
  await page.reload()
  await expect(page.locator('html[data-board="green"][data-pieces="merida"]')).toHaveCount(1)
  await expect(page.getByRole('group', { name: '보드' }).getByRole('radio', { name: '그린' })).toBeChecked()

  // 미리보기 보드가 새 기물 세트 이미지로 그려진다
  const knight = page.locator('cg-board piece.knight.white').first()
  await expect(knight).toHaveCSS('background-image', /\/pieces\/merida\/wN\.svg/)

  await page.waitForLoadState('networkidle')
  for (const width of [375, 320]) {
    // 실제 기기처럼 그 폭으로 새로 연다(모바일 에뮬레이션에서 창만 줄이면 레이아웃 뷰포트가 넓어진 채 남는다)
    await page.setViewportSize({ width, height: 812 })
    await page.reload()
    await page.waitForLoadState('networkidle')
    const m = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
      navRight: document.querySelector('nav[aria-label="주요 메뉴"]')!.getBoundingClientRect().right,
    }))
    expect(m.sw, `${width}px 가로 스크롤`).toBeLessThanOrEqual(m.cw)
    expect(m.navRight, `${width}px 헤더가 한 줄에 들어간다`).toBeLessThanOrEqual(width)
  }
})
