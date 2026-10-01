import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Lightbulb, Split } from 'lucide-react'
import { BarButton, ControlBar } from '../../ui/ControlBar'
import * as bar from '../../ui/controlBar.css'

export interface ViewerControlsProps {
  ply: number
  last: number
  onGo: (ply: number) => void
  onOpenMoves: () => void
  onFork: () => void
  forkDisabled: boolean
  hint?: boolean
  onHint?: () => void
  className?: string
  /** 퀴즈 중에는 모든 버튼을 막는다 */
  disabled?: boolean
}

export function ViewerControls({ ply, last, onGo, onOpenMoves, onFork, forkDisabled, hint, onHint, className, disabled = false }: ViewerControlsProps) {
  return (
    <ControlBar label="수 이동" className={className}>
      <BarButton icon={ChevronsLeft} label="처음" disabled={disabled || ply === 0} onClick={() => onGo(0)} />
      <BarButton icon={ChevronLeft} label="이전 수" disabled={disabled || ply === 0} onClick={() => onGo(ply - 1)} />
      <BarButton label={`기보 전체 보기 (${ply} / ${last})`} className={bar.counter} disabled={disabled} onClick={onOpenMoves}>
        <span>
          {ply} / {last}
        </span>
      </BarButton>
      <BarButton icon={ChevronRight} label="다음 수" disabled={disabled || ply === last} onClick={() => onGo(ply + 1)} />
      <BarButton icon={ChevronsRight} label="마지막" disabled={disabled || ply === last} onClick={() => onGo(last)} />
      {onHint && <BarButton icon={Lightbulb} label="힌트" pressed={Boolean(hint)} disabled={disabled} onClick={onHint} />}
      <BarButton icon={Split} label="여기서 분기" disabled={disabled || forkDisabled} onClick={onFork} />
    </ControlBar>
  )
}
