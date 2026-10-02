// npm run annotate:guide -- <slug>
// 핵심 장면과 이미 가이드를 지정한 수마다: 해설, 리뷰 뒤 자동 가이드, 직접 지정한 가이드를 나란히 보여 준다.
// 팩트 시트(scripts/annotate/facts/<slug>.json)가 있으면 리뷰 결과(놓친 수·반박)까지 넣어 계산한다.
import { existsSync, readFileSync } from 'node:fs'
import { moveTitle } from '../../src/chess/moveNumber'
import { pgnToPlies } from '../../src/chess/pgn'
import { guideFor } from '../../src/engine/comment/guide'
import type { MoveLabel } from '../../src/engine/judge'
import type { ReviewedPosition } from '../../src/engine/review'
import { pickGuide } from '../../src/features/viewer/pickGuide'
import type { Annotations } from '../../src/sources/annotations'
import { getClassic } from '../../src/sources/classics'
import { guideToken } from '../../src/sources/guideNotation'

const slug = process.argv[2]
const a = JSON.parse(readFileSync(`src/data/annotations/${slug}.json`, 'utf8')) as Annotations
const plies = pgnToPlies(getClassic(slug)!.pgn)
const factsPath = `scripts/annotate/facts/${slug}.json`
const facts = existsSync(factsPath)
  ? (JSON.parse(readFileSync(factsPath, 'utf8')) as { positions: ReviewedPosition[]; labels: (MoveLabel | null)[] })
  : { positions: [], labels: [] }
const starts = new Set(a.scenes.map((s) => s.startPly))

for (const p of a.plies) {
  if (p.ply === 0 || (!p.key && !p.guide)) continue
  const autoShapes = guideFor({ plies, positions: facts.positions, labels: facts.labels, index: p.ply, seed: slug })
  const auto = autoShapes.map(guideToken)
  console.log(`[${p.ply}${p.key ? ' 핵심' : ''}${starts.has(p.ply) ? ' 장면시작' : ''}] ${moveTitle(plies, p.ply)}`)
  console.log(`  해설: ${p.text}`)
  console.log(`  자동: ${JSON.stringify(auto)}${p.guide ? `   지정: ${JSON.stringify(p.guide)}` : ''}`)
  // 장면 시작에서는 뷰어가 자동 가이드를 초록 화살표만 남긴다. 실제로 그려질 것을 따로 보여 준다
  if (starts.has(p.ply)) {
    const shown = pickGuide({ authored: p.guide, auto: () => autoShapes, sceneStart: true }).map(guideToken)
    console.log(`  (장면시작${p.guide ? '' : ': 초록만'}) 표시: ${JSON.stringify(shown)}`)
  }
}
