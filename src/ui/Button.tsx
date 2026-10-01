import { LoaderCircle, type LucideIcon } from 'lucide-react'
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react'
import type { ComponentProps, ReactNode } from 'react'
import { Link, NavLink, type LinkProps } from 'react-router'
import { button, iconButton, spin, type ButtonVariants } from './button.css'
import { cx } from './cx'
import { Icon } from './Icon'

const MotionLink = motion.create(Link)
const hover = { y: -2 }
const tap = { scale: 0.98 }

type Common = ButtonVariants & { icon?: LucideIcon }
type MotionConflicts = 'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragOver' | 'onDragEnter' | 'onDragLeave' | 'onDrop'

export function Button({
  tone,
  size,
  icon,
  busy = false,
  disabled,
  className,
  children,
  ...rest
}: Common & { busy?: boolean; children?: ReactNode } & Omit<HTMLMotionProps<'button'>, 'children'>) {
  const inactive = Boolean(disabled || busy)
  const still = useReducedMotion() || inactive
  return (
    <motion.button
      type="button"
      whileHover={still ? undefined : hover}
      whileTap={still ? undefined : tap}
      className={cx(button({ tone, size }), className)}
      disabled={inactive}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? <Icon icon={LoaderCircle} size={18} className={spin} /> : icon ? <Icon icon={icon} size={18} /> : null}
      {children}
    </motion.button>
  )
}

export function LinkButton({ tone, size, icon, className, children, ...rest }: Common & Omit<LinkProps, MotionConflicts>) {
  const still = useReducedMotion()
  return (
    <MotionLink
      whileHover={still ? undefined : hover}
      whileTap={still ? undefined : tap}
      className={cx(button({ tone, size }), className)}
      {...rest}
    >
      {icon && <Icon icon={icon} size={18} />}
      {children}
    </MotionLink>
  )
}

export function IconButton({
  icon,
  label,
  pressed,
  className,
  ...rest
}: { icon: LucideIcon; label: string; pressed?: boolean } & Omit<ComponentProps<'button'>, 'aria-label' | 'children'>) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={pressed} className={cx(iconButton, className)} {...rest}>
      <Icon icon={icon} />
    </button>
  )
}

/** 현재 위치와 같은 링크면 aria-current="page"가 붙는다(NavLink) */
export function IconLink({
  icon,
  label,
  className,
  ...rest
}: { icon: LucideIcon; label: string; className?: string } & Omit<LinkProps, 'children' | 'className'>) {
  return (
    <NavLink aria-label={label} title={label} className={cx(iconButton, className)} {...rest}>
      <Icon icon={icon} />
    </NavLink>
  )
}
