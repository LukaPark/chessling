import { useQuery } from '@tanstack/react-query'
import type { GameRef } from '../../chess/gameRef'
import { loadAnnotations, type Annotations } from '../../sources/annotations'

export function useAnnotations(ref: GameRef): Annotations | null {
  const slug = ref.kind === 'classic' ? ref.slug : null
  const q = useQuery({
    queryKey: ['annotations', slug],
    queryFn: () => loadAnnotations(slug!),
    enabled: slug !== null,
    staleTime: Infinity,
  })
  return q.data ?? null
}
