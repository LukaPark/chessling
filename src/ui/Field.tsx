import { ChevronDown } from 'lucide-react'
import { useId, type ComponentProps, type ReactNode } from 'react'
import { visuallyHidden } from './a11y.css'
import { cx } from './cx'
import * as s from './field.css'
import { Icon } from './Icon'

export function TextField({
  label,
  hideLabel = false,
  className,
  ...input
}: { label: string; hideLabel?: boolean } & ComponentProps<'input'>) {
  const generated = useId()
  const id = input.id ?? generated
  return (
    <div className={cx(s.field, className)}>
      <label htmlFor={id} className={hideLabel ? visuallyHidden : s.label}>
        {label}
      </label>
      <input {...input} id={id} className={s.control} />
    </div>
  )
}

export function SelectField({
  label,
  hideLabel = false,
  className,
  children,
  ...select
}: { label: string; hideLabel?: boolean; children: ReactNode } & ComponentProps<'select'>) {
  const generated = useId()
  const id = select.id ?? generated
  return (
    <div className={cx(s.field, className)}>
      <label htmlFor={id} className={hideLabel ? visuallyHidden : s.label}>
        {label}
      </label>
      <div className={s.selectWrap}>
        <select {...select} id={id} className={s.select}>
          {children}
        </select>
        <Icon icon={ChevronDown} size={18} className={s.chevron} />
      </div>
    </div>
  )
}
