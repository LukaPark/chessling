import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { ErrorView } from '../../components/ErrorView'
import { queryKeys } from '../../sources'
import * as l from '../../styles/features/lists.css'
import * as p from '../../styles/features/page.css'
import { Section } from '../../ui/Section'
import { Segmented } from '../../ui/Segmented'
import { isHighlighted, listTopBroadcasts, searchBroadcasts, type BroadcastTour } from '../../sources/broadcast'

const QUICK = [
  { label: '올림피아드', q: 'Olympiad' },
  { label: '월드챔피언십', q: 'World Championship' },
  { label: '캔디데이츠', q: 'Candidates' },
]

export function EventsPage() {
  const [q, setQ] = useState<string | null>(null)
  const top = useQuery({ queryKey: queryKeys.broadcastTop(), queryFn: ({ signal }) => listTopBroadcasts(signal), enabled: q === null })
  const search = useQuery({
    queryKey: queryKeys.broadcastSearch(q ?? ''),
    queryFn: ({ signal }) => searchBroadcasts(q!, signal),
    enabled: q !== null,
  })

  return (
    <div className={p.page}>
      <h1 className={p.pageTitle}>대회</h1>
      <Segmented
        legend="대회 분류"
        name="events-filter"
        value={q ?? ''}
        onChange={(v) => setQ(v === '' ? null : v)}
        options={[{ value: '', label: '추천' }, ...QUICK.map((x) => ({ value: x.q, label: x.label }))]}
      />
      {q === null ? (
        top.isError ? (
          <ErrorView key={top.errorUpdatedAt} error={top.error} onRetry={() => void top.refetch()} />
        ) : top.isPending ? (
          <p className={p.meta}>불러오는 중…</p>
        ) : (
          <>
            <Section title="진행 중">
              <TourList tours={top.data.active} />
            </Section>
            <Section title="최근">
              <TourList tours={top.data.past} />
            </Section>
          </>
        )
      ) : search.isError ? (
        <ErrorView key={search.errorUpdatedAt} error={search.error} onRetry={() => void search.refetch()} />
      ) : search.isPending ? (
        <p className={p.meta}>불러오는 중…</p>
      ) : (
        <TourList tours={search.data} />
      )}
    </div>
  )
}

function TourList({ tours }: { tours: BroadcastTour[] }) {
  if (tours.length === 0) return <p className={p.meta}>대회가 없어요.</p>
  return (
    <ul className={l.rows}>
      {tours.map((t) => (
        <li key={t.id} data-highlight={isHighlighted(t) ? 'true' : undefined}>
          <Link to={`/events/${t.id}`} className={l.tourRow}>
            <span className={l.tourName}>
              {isHighlighted(t) && <span className={l.tourDot} aria-hidden="true" />}
              {t.name}
            </span>
            {t.dates?.[0] !== undefined && <span className={l.rowMeta}>{new Date(t.dates[0]).toISOString().slice(0, 10)}</span>}
          </Link>
        </li>
      ))}
    </ul>
  )
}
