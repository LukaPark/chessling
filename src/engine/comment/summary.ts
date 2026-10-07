import { Chess } from 'chess.js'
import { moveNumberOf } from '../../chess/moveNumber'
import { turnOf } from '../../chess/pgn'
import type { Ply, Result, Turn } from '../../chess/types'
import { winPercent } from '../classify'
import type { MoveLabel } from '../judge'
import { sacrificeAt, type GameReview } from '../review'

export interface GameSummaryText {
  /** 감상 한 문장 */
  headline: string
  /** 결과와 수 번호만 담은 짧은 사실 */
  caption: string
}

export interface SummaryInput {
  review: GameReview
  /** 인덱스 0은 시작 포지션 */
  plies: Ply[]
  result: Result
  /** 알면 나/상대로, 모르면 백/흑으로 쓴다 */
  mySide?: Turn | null
}

/** 기준값. 승률(%)은 따로 적지 않으면 해당 쪽 기준 */
export const SUMMARY_THRESHOLDS = {
  /** 이보다 수(ply)가 적으면 요약하지 않는다 */
  minPlies: 2,
  /** 이 ply 이후만 역전을 따진다(오프닝 흔들림 제외) */
  openingPlies: 16,
  /** 이긴 쪽 승률이 이 밑으로 떨어진 적이 있고, 그 뒤 진 쪽의 실수가 있으면 역전 */
  comebackBelow: 25,
  /** 전환점: 그 수 전까지 백 기준 승률이 이 범위 안 */
  balancedLow: 30,
  balancedHigh: 70,
  /** 전환점: 그 한 수로 잃은 승률 */
  turningDrop: 20,
  /** 그냥 승리: 진 쪽 실수가 이만큼 이상 잃었을 때만 고비로 본다 */
  notableDrop: 10,
  /** 우세를 잡았다고 보는 승률 */
  clearAdvantage: 70,
  /** 한 번 잡은 우세를 지켰다고 보는 하한 */
  hold: 50,
  /** 완승: 이 ply까지는 우세를 잡아야 한다(20수) */
  dominantByPly: 40,
  /** 완승: 이긴 쪽 승률이 대국 내내 이 밑으로 떨어지지 않았다 */
  dominantFloor: 40,
  /** 이 ply 안에 잡은 우세만 "초반"이라고 부른다(12수) */
  earlyPly: 24,
  /** 난타전: 양쪽이 각각 이만큼 이상 실수·블런더 */
  slugfestEach: 2,
  /** 진행 중: 이 승률 이상이면 그쪽 우세. 형세만 본 승리에서 진 쪽이 이만큼이면 "앞서 있었다" */
  leading: 60,
  /** 형세만 본 승리: 백 기준 승률이 내내 50 ± 이 안이면 "팽팽" */
  even: 15,
  /** 빈틈없는 무승부: 백 기준 승률이 내내 50 ± 이 안 */
  drawEven: 30,
  /** 이 수(full move) 안에 끝난 체크메이트는 항상 제목으로, "N수 만의"도 이때만 */
  miniatureMoves: 20,
} as const
const T = SUMMARY_THRESHOLDS

export type SummaryKind =
  | 'mate'
  | 'turning'
  | 'comeback'
  | 'comebackLoss'
  | 'dominant'
  | 'decisive'
  /** 결과는 났지만 형세가 이긴 쪽을 뒷받침하지 않는다(기권·시간패 등) */
  | 'result'
  | 'slugfest'
  | 'cleanDraw'
  | 'messyDraw'
  /** 실수 표시는 없지만 한쪽이 크게 앞선 적이 있는 무승부 */
  | 'draw'
  | 'inProgress'

export interface SummaryFacts {
  kind: SummaryKind
  /** 이야기의 중심이 되는 수(ply). 없으면 null */
  ply: number | null
  /** 이긴 쪽(진행 중이면 지금 앞선 쪽, 팽팽하거나 무승부면 null) */
  winner: Turn | null
  mate: boolean
  /** 완승: 이긴 쪽이 실수 없이, 우세를 잡은 뒤 한 번도 놓치지 않았다 */
  flawless?: boolean
  /** 무승부(draw): 크게 앞섰던 쪽 */
  ahead?: Turn
  /** 메이트로 바뀌기 전의 이야기 */
  base?: SummaryKind
  /** 형세만 본 승리: 진 쪽이 앞서 있었다 / 내내 팽팽 / 그 밖 */
  shape?: 'loserAhead' | 'even' | 'unsettled'
}

