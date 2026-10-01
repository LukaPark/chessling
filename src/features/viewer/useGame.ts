import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { GameRef } from '../../chess/gameRef'
import { pgnToPlies } from '../../chess/pgn'
import type { GameRecord, Ply } from '../../chess/types'
import { getGame, queryKeys } from '../../sources'

export interface LoadedGame {
  record: GameRecord
  plies: Ply[]
}

export function useGame(ref: GameRef | null) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: ref ? queryKeys.game(ref) : ['game', 'none'],
    enabled: ref !== null,
    staleTime: Infinity,
    queryFn: async (): Promise<LoadedGame> => {
      const record = await getGame(ref!, qc)
      return { record, plies: pgnToPlies(record.pgn) }
    },
  })
}
