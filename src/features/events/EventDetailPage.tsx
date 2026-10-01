import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'
import { ErrorView } from '../../components/ErrorView'
import { queryKeys } from '../../sources'
import * as l from '../../styles/features/lists.css'
import * as p from '../../styles/features/page.css'
import { Button } from '../../ui/Button'
import { SelectField } from '../../ui/Field'
import { getBroadcastTour, getRoundGames } from '../../sources/broadcast'
import { GameList } from '../player/GameList'

export function EventDetailPage() {
  const { tourId = '' } = useParams()
  const qc = useQueryClient()
  const tour = useQuery({ queryKey: queryKeys.broadcastTour(tourId), queryFn: ({ signal }) => getBroadcastTour(tourId, signal) })
  const [roundId, setRoundId] = useState<string | null>(null)
  const detail = tour.data
  const selected = roundId ?? detail?.defaultRoundId ?? detail?.rounds.at(-1)?.id ?? null
  const games = useQuery({
    queryKey: queryKeys.broadcastRound(selected ?? 'none'),
    queryFn: ({ signal }) => getRoundGames(selected!, signal),
    enabled: selected !== null,
    staleTime: 30_000,
  })

  if (tour.isError) return <ErrorView key={tour.errorUpdatedAt} error={tour.error} onRetry={() => void tour.refetch()} />
  if (!detail) return <p className={p.meta}>불러오는 중…</p>
  const noRounds = detail.rounds.length === 0
  return (
    <div className={p.page}>
      <h1 className={p.pageTitle}>{detail.tour.name}</h1>
      <div className={l.toolbar}>
        <SelectField label="라운드" value={selected ?? ''} onChange={(e) => setRoundId(e.target.value)}>
          {detail.rounds.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
              {r.ongoing ? ' (진행 중)' : ''}
            </option>
          ))}
        </SelectField>
        {selected && (
          <Button tone="ghost" icon={RefreshCw} onClick={() => void qc.invalidateQueries({ queryKey: queryKeys.broadcastRound(selected) })}>
            새로고침
          </Button>
        )}
      </div>
      {noRounds ? (
        <p className={p.meta}>라운드가 없어요.</p>
      ) : games.isError ? (
        <ErrorView key={games.errorUpdatedAt} error={games.error} onRetry={() => void games.refetch()} />
      ) : games.isPending ? (
        <p className={p.meta}>불러오는 중…</p>
      ) : (
        <GameList games={games.data} />
      )}
    </div>
  )
}
