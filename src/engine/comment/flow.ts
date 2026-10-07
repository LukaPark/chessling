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
  /** 꾸밈: 내 / 상대 / 백 / 흑 */
  pre: (t: Turn) => string
  /** 주제: "" (나) / "상대는 " / "백은 " */
  topic: (t: Turn) => string
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
  /** 내 쪽. 알면 내가 밀린 흐름을 "밀렸어요"처럼 쓴다 */
  me?: Turn | null
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
  /** "초반은" */
  topic: string
  /** "초반에" */
  at: string
  /** "초반부터" */
  from: string
}
const WORDS: Record<'early' | 'middle' | 'late' | 'after', PhaseWords> = {
  early: { topic: '초반은', at: '초반에', from: '초반부터' },
  middle: { topic: '중반은', at: '중반에', from: '중반부터' },
  late: { topic: '막판은', at: '막판에', from: '막판부터' },
  after: { topic: '그 뒤는', at: '그 뒤에', from: '그 뒤부터' },
}

const BAD: ReadonlySet<MoveLabel> = new Set(['mistake', 'blunder'])
const other = (t: Turn): Turn => (t === 'w' ? 'b' : 'w')

/** 흐름의 마디. N은 그 일이 일어난 수 번호 */
type Beat =
  /** 비등: topic "초반은"/"중반까지는"/"끝까지", at "초반엔"/"중반까지" */
  | { kind: 'even'; topic: string; at: string; whole: boolean; phase: number }
  /** 첫 구간부터 앞섬 */
  | { kind: 'lead'; who: Turn; big: boolean; from: string }
  | { kind: 'gain'; who: Turn; big: boolean; N: number }
  | { kind: 'widen'; who: Turn; N: number }
  | { kind: 'flip'; who: Turn; big: boolean; N: number; ply: number }
  | { kind: 'equalize'; who: Turn; N: number }
  | { kind: 'catchUp'; who: Turn; at: string }
  | { kind: 'transient'; who: Turn; at: string }

interface Mistakes {
  total: number
  /** 한쪽만 실수했으면 그쪽 */
  side: Turn | null
}

