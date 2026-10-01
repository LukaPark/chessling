export interface QuizStep {
  /** 정답 수 (UCI) */
  answerUci: string
  /** 정답으로 인정할 다른 수 */
  acceptUci?: string[]
  /** 정답 뒤 상대 응수. 마지막 단계는 없음 */
  replyUci?: string
  hint?: string
  refutations?: { uci: string; text: string }[]
}

export interface QuizScene {
  id: string
  /** 이 수까지 둔 포지션에서 시작한다 (0 = 시작 포지션) */
  startPly: number
  side: 'w' | 'b'
  prompt: string
  steps: QuizStep[]
  source: 'authored' | 'auto'
}
