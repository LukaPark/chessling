import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import type { Ply } from '../../chess/types'
import { buildLookup, identifyOpening } from '../../openings/identify'
import type { OpeningTrack } from '../../openings/types'
import { loadOpeningData } from '../../sources/openings'

export function useOpening(plies: Ply[]): OpeningTrack | null {
  const q = useQuery({
    queryKey: ['openings'],
    queryFn: async () => {
      const data = await loadOpeningData()
      return { data, lookup: buildLookup(data.index) }
    },
    staleTime: Infinity,
    retry: false,
  })
  useEffect(() => {
    if (q.error) console.warn('[opening] 오프닝 데이터를 불러오지 못했어요', q.error)
  }, [q.error])
  return useMemo(() => (q.data ? identifyOpening(plies, q.data.data, q.data.lookup) : null), [plies, q.data])
}
