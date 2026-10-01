import type { LucideIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import * as s from './controlBar.css'
import { cx } from './cx'
import { Icon } from './Icon'

export function ControlBar({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} data-control-bar="" className={cx(s.bar, className)}>
      {children}
    </div>
  )
}

export function BarButton({
  icon,
  label,
  caption = false,
  pressed,
  className,
  children,
  ...rest
}: {
  icon?: LucideIcon
  label: string
  caption?: boolean | string
  pressed?: boolean
  children?: ReactNode
} & Omit<ComponentProps<'button'>, 'aria-label' | 'children'>) {
  const captionText = caption === true ? label : caption || null
  return (
    <button type="button" aria-label={label} aria-pressed={pressed} className={cx(s.item, className)} {...rest}>
      {children ?? (icon && <Icon icon={icon} size={22} />)}
      {captionText && (
        <span className={s.caption} aria-hidden="true">
          {captionText}
        </span>
      )}
    </button>
  )
}
