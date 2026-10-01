import { test } from '@playwright/test'
import { mockLichessTop } from './helpers'

const SIZES = [
  { w: 375, h: 812 },
  { w: 768, h: 1024 },
  { w: 1280, h: 800 },
]
const PAGES = [
  { name: 'home', path: '/' },
  { name: 'viewer', path: '/game/classic/opera-game' },
  { name: 'classics', path: '/classics' },
  { name: 'forks', path: '/forks' },
]

test.skip(!process.env.VISUAL, 'VISUAL=1일 때만 실행한다')

for (const theme of ['light', 'dark'] as const) {
  for (const size of SIZES) {
    for (const p of PAGES) {
      test(`${p.name} ${size.w} ${theme}`, async ({ page }) => {
        await mockLichessTop(page)
        await page.setViewportSize({ width: size.w, height: size.h })
        await page.addInitScript((t) => localStorage.setItem('chessling-theme', t), theme)
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto(p.path)
        await page.waitForLoadState('networkidle')
        await page.screenshot({ path: `test-results/visual/${p.name}-${size.w}-${theme}.png`, fullPage: true })
      })
    }
  }
}
