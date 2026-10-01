// npm run annotate:probe -- <slug> <ply>:<uci,uci,…> …
// ply 포지션에서 각 수를 둔 뒤 depth 18로 평가해 백 기준 점수와 수순을 보여 준다.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { Chess } from 'chess.js'
import { turnOf } from '../../src/chess/pgn'
import { formatScore, toWhitePov, type Score } from '../../src/engine/classify'
import { parseBestMove, parseInfo } from '../../src/engine/uci'

const require = createRequire(import.meta.url)
const engine = await require('stockfish')('lite-single')
let listener: ((l: string) => void) | null = null
engine.listener = (l: string) => listener?.(l)
engine.sendCommand('uci')

function evalFen(fen: string): Promise<{ score: Score; pv: string[] }> {
  return new Promise((resolve) => {
    let last: { score: Score; pv: string[] } = { score: { cp: 0 }, pv: [] }
    listener = (l) => {
      const i = parseInfo(l)
      if (i) last = { score: toWhitePov(i.score, turnOf(fen)), pv: i.pv }
      if (parseBestMove(l) !== undefined) resolve(last)
    }
    engine.sendCommand(`position fen ${fen}`)
    engine.sendCommand('go depth 18')
  })
}

const [slug, ...specs] = process.argv.slice(2)
const f = JSON.parse(readFileSync(`scripts/annotate/facts/${slug}.json`, 'utf8')) as { plies: { fen: string }[] }
for (const spec of specs) {
  const [ply, list] = spec.split(':')
  for (const uci of list.split(',')) {
    const c = new Chess(f.plies[Number(ply)].fen)
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
    const r = c.isCheckmate() ? { score: { mate: 0 } as Score, pv: [] } : await evalFen(c.fen())
    const line = new Chess(c.fen())
    const sans = r.pv.slice(0, 6).map((u) => line.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san)
    console.log(`${ply} ${m.san.padEnd(7)} → ${formatScore(r.score).padStart(6)} | ${sans.join(' ')}`)
  }
}
process.exit(0)
