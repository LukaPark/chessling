import { Link } from 'react-router'
import { refKey, refToPath } from '../../chess/gameRef'
import type { GameSummary, Speed } from '../../chess/types'
import { playerLabel } from '../../components/playerLabel'
import * as l from '../../styles/features/lists.css'
import * as p from '../../styles/features/page.css'
import { outcomeFor, userColor } from './filters'
import { Badge } from '../../ui/Badge'

export const SPEED_LABEL: Record<Speed, string> = {
  ultraBullet: '울트라불릿',
  bullet: '불릿',
  blitz: '블리츠',
  rapid: '래피드',
  classical: '클래식',
  daily: '데일리',
  correspondence: '통신',
  unknown: '-',
}

export function GameList({ games, username }: { games: GameSummary[]; username?: string }) {
  if (games.length === 0) return <p className={p.meta}>조건에 맞는 대국이 없어요.</p>
  return (
    <ul className={l.rows}>
      {games.map((g) => (
        <li key={refKey(g.ref)}>
          {g.variant === 'standard' ? (
            <Link to={refToPath(g.ref)} className={l.row}>
              <Row g={g} username={username} />
            </Link>
          ) : (
            <div className={l.row} aria-disabled="true">
              <Row g={g} username={username} unsupported />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

function Row({ g, username, unsupported = false }: { g: GameSummary; username?: string; unsupported?: boolean }) {
  const color = username ? userColor(g, username) : null
  const outcome = color ? outcomeFor(g, color) : null
  const result = outcome ? <Badge tone={outcome}>{{ win: '승리', loss: '패배', draw: '무승부' }[outcome]}</Badge>
    : g.result === '*' ? <Badge tone="live">진행 중</Badge> : <Badge>{g.result}</Badge>
  return (
    <>
      <span className={l.rowMeta}>
        {g.date} · {SPEED_LABEL[g.speed]}
      </span>
      <span className={l.rowMain}>
        {playerLabel(g.white)} vs {playerLabel(g.black)}
      </span>
      <span className={l.rowEnd}>
        {unsupported && <Badge>지원하지 않음</Badge>}
        {result}
      </span>
    </>
  )
}
