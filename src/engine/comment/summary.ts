import { Chess } from 'chess.js'
import { moveNumberOf } from '../../chess/moveNumber'
import { turnOf } from '../../chess/pgn'
import type { Ply, Result, Turn } from '../../chess/types'
import { winPercent } from '../classify'
import type { MoveLabel } from '../judge'
import type { GameReview } from '../review'
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

/** 기준값. 승률은 모두 백 기준이 아니라 해당 쪽 기준 % */
export const SUMMARY_THRESHOLDS = {
  /** 이보다 짧은 대국(수 단위 ply)은 요약하지 않는다 */
  minPlies: 2,
  /** 이 ply 이후만 역전·우세를 따진다(오프닝 흔들림 제외) */
  openingPlies: 16,
  /** 이긴 쪽 승률이 이 밑으로 떨어진 적이 있으면 역전 */
  comebackBelow: 25,
  /** 전환점: 그 수 전까지 백 승률이 이 범위 안 */
  balancedLow: 30,
  balancedHigh: 70,
  /** 전환점: 그 한 수로 잃은 승률 */
  turningDrop: 20,
  /** 그냥 승리: 진 쪽의 이 이상 흔들림만 고비로 본다 */
  notableDrop: 10,
  /** 우세를 잡았다고 보는 승률 */
  clearAdvantage: 70,
  /** 한 번 잡은 우세를 지켰다고 보는 하한 */
  hold: 50,
  /** 완승: 이 ply까지는 우세를 잡아야 한다(20수) */
  dominantByPly: 40,
  /** 난타전: 양쪽이 각각 이만큼 이상 실수·블런더 */
  slugfestEach: 2,
  /** 진행 중: 이 승률 이상이면 그쪽 우세 */
  leading: 60,
  /** 이 수(full move) 안에 끝난 체크메이트는 항상 제목으로 */
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
  | 'slugfest'
  | 'cleanDraw'
  | 'messyDraw'
  | 'inProgress'

export interface SummaryFacts {
  kind: SummaryKind
  /** 이야기의 중심이 되는 수(ply). 없으면 null */
  ply: number | null
  /** 이긴 쪽(진행 중이면 지금 앞선 쪽, 팽팽하면 null) */
  winner: Turn | null
  mate: boolean
}

const BAD: ReadonlySet<MoveLabel> = new Set(['mistake', 'blunder'])
const other = (t: Turn): Turn => (t === 'w' ? 'b' : 'w')

interface Game {
  plies: Ply[]
  labels: (MoveLabel | null)[]
  /** 백 승률 */
  win: number[]
  n: number
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
    n,
  }
  const all = range(1, n)
  const badBy = (t: Turn) => all.filter((i) => isBad(g, i) && moverOf(g, i) === t)

  if (input.result === '*') {
    const last = g.win[n]
    const leader: Turn | null = last >= T.leading ? 'w' : last <= 100 - T.leading ? 'b' : null
    const bad = all.filter((i) => isBad(g, i))
    return { kind: 'inProgress', ply: bad.at(-1) ?? null, winner: leader, mate: false }
  }

  if (input.result === '1/2-1/2') {
    const bad = all.filter((i) => isBad(g, i))
    if (bad.length === 0) return { kind: 'cleanDraw', ply: null, winner: null, mate: false }
    return { kind: 'messyDraw', ply: biggestDrop(g, bad), winner: null, mate: false }
  }

  const winner: Turn = input.result === '1-0' ? 'w' : 'b'
  const loser = other(winner)
  const mate = endsInMate(g.plies)
  const facts = (kind: SummaryKind, ply: number | null): SummaryFacts => {
    const lastMove = moveNumberOf(g.plies[0].fen, n).number
    // 체크메이트는 결과만 남은 판(완승·그냥 승리)이거나 아주 짧은 판일 때 제목이 된다
    if (mate && (kind === 'dominant' || kind === 'decisive' || lastMove <= T.miniatureMoves)) return { kind: 'mate', ply: n, winner, mate }
    return { kind, ply, winner, mate }
  }

  // 역전: 오프닝 뒤 이긴 쪽이 크게 밀렸던 적이 있다
  const after = range(Math.min(T.openingPlies, n), n)
  let low: number | null = null
  for (const i of after) if (sideWin(g, i, winner) < T.comebackBelow && (low === null || sideWin(g, i, winner) < sideWin(g, low, winner))) low = i
  if (low !== null) {
    const rest = range(low + 1, n)
    const key = biggestDrop(g, rest.filter((i) => moverOf(g, i) === loser)) ?? biggestDrop(g, rest)
    return facts(input.mySide === loser ? 'comebackLoss' : 'comeback', key)
  }

  // 난타전: 양쪽 모두 여러 번 흔들렸다
  if (badBy('w').length >= T.slugfestEach && badBy('b').length >= T.slugfestEach) return facts('slugfest', badBy(loser).at(-1) ?? null)

  // 전환점: 팽팽하던 판을 진 쪽의 실수 하나가 갈랐고, 그 뒤로 되돌아오지 않았다
  const turn = biggestDrop(g, badBy(loser))
  if (
    turn !== null &&
    dropOf(g, turn) >= T.turningDrop &&
    range(0, turn - 1).every((i) => g.win[i] >= T.balancedLow && g.win[i] <= T.balancedHigh) &&
    range(turn, n).every((i) => sideWin(g, i, winner) >= T.hold)
  )
    return facts('turning', turn)

  // 완승: 일찍 잡은 우세를 끝까지 지켰다
  const clear = all.find((i) => sideWin(g, i, winner) >= T.clearAdvantage)
  if (clear !== undefined && clear <= T.dominantByPly && clear < n && range(clear, n).every((i) => sideWin(g, i, winner) >= T.hold))
    return facts('dominant', clear)

  // 그 밖: 진 쪽이 크게 흔들린 수가 있으면 그 수를, 없으면 이긴 쪽이 우세를 잡은 수를 고비로 본다
  const slip = biggestDrop(g, all.filter((i) => moverOf(g, i) === loser))
  if (slip !== null && dropOf(g, slip) >= T.notableDrop) return facts('decisive', slip)
  return facts('decisive', clear ?? n)
}

