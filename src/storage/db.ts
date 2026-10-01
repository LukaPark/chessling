import Dexie, { type EntityTable } from 'dexie'
import type { ForkRecord } from '../chess/fork'
import type { GameReview } from '../engine/review'

export interface ReviewRecord {
  key: string
  depth: number
  review: GameReview
  createdAt: number
}

export interface Store {
  readonly persistent: boolean
  forks: {
    get(id: string): Promise<ForkRecord | undefined>
    put(fork: ForkRecord): Promise<void>
    /** updatedAt 내림차순 */
    list(): Promise<ForkRecord[]>
    delete(id: string): Promise<void>
  }
  reviews: {
    get(key: string): Promise<ReviewRecord | undefined>
    put(record: ReviewRecord): Promise<void>
  }
}

class ChesslingDb extends Dexie {
  forks!: EntityTable<ForkRecord, 'id'>
  reviews!: EntityTable<ReviewRecord, 'key'>

  constructor(name: string) {
    super(name)
    this.version(1).stores({ forks: 'id, updatedAt', reviews: 'key' })
  }
}

export async function openDexieStore(name = 'chessling'): Promise<Store> {
  const db = new ChesslingDb(name)
  await db.open()
  return {
    persistent: true,
    forks: {
      get: (id) => db.forks.get(id),
      put: async (fork) => {
        await db.forks.put(fork)
      },
      list: () => db.forks.orderBy('updatedAt').reverse().toArray(),
      delete: (id) => db.forks.delete(id),
    },
    reviews: {
      get: (key) => db.reviews.get(key),
      put: async (record) => {
        await db.reviews.put(record)
      },
    },
  }
}

export function createMemoryStore(): Store {
  const forks = new Map<string, ForkRecord>()
  const reviews = new Map<string, ReviewRecord>()
  return {
    persistent: false,
    forks: {
      get: async (id) => clone(forks.get(id)),
      put: async (fork) => {
        forks.set(fork.id, structuredClone(fork))
      },
      list: async () => [...forks.values()].sort((a, b) => b.updatedAt - a.updatedAt).map((f) => structuredClone(f)),
      delete: async (id) => {
        forks.delete(id)
      },
    },
    reviews: {
      get: async (key) => clone(reviews.get(key)),
      put: async (record) => {
        reviews.set(record.key, structuredClone(record))
      },
    },
  }
}

export async function openStore(
  name = 'chessling',
  open: (name: string) => Promise<Store> = openDexieStore,
): Promise<Store> {
  try {
    return await open(name)
  } catch (e) {
    console.warn('[storage] IndexedDB를 쓸 수 없어 메모리 저장소를 사용합니다', e)
    return createMemoryStore()
  }
}

function clone<T>(value: T | undefined): T | undefined {
  return value === undefined ? undefined : structuredClone(value)
}
