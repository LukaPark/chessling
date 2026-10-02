import type { DrawShape } from '@lichess-org/chessground/draw'
import type { Key } from '@lichess-org/chessground/types'
import type { GuideKind, GuideShape } from '../engine/comment/guide'

export function bestMoveArrow(uci: string): DrawShape {
  return { orig: uci.slice(0, 2) as Key, dest: uci.slice(2, 4) as Key, brush: 'paleBlue' }
}

const GUIDE_BRUSH: Record<GuideKind, string> = { attack: 'green', danger: 'red', missed: 'blue' }

export function guideShape(g: GuideShape): DrawShape {
  const brush = GUIDE_BRUSH[g.kind]
  return g.from ? { orig: g.from as Key, dest: g.to as Key, brush } : { orig: g.to as Key, brush }
}
