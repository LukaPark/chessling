import type { Page } from '@playwright/test'
import { CORS } from './fixtures'

/** chessground 보드는 칸마다 DOM이 없으므로 좌표로 클릭한다 */
export async function clickSquare(page: Page, square: string, orientation: 'white' | 'black' = 'white') {
  // 등장 모션이 끝나 보드 위치가 멈출 때까지 기다린다
  const board = page.locator('cg-board')
  await board.scrollIntoViewIfNeeded() // 새 레이아웃에서는 보드 아랫줄이 뷰포트 밖일 수 있다
  let box = await board.boundingBox()
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(100)
    const next = await board.boundingBox()
    const still = box && next && box.x === next.x && box.y === next.y && box.width === next.width
    box = next
    if (still) break
  }
  if (!box) throw new Error('보드를 찾을 수 없습니다')
  const file = square.charCodeAt(0) - 97
  const rank = Number(square[1]) - 1
  const col = orientation === 'white' ? file : 7 - file
  const row = orientation === 'white' ? 7 - rank : rank
  const size = box.width / 8
  await page.mouse.click(box.x + (col + 0.5) * size, box.y + (row + 0.5) * size)
}

/** 홈의 "진행 중인 대회" 섹션이 실제 Lichess를 부르지 않도록 빈 응답으로 막는다 */
export async function mockLichessTop(page: Page) {
  await page.route('https://lichess.org/api/broadcast/top', (route) =>
    route.fulfill({
      status: 200,
      headers: CORS,
      contentType: 'application/json',
      body: JSON.stringify({ active: [], upcoming: [], past: { currentPageResults: [] } }),
    }),
  )
}
