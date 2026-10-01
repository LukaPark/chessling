import { UciEngine, type WorkerLike } from './UciEngine'

export const ENGINE_FILES = {
  multi: '/engine/stockfish-19-lite.js',
  single: '/engine/stockfish-19-lite-single.js',
} as const

/** 멀티스레드 빌드가 첫 준비 전에 죽은 적이 있으면 이 세션(페이지 수명) 동안 싱글스레드만 쓴다 */
let singleOnly = false
const listeners = new Set<() => void>()

/** 실제로 멀티스레드 엔진을 쓰는지. 격리 환경이어도 멀티스레드 빌드가 뜨지 못했으면 false */
export function isMultiThreaded(): boolean {
  return !singleOnly && globalThis.crossOriginIsolated === true && typeof SharedArrayBuffer !== 'undefined'
}

/** isMultiThreaded()가 바뀌면 알린다(useSyncExternalStore용) */
export function subscribeEngineMode(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function engineUrl(multi = isMultiThreaded()): string {
  return multi ? ENGINE_FILES.multi : ENGINE_FILES.single
}

function spawn(multi: boolean): WorkerLike {
  return new Worker(engineUrl(multi)) as unknown as WorkerLike
}

function analysisThreads(multi: boolean): number {
  if (!multi) return 1
  const cores = navigator.hardwareConcurrency ?? 2
  return Math.max(1, Math.min(4, cores - 1))
}

const engines: UciEngine[] = []

function fallBackToSingle() {
  if (singleOnly) return
  singleOnly = true
  // 한 엔진이 갈아타면 다른 엔진도 다음 워커부터 싱글로 띄운다(Threads도 함께 1로).
  for (const e of engines) e.useFallback()
  for (const l of listeners) l()
}

export function createEngine(options: { Threads: number; Hash: number }, factory: (multi: boolean) => WorkerLike = spawn): UciEngine {
  const multi = isMultiThreaded()
  const engine = new UciEngine(
    () => factory(multi),
    options,
    multi ? { factory: () => factory(false), options: { Threads: 1 }, onFallback: fallBackToSingle } : undefined,
  )
  engines.push(engine)
  return engine
}

let analysis: UciEngine | null = null
let play: UciEngine | null = null

/** 풀파워: 실시간 분석 + 대국 리뷰 */
export function getAnalysisEngine(): UciEngine {
  return (analysis ??= createEngine({ Threads: analysisThreads(isMultiThreaded()), Hash: 64 }))
}

/** Elo 제한: 분기 대국 상대 */
export function getPlayEngine(): UciEngine {
  return (play ??= createEngine({ Threads: 1, Hash: 16 }))
}
