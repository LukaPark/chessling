import { turnOf } from '../../chess/pgn'
import { extractFacts, type CommentInput, type Fact } from './facts'
import { PHRASES, QUIET, type PhraseCtx } from './phrases.ko'

export interface MoveComment {
  text: string
  facts: Fact['kind'][]
}

const BAD = new Set(['mistake', 'blunder', 'miss', 'inaccuracy'])

/** 앞에 있을수록 먼저 말한다 */
const PRIORITY_BAD: Fact['kind'][] = ['mate', 'refutation', 'hanging', 'missed', 'mateThreat', 'capture', 'check', 'kingShield', 'band']
const PRIORITY_GOOD: Fact['kind'][] = ['mate', 'promotion', 'fork', 'pin', 'mateThreat', 'capture', 'recapture', 'check', 'castle', 'trade', 'rookFile', 'develop', 'centerPawn', 'band']

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** used: 직전 3수에서 쓴 틀 키("kind:idx") */
export function compose(input: CommentInput, used: string[]): { comment: MoveComment; keys: string[] } | null {
  if (!input.plies[input.index]?.uci) return null
  const facts = extractFacts(input)
  const mover = turnOf(input.plies[input.index - 1].fen) === 'w' ? '백' : '흑'
  const ctx: PhraseCtx = { mover, enemy: mover === '백' ? '흑' : '백' }
  const label = input.labels[input.index]
  const bad = Boolean(label && BAD.has(label))
  // 좋은 수인데 상대에게 메이트가 있으면(강요된 응수 등) 둔 수 이야기를 먼저 한다
  const threatOnMover = facts.some((f) => f.kind === 'mateThreat' && f.forWhite !== (mover === '백'))
  const order = bad ? PRIORITY_BAD : threatOnMover ? demote(PRIORITY_GOOD, 'mateThreat') : PRIORITY_GOOD
  const picked = order.flatMap((k) => facts.filter((f) => f.kind === k)).filter((f, i, arr) => arr.findIndex((g) => g.kind === f.kind) === i)
  const main = picked.filter((f) => f.kind !== 'band').slice(0, 2)
  const band = picked.find((f) => f.kind === 'band')
  // 체크메이트는 그 한마디로 끝낸다
  const chosen = picked[0]?.kind === 'mate' ? [picked[0]] : band ? [...main, band] : main
  const keys: string[] = []
  const parts: string[] = []
  const seed = hash(`${input.seed}:${input.index}`)
  if (chosen.length === 0) {
    const i = pickIndex(seed, QUIET.length, 'quiet', used)
    keys.push(`quiet:${i}`)
    parts.push(QUIET[i](ctx))
  }
  for (const f of chosen) {
    const list = PHRASES[f.kind] as ((f: Fact, c: PhraseCtx) => string)[]
    const i = pickIndex(seed + keys.length, list.length, f.kind, used)
    keys.push(`${f.kind}:${i}`)
    parts.push(list[i](f, ctx))
  }
  return { comment: { text: parts.join(' '), facts: chosen.map((f) => f.kind) }, keys }
}

/** kind를 band 바로 앞으로 옮긴다 */
function demote(order: Fact['kind'][], kind: Fact['kind']): Fact['kind'][] {
  const rest = order.filter((k) => k !== kind && k !== 'band')
  return [...rest, kind, 'band']
}

function pickIndex(seed: number, n: number, kind: string, used: string[]): number {
  for (let k = 0; k < n; k++) {
    const i = (seed + k) % n
    if (!used.includes(`${kind}:${i}`)) return i
  }
  return seed % n
}
