import { House } from 'lucide-react'
import * as p from '../styles/features/page.css'
import { LinkButton } from '../ui/Button'

export function NotFound() {
  return (
    <div className={p.reading}>
      <p className={p.bigNumber} aria-hidden="true">
        404
      </p>
      <h1 className={p.pageTitle}>페이지를 찾을 수 없어요</h1>
      <div>
        <LinkButton to="/" tone="secondary" icon={House}>
          홈으로
        </LinkButton>
      </div>
    </div>
  )
}