const BAD: ReadonlySet<MoveLabel> = new Set(['mistake', 'blunder'])
const other = (t: Turn): Turn => (t === 'w' ? 'b' : 'w')

interface Game {
  plies: Ply[]
  labels: (MoveLabel | null)[]
  /** 백 승률 */
  win: number[]
}

/** i번째 수를 둔 쪽 */
const moverOf = (g: Game, i: number): Turn => turnOf(g.plies[i - 1].fen)
const sideWin = (g: Game, i: number, t: Turn) => (t === 'w' ? g.win[i] : 100 - g.win[i])
/** i번째 수로 둔 쪽이 잃은 승률 */
const dropOf = (g: Game, i: number) => sideWin(g, i - 1, moverOf(g, i)) - sideWin(g, i, moverOf(g, i))
const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from + 1) }, (_, k) => from + k)
const isBad = (g: Game, i: number) => BAD.has(g.labels[i] as MoveLabel)
/** 후보 중 잃은 승률이 가장 큰 수. 같으면 앞쪽 */
function biggestDrop(g: Game, plies: number[]): number | null {
  let best: number | null = null
  for (const i of plies) if (best === null || dropOf(g, i) > dropOf(g, best)) best = i
  return best
}

function endsInMate(plies: Ply[]): boolean {
  const last = plies.at(-1)!
  if (last.san?.endsWith('#')) return true
  try {
    return new Chess(last.fen).isCheckmate()
  } catch {
    return false
  }
}

export function classifyGame(input: SummaryInput): SummaryFacts | null {
  const len = Math.min(input.plies.length, input.review.positions.length)
  const n = len - 1
  if (n < T.minPlies) return null
  const g: Game = {
    plies: input.plies.slice(0, len),
    labels: input.review.labels,
    win: input.review.positions.slice(0, len).map((p) => winPercent(p.score)),
  }
  const all = range(1, n)
  const bad = all.filter((i) => isBad(g, i))
  const badBy = (t: Turn) => bad.filter((i) => moverOf(g, i) === t)
  const edge = (i: number) => Math.abs(g.win[i] - 50)
  const maxEdge = Math.max(...range(0, n).map(edge))

  if (input.result === '*') {
    const last = g.win[n]
    const leader: Turn | null = last >= T.leading ? 'w' : last <= 100 - T.leading ? 'b' : null
    return { kind: 'inProgress', ply: bad.at(-1) ?? null, winner: leader, mate: false }
  }

  if (input.result === '1/2-1/2') {
    if (bad.length > 0) return { kind: 'messyDraw', ply: biggestDrop(g, bad), winner: null, mate: false }
    if (maxEdge < T.drawEven) return { kind: 'cleanDraw', ply: null, winner: null, mate: false }
    const peak = range(0, n).find((i) => edge(i) === maxEdge)!
    return { kind: 'draw', ply: peak, winner: null, mate: false, ahead: g.win[peak] > 50 ? 'w' : 'b' }
  }

  const winner: Turn = input.result === '1-0' ? 'w' : 'b'
  const loser = other(winner)
  const ws = (i: number) => sideWin(g, i, winner)
  const mate = endsInMate(g.plies)
  const lastMove = moveNumberOf(g.plies[0].fen, n).number
  const facts = (kind: SummaryKind, ply: number | null, extra: Partial<SummaryFacts> = {}): SummaryFacts => {
    // 체크메이트는 결과만 남은 판(완승·그냥 승리)이거나 아주 짧은 판일 때 제목이 된다
    if (mate && (kind === 'dominant' || kind === 'decisive' || lastMove <= T.miniatureMoves)) return { kind: 'mate', ply: n, winner, mate, base: kind, ...extra }
    return { kind, ply, winner, mate, ...extra }
  }

  // 형세가 결과를 뒷받침하지 않는다: 이긴 쪽이 우세를 잡은 적이 없거나, 마지막 형세가 이긴 쪽 편이 아니다
  const clear = all.find((i) => ws(i) >= T.clearAdvantage)
  if (clear === undefined || ws(n) <= 50) {
    const shape = 100 - ws(n) >= T.leading ? 'loserAhead' : maxEdge < T.even ? 'even' : 'unsettled'
    return facts('result', null, { shape })
  }

  // 역전: 오프닝 뒤 이긴 쪽이 크게 밀렸고, 그 뒤 진 쪽의 실수로 뒤집혔다
  let low: number | null = null
  for (const i of range(Math.min(T.openingPlies, n), n)) if (ws(i) < T.comebackBelow && (low === null || ws(i) < ws(low))) low = i
  if (low !== null) {
    const key = biggestDrop(g, badBy(loser).filter((i) => i > low))
    if (key !== null) return facts(input.mySide === loser ? 'comebackLoss' : 'comeback', key)
  }

  // 난타전: 양쪽 모두 여러 번 흔들렸다. 진 쪽이 가장 크게 잃은 수를 고비로 본다
  if (badBy('w').length >= T.slugfestEach && badBy('b').length >= T.slugfestEach) return facts('slugfest', biggestDrop(g, badBy(loser)))

  // 전환점: 팽팽하던 판을 진 쪽의 실수 하나가 갈랐고, 그 뒤로 되돌아오지 않았다
  const turn = biggestDrop(g, badBy(loser))
  if (
    turn !== null &&
    dropOf(g, turn) >= T.turningDrop &&
    range(0, turn - 1).every((i) => g.win[i] >= T.balancedLow && g.win[i] <= T.balancedHigh) &&
    range(turn, n).every((i) => ws(i) >= T.hold)
  )
    return facts('turning', turn)

  // 완승: 내내 크게 밀린 적 없이, 일찍 잡은 우세로 이겼다
  if (clear <= T.dominantByPly && clear < n && range(0, n).every((i) => ws(i) >= T.dominantFloor)) {
    const flawless = badBy(winner).length === 0 && range(clear, n).every((i) => ws(i) >= T.hold)
    return facts('dominant', clear, { flawless })
  }

  // 그 밖: 진 쪽 실수가 크게 잃었으면 그 수를, 아니면 이긴 쪽이 우세를 잡은 수를 고비로 본다
  const slip = biggestDrop(g, badBy(loser))
  if (slip !== null && dropOf(g, slip) >= T.notableDrop) return facts('decisive', slip)
  return facts('decisive', clear)
}

