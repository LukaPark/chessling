import type { Player } from '../chess/types'

export function playerLabel(p: Player): string {
  return `${p.title ? `${p.title} ` : ''}${p.name}${p.rating ? ` (${p.rating})` : ''}`
}
