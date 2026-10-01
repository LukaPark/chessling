import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { IconButton } from './Button'
import { cx } from './cx'
import * as s from './dialog.css'

export function Dialog({
  title,
  onClose,
  children,
  variant = 'center',
  className,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  variant?: 'center' | 'sheet'
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (d && !d.open) d.showModal()
    return () => {
      if (d?.open) d.close()
      if (opener?.isConnected) opener.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cx(s.dialog[variant], className)}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={cx(s.panel, variant === 'sheet' && s.sheetPanel)}>
        <div className={s.head}>
          <h2 id={titleId} className={s.title}>
            {title}
          </h2>
          <IconButton icon={X} label="닫기" onClick={onClose} />
        </div>
        {children}
      </div>
    </dialog>
  )
}