// ── 한줄평 ──────────────────────────────────────────────

/** 판의 모양: 한줄평 문장 묶음을 고르는 기준 */
export type SummaryShape = 'sacrifice' | 'quick' | 'squeeze' | 'hardWon' | 'sudden' | 'comeback' | 'chaos' | 'offBoard' | 'tightDraw' | 'messyDraw' | 'ongoing'

/** 우세를 지킨 채 이 수(full move) 안에 끝난 승리는 짧은 판 */
export const QUICK_MOVES = 25

/**
 * 모양마다 문장 묶음. neutral은 누구 편도 아닌 말, won/lost는 내 대국에서 이겼을 때·졌을 때.
 * 백/흑이나 수 번호는 넣지 않는다(그건 캡션 몫).
 */
export const HEADLINES: Record<SummaryShape, { neutral: string[]; won?: string[]; lost?: string[] }> = {
  sacrifice: {
    neutral: [
      '아낌없이 내주고 끝내 이긴 판',
      '내준 만큼 더 깊이 파고들었어요.',
      '잃는 게 두렵지 않았던 공격.',
      '기물보다 시간을 산 판',
      '내주는 수가 가장 날카로웠던 판',
      '버린 기물이 길을 열어 준 판',
      '아끼지 않은 쪽이 이겼어요.',
      '손해처럼 보이던 수가 판을 바꿨어요.',
    ],
    won: [
      '아낌없이 내주고 얻은 승리예요.',
      '내준 기물이 길을 열어 줬어요.',
      '잃는 게 두렵지 않았어요.',
      '과감하게 내준 수가 통했어요.',
      '기물보다 공격을 택한 판이에요.',
      '내준 만큼 더 깊이 들어갔어요.',
      '손해 같던 수가 승부수였어요.',
    ],
    lost: [
      '상대의 희생 앞에 길이 막혔어요.',
      '상대가 내준 만큼 더 깊이 들어왔어요.',
      '과감한 한 수에 흐름을 뺏겼어요.',
      '상대의 희생이 한 수 빨랐어요.',
      '상대의 과감한 수를 버텨 내지 못했어요.',
      '아낌없이 내준 상대가 한 발 앞섰어요.',
      '내주는 수 하나가 판을 바꿔 놓았어요.',
    ],
  },
  quick: {
    neutral: [
      '짧고 굵게, 한 번 잡은 흐름을 끝까지 놓지 않은 판',
      '거침없었어요. 숨 고를 틈도 없이.',
      '한쪽으로 기운 뒤로는 금방 끝났어요.',
      '망설임 없이 달려가 일찍 끝을 본 판',
      '길게 갈 이유가 없었던 판.',
      '방향이 정해지자 망설임이 없었어요.',
      '숨 돌릴 새도 없이 끝난 판',
      '빠르게 와서 빠르게 끝냈어요.',
    ],
    won: [
      '거침없었어요. 상대가 숨 고를 틈도 없이.',
      '처음 잡은 흐름을 끝까지 놓지 않았어요.',
      '망설임 없이 밀고 나가 일찍 끝냈어요.',
      '짧고 굵게, 내 판이었어요.',
      '한 번 잡은 기세가 끝까지 갔어요.',
      '숨 돌릴 틈 없이 몰아쳤어요.',
      '길게 끌 필요가 없었어요.',
    ],
    lost: [
      '오늘은 상대가 한 수 위였어요.',
      '손쓸 틈도 없이 지나간 판이에요.',
      '빨리 끝났지만 배울 게 많은 판이에요.',
      '상대의 기세가 너무 빨랐어요.',
      '다음엔 첫걸음부터 더 단단하게 가 봐요.',
      '정신 차리기 전에 끝나 버렸어요.',
      '짧았지만 다음 판의 숙제가 생겼어요.',
    ],
  },
  squeeze: {
    neutral: [
      '소리 없이 조여 오다 어느새 끝나 있던 판',
      '서두르지 않고 한 칸씩 숨통을 조인 판',
      '큰 소리 없이 차곡차곡 쌓아 올린 승리.',
      '천천히, 그러나 확실하게.',
      '조용한 압박이 결국 판을 정했어요.',
      '티 나지 않게 앞서 나가 그대로 끝난 판',
      '서두른 적 없이 끝까지 간 판',
      '조금씩, 아주 조금씩 기울어 간 판',
    ],
    won: [
      '서두르지 않고 차곡차곡 쌓아 올린 승리예요.',
      '조용히 조여 간 끝에 얻은 판이에요.',
      '천천히, 그러나 확실하게 이겼어요.',
      '한 칸씩 숨통을 조여 간 판이에요.',
      '내 걸음대로 끝까지 간 판이에요.',
      '급할 것 없이 한 걸음씩 갔어요.',
      '참을성 있게 쌓아 올린 판이에요.',
    ],
    lost: [
      '조금씩 숨이 막혀 오던 판이에요.',
      '어디서부터 밀렸는지 다시 볼 만한 판이에요.',
      '상대가 조금씩 길을 막아 왔어요.',
      '버텼지만 조금씩 밀려났어요.',
      '티 나지 않게 조여 온 상대가 강했어요.',
      '한 걸음씩 밀려난 판이에요.',
      '어디가 시작이었는지 다시 볼 만해요.',
    ],
  },
  hardWon: {
    neutral: [
      '흔들리면서도 끝내 놓지 않은 판',
      '몇 번 비틀거렸지만 길을 잃지는 않았어요.',
      '매끄럽진 않았지만 결국 닿은 판',
      '울퉁불퉁한 길 끝에 도착한 승리.',
      '삐걱거려도 멈추지 않았던 판',
      '넘어질 뻔했지만 끝까지 걸어간 판',
      '실수를 안고도 앞으로 나아간 판',
      '흠은 있어도 결과는 분명했던 판',
    ],
    won: [
      '삐걱거려도 멈추지 않았어요.',
      '몇 번 비틀거렸지만 결국 해냈어요.',
      '매끄럽진 않아도 이긴 판이에요.',
      '흔들렸지만 놓지 않았어요.',
      '고비를 넘기고 얻은 승리예요.',
      '실수도 있었지만 결국 내 판이었어요.',
      '넘어질 뻔했지만 버텼어요.',
    ],
    lost: [
      '기회가 몇 번 있었던 판이에요.',
      '상대도 흔들렸는데, 잡지 못했어요.',
      '아까운 장면이 많았던 판이에요.',
      '조금만 더 버텼다면 싶은 판이에요.',
      '끝까지 해볼 만했던 판이에요.',
      '상대의 실수를 살렸다면 싶은 판이에요.',
      '기회가 왔다 갔다 한 판이에요.',
    ],
  },
  sudden: {
    neutral: [
      '버티고 버티다 한 번에 무너졌어요.',
      '오래 맞서던 균형이 한순간에 깨진 판',
      '팽팽하던 줄이 한 번에 끊어졌어요.',
      '길게 이어진 균형, 그리고 단 한 번의 틈.',
      '한 수가 모든 걸 바꾼 판',
      '조용하던 판이 한순간에 기울었어요.',
      '잔잔하던 수면에 돌 하나가 떨어진 판',
      '균형을 깬 건 단 한 수였어요.',
    ],
    won: [
      '오래 기다린 단 한 번의 틈을 놓치지 않았어요.',
      '버티고 버티다 찾아온 기회를 잡았어요.',
      '팽팽하던 줄을 먼저 끊어 낸 판이에요.',
      '참고 기다린 보람이 있었어요.',
      '한 번의 기회면 충분했어요.',
      '기다림 끝에 찾아온 한 번이었어요.',
      '조용히 기다리다 한 번에 잡았어요.',
    ],
    lost: [
      '잘 버티다 한 번에 무너졌어요.',
      '단 한 번의 틈이 너무 아팠어요.',
      '팽팽하게 잘 맞서던 판이라 더 아쉬워요.',
      '한 수만 다시 둘 수 있다면 싶은 판이에요.',
      '거의 다 왔는데, 한 번이 모자랐어요.',
      '한 번의 흔들림이 끝까지 갔어요.',
      '오래 잘 버틴 판이라 더 아까워요.',
    ],
  },
  comeback: {
    neutral: [
      '무너질 듯하다 다시 일어선 판',
      '끝났다 싶은 순간부터 다시 시작된 판',
      '포기하지 않은 쪽이 결국 웃었어요.',
      '밀리고 또 밀리다 한 번에 뒤집었어요.',
      '벼랑 끝에서 돌아 나온 판',
      '기울었던 판이 거꾸로 쏟아졌어요.',
      '기울어진 판을 다시 세운 판',
      '지는 줄 알았던 쪽이 마지막에 웃었어요.',
    ],
    won: [
      '포기하지 않은 덕분이에요.',
      '벼랑 끝에서 돌아 나왔어요.',
      '밀려도 끝까지 버틴 보람이 있었어요.',
      '다 진 줄 알았던 판을 뒤집었어요.',
      '끝까지 기회를 기다린 판이에요.',
      '기울어진 판을 다시 세웠어요.',
      '버티고 기다린 끝에 뒤집었어요.',
    ],
    lost: [
      '다 잡은 판이 손에서 빠져나갔어요.',
      '앞서던 판이라 더 아쉬워요.',
      '한 번 흔들린 게 끝까지 이어졌어요.',
      '잘 싸우고도 뒤집힌 판이에요.',
      '이길 수 있었던 판, 다음엔 꼭.',
      '앞서다 놓친 판, 다음엔 끝까지.',
      '이기던 판을 지키지 못했어요.',
    ],
  },
  chaos: {
    neutral: [
      '서로 넘어지고 일어서다 먼저 일어선 쪽이 이긴 판',
      '실수조차 대담했던 판.',
      '누구도 쉽게 놓아주지 않던 혼전',
      '넘어지고 또 넘어지며 끝까지 간 판',
      '정신없이 오가다 마지막에 웃은 쪽이 있던 판',
      '매끄럽진 않아도 뜨거웠던 판.',
      '누가 이겨도 이상하지 않던 판',
      '실수와 반격이 쉬지 않고 오간 판',
    ],
    won: [
      '넘어져도 먼저 일어났어요.',
      '흔들리면서도 끝까지 붙잡은 판이에요.',
      '엉망이었어도 이긴 건 이긴 거예요.',
      '실수조차 대담했던 판이에요.',
      '서로 흔들리다 먼저 중심을 잡았어요.',
      '어지러웠지만 마지막에 웃었어요.',
      '흔들린 만큼 상대도 흔들렸어요.',
    ],
    lost: [
      '서로 흔들리던 판, 마지막 한 번이 아쉬워요.',
      '기회는 나에게도 있었어요.',
      '주고받다 마지막에 놓친 판이에요.',
      '실수가 실수를 부른 판이었어요.',
      '다음엔 덜 흔들리면 돼요.',
      '어지러운 판에서 마지막 한 번을 놓쳤어요.',
      '누가 이겨도 이상하지 않던 판이에요.',
    ],
  },
  offBoard: {
    neutral: [
      '승부는 판 밖에서 갈렸어요.',
      '판 위의 형세와 결과가 엇갈린 판',
      '형세보다 먼저 결과가 나왔어요.',
      '판 위에선 아직 끝나지 않았던 판',
      '결과만으로는 다 말할 수 없는 판',
      '판 위의 이야기는 아직 남아 있었어요.',
      '형세와 결과가 다른 길로 간 판',
      '끝맺음이 판 밖에서 온 판',
    ],
    won: [
      '판 밖에서 얻은 승리예요.',
      '형세와 달리 결과는 내 편이었어요.',
      '결과가 먼저 찾아온 판이에요.',
      '판 위에선 아직 끝나지 않았던 승리예요.',
      '이런 날도 있어요.',
      '판 위의 형세보다 결과가 먼저 왔어요.',
      '결과는 내 편이었던 날이에요.',
    ],
    lost: [
      '판 위에선 아직 끝나지 않았던 판이에요.',
      '결과가 형세를 앞질러 간 판이에요.',
      '판 밖에서 갈린 승부라 더 아쉬워요.',
      '결과만 보고 지나치기엔 아까운 판이에요.',
      '이런 날도 있어요.',
      '판 위에선 더 해볼 수 있었던 판이에요.',
      '형세와 다르게 끝나 버렸어요.',
    ],
  },
  tightDraw: {
    neutral: [
      '끝까지 팽팽했던 줄다리기.',
      '누구도 한 발 물러서지 않았어요.',
      '주고받은 만큼 나눠 가진 판',
      '서로를 끝까지 놓아주지 않은 판',
      '균형 위에서 끝까지 버틴 판',
      '어느 쪽도 틈을 내주지 않았어요.',
      '끝까지 같은 무게로 맞선 판',
      '한 치도 기울지 않은 판',
    ],
  },
  messyDraw: {
    neutral: [
      '흔들리고 흔들리다 제자리로 돌아온 판',
      '기울었던 판이 다시 평평해졌어요.',
      '이길 수도, 질 수도 있었던 판',
      '주고받다 결국 나눠 가진 판',
      '끝내 누구 편도 들지 않은 판',
      '엎어질 뻔한 판이 제자리로 돌아왔어요.',
      '기회가 오갔지만 아무도 잡지 못했어요.',
      '결국 처음 자리로 돌아온 판',
    ],
  },
  ongoing: {
    neutral: [
      '아직 이야기가 끝나지 않았어요.',
      '다음 수가 궁금해지는 판',
      '아직 결말을 쓰는 중이에요.',
      '지금부터가 진짜일지도 몰라요.',
      '판은 아직 열려 있어요.',
      '어디로 갈지 아직 모르는 판',
      '다음 장면을 기다리는 중이에요.',
      '이야기는 지금도 쓰이고 있어요.',
    ],
  },
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

interface Shaped {
  facts: SummaryFacts
  shape: SummaryShape
  n: number
}

function shaped(input: SummaryInput): Shaped | null {
  const facts = classifyGame(input)
  if (!facts) return null
  const n = Math.min(input.plies.length, input.review.positions.length) - 1
  const lastMove = moveNumberOf(input.plies[0].fen, n).number
  const winnerSlips = () =>
    range(1, n).filter((i) => (input.review.labels[i] === 'mistake' || input.review.labels[i] === 'blunder') && turnOf(input.plies[i - 1].fen) === facts.winner).length
  const SOUND: ReadonlySet<MoveLabel | null> = new Set(['brilliant', 'great', 'best', 'excellent'])
  const winnerSacrificed = () =>
    range(1, n).some((i) => {
      if (turnOf(input.plies[i - 1].fen) !== facts.winner) return false
      const label = input.review.labels[i]
      return label === 'brilliant' || (SOUND.has(label) && sacrificeAt(input.plies, input.review.positions, i))
    })
  // 짧은 판: 잡은 우세를 놓치지 않고, 일찍 잡았거나 일찍 끝난 판
  const fromWin = (kind: SummaryKind | undefined): SummaryShape => {
    if (kind === 'dominant' && facts.flawless && (lastMove <= QUICK_MOVES || (facts.ply ?? n) <= T.earlyPly)) return 'quick'
    return winnerSlips() >= 2 ? 'hardWon' : 'squeeze'
  }
  const shape: SummaryShape = (() => {
    switch (facts.kind) {
      case 'inProgress':
        return 'ongoing'
      case 'cleanDraw':
        return 'tightDraw'
      case 'messyDraw':
      case 'draw':
        return 'messyDraw'
      case 'result':
        return 'offBoard'
      case 'comeback':
      case 'comebackLoss':
        return 'comeback'
    }
    // 이긴 쪽이 기물을 내주고 이긴 판(탁월한 수, 또는 리뷰가 좋게 본 희생)
    if (winnerSacrificed()) return 'sacrifice'
    switch (facts.kind) {
      case 'slugfest':
        return 'chaos'
      case 'turning':
        return 'sudden'
      case 'mate':
        return fromWin(facts.base)
      default:
        return fromWin(facts.kind)
    }
  })()
  return { facts, shape, n }
}

/** 판의 모양(한줄평 묶음). 요약할 수 없으면 null */
export function shapeOf(input: SummaryInput): SummaryShape | null {
  return shaped(input)?.shape ?? null
}

function captionOf(input: SummaryInput, { facts, n }: Shaped): string {
  const me = input.mySide ?? null
  const start = input.plies[0].fen
  const side = (t: Turn) => (me ? (t === me ? '내' : '상대') : t === 'w' ? '백' : '흑')
  if (facts.kind === 'inProgress') return facts.winner ? `진행 중 · 지금은 ${side(facts.winner)} 우세` : '진행 중 · 비슷한 형세'
  if (facts.winner === null) return '무승부'
  const who = me ? (me === facts.winner ? '내 승리' : '내 패배') : `${side(facts.winner)} 승`
  const N = facts.ply !== null ? moveNumberOf(start, facts.ply).number : null
  const detail = (() => {
    switch (facts.kind) {
      case 'mate':
        return `${moveNumberOf(start, n).number}수 메이트`
      case 'comeback':
      case 'comebackLoss':
        return `${N}수에 역전`
      case 'dominant':
        return `${N}수부터 우세`
      case 'decisive':
        return isSlip(input, facts) ? `${N}수에 갈림` : `${N}수부터 우세`
      case 'turning':
      case 'slugfest':
        return N === null ? null : `${N}수에 갈림`
      default:
        return null
    }
  })()
  return detail ? `${who} · ${detail}` : who
}

/** 그냥 이긴 판의 중심 수가 진 쪽 실수인가(아니면 우세를 잡은 수) */
function isSlip(input: SummaryInput, facts: SummaryFacts): boolean {
  const label = facts.ply !== null ? input.review.labels[facts.ply] : null
  return label === 'mistake' || label === 'blunder'
}

/** 수순 전체를 섞은 해시로 문장 묶음의 몇 번째를 쓸지 정한다. 같은 대국이면 같은 번호 */
export function headlineIndex(plies: Ply[], length: number): number {
  return mix(hash(`${HEADLINE_SALT}|${plies.map((p) => p.san ?? '').join(' ')}`)) % length
}
/** 예시 명경기 여덟 판이 서로 다른 문장을 고르도록 고른 값(테스트가 지킨다) */
const HEADLINE_SALT = 'c211'

/** FNV 해시는 아래 비트가 고르지 않아 나머지 연산 전에 한 번 더 섞는다(murmur3 fmix32) */
function mix(h: number): number {
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

/** 리뷰가 끝난 대국을 감상 한 문장과 사실 캡션으로 요약한다. 같은 대국이면 같은 문장 */
export function summarizeGame(input: SummaryInput): GameSummaryText | null {
  const s = shaped(input)
  if (!s) return null
  const me = input.mySide ?? null
  const pools = HEADLINES[s.shape]
  const pool = me && s.facts.winner && s.facts.kind !== 'inProgress' ? ((me === s.facts.winner ? pools.won : pools.lost) ?? pools.neutral) : pools.neutral
  return { headline: pool[headlineIndex(input.plies, pool.length)], caption: captionOf(input, s) }
}
