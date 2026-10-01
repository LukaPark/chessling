import type { QueryClient } from '@tanstack/react-query'
import { refKey, type GameRef } from '../chess/gameRef'
import type { GameRecord } from '../chess/types'
import { getRoundGames } from './broadcast'
import { fetchChesscomMonth, findInMonth } from './chesscom'
import { classicToRecord, getClassic } from './classics'
import { HttpError } from './http'
import { getLichessGame } from './lichess'

export const queryKeys = {
  game: (ref: GameRef) => ['game', refKey(ref)] as const,
  lichessGame: (id: string) => ['lichess', 'game', id] as const,
  chesscomArchives: (user: string) => ['chesscom', 'archives', user.toLowerCase()] as const,
  chesscomMonth: (user: string, yyyy: string, mm: string) => ['chesscom', 'month', user.toLowerCase(), yyyy, mm] as const,
  broadcastTop: () => ['broadcast', 'top'] as const,
  broadcastSearch: (q: string) => ['broadcast', 'search', q] as const,
  broadcastTour: (id: string) => ['broadcast', 'tour', id] as const,
  broadcastRound: (id: string) => ['broadcast', 'round', id] as const,
}

/** 지난 달 아카이브는 변하지 않으므로 무기한 캐시, 이번 달(과 미래)은 60초 */
export function chesscomMonthStaleTime(yyyy: string, mm: string, now: Date = new Date()): number {
  const current = now.getUTCFullYear() * 12 + now.getUTCMonth()
  const target = Number(yyyy) * 12 + (Number(mm) - 1)
  return target < current ? Infinity : 60_000
}

export async function getGame(ref: GameRef, qc: QueryClient): Promise<GameRecord> {
  switch (ref.kind) {
    case 'lichess':
      return qc.fetchQuery({
        queryKey: queryKeys.lichessGame(ref.id),
        queryFn: ({ signal }) => getLichessGame(ref.id, signal),
        staleTime: Infinity,
        retry: false,
      })
    case 'chesscom': {
      const month = await qc.fetchQuery({
        queryKey: queryKeys.chesscomMonth(ref.user, ref.yyyy, ref.mm),
        queryFn: ({ signal }) => fetchChesscomMonth(ref.user, ref.yyyy, ref.mm, signal),
        staleTime: chesscomMonthStaleTime(ref.yyyy, ref.mm),
        retry: false,
      })
      return findInMonth(month, ref.uuid)
    }
    case 'broadcast': {
      const games = await qc.fetchQuery({
        queryKey: queryKeys.broadcastRound(ref.roundId),
        queryFn: ({ signal }) => getRoundGames(ref.roundId, signal),
        staleTime: 30_000,
        retry: false,
      })
      const found = games.find((g) => g.ref.kind === 'broadcast' && g.ref.gameId === ref.gameId)
      if (!found) throw new HttpError('not_found', 404, `대국 ${ref.gameId}를 찾을 수 없습니다`)
      return found
    }
    case 'classic': {
      const c = getClassic(ref.slug)
      if (!c) throw new HttpError('not_found', 404, `명경기 ${ref.slug}를 찾을 수 없습니다`)
      return classicToRecord(c)
    }
  }
}
