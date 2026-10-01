import { ArrowUpDown, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import type { GameRecord } from '../../chess/types'
import { playerLabel } from '../../components/playerLabel'
import * as g from '../../styles/features/gameLayout.css'
import { Badge } from '../../ui/Badge'
import { Button, IconButton } from '../../ui/Button'

export function ViewerHeader({
  record,
  onRefresh,
  onFlip,
  children,
}: {
  record: GameRecord
  onRefresh?: () => void
  onFlip: () => void
  children?: ReactNode
}) {
  const live = record.ref.kind === 'broadcast' && record.result === '*'
  const meta = [record.event, record.date, record.timeControl].filter(Boolean).join(' · ')
  return (
    <header className={g.header}>
      <div className={g.headRow}>
        <h1 className={g.title}>
          <span className={g.player}><span className={g.side} aria-label="백">♔ 백</span>{playerLabel(record.white)}</span>
          <span className={g.vs}>vs</span>
          <span className={g.player}><span className={g.side} aria-label="흑">♚ 흑</span>{playerLabel(record.black)}</span>
        </h1>
        <IconButton icon={ArrowUpDown} label="보드 뒤집기" onClick={onFlip} />
      </div>
      <p className={g.meta}>
        {meta && <span>{meta}</span>}
        <span className={g.result}>{record.result}</span>
        {live && (
          <>
            <Badge tone="live">진행 중</Badge>
            <Button tone="ghost" size="sm" icon={RefreshCw} onClick={onRefresh}>
              새로고침
            </Button>
          </>
        )}
      </p>
      {children}
    </header>
  )
}