/** 대국 전체를 구간으로 나눠, 형세가 어떻게 흘렀는지 한 문장으로 쓴다 */
export function flowLine(input: FlowInput): string {
  const { plies, labels, win, names, seed } = input
  const n = win.length - 1
  const start = plies[0].fen
  const moveNo = (i: number) => moveNumberOf(start, i).number
  const levels = win.map(levelOf)
  const inProgress = input.ending.kind === 'inProgress'

  // 구간 나누기
  const last = moveNo(n)
  const bounds: [keyof typeof WORDS, number, number][] =
    last <= F.shortGame
      ? [['early', 1, F.earlyEnd], ['after', F.earlyEnd + 1, Infinity]]
      : [['early', 1, F.earlyEnd], ['middle', F.earlyEnd + 1, F.middleEnd], ['late', F.middleEnd + 1, Infinity]]
  const phases = bounds
    .map(([key, lo, hi]) => ({ key, words: WORDS[key], plies: range(1, n).filter((i) => moveNo(i) >= lo && moveNo(i) <= hi) }))
    .filter((p) => p.plies.length > 0)

  // 마디 뽑기
  const beats: Beat[] = []
  let mistakes: Mistakes | null = null
  let prev: Level = { lead: null, big: false }
  phases.forEach((p, pi) => {
    const end = levels[p.plies.at(-1)!]
    const w = p.words
    const bad = { w: 0, b: 0 }
    for (const i of p.plies) if (BAD.has(labels[i] as MoveLabel)) bad[turnOf(plies[i - 1].fen)]++
    const total = bad.w + bad.b
    if (total >= F.notableMistakes && (!mistakes || total > mistakes.total))
      mistakes = { total, side: bad.w > 0 && bad.b > 0 ? null : bad.w > 0 ? 'w' : 'b' }
    // 구간 안에서 잠깐 앞섰다가 내준 쪽
    for (const y of new Set(p.plies.map((i) => levels[i].lead)))
      if (y !== null && y !== end.lead && y !== prev.lead) beats.push({ kind: 'transient', who: y, at: w.at })
    // 구간 끝 형세로 들어선 마지막 수, 크게 앞서기 시작한 수
    const shift = [...p.plies].reverse().find((i) => levels[i].lead === end.lead && levels[i - 1].lead !== end.lead)
    const bigAt = p.plies.find((i) => levels[i].big && levels[i].lead === end.lead && !(levels[i - 1].big && levels[i - 1].lead === end.lead))
    const lastBeat = beats.at(-1)
    if (end.lead === prev.lead) {
      if (end.lead && end.big && !prev.big && bigAt !== undefined) beats.push({ kind: 'widen', who: end.lead, N: moveNo(bigAt) })
      else if (end.lead && !end.big && prev.big) beats.push({ kind: 'catchUp', who: other(end.lead), at: w.at })
      else if (end.lead === null && lastBeat?.kind === 'even') {
        const whole = pi === phases.length - 1
        lastBeat.topic = whole ? '끝까지' : inProgress && p.key === 'middle' ? '초반과 중반은' : `${p.key === 'middle' ? '중반' : '막판'}까지는`
        lastBeat.at = whole ? '끝까지' : inProgress && p.key === 'middle' ? '초반과 중반에' : `${p.key === 'middle' ? '중반' : '막판'}까지`
        lastBeat.whole = whole
        lastBeat.phase = pi
      } else if (end.lead === null && !beats.some((b) => b.kind !== 'transient'))
        beats.push({ kind: 'even', topic: w.topic, at: w.at, whole: phases.length === 1, phase: pi })
    } else if (end.lead !== null && pi === 0) {
      beats.push({ kind: 'lead', who: end.lead, big: end.big, from: w.from })
    } else if (end.lead === null) {
      beats.push({ kind: 'equalize', who: other(prev.lead!), N: moveNo(shift!) })
    } else if (prev.lead === null) {
      beats.push({ kind: 'gain', who: end.lead, big: end.big, N: moveNo(end.big && bigAt !== undefined ? bigAt : shift!) })
    } else {
      beats.push({ kind: 'flip', who: end.lead, big: end.big, N: moveNo(shift!), ply: shift! })
    }
    prev = end
  })

  const s = names.subj
  const me = input.me ?? null
  const v = (k: number) => ((seed >>> (k * 3)) & 1) === 0

  // 시작 마디와 중심 마디 고르기
  const steady = beats.filter((b) => b.kind !== 'transient')
  const finalLead = levels[n].lead
  const target = input.ending.kind === 'decisive' || input.ending.kind === 'result' ? input.ending.winner : finalLead
  const first: Beat = steady[0] ?? { kind: 'even', topic: '끝까지', at: '끝까지', whole: true, phase: 0 }
  const rest = beats.slice(beats.indexOf(first) + 1)
  const decisive = [...rest].reverse().find((b) => (b.kind === 'flip' || b.kind === 'gain' || b.kind === 'widen') && b.who === target)
  const main: Beat | null = decisive ?? [...rest].reverse().find((b) => b.kind !== 'transient') ?? rest[0] ?? null
  // 뒤집기·따라잡기면 그 전에 앞섰던 쪽을 시작 마디로(누가 먼저 앞섰는지는 버리지 않는다)
  let opening: Beat = first
  let reversal = false
  if (main && (main.kind === 'flip' || main.kind === 'equalize' || main.kind === 'catchUp')) {
    const before = steady
      .slice(0, steady.indexOf(main))
      .reverse()
      .find((b) => 'who' in b && b.who === other(main.who) && b.kind !== 'catchUp' && b.kind !== 'equalize')
    if (before) opening = before
    reversal = true
  }

  // 시작 마디: "~는데" / "~다가"
  const when = (b: Beat) => (b.kind === 'lead' ? '초반엔' : 'N' in b ? `${b.N}수쯤부터` : '')
  const evenSpan = (b: Beat & { kind: 'even' }) => (b.topic === '끝까지' ? '끝까지' : b.at.endsWith('에') ? `${b.at.slice(0, -1)}엔` : b.at)
  const openNde = (): string => {
    if (opening.kind === 'even') return `${evenSpan(opening)} 비슷했는데`
    const who = (opening as { who: Turn }).who
    if (me && who !== me) return `${when(opening)} 밀렸는데`
    return `${when(opening)} ${s(who)} 앞섰는데`
  }
  const openDaga = (): string => {
    if (opening.kind === 'even') return opening.topic === '초반은' ? '비슷하게 가다가' : `${evenSpan(opening)} 비슷하게 가다가`
    const who = (opening as { who: Turn }).who
    return `${when(opening)} ${s(who)} 앞서다가`
  }
  const both = (mistakes as Mistakes | null)?.side === null
  const busy = mistakes ? (both ? '양쪽 다 실수가 잦았는데' : `${names.poss((mistakes as Mistakes).side!)} 실수가 잦았는데`) : null

  // 중심 마디: 과거형 어간(뒤에 "어요"·"고"·"지만"이 붙는다)
  const lostBy = (b: Beat & { kind: 'flip' }) => {
    const mover = turnOf(plies[b.ply - 1].fen)
    return mover === other(b.who) && BAD.has(labels[b.ply] as MoveLabel) ? `${names.poss(mover)} 실수로 ` : ''
  }
  const stem = (b: Beat): { past: string; ing: string; now: string } => {
    switch (b.kind) {
      case 'gain':
        return {
          past: `${b.N}수쯤 ${s(b.who)} ${b.big ? '확실히 ' : ''}앞섰`,
          ing: `${b.N}수쯤 ${s(b.who)} ${b.big ? '확실히 ' : ''}앞서`,
          now: `${b.N}수쯤부터 ${s(b.who)} 앞서 있어요.`,
        }
      case 'widen':
        return { past: `${b.N}수쯤 ${s(b.who)} 확실히 앞섰`, ing: `${b.N}수쯤 ${s(b.who)} 확실히 앞서`, now: `${b.N}수쯤부터 ${s(b.who)} 크게 앞서 있어요.` }
      case 'flip': {
        const subject = me === b.who ? '' : `${s(b.who)} `
        return { past: `${b.N}수쯤 ${lostBy(b)}${subject}뒤집었`, ing: `${b.N}수쯤 ${lostBy(b)}${subject}뒤집어서`, now: `${b.N}수쯤 ${s(b.who)} 뒤집어서 지금은 앞서 있어요.` }
      }
      case 'equalize':
        return { past: `${b.N}수쯤 ${s(b.who)} 따라잡았`, ing: `${b.N}수쯤 ${s(b.who)} 따라잡아서`, now: `${b.N}수쯤 ${s(b.who)} 따라잡아서 지금은 비슷해요.` }
      case 'catchUp':
        return { past: `${b.at} ${s(b.who)} 차이를 좁혔`, ing: `${b.at} ${s(b.who)} 차이를 좁혀서`, now: `${b.at} ${s(b.who)} 차이를 좁혔어요.` }
      case 'transient':
        return { past: `${b.at} 한때 ${s(b.who)} 앞섰`, ing: `${b.at} 한때 ${s(b.who)} 앞서서`, now: `${b.at} 한때 ${s(b.who)} 앞섰어요.` }
      default:
        return { past: '', ing: '', now: '' }
    }
  }

  const candidates = (): string[] => {
    const e = input.ending
    if (e.kind === 'inProgress') {
      if (!main) {
        if (opening.kind === 'even') return [v(0) ? '아직은 비슷해요.' : '지금까지 비슷하게 가고 있어요.']
        return [`초반부터 ${s((opening as { who: Turn }).who)} 앞서 있어요.`]
      }
      return [stem(main).now]
    }
    if (e.kind === 'draw') {
      const anyBad = range(1, n).some((i) => BAD.has(labels[i] as MoveLabel))
      if (!main) {
        if (opening.kind === 'even') return [anyBad ? '끝까지 비슷하게 가서 비겼어요.' : '끝까지 큰 실수 없이 비슷하게 갔어요.']
        return [`${openNde()} 결국 비겼어요.`]
      }
      if (main.kind === 'equalize') return [`${openNde()} ${stem(main).ing} 비겼어요.`]
      return [`${openDaga()} ${stem(main).past}지만 결국 비겼어요.`, `${stem(main).past}지만 결국 비겼어요.`]
    }
    if (e.kind === 'result') {
      const tail = `결과는 ${names.pre(e.winner)} 승리였어요.`
      if (!main) return [`${openNde()} ${tail}`]
      return [`${openDaga()} ${stem(main).past}는데 ${tail}`, `${stem(main).past}는데 ${tail}`]
    }
    // 이긴 판
    const W = e.winner
    const M = moveNumberOf(start, n).number
    const clean = range(1, n).every((i) => !(BAD.has(labels[i] as MoveLabel) && turnOf(plies[i - 1].fen) === W))
    const lostView = me !== null && me !== W
    const after = e.mate
      ? '결국 메이트로 끝났어요.'
      : clean
        ? v(1)
          ? `그 뒤로 ${names.topic(W)}실수가 없었어요.`
          : `${names.topic(W)}끝까지 실수 없이 이겼어요.`
        : v(1)
          ? '그대로 이겼어요.'
          : '결국 이겼어요.'
    if (!main || ((main.kind === 'widen' || main.kind === 'gain') && main.who === W && lostView)) {
      // 한쪽이 처음부터 앞섰거나, 내가 밀린 채로 진 판
      const since =
        opening.kind === 'lead' && opening.who === W
          ? '초반부터'
          : opening.kind === 'gain' && opening.who === W
            ? `${opening.N}수쯤부터`
            : !main
              ? '초반부터'
              : `${(main as { N: number }).N}수쯤부터`
      if (lostView) return [`${since} 밀렸고 ${e.mate ? '결국 메이트를 당했어요.' : '끝까지 따라잡지 못했어요.'}`]
      if (opening.kind !== 'even' && opening.who === W) {
        if (e.mate && M <= 20) return [`${s(W)} 처음부터 밀어붙여서 ${M}수 만에 끝났어요.`]
        return [`${s(W)} 초반부터 앞섰고 ${after}`, `${s(W)} 초반부터 앞선 채로 이겼어요.`].filter((x) => !e.mate || x.includes('메이트'))
      }
      return [`${openNde()} 결국 ${s(W)} 이겼어요.`]
    }
    const st = stem(main)
    if (!('who' in main) || main.who !== W) return [`${openDaga()} ${st.past}지만 결국 ${s(W)} 이겼어요.`]
    if (reversal) {
      const short = `${openNde()} ${st.past}어요.`
      return e.mate ? [`${openNde()} ${st.past}고 ${after}`, short] : [short]
    }
    const out: string[] = []
    if (busy) out.push(`${busy} ${st.past}고 ${after}`)
    else if (opening.kind === 'even') out.push(`${openNde()} ${st.past}고 ${after}`)
    else if (main.kind === 'widen') out.push(`${s(W)} 초반부터 앞섰는데 ${main.N}수쯤 차이가 더 커졌고 ${after}`)
    else out.push(`${openDaga()} ${st.past}고 ${after}`)
    if (opening.kind === 'even' && main.kind === 'gain' && !e.mate && !busy) out.push(`${openNde()} ${main.N}수쯤 ${names.toward(W)}으로 넘어갔어요.`)
    if (v(2)) out.reverse()
    // 길이가 넘칠 때만 시작 마디를 뺀다
    out.push(`${st.past}고 ${after}`)
    return out
  }

  const all = candidates()
  return all.find((c) => c.length <= F.lineMax) ?? all.reduce((a, b) => (b.length < a.length ? b : a))
}

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, k) => from + k)
}
