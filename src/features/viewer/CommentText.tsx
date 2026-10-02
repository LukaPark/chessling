import { useState } from 'react'
import * as v from '../../styles/features/viewer.css'
import { cx } from '../../ui/cx'

export const COMMENT_CLAMP_CHARS = 90

/** "[[...]]"을 변화 수순 조각으로 나눈다 */
function segments(text: string): { variation: boolean; text: string }[] {
  const out: { variation: boolean; text: string }[] = []
  const re = /\[\[(.+?)\]\]/g
  let last = 0
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({ variation: false, text: text.slice(last, m.index) })
    out.push({ variation: true, text: m[1] })
    last = m.index! + m[0].length
  }
  if (last < text.length) out.push({ variation: false, text: text.slice(last) })
  return out
}

export function CommentText({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const long = text.replace(/\[\[|\]\]/g, '').length > COMMENT_CLAMP_CHARS
  return (
    <div className={v.comment}>
      <p className={cx(v.commentText, long && !open && v.commentClamped)}>
        {segments(text).map((s, i) =>
          s.variation ? (
            <span key={i} className={v.variation} data-variation="">
              {s.text}
            </span>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
      </p>
      {long && (
        <button type="button" className={v.moreButton} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? '접기' : '더 보기'}
        </button>
      )}
    </div>
  )
}
