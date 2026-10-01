import type { WorkerLike } from '../UciEngine'

export interface FakeEngineScript {
  /** `go`마다 내보낼 info 줄 */
  info?: (fen: string, go: string) => string[]
  /** 기본값 e2e4 */
  bestMove?: (fen: string, go: string) => string
  /** 처음 N번의 `go`는 `stop`이 올 때까지 결과를 내지 않는다 */
  holdGoCount?: number
  /** 이 워커의 N번째 `go`(1부터)에서 onerror를 발생시킨다 */
  crashOnGo?: number
}

export class FakeWorker implements WorkerLike {
  onmessage: ((ev: { data: unknown }) => void) | null = null
  onerror: ((ev: unknown) => void) | null = null
  sent: string[] = []
  terminated = false
  private fen = ''
  private goCount = 0
  private held: (() => void) | null = null

  constructor(private readonly script: FakeEngineScript = {}) {}

  postMessage(cmd: string): void {
    this.sent.push(cmd)
    queueMicrotask(() => this.handle(cmd))
  }

  terminate(): void {
    this.terminated = true
  }

  private emit(line: string) {
    this.onmessage?.({ data: line })
  }

  private handle(cmd: string) {
    if (this.terminated) return
    if (cmd === 'uci') {
      this.emit('id name FakeFish')
      this.emit('uciok')
    } else if (cmd === 'isready') {
      this.emit('readyok')
    } else if (cmd.startsWith('position fen ')) {
      this.fen = cmd.slice('position fen '.length)
    } else if (cmd.startsWith('go')) {
      this.goCount++
      if (this.script.crashOnGo === this.goCount) {
        this.onerror?.(new Error('fake crash'))
        return
      }
      const fen = this.fen
      const finish = () => {
        for (const line of this.script.info?.(fen, cmd) ?? []) this.emit(line)
        this.emit(`bestmove ${this.script.bestMove?.(fen, cmd) ?? 'e2e4'}`)
      }
      if (this.goCount <= (this.script.holdGoCount ?? 0)) this.held = finish
      else finish()
    } else if (cmd === 'stop') {
      const held = this.held
      this.held = null
      held?.()
    }
  }
}
