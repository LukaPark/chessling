import { turnOf } from '../chess/pgn'
import { toWhitePov, type Score } from './classify'
import { parseBestMove, parseInfo } from './uci'

export interface WorkerLike {
  postMessage(message: string): void
  onmessage: ((ev: { data: unknown }) => void) | null
  onerror: ((ev: unknown) => void) | null
  terminate(): void
}
export type WorkerFactory = () => WorkerLike

export interface EngineLine {
  depth: number
  multipv: number
  /** 백 기준 */
  score: Score
  pv: string[]
}
export interface SearchResult {
  lines: EngineLine[]
  bestMove: string | null
  cancelled: boolean
}
export interface AnalyzeOptions {
  depth?: number
  movetime?: number
  multiPv?: number
  signal?: AbortSignal
}

export class EngineCrashedError extends Error {
  constructor() {
    super('Stockfish 워커가 중단됐습니다')
    this.name = 'EngineCrashedError'
  }
}

interface Job {
  fen: string
  go: string
  multiPv: number
  onInfo?: (lines: EngineLine[]) => void
  resolve: (r: SearchResult) => void
  reject: (e: unknown) => void
  lines: EngineLine[]
  cancelled: boolean
  retried: boolean
  attempt: number
}
interface Waiter {
  match: (line: string) => boolean
  resolve: () => void
  reject: (e: unknown) => void
}

const DEFAULT_DEPTH = 18

export class UciEngine {
  private worker: WorkerLike | null = null
  private ready: Promise<void> | null = null
  private waiters: Waiter[] = []
  private queue: Job[] = []
  private current: Job | null = null
  private multiPv = 1
  private desired: Record<string, string | number>
  private idleWaiters: (() => void)[] = []
  private attempts = 0

  constructor(
    private readonly factory: WorkerFactory,
    private readonly baseOptions: Record<string, string | number> = {},
  ) {
    this.desired = { ...baseOptions }
  }

  analyze(fen: string, opts: AnalyzeOptions = {}, onInfo?: (lines: EngineLine[]) => void): Promise<SearchResult> {
    const go = opts.movetime !== undefined ? `go movetime ${opts.movetime}` : `go depth ${opts.depth ?? DEFAULT_DEPTH}`
    let onAbort: (() => void) | undefined
    const promise = new Promise<SearchResult>((resolve, reject) => {
      const job: Job = {
        fen,
        go,
        multiPv: opts.multiPv ?? 1,
        onInfo,
        resolve,
        reject,
        lines: [],
        cancelled: false,
        retried: false,
        attempt: 0,
      }
      this.supersedeAll()
      if (opts.signal?.aborted) {
        job.cancelled = true
        resolve(cancelledResult())
        return
      }
      onAbort = () => this.cancel(job)
      opts.signal?.addEventListener('abort', onAbort, { once: true })
      this.queue.push(job)
      void this.pump()
    })
    // 신호가 오래 살아있는 리뷰에서 탐색마다 리스너가 쌓이지 않도록 끝나면 떼어낸다.
    const detach = () => {
      if (onAbort) opts.signal?.removeEventListener('abort', onAbort)
    }
    promise.then(detach, detach)
    return promise
  }

  async bestMove(fen: string, opts: { movetime: number; elo?: number; signal?: AbortSignal }): Promise<string | null> {
    if (opts.elo !== undefined && Math.round(opts.elo) !== this.desired.UCI_Elo) {
      this.supersedeAll()
      await this.whenIdle()
      await this.setOptions({ UCI_LimitStrength: 'true', UCI_Elo: Math.round(opts.elo) })
    }
    const r = await this.analyze(fen, { movetime: opts.movetime, signal: opts.signal })
    return r.cancelled ? null : r.bestMove
  }

  /** 탐색 중이 아닐 때 호출한다 */
  async setOptions(options: Record<string, string | number>): Promise<void> {
    await this.ensureReady()
    Object.assign(this.desired, options)
    for (const [name, value] of Object.entries(options)) this.send(`setoption name ${name} value ${value}`)
    this.send('isready')
    await this.waitFor((l) => l === 'readyok')
  }

  stop(): void {
    this.supersedeAll()
  }