// ── 문장 ──────────────────────────────────────────────

type View = 'neutral' | 'won' | 'lost'

interface Ctx {
  /** 중심 수의 수 번호 */
  N: number
  /** 마지막 수의 수 번호 */
  M: number
  /** 중심 수의 판정: 블런더 / 실수 */
  lab: string
  view: View
  W: Turn
  L: Turn
  /** 이름: 나 / 상대 / 백 / 흑 */
  name: (t: Turn) => string
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
  line: Phrase[]
}
const by = (neutral: Phrase, won: Phrase, lost: Phrase): Phrase => (c) => (c.view === 'won' ? won(c) : c.view === 'lost' ? lost(c) : neutral(c))

const PHRASES: Record<Exclude<SummaryKind, 'inProgress'>, Phrases> = {
  turning: {
    headline: [
      (c) => `${c.N}수째 ${c.lab} 하나로 갈린 판`,
      (c) => `${c.N}수째, ${withJosa(c.lab, '이/가')} 가른 승부`,
      by(
        (c) => `${c.N}수째에 기운 승부`,
        (c) => `${c.N}수째 기회를 잡아낸 승리`,
        (c) => `${c.N}수째 ${c.lab} 하나가 아쉬운 판`,
      ),
    ],
    line: [
      (c) => `팽팽하던 판이 ${c.poss(c.L)} ${withJosa(c.lab, '으로/로')} ${c.toward(c.W)}으로 기울었어요.`,
      by(
        (c) => `균형이 이어지다 ${c.poss(c.L)} ${withJosa(c.lab, '을/를')} ${c.subj(c.W)} 놓치지 않고 이겼어요.`,
        (c) => `균형이 이어지다 ${c.poss(c.L)} ${withJosa(c.lab, '을/를')} 놓치지 않고 이겼어요.`,
        (c) => `잘 버티다 ${c.N}수째 ${withJosa(c.lab, '으로/로')} 흐름을 내줬어요.`,
      ),
    ],
  },
  comeback: {
    headline: [(c) => `${c.of(c.W)} 역전승, ${c.N}수째가 분수령`, (c) => `끝까지 버틴 ${c.of(c.W)} 역전승`],
    line: [
      (c) => `${c.topic(c.W)}중반까지 밀렸지만 ${c.poss(c.L)} 실수를 놓치지 않고 판을 뒤집었어요.`,
      (c) => `${c.subj(c.W)} 밀리던 판을 ${c.N}수째 ${c.poss(c.L)} ${withJosa(c.lab, '으로/로')} 뒤집었어요.`,
    ],
  },
  comebackLoss: {
    headline: [() => '아쉬운 역전패', (c) => `${c.N}수째에 놓친 승리`, () => '앞서다 내준 한 판'],
    line: [
      (c) => `내가 앞서 있었는데, ${c.N}수째 ${withJosa(c.lab, '으로/로')} 흐름을 내줬어요.`,
      (c) => `유리하던 판을 ${c.N}수째 ${c.lab} 뒤로 지키지 못했어요.`,
    ],
  },
  dominant: {
    headline: [(c) => `처음부터 끝까지 ${c.of(c.W)} 흐름`, (c) => `${c.of(c.W)} 완승`, (c) => `한 번도 흔들리지 않은 ${c.of(c.W)} 승리`],
    line: [
      by(
        (c) => `${c.topic(c.W)}초반에 잡은 우세를 끝까지 지켜 깔끔하게 이겼어요.`,
        () => '초반에 잡은 우세를 끝까지 지켜 깔끔하게 이겼어요.',
        () => '초반에 밀린 흐름을 끝내 되돌리지 못했어요.',
      ),
      by(
        (c) => `${c.topic(c.W)}${c.N}수째에 앞서 나간 뒤로 한 번도 흔들리지 않았어요.`,
        (c) => `${c.N}수째에 앞서 나간 뒤로 한 번도 흔들리지 않았어요.`,
        (c) => `${c.N}수째에 내준 우세를 끝내 되찾지 못했어요.`,
      ),
    ],
  },
  decisive: {
    headline: [(c) => `끝까지 겨룬 끝에 ${c.of(c.W)} 승리`, (c) => `${c.subj(c.W)} 끝내 가져간 한 판`],
    line: [
      (c) => `${c.N}수째를 고비로 ${c.toward(c.W)}으로 기울어 끝났어요.`,
      (c) => `한동안 비등했지만 ${c.N}수째부터 ${c.toward(c.W)}으로 기울었어요.`,
    ],
  },
  slugfest: {
    headline: [(c) => `실수가 오간 난타전 끝 ${c.of(c.W)} 승리`, (c) => `엎치락뒤치락, 끝내 ${c.of(c.W)} 승리`],
    line: [
      by(
        (c) => `실수가 여러 번 오간 끝에, 마지막에 덜 흔들린 ${c.subj(c.W)} 이겼어요.`,
        () => '실수가 여러 번 오간 끝에, 마지막까지 버텨 이겼어요.',
        () => '실수가 여러 번 오간 끝에, 마지막 흔들림을 되돌리지 못했어요.',
      ),
      (c) => `양쪽 모두 몇 번씩 흔들렸고, ${c.N}수째 ${c.poss(c.L)} ${withJosa(c.lab, '이/가')} 마지막 고비였어요.`,
    ],
  },
  mate: {
    headline: [(c) => `${c.M}수 만의 체크메이트`, (c) => `${c.M}수째 체크메이트로 끝난 판`],
    line: [
      by(
        (c) => `${c.subj(c.W)} ${c.name(c.L)} 킹을 몰아붙여 체크메이트로 끝냈어요.`,
        () => '상대 킹 쪽을 몰아붙여 체크메이트로 끝냈어요.',
        () => '내 킹이 몰려 체크메이트로 끝났어요.',
      ),
      by(
        (c) => `${c.topic(c.W)}${c.name(c.L)} 킹의 마지막 길까지 막아 끝냈어요.`,
        () => '상대 킹이 피할 곳을 모두 막아 끝냈어요.',
        () => '내 킹이 피할 곳을 찾지 못하고 끝났어요.',
      ),
    ],
  },
  cleanDraw: {
    headline: [() => '빈틈없는 무승부', () => '끝까지 팽팽했던 무승부'],
    line: [() => '양쪽 모두 큰 실수 없이 끝까지 균형을 지켰어요.', () => '누구도 크게 흔들리지 않고 비긴 판이에요.'],
  },
  messyDraw: {
    headline: [() => '실수가 오간 끝의 무승부', () => '흔들렸지만 비긴 판'],
    line: [
      (c) => `${c.N}수째 ${c.poss(c.L)} ${withJosa(c.lab, '으로/로')} 판이 기울었지만, 끝내 비겼어요.`,
      (c) => `${c.N}수째 ${c.poss(c.L)} ${c.lab} 뒤에도 끝내 균형을 되찾았어요.`,
    ],
  },
}

