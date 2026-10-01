import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'
import type { GameSummary, Speed } from '../../chess/types'
import { ErrorView } from '../../components/ErrorView'
import { queryKeys } from '../../sources'
import { fetchChesscomKoreanMonth, koreanArchiveMonths, listArchives } from '../../sources/chesscom'
import * as l from '../../styles/features/lists.css'
import * as p from '../../styles/features/page.css'
import { Badge } from '../../ui/Badge'
import { Button, IconButton } from '../../ui/Button'
import { SelectField } from '../../ui/Field'
import { Segmented } from '../../ui/Segmented'
import { NotFound } from '../NotFound'
import { DEFAULT_FILTER, filterGames, type GameFilter } from './filters'
import { GameList, SPEED_LABEL } from './GameList'
import { useLichessGames } from './useLichessGames'

export function PlayerPage() {
  const { platform, username = '' } = useParams()
  if (platform !== 'chesscom' && platform !== 'lichess') return <NotFound />
  return (
    <div className={p.page}>
      <header className={p.pageHead}>
        <h1 className={p.pageTitle}>{username}</h1>
        <div>
          <Badge>{platform === 'chesscom' ? 'Chess.com' : 'Lichess'}</Badge>
        </div>
      </header>
      {platform === 'chesscom' ? <ChesscomGames key={username} username={username} /> : <LichessGames key={username} username={username} />}
    </div>
  )
}

function ChesscomGames({ username }: { username: string }) {
  const archives = useQuery({
    queryKey: queryKeys.chesscomArchives(username),
    queryFn: ({ signal }) => listArchives(username, signal),
  })
  const [index, setIndex] = useState<number | null>(null)
  const months = koreanArchiveMonths(archives.data ?? [])
  const current = index ?? months.length - 1
  const month = months[current]
  const games = useQuery({
    queryKey: month ? ['chesscom', 'korean-month', username.toLowerCase(), month.yyyy, month.mm, archives.data] : ['chesscom', 'month', 'none'],
    enabled: month !== undefined,
    queryFn: ({ signal }) => fetchChesscomKoreanMonth(username, month!.yyyy, month!.mm, archives.data ?? [], signal),
    staleTime: 60_000,
  })

  if (archives.isError) return <ErrorView key={archives.errorUpdatedAt} error={archives.error} onRetry={() => void archives.refetch()} />
  if (archives.isPending) return <p className={p.meta}>불러오는 중…</p>
  if (!month) return <p className={p.meta}>대국이 없어요.</p>
  return (
    <>
      <div className={l.monthNav}>
        <IconButton icon={ChevronLeft} label="이전 달" disabled={current <= 0} onClick={() => setIndex(current - 1)} />
        <span className={l.monthLabel}>
          {month.yyyy}년 {Number(month.mm)}월
        </span>
        <IconButton icon={ChevronRight} label="다음 달" disabled={current >= months.length - 1} onClick={() => setIndex(current + 1)} />
      </div>
      {games.isError ? (
        <ErrorView key={games.errorUpdatedAt} error={games.error} onRetry={() => void games.refetch()} />
      ) : games.isPending ? (
        <p className={p.meta}>불러오는 중…</p>
      ) : (
        <FilteredGames games={games.data} username={username} />
      )}
    </>
  )
}

function LichessGames({ username }: { username: string }) {
  const { games, loading, error, errorCount, hasMore, loadMore, retry } = useLichessGames(username)
  return (
    <>
      <FilteredGames games={games} username={username} />
      {loading && <p className={p.meta}>불러오는 중…</p>}
      {error !== null && <ErrorView key={errorCount} error={error} onRetry={retry} />}
      {hasMore && !loading && (
        <div>
          <Button tone="secondary" onClick={loadMore}>
            더 보기
          </Button>
        </div>
      )}
    </>
  )
}

function FilteredGames({ games, username }: { games: GameSummary[]; username: string }) {
  const [filter, setFilter] = useState<GameFilter>(DEFAULT_FILTER)
  const speeds = [...new Set(games.map((g) => g.speed))]
  return (
    <>
      <div className={l.toolbar}>
        <SelectField label="시간 제한" value={filter.speed} onChange={(e) => setFilter({ ...filter, speed: e.target.value as Speed | 'all' })}>
          <option value="all">전체</option>
          {speeds.map((s) => (
            <option key={s} value={s}>
              {SPEED_LABEL[s]}
            </option>
          ))}
        </SelectField>
        <Segmented
          legend="색"
          name="filter-color"
          value={filter.color}
          onChange={(color) => setFilter({ ...filter, color })}
          options={[
            { value: 'all', label: '전체' },
            { value: 'white', label: '백' },
            { value: 'black', label: '흑' },
          ]}
        />
        <Segmented
          legend="결과"
          name="filter-result"
          value={filter.result}
          onChange={(result) => setFilter({ ...filter, result })}
          options={[
            { value: 'all', label: '전체' },
            { value: 'win', label: '승' },
            { value: 'loss', label: '패' },
            { value: 'draw', label: '무' },
          ]}
        />
      </div>
      <GameList games={filterGames(games, username, filter)} username={username} />
    </>
  )
}
