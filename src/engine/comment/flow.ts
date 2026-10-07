import { moveNumberOf } from '../../chess/moveNumber'
import { turnOf } from '../../chess/pgn'
import type { Ply, Turn } from '../../chess/types'
import type { MoveLabel } from '../judge'

/** 흐름 문장의 기준값. 승률(%)은 백 기준 */
export const FLOW_THRESHOLDS = {
  /** 초반: 1~12수, 중반: 13~30수, 막판: 31수~ */
  earlyEnd: 12,
  middleEnd: 30,
  /** 이 수 이하로 끝난 대국은 초반 / 그 뒤 두 구간 */
  shortGame: 25,
  /** 40~60 비등, 60~75 / 25~40 조금 앞섬, 그 밖 크게 앞섬 */
  evenLow: 40,
  evenHigh: 60,
  bigLow: 25,
  bigHigh: 75,
  /** 한 구간에서 실수·블런더가 이만큼 이상이면 횟수를 말한다 */
  notableMistakes: 3,
  lineMax: 70,
} as const
const F = FLOW_THRESHOLDS

export interface Names {
  subj: (t: Turn) => string
  poss: (t: Turn) => string
  toward: (t: Turn) => string
}

export interface FlowInput {
  plies: Ply[]
  labels: (MoveLabel | null)[]
  /** 백 승률, 포지션마다 */
  win: number[]
  /** 맺음: 이긴 쪽(형세가 뒷받침하면 decisive, 아니면 result) / 무승부 / 진행 중 */
  ending:
    | { kind: 'decisive'; winner: Turn; mate: boolean }
    | { kind: 'result'; winner: Turn }
    | { kind: 'draw' }
    | { kind: 'inProgress' }
  names: Names
  seed: number
}

interface Level {
  lead: Turn | null
  big: boolean
}

export function levelOf(w: number): Level {
  if (w > F.bigHigh) return { lead: 'w', big: true }
  if (w > F.evenHigh) return { lead: 'w', big: false }
  if (w < F.bigLow) return { lead: 'b', big: true }
  if (w < F.evenLow) return { lead: 'b', big: false }
  return { lead: null, big: false }
}

interface PhaseWords {
  topic: string
  at: string
  from: string
  until: string
}
const WORDS: Record<'early' | 'middle' | 'late' | 'after', PhaseWords> = {
  early: { topic: '초반은', at: '초반에', from: '초반부터', until: '초반까지는' },
  middle: { topic: '중반은', at: '중반에', from: '중반부터', until: '중반까지는' },
  late: { topic: '막판은', at: '막판에', from: '막판부터', until: '끝까지' },
  after: { topic: '그 뒤는', at: '그 뒤에', from: '그 뒤부터', until: '끝까지' },
}

