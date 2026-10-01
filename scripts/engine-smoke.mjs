import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const initEngine = require('stockfish')
const FEN = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1' // Ra8#

const timer = setTimeout(() => {
  console.error('[smoke] 시간 초과')
  process.exit(1)
}, 20_000)

const engine = await initEngine('lite-single')
engine.listener = (line) => {
  if (!line.startsWith('bestmove')) return
  clearTimeout(timer)
  const move = line.split(' ')[1]
  if (move === 'a1a8') {
    console.log('[smoke] OK', line)
    process.exit(0)
  }
  console.error('[smoke] 예상과 다른 수', line)
  process.exit(1)
}
engine.sendCommand('uci')
engine.sendCommand(`position fen ${FEN}`)
engine.sendCommand('go depth 8')
