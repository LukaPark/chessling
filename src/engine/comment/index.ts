import { compose, type MoveComment } from './compose'
import type { CommentInput } from './facts'

export type { MoveComment } from './compose'
export type { CommentInput, Fact } from './facts'

export function commentFor(input: CommentInput): MoveComment | null {
  return compose(input, [])?.comment ?? null
}

/** 반복 방지를 위해 앞에서부터 차례로 만든다. 0번은 null */
export function commentsForGame(base: Omit<CommentInput, 'index'>): (MoveComment | null)[] {
  const out: (MoveComment | null)[] = [null]
  const recent: string[][] = []
  for (let index = 1; index < base.plies.length; index++) {
    const r = compose({ ...base, index }, recent.flat())
    out.push(r?.comment ?? null)
    recent.push(r?.keys ?? [])
    if (recent.length > 3) recent.shift()
  }
  return out
}
