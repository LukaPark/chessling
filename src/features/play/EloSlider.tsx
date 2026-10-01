import { ELO_MAX, ELO_MIN } from '../../chess/fork'
import * as s from '../../styles/features/play.css'

export function EloSlider({ value, onChange }: { value: number; onChange: (elo: number) => void }) {
  return (
    <label className={s.elo}>
      <span className={s.eloLabel}>엔진 Elo</span>
      <strong className={s.eloValue}>{value}</strong>
      <input
        type="range"
        className={s.range}
        min={ELO_MIN}
        max={ELO_MAX}
        step={10}
        value={value}
        aria-label="엔진 Elo"
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}
