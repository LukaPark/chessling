// npx tsx scripts/annotate/preview-comments.ts <slug>
import { readFileSync } from 'node:fs'
import { moveTitle } from '../../src/chess/moveNumber'
import type { Ply } from '../../src/chess/types'
import { commentsForGame } from '../../src/engine/comment'
import { JUDGMENT_META, type MoveLabel } from '../../src/engine/judge'
import type { ReviewedPosition } from '../../src/engine/review'

const slug = process.argv.slice(2).find((a) => a !== '--')
if (!slug) {
  console.error('사용법: npm run annotate:preview -- <slug>')
  process.exit(1)
}
const f = JSON.parse(readFileSync(`scripts/annotate/facts/${slug}.json`, 'utf8')) as {
  plies: Ply[]
  positions: ReviewedPosition[]
  labels: (MoveLabel | null)[]
}
const t0 = performance.now()
const out = commentsForGame({ plies: f.plies, positions: f.positions, labels: f.labels, seed: slug })
const ms = performance.now() - t0
for (let i = 1; i < f.plies.length; i++) {
  const label = f.labels[i] ? JUDGMENT_META[f.labels[i]!].name : '-'
  console.log(`${moveTitle(f.plies, i).padEnd(14)} ${label.padEnd(5)} | ${out[i]?.text ?? ''}`)
}
console.error(`${f.plies.length - 1}수, ${ms.toFixed(0)}ms`)