const MATE_TAIL = ' 마지막은 체크메이트였어요.'

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

function context(input: SummaryInput, facts: SummaryFacts): Ctx {
  const me = input.mySide ?? null
  const isMe = (t: Turn) => me === t
  const name = (t: Turn) => (me ? (isMe(t) ? '나' : '상대') : t === 'w' ? '백' : '흑')
  const W = facts.winner ?? 'w'
  const start = input.plies[0].fen
  const n = Math.min(input.plies.length, input.review.positions.length) - 1
  // 중심 수가 없으면 마지막 수를 쓴다(문장에 쓰지 않는 경우)
  const ply = facts.ply ?? n
  const L = facts.kind === 'messyDraw' || facts.kind === 'inProgress' ? turnOf(input.plies[ply - 1].fen) : other(W)
  return {
    N: moveNumberOf(start, ply).number,
    M: moveNumberOf(start, n).number,
    lab: input.review.labels[ply] === 'blunder' ? '블런더' : '실수',
    view: !me || facts.winner === null ? 'neutral' : me === W ? 'won' : 'lost',
    W,
    L,
    name,
    poss: (t) => (isMe(t) ? '내' : `${name(t)}의`),
    of: (t) => `${name(t)}의`,
    subj: (t) => (isMe(t) ? '내가' : withJosa(name(t), '이/가')),
    topic: (t) => (isMe(t) ? '' : `${withJosa(name(t), '은/는')} `),
    toward: (t) => (isMe(t) ? '내 쪽' : `${name(t)} 쪽`),
  }
}

