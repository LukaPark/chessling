import * as h from '../../styles/features/home.css'
import { visuallyHidden } from '../../ui/a11y.css'
import { InkText } from '../../ui/InkText'

export function HeroTitle({ id, lead, ink }: { id: string; lead: string; ink: string }) {
  return (
    <h1 id={id} className={h.title}>
      <span className={visuallyHidden}>
        {lead}
        {ink}
      </span>
      <span aria-hidden="true">
        <span className={h.titleLine}>{lead}</span>
        <span className={h.titleLine}><InkText text={ink} delay={0.2} /></span>
      </span>
    </h1>
  )
}
