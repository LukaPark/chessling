import { useState } from 'react'
import { DEFAULT_ELO } from '../../chess/fork'
import type { Color } from '../../chess/types'
import { Banner } from '../../components/Banner'
import * as s from '../../styles/features/play.css'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { Segmented } from '../../ui/Segmented'
import { EloSlider } from './EloSlider'

export interface ForkDialogProps {
  defaultColor: Color
  onConfirm: (options: { playerColor: Color; engineElo: number }) => void
  onCancel: () => void
  pending?: boolean
  error?: boolean
}

export function ForkDialog({ defaultColor, onConfirm, onCancel, pending = false, error = false }: ForkDialogProps) {
  const [color, setColor] = useState<Color>(defaultColor)
  const [elo, setElo] = useState(DEFAULT_ELO)
  return (
    <Dialog title="여기서 분기해서 두기" onClose={onCancel}>
      <div className={s.dialogBody}>
        <Segmented
          legend="내 색"
          name="fork-color"
          value={color}
          onChange={setColor}
          options={[
            { value: 'white', label: '백' },
            { value: 'black', label: '흑' },
          ]}
        />
        <EloSlider value={elo} onChange={setElo} />
        {error && <Banner tone="warn">분기를 저장하지 못했어요.</Banner>}
        <div className={s.actions}>
          <Button tone="secondary" onClick={onCancel}>
            취소
          </Button>
          <Button busy={pending} onClick={() => onConfirm({ playerColor: color, engineElo: elo })}>
            시작
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
