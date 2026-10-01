export type GameRef =
  | { kind: 'lichess'; id: string }
  | { kind: 'chesscom'; user: string; yyyy: string; mm: string; uuid: string }
  | { kind: 'broadcast'; roundId: string; gameId: string }
  | { kind: 'classic'; slug: string }

const enc = encodeURIComponent

export function refToPath(ref: GameRef): string {
  switch (ref.kind) {
    case 'lichess':
      return `/game/lichess/${enc(ref.id)}`
    case 'chesscom':
      return `/game/chesscom/${enc(ref.user)}/${ref.yyyy}/${ref.mm}/${enc(ref.uuid)}`
    case 'broadcast':
      return `/game/broadcast/${enc(ref.roundId)}/${enc(ref.gameId)}`
    case 'classic':
      return `/game/classic/${enc(ref.slug)}`
  }
}

export function pathToRef(path: string): GameRef | null {
  let parts: string[]
  try {
    parts = path.replace(/^\/+|\/+$/g, '').split('/').map(decodeURIComponent)
  } catch {
    return null
  }
  if (parts[0] !== 'game') return null
  const [, kind, ...rest] = parts
  switch (kind) {
    case 'lichess':
      return rest.length === 1 && rest[0] ? { kind, id: rest[0] } : null
    case 'chesscom': {
      if (rest.length !== 4) return null
      const [user, yyyy, mm, uuid] = rest
      if (!user || !/^\d{4}$/.test(yyyy) || !/^\d{2}$/.test(mm) || !uuid) return null
      return { kind, user, yyyy, mm, uuid }
    }
    case 'broadcast':
      return rest.length === 2 && rest[0] && rest[1] ? { kind, roundId: rest[0], gameId: rest[1] } : null
    case 'classic':
      return rest.length === 1 && rest[0] ? { kind, slug: rest[0] } : null
    default:
      return null
  }
}

export function refKey(ref: GameRef): string {
  return refToPath(ref).slice('/game/'.length)
}
