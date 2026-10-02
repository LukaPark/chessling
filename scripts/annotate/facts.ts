// npx tsx scripts/annotate/facts.ts <slug|all> [--depth 22]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { Chess } from 'chess.js'
import { pgnToPlies, pvToSan, turnOf } from '../../src/chess/pgn'
import { toWhitePov, type Score } from '../../src/engine/classify'
import { buildReview, terminalScore, type ReviewedPosition } from '../../src/engine/review'
import { parseBestMove, parseInfo } from '../../src/engine/uci'

interface Line {
  multipv: number
  /** 백 기준 */
  score: Score
  pv: string[]
}

const require = createRequire(import.meta.url)
const initEngine = require('stockfish')

const args = process.argv.slice(2).filter((a) => a !== '--')
const target = args[0] ?? 'all'
const depthAt = args.indexOf('--depth')
const depth = (depthAt >= 0 && Number(args[depthAt + 1])) || 22

const data = JSON.parse(readFileSync('src/data/classics.json', 'utf8')) as { slug: string; pgn: string }[]
const games = data.filter((g) => target === 'all' || g.slug === target)
if (games.length === 0) {
  console.error(`명경기를 찾지 못했어요: ${target}`)
  process.exit(1)
}

const engine = await initEngine('lite-single')
let listener: ((line: string) => void) | null = null
engine.listener = (line: string) => listener?.(line)
const send = (cmd: string) => engine.sendCommand(cmd)

function search(fen: string): Promise<{ lines: Line[]; best: string | null }> {
  return new Promise((resolve) => {
    const lines = new Map<number, Line>()
    const turn = turnOf(fen)
    listener = (line) => {
      const info = parseInfo(line)
      if (info) lines.set(info.multipv, { multipv: info.multipv, score: toWhitePov(info.score, turn), pv: info.pv })
      const best = parseBestMove(line)
      if (best !== undefined) {
        listener = null
        resolve({ lines: [...lines.values()].sort((a, b) => a.multipv - b.multipv), best })
      }
    }
    send(`position fen ${fen}`)
    send(`go depth ${depth}`)
  })
}

send('uci')
send('setoption name MultiPV value 3')
send('setoption name Hash value 128')

mkdirSync('scripts/annotate/facts', { recursive: true })
for (const g of games) {
  const t0 = performance.now()
  const plies = pgnToPlies(g.pgn)
  const positions: ReviewedPosition[] = []
  const alternatives: { uci: string; san: string; score: Score }[][] = []
  for (const [i, p] of plies.entries()) {
    const term = terminalScore(p.fen)
    if (term) {
      positions.push({ score: term, best: null, pv: [], second: null, legalMoves: 0 })
      alternatives.push([])
      continue
    }
    const r = await search(p.fen)
    const [first, second] = r.lines
    positions.push({
      score: first?.score ?? { cp: 0 },
      best: r.best,
      pv: first?.pv ?? [],
      second: second?.score ?? null,
      legalMoves: new Chess(p.fen).moves().length,
    })
    alternatives.push(r.lines.map((l) => ({ uci: l.pv[0], san: pvToSan(p.fen, [l.pv[0]], 1)[0] ?? l.pv[0], score: l.score })))
    process.stderr.write(`\r${g.slug} ${i + 1}/${plies.length}`)
  }
  const review = buildReview(plies, positions, depth)
  writeFileSync(
    `scripts/annotate/facts/${g.slug}.json`,
    JSON.stringify({ slug: g.slug, depth, plies, positions, alternatives, labels: review.labels }, null, 1),
  )
  process.stderr.write(`\n${g.slug} 완료 (${plies.length}개 포지션, ${((performance.now() - t0) / 1000).toFixed(1)}초)\n`)
}
process.exit(0)
