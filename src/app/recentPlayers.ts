import { useSyncExternalStore } from 'react'

export const RECENT_PLAYERS_KEY = 'chessling-recent-players'
const LIMIT = 3

export interface RecentPlayer {
  platform: 'chesscom' | 'lichess'
  username: string
}

const EMPTY: RecentPlayer[] = []

function isRecentPlayer(v: unknown): v is RecentPlayer {
  if (typeof v !== 'object' || v === null) return false
  const { platform, username } = v as Record<string, unknown>
  return (platform === 'chesscom' || platform === 'lichess') && typeof username === 'string' && username.length > 0
}

/** 저장소를 읽을 수 없으면 null. 깨졌거나 모르는 모양의 값은 빈 목록으로 본다 */
function readStored(): RecentPlayer[] | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(RECENT_PLAYERS_KEY)
  } catch {
    return null
  }
  if (raw === null) return EMPTY
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return EMPTY
    return parsed
      .filter(isRecentPlayer)
      .map(({ platform, username }) => ({ platform, username }))
      .slice(0, LIMIT)
  } catch {
    return EMPTY
  }
}

/** null이면 아직 읽지 않았고, available이 false면 저장소를 쓸 수 없다 */
let state: { available: boolean; list: RecentPlayer[] } | null = null
const listeners = new Set<() => void>()

function current() {
  if (!state) {
    const list = readStored()
    state = list === null ? { available: false, list: EMPTY } : { available: true, list }
  }
  return state
}
const snapshot = () => current().list
function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

const same = (a: RecentPlayer, b: RecentPlayer) => a.platform === b.platform && a.username.toLowerCase() === b.username.toLowerCase()

function update(next: (list: RecentPlayer[]) => RecentPlayer[]) {
  const s = current()
  if (!s.available) return
  const list = next(s.list)
  state = { available: true, list }
  try {
    localStorage.setItem(RECENT_PLAYERS_KEY, JSON.stringify(list))
  } catch {
    // 저장할 수 없어도 이번 세션에는 적용한다
  }
  listeners.forEach((fn) => fn())
}

/** 맨 앞에 넣는다. 이미 있으면(같은 플랫폼, 아이디 대소문자 무시) 앞으로 옮기고 이번 철자를 쓴다. 최대 3개 */
export function addRecentPlayer(player: RecentPlayer): void {
  const entry = { platform: player.platform, username: player.username }
  update((list) => [entry, ...list.filter((p) => !same(p, entry))].slice(0, LIMIT))
}

export function removeRecentPlayer(player: RecentPlayer): void {
  update((list) => list.filter((p) => !same(p, player)))
}

/** 최근에 불러온 계정, 최근 것부터. 저장소를 쓸 수 없으면 빈 목록 */
export function useRecentPlayers(): RecentPlayer[] {
  return useSyncExternalStore(subscribe, snapshot)
}

export function resetRecentPlayersForTest(): void {
  state = null
}
