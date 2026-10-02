// npm run annotate:view -- <slug>
// 팩트 시트를 수마다 한 줄로: 번호 SAN 판정 | 형세(백 기준) 전→후 | 직전 포지션 엔진 후보 3개
import { readFileSync } from 'node:fs'
import { moveTitle } from '../../src/chess/moveNumber'
import { formatScore, type Score } from '../../src/engine/classify'
import { JUDGMENT_META, type MoveLabel } from '../../src/engine/judge'

const slug = process.argv[2]
const f = JSON.parse(readFileSync(`scripts/annotate/facts/${slug}.json`, 'utf8')) as {
  plies: { san: string | null; uci: string | null; fen: string }[]
  positions: { score: Score; best: string | null; pv: string[] }[]
  alternatives: { uci: string; san: string; score: Score }[][]
  labels: (MoveLabel | null)[]
}
for (let i = 1; i < f.plies.length; i++) {
  const label = f.labels[i] ? JUDGMENT_META[f.labels[i]!].name : '-'
  const alts = f.alternatives[i - 1].map((a) => `${a.san}${a.uci === f.plies[i].uci ? '*' : ''} ${formatScore(a.score)}`).join(', ')
  console.log(`${String(i).padStart(3)} ${moveTitle(f.plies, i).padEnd(13)} ${label.padEnd(5)} | ${formatScore(f.positions[i - 1].score)} → ${formatScore(f.positions[i].score)} | ${alts}`)
}
