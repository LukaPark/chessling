import { Chess, type Square } from 'chess.js'
import { PIECE_VALUE } from '../../chess/material'
import { attackedBy, extractFacts, type CommentInput, type Fact } from './facts'

export type GuideKind = 'attack' | 'danger' | 'missed'
export interface GuideShape {
  kind: GuideKind
  /** 있으면 화살표, 없으면 to 칸에 원 */
  from?: Square
  to: Square
}
export const GUIDE_MAX = 3

/** 앞에서부터 채운다. threat는 사실이 아니라 여기서 계산한다(코멘트 문장에는 쓰지 않는다) */
const ORDER = ['missed', 'fork', 'pin', 'refutation', 'threat', 'hanging'] as const

/** 수 하나에 그릴 가이드. 코멘트와 같은 사실에서 만들어 문장과 어긋나지 않는다 */
export function guideFor(input: CommentInput): GuideShape[] {
  const { plies, index } = input
  const uci = plies[index]?.uci
  if (index < 1 || !uci) return []
  const facts = extractFacts(input)
  if (facts.some((f) => f.kind === 'mate')) return []
  const out: GuideShape[] = []
  const add = (g: GuideShape) => {
    if (out.length >= GUIDE_MAX) return
    if (out.some((o) => o.from === g.from && o.to === g.to)) return
    out.push(g)
  }
  for (const kind of ORDER) {
    if (kind === 'threat') {
      if (!facts.some((f) => f.kind === 'fork')) {
        const t = threatOf(plies[index].fen, uci.slice(2, 4) as Square)
        if (t) add(t)
      }
      continue
    }
    for (const f of facts) if (f.kind === kind) shapesOf(f).forEach(add)
  }
  return out
}

const arrow = (kind: GuideKind, uci: string): GuideShape => ({ kind, from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square })

function shapesOf(f: Fact): GuideShape[] {
  switch (f.kind) {
    case 'missed':
      return f.uci ? [arrow('missed', f.uci)] : []
    case 'fork':
      return (f.targetSquares ?? []).map((to) => ({ kind: 'attack' as const, from: f.square, to }))
    case 'pin':
      return f.from ? [{ kind: 'attack', from: f.from, to: f.square }, { kind: 'danger', to: f.square }] : []
    case 'refutation':
      return f.uci ? [arrow('danger', f.uci)] : []
    case 'hanging':
      return [{ kind: 'danger', to: f.square }]
    default:
      return []
  }
}

/** 움직인 기물이 노리는 상대 기물 하나: 방어가 없거나 움직인 기물보다 비싼 것 중 가장 비싼 것. 킹은 체크가 맡는다 */
function threatOf(fen: string, from: Square): GuideShape | null {
  const c = new Chess(fen)
  const mover = c.get(from)
  if (!mover) return null
  // 킹은 가치가 0이라, 방어가 없는 기물만 노림으로 친다
  const moverValue = mover.type === 'k' ? Infinity : PIECE_VALUE[mover.type]
  let best: { sq: Square; value: number } | null = null
  for (const sq of attackedBy(c, from)) {
    const t = c.get(sq)
    if (!t || t.color === mover.color || t.type === 'k') continue
    const undefended = c.attackers(sq, t.color).length === 0
    if (!undefended && PIECE_VALUE[t.type] <= moverValue) continue
    if (!best || PIECE_VALUE[t.type] > best.value) best = { sq, value: PIECE_VALUE[t.type] }
  }
  return best ? { kind: 'attack', from, to: best.sq } : null
}