function inProgress(c: Ctx, facts: SummaryFacts, seed: number): GameSummaryText {
  const leader = facts.winner
  if (leader === null) {
    const line =
      facts.ply !== null
        ? `${c.N}수째 ${c.poss(c.L)} ${withJosa(c.lab, '이/가')} 있었지만 아직 팽팽해요.`
        : ['아직 큰 실수 없이 이어지고 있어요.', '양쪽 모두 아직 크게 흔들리지 않았어요.'][seed % 2]
    return { headline: '진행 중 · 팽팽해요', line }
  }
  const headline = `진행 중 · 지금은 ${c.toward(leader) === '내 쪽' ? '내' : c.name(leader)} 우세`
  const line =
    facts.ply !== null && c.L !== leader
      ? `${c.N}수째 ${c.poss(c.L)} ${c.lab} 뒤로 ${c.subj(leader)} 앞서 있어요.`
      : `${c.subj(leader)} 조금씩 앞서 나가고 있어요.`
  return { headline, line }
}

/** 리뷰가 끝난 대국을 제목 한 줄과 설명 한 문장으로 요약한다. 같은 대국이면 같은 문장 */
export function summarizeGame(input: SummaryInput): GameSummaryText | null {
  const facts = classifyGame(input)
  if (!facts) return null
  const c = context(input, facts)
  const seed = hash(input.plies.map((p) => p.san ?? '').join(' '))
  if (facts.kind === 'inProgress') return inProgress(c, facts, seed)
  const table = PHRASES[facts.kind]
  const headline = table.headline[seed % table.headline.length](c)
  let line = table.line[(seed >>> 8) % table.line.length](c)
  if (facts.mate && facts.kind !== 'mate' && (line + MATE_TAIL).length <= T.lineMax) line += MATE_TAIL
  return { headline, line }
}
