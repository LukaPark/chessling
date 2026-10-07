import { Chess } from 'chess.js'
import { moveNumberOf } from '../../chess/moveNumber'
import { turnOf } from '../../chess/pgn'
import type { Ply, Result, Turn } from '../../chess/types'
import { winPercent } from '../classify'
import type { MoveLabel } from '../judge'
import type { GameReview } from '../review'
import { flowLine, type FlowInput } from './flow'
import { withJosa } from './korean'

export interface GameSummaryText {
  headline: string
  line: string
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
  headlineMax: 24,
  lineMax: 60,
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
    if (mate && (kind === 'dominant' || kind === 'decisive' || lastMove <= T.miniatureMoves)) return { kind: 'mate', ply: n, winner, mate }
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

// ── 문장 ──────────────────────────────────────────────

type View = 'neutral' | 'won' | 'lost'

interface Ctx {
  /** 중심 수의 수 번호 */
  N: number
  /** 마지막 수의 수 번호 */
  M: number
  /** 중심 수의 판정: 블런더 / 실수. 실수·블런더가 아니면 null */
  lab: string | null
  /** 중심 수가 초반(earlyPly 안)인가 */
  early: boolean
  facts: SummaryFacts
  view: View
  W: Turn
  /** 진 쪽. 무승부·진행 중이면 중심 수를 둔 쪽, 무승부(draw)면 앞섰던 쪽 */
  L: Turn
  /** 이름: 나 / 상대 / 백 / 흑 */
  name: (t: Turn) => string
  /** 꾸밈: 내 / 상대 / 백 / 흑 */
  pre: (t: Turn) => string
  /** 소유: 내 / 상대의 / 백의 / 흑의 */
  poss: (t: Turn) => string
  /** 제목용 소유: 나의 / 상대의 / 백의 / 흑의 */
  of: (t: Turn) => string
  /** 주어: 내가 / 상대가 / 백이 / 흑이 */
  subj: (t: Turn) => string
  /** 주제: (나는 생략) / 상대는 / 백은 / 흑은 + 공백 */
  topic: (t: Turn) => string
  /** 쪽: 내 쪽 / 상대 쪽 / 백 쪽 / 흑 쪽 */
  toward: (t: Turn) => string
}

type Phrase = (c: Ctx) => string
interface Phrases {
  headline: Phrase[]
}
const by = (neutral: Phrase, won: Phrase, lost: Phrase): Phrase => (c) => (c.view === 'won' ? won(c) : c.view === 'lost' ? lost(c) : neutral(c))
/** 실수·블런더가 확실한 수에만 쓴다 */
const lab = (c: Ctx) => c.lab ?? '실수'

type PhraseKey = Exclude<SummaryKind, 'inProgress' | 'dominant' | 'decisive'> | 'dominantFlawless' | 'dominantSoft' | 'decisiveSlip' | 'decisivePlain'

const PHRASES: Record<PhraseKey, Phrases> = {
  turning: {
    headline: [
      (c) => `${c.N}수째 ${lab(c)} 하나로 갈린 판`,
      (c) => `${c.N}수째, ${withJosa(lab(c), '이/가')} 가른 승부`,
      by(
        (c) => `${c.N}수째에 기운 승부`,
        (c) => `${c.N}수째 기회를 잡아낸 승리`,
        (c) => `${c.N}수째 ${lab(c)} 하나가 아쉬운 판`,
      ),
    ],
  },
  comeback: {
    headline: [(c) => `${c.of(c.W)} 역전승, ${c.N}수째가 분수령`, (c) => `끝까지 버틴 ${c.of(c.W)} 역전승`],
  },
  comebackLoss: {
    headline: [() => '아쉬운 역전패', (c) => `${c.N}수째에 놓친 승리`, () => '앞서다 내준 한 판'],
  },
  dominantFlawless: {
    headline: [(c) => (c.early ? `처음부터 끝까지 ${c.of(c.W)} 흐름` : `${c.N}수째부터 이어진 ${c.of(c.W)} 흐름`), (c) => `${c.of(c.W)} 완승`, (c) => `한 번도 흔들리지 않은 ${c.of(c.W)} 승리`],
  },
  dominantSoft: {
    headline: [(c) => `${c.of(c.W)} 승리, ${c.N}수째부터 앞선 판`, (c) => `앞선 흐름을 지켜 낸 ${c.of(c.W)} 승리`],
  },
  decisiveSlip: {
    headline: [(c) => `${c.subj(c.W)} 끝내 가져간 한 판`, (c) => `${c.of(c.W)} 승리, ${c.N}수째가 고비`],
  },
  decisivePlain: {
    headline: [(c) => `${c.subj(c.W)} 끝내 가져간 한 판`, (c) => `${c.of(c.W)} 승리, ${c.N}수째부터 앞선 판`],
  },
  result: {
    headline: [by((c) => `${c.of(c.W)} 승리`, () => '나의 승리', () => '아쉬운 패배')],
  },
  slugfest: {
    headline: [(c) => `실수가 오간 난타전 끝 ${c.of(c.W)} 승리`, (c) => `엎치락뒤치락, 끝내 ${c.of(c.W)} 승리`],
  },
  mate: {
    headline: [(c) => (c.M <= T.miniatureMoves ? `${c.M}수 만의 체크메이트` : `${c.M}수째 체크메이트로 끝난 판`), (c) => `${c.M}수째 체크메이트로 끝난 판`],
  },
  cleanDraw: {
    headline: [() => '빈틈없는 무승부', () => '끝까지 팽팽했던 무승부'],
  },
  messyDraw: {
    headline: [() => '흔들렸지만 비긴 판', () => '실수 뒤에 지켜 낸 무승부'],
  },
  draw: {
    headline: [() => '끝내 비긴 판', () => '승부를 가리지 못한 무승부'],
  },
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

function context(input: SummaryInput, facts: SummaryFacts): Ctx {
  const me = input.mySide ?? null
  const isMe = (t: Turn) => me === t
  const name = (t: Turn) => (me ? (isMe(t) ? '나' : '상대') : t === 'w' ? '백' : '흑')
  const pre = (t: Turn) => (isMe(t) ? '내' : name(t))
  const W = facts.winner ?? 'w'
  const start = input.plies[0].fen
  const n = Math.min(input.plies.length, input.review.positions.length) - 1
  // 중심 수가 없으면 마지막 수를 쓴다(문장에 쓰지 않는 경우)
  const ply = facts.ply ?? n
  const L =
    facts.kind === 'draw' ? facts.ahead! : facts.kind === 'messyDraw' || facts.kind === 'inProgress' ? turnOf(input.plies[ply - 1].fen) : other(W)
  const label = input.review.labels[ply]
  return {
    N: moveNumberOf(start, ply).number,
    M: moveNumberOf(start, n).number,
    lab: label === 'blunder' ? '블런더' : label === 'mistake' ? '실수' : null,
    early: ply <= T.earlyPly,
    facts,
    view: !me || facts.winner === null ? 'neutral' : me === W ? 'won' : 'lost',
    W,
    L,
    name,
    pre,
    poss: (t) => (isMe(t) ? '내' : `${name(t)}의`),
    of: (t) => `${name(t)}의`,
    subj: (t) => (isMe(t) ? '내가' : withJosa(name(t), '이/가')),
    topic: (t) => (isMe(t) ? '' : `${withJosa(name(t), '은/는')} `),
    toward: (t) => `${pre(t)} 쪽`,
  }
}

function inProgressHeadline(c: Ctx, facts: SummaryFacts): string {
  return facts.winner === null ? '진행 중 · 팽팽해요' : `진행 중 · 지금은 ${c.pre(facts.winner)} 우세`
}

function phraseKey(facts: SummaryFacts, c: Ctx): PhraseKey {
  if (facts.kind === 'dominant') return facts.flawless ? 'dominantFlawless' : 'dominantSoft'
  if (facts.kind === 'decisive') return c.lab ? 'decisiveSlip' : 'decisivePlain'
  return facts.kind as PhraseKey
}

/** 리뷰가 끝난 대국을 제목 한 줄과, 대국 전체 흐름을 담은 설명 한 문장으로 요약한다. 같은 대국이면 같은 문장 */
export function summarizeGame(input: SummaryInput): GameSummaryText | null {
  const facts = classifyGame(input)
  if (!facts) return null
  const c = context(input, facts)
  const seed = hash(input.plies.map((p) => p.san ?? '').join(' '))
  const headline = facts.kind === 'inProgress' ? inProgressHeadline(c, facts) : PHRASES[phraseKey(facts, c)].headline[seed % PHRASES[phraseKey(facts, c)].headline.length](c)
  const len = Math.min(input.plies.length, input.review.positions.length)
  const line = flowLine({
    plies: input.plies.slice(0, len),
    labels: input.review.labels,
    win: input.review.positions.slice(0, len).map((p) => winPercent(p.score)),
    ending: endingOf(facts),
    names: c,
    seed: seed >>> 8,
  })
  return { headline, line }
}

function endingOf(facts: SummaryFacts): FlowInput['ending'] {
  switch (facts.kind) {
    case 'inProgress':
      return { kind: 'inProgress' }
    case 'cleanDraw':
    case 'messyDraw':
    case 'draw':
      return { kind: 'draw' }
    case 'result':
      return { kind: 'result', winner: facts.winner! }
    default:
      return { kind: 'decisive', winner: facts.winner!, mate: facts.mate }
  }
}
