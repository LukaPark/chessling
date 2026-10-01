import type { Color, GameSummary, Speed } from '../../chess/types'

export interface GameFilter {
  speed: Speed | 'all'
  color: Color | 'all'
  result: 'all' | 'win' | 'loss' | 'draw'
}

export const DEFAULT_FILTER: GameFilter = { speed: 'all', color: 'all', result: 'all' }

export function userColor(g: GameSummary, username: string): Color | null {
  const u = username.toLowerCase()
  if (g.white.name.toLowerCase() === u) return 'white'
  if (g.black.name.toLowerCase() === u) return 'black'
  return null
}

export function outcomeFor(g: GameSummary, color: Color): 'win' | 'loss' | 'draw' | null {
  if (g.result === '1/2-1/2') return 'draw'
  if (g.result === '*') return null
  return (color === 'white') === (g.result === '1-0') ? 'win' : 'loss'
}

export function filterGames(games: GameSummary[], username: string, f: GameFilter): GameSummary[] {
  return games.filter((g) => {
    if (f.speed !== 'all' && g.speed !== f.speed) return false
    const color = userColor(g, username)
    if (f.color !== 'all' && color !== f.color) return false
    if (f.result !== 'all' && (!color || outcomeFor(g, color) !== f.result)) return false
    return true
  })
}
