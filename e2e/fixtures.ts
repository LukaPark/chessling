export const SCHOLAR_PGN = '[Event "Rated blitz game"]\n[White "tester"]\n[Black "rival"]\n[Result "1-0"]\n\n1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0'

export const LICHESS_GAME = {
  id: 'e2egame1',
  variant: 'standard',
  speed: 'blitz',
  createdAt: Date.UTC(2026, 8, 29, 12),
  status: 'mate',
  winner: 'white',
  players: { white: { user: { name: 'tester' }, rating: 1500 }, black: { user: { name: 'rival' }, rating: 1490 } },
  clock: { initial: 180, increment: 0 },
}

export const CORS = { 'Access-Control-Allow-Origin': '*' }
