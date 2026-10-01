import { UciEngine, type WorkerLike } from './UciEngine'

export const ENGINE_FILES = {
  multi: '/engine/stockfish-19-lite.js',
  single: '/engine/stockfish-19-lite-single.js',
} as const

export function isMultiThreaded(): boolean {
  return globalThis.crossOriginIsolated === true && typeof SharedArrayBuffer !== 'undefined'
}

export function engineUrl(multi = isMultiThreaded()): string {
  return multi ? ENGINE_FILES.multi : ENGINE_FILES.single
}

function spawn(): WorkerLike {
  return new Worker(engineUrl()) as unknown as WorkerLike
}

function analysisThreads(): number {
  if (!isMultiThreaded()) return 1
  const cores = navigator.hardwareConcurrency ?? 2
  return Math.max(1, Math.min(4, cores - 1))
}

let analysis: UciEngine | null = null
let play: UciEngine | null = null

/** 풀파워: 실시간 분석 + 대국 리뷰 */
export function getAnalysisEngine(): UciEngine {
  return (analysis ??= new UciEngine(spawn, { Threads: analysisThreads(), Hash: 64 }))
}

/** Elo 제한: 분기 대국 상대 */
export function getPlayEngine(): UciEngine {
  return (play ??= new UciEngine(spawn, { Threads: 1, Hash: 16 }))
}
