import { RotateCcw, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PgnError } from '../chess/pgn'
import { HttpError } from '../sources/http'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import * as s from '../ui/feedback.css'

const RATE_LIMIT_WAIT_MS = 60_000

export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const kind = error instanceof HttpError ? error.kind : null
  const [deadline] = useState(() => (kind === 'rate_limited' ? Date.now() + RATE_LIMIT_WAIT_MS : 0))
  const [now, setNow] = useState(() => Date.now())
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000))
  const waiting = remaining > 0

  useEffect(() => {
    if (!waiting) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [waiting])

  return (
    <div className={s.error} role="alert">
      <div className={s.errorHead}>
        <Icon icon={TriangleAlert} size={18} className={s.icon} />
        <p>{message(error, remaining)}</p>
      </div>
      {onRetry && (
        <Button tone="secondary" size="sm" icon={RotateCcw} onClick={onRetry} disabled={waiting}>
          다시 시도
        </Button>
      )}
    </div>
  )
}

function message(error: unknown, remaining: number): string {
  if (error instanceof PgnError) return '기보를 읽을 수 없어요.'
  if (error instanceof HttpError) {
    switch (error.kind) {
      case 'not_found':
        return '찾을 수 없어요. 아이디나 플랫폼을 확인해 주세요.'
      case 'rate_limited':
        return remaining > 0
          ? `요청이 너무 많아요. ${remaining}초 후에 다시 시도할 수 있어요.`
          : '이제 다시 시도할 수 있어요.'
      case 'network':
        return '네트워크에 연결할 수 없어요.'
      case 'server':
        return '서버에 문제가 있어요. 잠시 후 다시 시도해 주세요.'
    }
  }
  return error instanceof Error ? error.message : '알 수 없는 오류가 났어요.'
}