const COUNT = ['영', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열']
const countWord = (k: number) => (k < COUNT.length ? COUNT[k] : '여러')

const BAD: ReadonlySet<MoveLabel> = new Set(['mistake', 'blunder'])
const other = (t: Turn): Turn => (t === 'w' ? 'b' : 'w')

interface Beat {
  /** 과거 어간: 뒤에 "고" / "지만"이 붙는다 */
  stem: string
  /** 이 마디에서 흐름을 가진 쪽 */
  who: Turn | null
  /** 앞 마디를 뒤집는 말인가(앞 마디가 "지만"으로 이어진다) */
  reversal: boolean
  transient?: boolean
  /** 비등이 이어지는 마디: 다음 구간도 비등이면 "~까지는"으로 늘린다 */
  evenSpan?: boolean
  /** 비등이 대국 끝까지 이어졌다 */
  whole?: boolean
}

/** 대국 전체를 구간으로 나눠, 형세가 어떻게 흘렀는지 한 문장으로 쓴다 */
export function flowLine(input: FlowInput): string {
  const { plies, labels, win, names, seed } = input
  const n = win.length - 1
  const start = plies[0].fen
  const moveNo = (i: number) => moveNumberOf(start, i).number
  const levels = win.map(levelOf)
  const pick = <T,>(xs: T[], k: number) => xs[(seed + k) % xs.length]

  // 구간 나누기
  const last = moveNo(n)
  const bounds: [keyof typeof WORDS, number, number][] =
    last <= F.shortGame
      ? [['early', 1, F.earlyEnd], ['after', F.earlyEnd + 1, Infinity]]
      : [['early', 1, F.earlyEnd], ['middle', F.earlyEnd + 1, F.middleEnd], ['late', F.middleEnd + 1, Infinity]]
  const phases = bounds
    .map(([key, lo, hi]) => ({ words: WORDS[key], plies: range(1, n).filter((i) => moveNo(i) >= lo && moveNo(i) <= hi) }))
    .filter((p) => p.plies.length > 0)

  const inProgress = input.ending.kind === 'inProgress'
  const beats: Beat[] = []
  let prev: Level = { lead: null, big: false }
  phases.forEach((p, pi) => {
    const end = levels[p.plies.at(-1)!]
    const w = p.words
    const bad = { w: 0, b: 0 }
    for (const i of p.plies) if (BAD.has(labels[i] as MoveLabel)) bad[turnOf(plies[i - 1].fen)]++
    const total = bad.w + bad.b
    const notable = total >= F.notableMistakes
    const mistakes = !notable
      ? ''
      : bad.w > 0 && bad.b > 0
        ? `${w.at} 실수가 ${countWord(total)} 번 오가며 `
        : `${w.at} ${names.poss(bad.w > 0 ? 'w' : 'b')} 실수가 ${countWord(total)} 번 나오며 `
    // 구간 안에서 잠깐 앞섰다가 내준 쪽
    const led = new Set(p.plies.map((i) => levels[i].lead).filter((t): t is Turn => t !== null))
    for (const y of led)
      if (y !== end.lead && y !== prev.lead)
        beats.push({ stem: `${w.at} 한때 ${names.subj(y)} 앞섰`, who: y, reversal: prev.lead !== null, transient: true })
    // 구간 끝 형세로 들어선 마지막 수
    const shift = [...p.plies].reverse().find((i) => levels[i].lead === end.lead && levels[i - 1].lead !== end.lead) ?? null
    const bigAt = p.plies.find((i) => levels[i].big && levels[i].lead === end.lead && !(levels[i - 1].big && levels[i - 1].lead === end.lead)) ?? null
    const lastBeat = beats.at(-1)

    if (end.lead === prev.lead) {
      if (end.lead && end.big && !prev.big && bigAt !== null) {
        beats.push({ stem: `${mistakes}${moveNo(bigAt)}수 무렵 ${names.subj(end.lead)} 격차를 크게 벌렸`, who: end.lead, reversal: false })
      } else if (end.lead && !end.big && prev.big) {
        beats.push({ stem: `${mistakes}${w.at} ${names.subj(other(end.lead))} 조금 따라붙었`, who: other(end.lead), reversal: true })
      } else if (notable) {
        const stem =
          bad.w > 0 && bad.b > 0
            ? `${w.at} 실수가 ${countWord(total)} 번 오갔`
            : `${w.at} ${names.poss(bad.w > 0 ? 'w' : 'b')} 실수가 ${countWord(total)} 번 나왔`
        beats.push({ stem, who: end.lead, reversal: false })
      } else if (end.lead === null && lastBeat?.evenSpan) {
        lastBeat.stem = `${pi === phases.length - 1 ? '끝까지' : inProgress && w === WORDS.middle ? '초반과 중반은' : w.until} ${pick(['팽팽했', '비등했'], 0)}`
        lastBeat.whole = pi === phases.length - 1
      } else if (end.lead === null && beats.length === 0) {
        beats.push({ stem: `${w.topic} ${pick(['팽팽했', '비등했'], 0)}`, who: null, reversal: false, evenSpan: true })
      }
    } else if (end.lead !== null && prev.lead === null && pi === 0) {
      beats.push({ stem: `${mistakes}${w.from} ${names.subj(end.lead)} ${end.big ? '크게' : '조금'} 앞섰`, who: end.lead, reversal: false })
    } else if (end.lead === null) {
      const y = other(prev.lead!)
      beats.push({ stem: `${mistakes}${moveNo(shift!)}수 무렵 ${names.subj(y)} 균형을 되찾았`, who: y, reversal: true })
    } else if (prev.lead === null) {
      const at = moveNo(end.big && bigAt !== null ? bigAt : shift!)
      const stem = end.big
        ? pick([`${at}수 무렵 ${names.subj(end.lead)} 크게 앞섰`, `${at}수 무렵 ${names.toward(end.lead)}으로 크게 기울었`], pi)
        : pick([`${at}수 무렵부터 ${names.subj(end.lead)} 조금씩 앞섰`, `${at}수 무렵부터 ${names.toward(end.lead)}으로 기울었`], pi)
      beats.push({ stem: mistakes + stem, who: end.lead, reversal: false })
    } else {
      const stem = pick([`${moveNo(shift!)}수 무렵 ${names.subj(end.lead)} 흐름을 뒤집었`, `${moveNo(shift!)}수 무렵 ${names.subj(end.lead)} 판을 뒤집었`], pi)
      beats.push({ stem: mistakes + stem, who: end.lead, reversal: true })
    }
    prev = end
  })

  const finalLead = levels[n].lead
  const prefix = inProgress ? '지금까지 ' : ''
  if (inProgress && beats.length === 1 && beats[0].whole) return '지금까지 어느 쪽도 크게 앞서지 않고 팽팽해요.'
  const ending = (bs: Beat[]): { text: string; reversal: boolean } => {
    const lastWho = bs.at(-1)?.who ?? null
    const e = input.ending
    if (e.kind === 'draw') return { text: pick(['무승부로 끝났어요.', '결과는 무승부였어요.'], 7), reversal: lastWho !== null }
    if (e.kind === 'inProgress')
      return finalLead
        ? { text: `지금은 ${names.subj(finalLead)} 앞서 있어요.`, reversal: lastWho !== null && lastWho !== finalLead }
        : { text: '지금은 팽팽해요.', reversal: lastWho !== null }
    if (e.kind === 'result') return { text: `승부는 ${names.toward(e.winner)}으로 끝났어요.`, reversal: lastWho !== null && lastWho !== e.winner }
    const clean = range(1, n).every((i) => !(BAD.has(labels[i] as MoveLabel) && turnOf(plies[i - 1].fen) === e.winner))
    const verb = e.mate
      ? clean
        ? '실수 없이 체크메이트로 끝냈어요.'
        : '체크메이트로 끝냈어요.'
      : clean
        ? '실수 없이 마무리했어요.'
        : pick(['그대로 이겼어요.', '끝까지 밀어붙여 이겼어요.'], 3)
    if (lastWho === e.winner) return { text: verb, reversal: false }
    return { text: `끝내 ${names.subj(e.winner)} ${e.mate ? '체크메이트로 끝냈어요.' : '이겼어요.'}`, reversal: lastWho !== null }
  }
  const join = (bs: Beat[]) => {
    const end = ending(bs)
    const parts = bs.map((b, i) => b.stem + ((i + 1 < bs.length ? bs[i + 1].reversal : end.reversal) ? '지만' : '고'))
    return prefix + [...parts, end.text].join(', ')
  }
  const steady = beats.filter((b) => !b.transient)
  const tries = [beats, steady, steady.slice(1), steady.length > 2 ? [steady[0], steady.at(-1)!] : steady, steady.slice(-1), []]
  for (const bs of tries) {
    const s = join(bs)
    if (s.length <= F.lineMax) return s
  }
  return join([])
}

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, k) => from + k)
}