  dispose(): void {
    this.supersedeAll()
    const job = this.current
    this.current = null
    if (job) {
      job.cancelled = true
      job.resolve(cancelledResult())
    }
    this.worker?.terminate()
    this.worker = null
    this.ready = null
    for (const w of this.waiters.splice(0)) w.reject(new Error('engine disposed'))
    this.flushIdle()
  }

  private whenIdle(): Promise<void> {
    if (!this.current) return Promise.resolve()
    return new Promise((resolve) => this.idleWaiters.push(resolve))
  }

  private flushIdle() {
    if (this.current) return
    for (const r of this.idleWaiters.splice(0)) r()
  }

  private supersedeAll() {
    for (const q of this.queue.splice(0)) {
      q.cancelled = true
      q.resolve(cancelledResult())
    }
    if (this.current && !this.current.cancelled) {
      this.current.cancelled = true
      this.send('stop')
    }
  }

  private cancel(job: Job) {
    const i = this.queue.indexOf(job)
    if (i >= 0) {
      this.queue.splice(i, 1)
      job.cancelled = true
      job.resolve(cancelledResult())
    } else if (this.current === job && !job.cancelled) {
      job.cancelled = true
      this.send('stop')
    }
  }

  private async pump(): Promise<void> {
    if (this.current || this.queue.length === 0) return
    const job = this.queue.shift()!
    this.current = job
    const attempt = ++this.attempts
    job.attempt = attempt
    try {
      await this.ensureReady()
      if (this.current !== job || job.attempt !== attempt) return
      if (job.cancelled) {
        this.finish(job, null)
        return
      }
      if (job.multiPv !== this.multiPv) {
        this.send(`setoption name MultiPV value ${job.multiPv}`)
        this.multiPv = job.multiPv
      }
      this.send(`position fen ${job.fen}`)
      this.send(job.go)
    } catch (e) {
      if (this.current === job && job.attempt === attempt) {
        this.current = null
        job.reject(e)
        this.flushIdle()
        void this.pump()
      }
    }
  }

  private ensureReady(): Promise<void> {
    if (!this.ready) {
      const worker = this.factory()
      worker.onmessage = (ev) => {
        if (typeof ev.data === 'string') this.onLine(ev.data.trim())
      }
      worker.onerror = () => this.onCrash(worker)
      this.worker = worker
      this.multiPv = 1
      this.ready = (async () => {
        this.send('uci')
        await this.waitFor((l) => l === 'uciok')
        for (const [name, value] of Object.entries(this.desired)) this.send(`setoption name ${name} value ${value}`)
        this.send('isready')
        await this.waitFor((l) => l === 'readyok')
      })()
    }
    return this.ready
  }

  private onLine(line: string) {
    const wi = this.waiters.findIndex((w) => w.match(line))
    if (wi >= 0) {
      const [w] = this.waiters.splice(wi, 1)
      w.resolve()
      return
    }
    const job = this.current
    if (!job) return
    const info = parseInfo(line)
    if (info) {
      if (job.cancelled) return
      job.lines[info.multipv - 1] = { ...info, score: toWhitePov(info.score, turnOf(job.fen)) }
      job.onInfo?.(job.lines.filter(Boolean))
      return
    }
    const best = parseBestMove(line)
    if (best !== undefined) this.finish(job, best)
  }

  private finish(job: Job, best: string | null) {
    if (this.current === job) this.current = null
    job.resolve({ lines: job.lines.filter(Boolean), bestMove: job.cancelled ? null : best, cancelled: job.cancelled })
    this.flushIdle()
    void this.pump()
  }

  private onCrash(worker: WorkerLike) {
    if (worker !== this.worker) return
    worker.terminate()
    this.worker = null
    this.ready = null
    for (const w of this.waiters.splice(0)) w.reject(new EngineCrashedError())
    const job = this.current
    this.current = null
    if (job) {
      if (job.cancelled) job.resolve(cancelledResult())
      else if (!job.retried) {
        job.retried = true
        job.lines = []
        this.queue.unshift(job)
      } else job.reject(new EngineCrashedError())
    }
    this.flushIdle()
    void this.pump()
  }

  private send(cmd: string) {
    this.worker?.postMessage(cmd)
  }

  private waitFor(match: (line: string) => boolean): Promise<void> {
    return new Promise((resolve, reject) => this.waiters.push({ match, resolve, reject }))
  }
}

function cancelledResult(): SearchResult {
  return { lines: [], bestMove: null, cancelled: true }
}
