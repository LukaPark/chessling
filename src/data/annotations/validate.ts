import { Chess } from 'chess.js'
import type { Ply } from '../../chess/types'
import { GUIDE_MAX } from '../../engine/comment/guide'
import type { Annotations } from '../../sources/annotations'
import { parseGuideToken } from '../../sources/guideNotation'

/** 1: 수 번호("12." "12...") 2: SAN 모양 토큰 */
const SAN = /(\d+\.(?:\.\.)?\s*)?\b(O-O(?:-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)/g
/** 수 번호 없이 쓴 "e4"는 칸 이름으로 읽는다 ("d5가 비어요") */
const BARE_SQUARE = /^[a-h][1-8]$/
const MOVE_NUMBER = /\d+\.(\.\.)?/g
/** 문체 금칙어. "엔진"은 해설자 말투를 지키려고 넣었다("엔진은 ~로 봐요" 대신 "~가 나았어요") */
export const BANNED = [/것입니다/, /중요한 순간/, /놀라운/, /라고 할 수 있/, /매우 흥미로운/, /엔진/]

const plain = (san: string) => san.replace(/[+#]$/, '')

function legalSans(fen: string): Set<string> {
  return new Set(new Chess(fen).moves().map(plain))
}

function lineSans(line: string): string[] {
  return line.replace(MOVE_NUMBER, ' ').split(/\s+/).filter(Boolean)
}

/** "[[9...cxd5 10. exd5]]"의 수들을 fen에서 차례로 둘 수 있는가 */
function lineOk(fen: string, line: string): boolean {
  const c = new Chess(fen)
  try {
    for (const m of lineSans(line)) c.move(m)
    return true
  } catch {
    return false
  }
}

export function validateAnnotations(a: Annotations, plies: Ply[]): string[] {
  const errors: string[] = []
  const n = plies.length - 1
  const byPly = new Map(a.plies.map((p) => [p.ply, p]))
  for (let i = 0; i <= n; i++) if (!byPly.get(i)?.text.trim()) errors.push(`${i}수 해설이 비어 있음`)
  for (const p of a.plies) if (p.ply < 0 || p.ply > n) errors.push(`${p.ply}수: 경기 범위(0~${n}) 밖`)
  const keys = a.plies.filter((p) => p.key).length
  if (keys < 2 || keys > 10) errors.push(`핵심 장면 ${keys}개 (2~10개여야 함)`)
  const played = plies.map((p) => (p.san ? plain(p.san) : ''))
  for (const p of a.plies) {
    if (p.ply < 0 || p.ply > n) continue
    for (const b of BANNED) if (b.test(p.text)) errors.push(`${p.ply}수: 금칙어 ${b}`)
    const before = plies[Math.max(0, p.ply - 1)].fen
    const after = plies[p.ply].fen
    if (p.guide) errors.push(...guideErrors(p.ply, p.guide, before, after))
    const lines = [...p.text.matchAll(/\[\[(.+?)\]\]/g)].map((m) => m[1])
    for (const l of lines) if (!lineOk(before, l) && !lineOk(after, l)) errors.push(`${p.ply}수: 가정 수순을 둘 수 없음 "${l}"`)
    const lineMoves = new Set(lines.flatMap(lineSans).map(plain))
    const okBefore = legalSans(before)
    const okAfter = legalSans(after)
    const past = new Set(played.slice(1, p.ply + 1))
    const future = new Set(played.slice(p.ply + 1))
    for (const m of p.text.replace(/\[\[.+?\]\]/g, ' ').matchAll(SAN)) {
      const [, number, token] = m
      if (!number && BARE_SQUARE.test(token)) continue
      const san = plain(token)
      const legal = past.has(san) || okBefore.has(san) || okAfter.has(san)
      if (!legal && !lineMoves.has(san)) errors.push(`${p.ply}수: 둘 수 없는 수 표기 "${token}"`)
      // 직전 포지션의 합법 수는 "안 둔 대안"으로 읽는다
      if (future.has(san) && !past.has(san) && !okBefore.has(san) && !lineMoves.has(san)) errors.push(`${p.ply}수: 앞으로 나올 수 언급 "${token}"`)
    }
  }
  for (const s of a.scenes) {
    if (s.startPly < 0 || s.startPly >= n) {
      errors.push(`장면 ${s.id}: 시작 수(${s.startPly})가 경기 범위 밖`)
      continue
    }
    const first = s.steps[0]?.answerUci.slice(0, 4)
    for (const ply of [s.startPly - 2, s.startPly - 1, s.startPly]) {
      const guide = byPly.get(ply)?.guide ?? []
      if (first && guide.some((t) => { const g = parseGuideToken(t); return g?.from !== undefined && g.from + g.to === first })) {
        errors.push(`장면 ${s.id}: ${ply}수 가이드가 첫 정답을 보여 줌`)
      }
    }
    const c = new Chess(plies[s.startPly].fen)
    if (c.turn() !== s.side) errors.push(`장면 ${s.id}: 둘 쪽이 맞지 않음`)
    for (const [k, step] of s.steps.entries()) {
      const want = plies[s.startPly + 1 + k * 2]?.uci
      if (s.source === 'authored' && step.answerUci !== want) errors.push(`장면 ${s.id} ${k + 1}단계: 정답이 실제 기보와 다름`)
      try {
        c.move({ from: step.answerUci.slice(0, 2), to: step.answerUci.slice(2, 4), promotion: step.answerUci[4] })
        if (step.replyUci) c.move({ from: step.replyUci.slice(0, 2), to: step.replyUci.slice(2, 4), promotion: step.replyUci[4] })
      } catch {
        errors.push(`장면 ${s.id} ${k + 1}단계: 둘 수 없는 수`)
        break
      }
    }
  }
  return errors
}

/** 가이드: 표기, 개수, 화살표가 실제로 닿는지(사이에 낀 기물에 막히는 것까지), 놓친 수는 둘 수 있는 수인지 */
function guideErrors(ply: number, list: string[], before: string, after: string): string[] {
  const out: string[] = []
  if (ply === 0) out.push('0수: 시작 포지션에는 가이드를 둘 수 없음')
  if (list.length > GUIDE_MAX) out.push(`${ply}수: 가이드 ${list.length}개 (최대 ${GUIDE_MAX}개)`)
  for (const t of list) {
    const g = parseGuideToken(t)
    if (!g) {
      out.push(`${ply}수: 가이드 표기를 읽을 수 없음 "${t}"`)
      continue
    }
    if (!g.from) {
      if (g.kind === 'danger' && !new Chess(after).get(g.to)) out.push(`${ply}수: 가이드 "${t}" 칸이 비어 있음`)
      continue
    }
    if (g.kind === 'missed') {
      const legal = new Chess(before).moves({ verbose: true }).some((m) => m.from === g.from && m.to === g.to)
      if (!legal) out.push(`${ply}수: 가이드 "${t}"는 직전 포지션에서 둘 수 없는 수`)
      continue
    }
    const c = new Chess(after)
    const piece = c.get(g.from)
    if (!piece) out.push(`${ply}수: 가이드 "${t}" 출발 칸이 비어 있음`)
    else if (!c.attackers(g.to, piece.color).includes(g.from)) out.push(`${ply}수: 가이드 "${t}"의 기물이 ${g.to}에 닿지 않음`)
  }
  return out
}
