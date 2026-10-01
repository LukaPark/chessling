import { pvToSan } from '../chess/pgn'
import { formatScore } from '../engine/classify'
import type { EngineLine } from '../engine/UciEngine'
import * as s from './engineLines.css'

export function EngineLines({ fen, lines }: { fen: string; lines: EngineLine[] }) {
  return (
    <ul className={s.list} aria-label="엔진 라인">
      {lines.map((l) => (
        <li key={l.multipv} className={s.line}>
          <strong className={s.score}>{formatScore(l.score)}</strong>
          <span className={s.pv}>{pvToSan(fen, l.pv, 8).join(' ')}</span>
        </li>
      ))}
    </ul>
  )
}
