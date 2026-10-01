import { visuallyHidden } from './a11y.css'
import { cx } from './cx'
import * as s from './segmented.css'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export function Segmented<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  className,
}: {
  legend: string
  name: string
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <fieldset className={cx(s.root, className)}>
      <legend className={visuallyHidden}>{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className={s.option}>
          <input
            type="radio"
            className={s.input}
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  )
}
