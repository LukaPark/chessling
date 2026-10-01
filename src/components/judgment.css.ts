import { styleVariants } from '@vanilla-extract/css'
import { MOVE_LABELS, type MoveLabel } from '../engine/judge'
import { vars } from '../styles/tokens.css'

export const glyphColor = styleVariants(
  Object.fromEntries(MOVE_LABELS.map((l) => [l, { color: vars.color.judgment[l] }])) as Record<MoveLabel, { color: string }>,
)
