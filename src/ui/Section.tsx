import { useId, type ReactNode } from 'react'
import { cx } from './cx'
import { Reveal } from './Reveal'
import * as s from './section.css'

export function Section({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  id?: string
  title: string
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  const titleId = useId()
  return (
    <section id={id} aria-labelledby={titleId} className={cx(s.section, className)}>
      <Reveal>
        <div className={s.head}>
          <div>
            <h2 id={titleId} className={s.title}>
              {title}
            </h2>
            {description && <p className={s.description}>{description}</p>}
          </div>
          {action}
        </div>
      </Reveal>
      <Reveal variant="graphic" index={1}>
        {children}
      </Reveal>
    </section>
  )
}
