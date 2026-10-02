# 보드 가이드(화살표·칸 표시) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기보를 넘기거나 리뷰할 때, 이번 수가 노리는 것·위험한 기물·놓친 수를 보드 위 화살표와 원으로 보여 준다.

**Architecture:**
- 코멘트가 쓰는 `extractFacts` 결과를 새 모듈 `guide.ts`가 도형(`GuideShape`)으로 바꾼다. 문장과 화살표가 같은 사실에서 나온다.
- 명경기는 해설 JSON의 `guide` 필드로 자동 결과를 덮어쓸 수 있고, 해설 검증기가 이 필드도 검사한다.
- `ViewerPage`가 도형을 chessground `DrawShape`로 바꿔 기존 힌트 화살표와 함께 보드에 넘긴다. 판정 카드의 "가이드" 토글로 켜고 끈다.

**Tech Stack:** React 19, TypeScript, chess.js 1.4, chessground(`@lichess-org/chessground`) autoShapes, Vanilla Extract, Vitest + Testing Library(jsdom), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-02-board-guide-design.md`

## Global Constraints

- 커밋·PR에 Claude 표시를 넣지 않는다. `Co-Authored-By: Claude…`, "Generated with Claude Code" 모두 금지.
- `main`에 직접 커밋하지 않는다. 작업 브랜치는 `feat/board-guide`. 푸시는 사용자가 요청할 때만.
- 포트 5199(사용자 미리보기), 5173, 4173에 서버를 띄우지 않는다. 남의 프로세스를 끄지 않는다.
- `.superpowers/`, `.claude/`, `test-results/`, `playwright-report/`, `scripts/annotate/facts/`는 커밋하지 않는다.
- 서버·LLM API 호출 금지.
- 가이드는 한 수에 최대 3개(`GUIDE_MAX = 3`).
- 색: 노림 `green`, 위험 `red`, 놓친 수 `blue`. 기존 힌트·라인 화살표 `paleBlue`는 그대로 둔다.
- 코멘트 문장 생성(`compose.ts`, `phrases.ko.ts`)은 바꾸지 않는다.
- 테스트는 파일 단위로 돌린다(`npx vitest run <path>`). 커밋 전에는 테스트 명령과 커밋 명령을 따로 실행해서 실패를 놓치지 않는다.

## 스펙과 달라지는 점(계획에서 정함)

- 스펙의 "새 사실 `threat`"은 `Fact` 유니언에 넣지 않고 `guide.ts` 안에서 계산한다. `PHRASES`가 모든 `Fact['kind']`에 문장을 요구하므로, 문장에 쓰지 않을 사실을 유니언에 넣으면 코멘트 쪽을 고쳐야 하기 때문이다.
- 퀴즈 장면 시작 포지션에서 자동 가이드는 `attack` 종류만 남긴다(`missed`뿐 아니라 `danger`도 뺀다). 반박 화살표(상대의 응징 수)가 곧 퀴즈 정답인 경우가 많아서다. Task 5에서 스펙 문장도 이렇게 고친다.

## 파일 구조

| 파일 | 역할 |
|---|---|
| `src/engine/comment/facts.ts` (수정) | 사실에 칸·UCI 정보를 더하고 `attackedBy`를 내보낸다 |
| `src/engine/comment/guide.ts` (새) | `GuideShape` 타입, `guideFor`, `GUIDE_MAX` |
| `src/sources/guideNotation.ts` (새) | 짧은 표기 `"d3h7"`·`"h7"`·`"!d3h7"`·`"?e2e4"` ↔ `GuideShape` |
| `src/sources/annotations.ts` (수정) | `AnnotatedPly.guide?: string[]` |
| `src/data/annotations/validate.ts` (수정) | 가이드 검사 |
| `src/app/guidePref.ts` (새) | 토글 상태를 `localStorage` `chessling-guide`에 저장하는 훅 |
| `src/components/boardShapes.ts` (수정) | `guideShape(g) → DrawShape` |
| `src/features/viewer/pickGuide.ts` (새) | 직접 지정/자동/장면 시작 규칙을 고르는 순수 함수 |
| `src/features/viewer/ViewerPage.tsx`, `JudgmentCard.tsx`, `src/styles/features/viewer.css.ts` (수정) | 연결과 토글 버튼 |
| `scripts/annotate/view-guide.ts` (새) | 판마다 핵심 장면의 자동 가이드와 해설을 나란히 보여 주는 작성 도구 |
| `src/data/annotations/*.json` (수정) | 핵심 장면 직접 지정 |
| `e2e/guide.spec.ts` (새) | 보드 SVG 화살표와 토글 |

---

### Task 1: 사실에 칸·UCI 정보 더하기

**Files:**
- Modify: `src/engine/comment/facts.ts`
- Test: `src/engine/comment/facts.test.ts`

**Interfaces:**
- Produces:
  - `Fact`의 `fork`에 `targetSquares?: Square[]`, `pin`에 `from?: Square`, `missed`에 `uci?: string`, `refutation`에 `uci?: string`. 모두 선택 필드라서 손으로 만든 사실(`compose.test.ts`)은 그대로 동작한다. `extractFacts`는 항상 채운다.
  - `export function attackedBy(chess: Chess, sq: Square): Square[]`

- [ ] **Step 1: 실패하는 테스트 쓰기**

`src/engine/comment/facts.test.ts`의 `describe('extractFacts', …)` 안 끝에 더한다(파일 위쪽의 `pliesFrom`·`pos`·`input` 헬퍼를 그대로 쓴다).

```ts
  it('가이드용 칸 정보: 포크 목표 칸', () => {
    const plies = pliesFrom('r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', ['Nc7+'])
    const fork = extractFacts(input(plies, [pos(0), pos(500)], 1)).find((x) => x.kind === 'fork')
    expect(fork && fork.kind === 'fork' ? [...(fork.targetSquares ?? [])].sort() : []).toEqual(['a8', 'e8'])
  })
  it('가이드용 칸 정보: 핀을 거는 기물 칸', () => {
    const plies = pliesFrom('4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1', ['Bb5'])
    expect(extractFacts(input(plies, [pos(0), pos(300)], 1)).find((x) => x.kind === 'pin')).toMatchObject({ from: 'b5', square: 'c6', pinned: 'n', behind: 'k' })
  })
  it('가이드용 칸 정보: 놓친 수와 반박 수의 UCI', () => {
    const plies = pliesFrom('4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1', ['Ke2'])
    const missed = extractFacts(input(plies, [pos(900, 'd1d5', ['d1d5']), pos(-900)], 1, [null, 'blunder'])).find((x) => x.kind === 'missed')
    expect(missed).toMatchObject({ uci: 'd1d5' })

    const p2 = pliesFrom('3rk3/8/8/8/8/8/8/3QK3 w - - 0 1', ['Ke2'])
    const ref = extractFacts(input(p2, [pos(0), pos(-900, 'd8d1', ['d8d1'])], 1, [null, 'blunder'])).find((x) => x.kind === 'refutation')
    expect(ref).toMatchObject({ uci: 'd8d1', target: 'q', square: 'd1' })
  })
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/engine/comment/facts.test.ts`
Expected: 새 테스트 3개 FAIL. `targetSquares`가 없어 `[]`이고, `from`·`uci`가 없어 `toMatchObject`가 실패한다.

- [ ] **Step 3: 구현**

`src/engine/comment/facts.ts`:

1. `Fact` 유니언의 네 줄을 바꾼다.

```ts
  | { kind: 'fork'; piece: PieceSymbol; square: Square; targets: PieceSymbol[]; targetSquares?: Square[] }
  | { kind: 'pin'; pinned: PieceSymbol; square: Square; behind: PieceSymbol; from?: Square }
  | { kind: 'missed'; bestSan: string; gain: 'mate' | 'material' | 'advantage'; amount: number; uci?: string }
  | { kind: 'refutation'; target: PieceSymbol; square: Square; san: string | null; uci?: string }
```

2. 포크 부분에서 칸도 모은다.

```ts
  const targets: PieceSymbol[] = []
  const targetSquares: Square[] = []
  for (const sq of attackedBy(after, move.to)) {
    const t = after.get(sq)
    if (!t || t.color !== enemy) continue
    const undefended = after.attackers(sq, enemy).length === 0
    if (t.type === 'k' || PIECE_VALUE[t.type] > PIECE_VALUE[move.piece] || undefended) {
      targets.push(t.type)
      targetSquares.push(sq)
    }
  }
  if (targets.length >= 2 && !isHanging(after, move.to)) facts.push({ kind: 'fork', piece: move.piece, square: move.to, targets, targetSquares })
```

3. `function attackedBy`를 `export function attackedBy`로 바꾼다.

4. `findPin`의 반환을 `return { kind: 'pin', pinned: first.type, square: first.sq, behind: t.type, from }`로 바꾼다.

5. `describeMissed`의 세 `return`에 `uci: before.best!`를 더한다.

```ts
  if ('mate' in before.score) return { kind: 'missed', bestSan, gain: 'mate', amount: Math.abs(before.score.mate), uci: before.best! }
  …
  if (m.captured) return { kind: 'missed', bestSan, gain: 'material', amount: PIECE_VALUE[m.captured], uci: before.best! }
  return { kind: 'missed', bestSan, gain: 'advantage', amount: 0, uci: before.best! }
```

6. `describeRefutation`의 반환에 `uci: replyUci`를 더한다.

```ts
  return { kind: 'refutation', target: m.captured, square: m.to, san: replyUci === nextGameUci ? null : m.san, uci: replyUci }
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/engine/comment`
Expected: PASS. 기존 `toContainEqual` 테스트(`hanging`, `capture` 등)는 바뀌지 않은 사실이라 그대로 통과한다.

Run: `npx tsc --noEmit`
Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add src/engine/comment/facts.ts src/engine/comment/facts.test.ts
git commit -m "feat: 코멘트 사실에 가이드용 칸·수 정보 추가"
```

---

### Task 2: `guideFor` 자동 가이드

**Files:**
- Create: `src/engine/comment/guide.ts`
- Test: `src/engine/comment/guide.test.ts`

**Interfaces:**
- Consumes: Task 1의 `extractFacts`, `attackedBy`, `CommentInput`, `Fact`(선택 필드 포함)
- Produces:

```ts
export type GuideKind = 'attack' | 'danger' | 'missed'
export interface GuideShape { kind: GuideKind; from?: Square; to: Square }
export const GUIDE_MAX = 3
export function guideFor(input: CommentInput): GuideShape[]
```

- [ ] **Step 1: 실패하는 테스트 쓰기**

`src/engine/comment/guide.test.ts`:

```ts
import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import type { Ply } from '../../chess/types'
import type { MoveLabel } from '../judge'
import type { ReviewedPosition } from '../review'
import type { CommentInput } from './facts'
import { GUIDE_MAX, guideFor } from './guide'

function pliesFrom(fen: string, sans: string[]): Ply[] {
  const c = new Chess(fen)
  const out: Ply[] = [{ san: null, uci: null, fen }]
  for (const san of sans) {
    const m = c.move(san)
    out.push({ san: m.san, uci: m.from + m.to + (m.promotion ?? ''), fen: c.fen() })
  }
  return out
}
const pos = (cp: number, best: string | null = null, pv: string[] = []): ReviewedPosition => ({ score: { cp }, best, pv, second: null, legalMoves: 20 })
const input = (plies: Ply[], index: number, positions: ReviewedPosition[] = [], labels: (MoveLabel | null)[] = []): CommentInput => ({ plies, positions, labels, index, seed: 't' })

describe('guideFor', () => {
  it('시작 포지션과 메이트에는 가이드가 없다', () => {
    const plies = pliesFrom('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', ['Ra8#'])
    expect(guideFor(input(plies, 0))).toEqual([])
    expect(guideFor(input(plies, 1))).toEqual([])
  })

  it('포크: 움직인 기물에서 목표마다 초록 화살표', () => {
    const plies = pliesFrom('r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', ['Nc7+'])
    const g = guideFor(input(plies, 1))
    expect(g).toHaveLength(2)
    expect(g).toContainEqual({ kind: 'attack', from: 'c7', to: 'a8' })
    expect(g).toContainEqual({ kind: 'attack', from: 'c7', to: 'e8' })
  })

  it('핀: 거는 기물에서 묶인 기물로 화살표, 묶인 기물에 빨간 원', () => {
    const plies = pliesFrom('4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1', ['Bb5'])
    const g = guideFor(input(plies, 1))
    expect(g).toContainEqual({ kind: 'attack', from: 'b5', to: 'c6' })
    expect(g).toContainEqual({ kind: 'danger', to: 'c6' })
  })

  it('노림: 방어 없는 기물을 공격하면 화살표', () => {
    const plies = pliesFrom('4k3/8/8/3n4/8/8/8/R3K3 w - - 0 1', ['Ra5'])
    expect(guideFor(input(plies, 1))).toEqual([{ kind: 'attack', from: 'a5', to: 'd5' }])
  })

  it('노림: 사이에 기물이 끼어 막힌 줄은 치지 않는다', () => {
    // a5 룩과 d5 나이트 사이 c5에 흑 폰(b6 폰이 받침)
    const plies = pliesFrom('4k3/8/1p6/2pn4/8/8/8/R3K3 w - - 0 1', ['Ra5'])
    expect(guideFor(input(plies, 1))).not.toContainEqual({ kind: 'attack', from: 'a5', to: 'd5' })
  })

  it('노림 다음에 걸린 기물(빨간 원)', () => {
    const plies = pliesFrom('4k3/8/8/8/2p5/8/8/3QK3 w - - 0 1', ['Qd3'])
    expect(guideFor(input(plies, 1))).toEqual([
      { kind: 'attack', from: 'd3', to: 'c4' },
      { kind: 'danger', to: 'd3' },
    ])
  })

  it('놓친 수: 리뷰 전에는 없고, 리뷰 뒤에는 맨 앞에 파란 화살표', () => {
    const plies = pliesFrom('4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1', ['Ke2'])
    expect(guideFor(input(plies, 1)).some((s) => s.kind === 'missed')).toBe(false)
    const g = guideFor(input(plies, 1, [pos(900, 'd1d5', ['d1d5']), pos(-900)], [null, 'blunder']))
    expect(g[0]).toEqual({ kind: 'missed', from: 'd1', to: 'd5' })
  })

  it('반박: 실수 뒤 상대의 응징 수를 빨간 화살표로', () => {
    const plies = pliesFrom('3rk3/8/8/8/8/8/8/3QK3 w - - 0 1', ['Ke2'])
    const g = guideFor(input(plies, 1, [pos(0), pos(-900, 'd8d1', ['d8d1'])], [null, 'blunder']))
    expect(g).toContainEqual({ kind: 'danger', from: 'd8', to: 'd1' })
  })

  it(`최대 ${GUIDE_MAX}개까지만`, () => {
    // d6 나이트가 킹·퀸·룩 두 개를 함께 공격
    const plies = pliesFrom('2q1k3/1r3r2/8/1N6/8/8/8/4K3 w - - 0 1', ['Nd6+'])
    const g = guideFor(input(plies, 1))
    expect(g).toHaveLength(GUIDE_MAX)
    expect(g.every((s) => s.kind === 'attack' && s.from === 'd6')).toBe(true)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/engine/comment/guide.test.ts`
Expected: FAIL. `./guide` 모듈이 없다.

- [ ] **Step 3: 구현**

`src/engine/comment/guide.ts`:

```ts
import { Chess, type Square } from 'chess.js'
import { PIECE_VALUE } from '../../chess/material'
import { attackedBy, extractFacts, type CommentInput, type Fact } from './facts'

export type GuideKind = 'attack' | 'danger' | 'missed'
export interface GuideShape {
  kind: GuideKind
  /** 있으면 화살표, 없으면 to 칸에 원 */
  from?: Square
  to: Square
}
export const GUIDE_MAX = 3

/** 앞에서부터 채운다. threat는 사실이 아니라 여기서 계산한다(코멘트 문장에는 쓰지 않는다) */
const ORDER = ['missed', 'fork', 'pin', 'refutation', 'threat', 'hanging'] as const

/** 수 하나에 그릴 가이드. 코멘트와 같은 사실에서 만들어 문장과 어긋나지 않는다 */
export function guideFor(input: CommentInput): GuideShape[] {
  const { plies, index } = input
  const uci = plies[index]?.uci
  if (index < 1 || !uci) return []
  const facts = extractFacts(input)
  if (facts.some((f) => f.kind === 'mate')) return []
  const out: GuideShape[] = []
  const add = (g: GuideShape) => {
    if (out.length >= GUIDE_MAX) return
    if (out.some((o) => o.from === g.from && o.to === g.to)) return
    out.push(g)
  }
  for (const kind of ORDER) {
    if (kind === 'threat') {
      if (!facts.some((f) => f.kind === 'fork')) {
        const t = threatOf(plies[index].fen, uci.slice(2, 4) as Square)
        if (t) add(t)
      }
      continue
    }
    for (const f of facts) if (f.kind === kind) shapesOf(f).forEach(add)
  }
  return out
}

const arrow = (kind: GuideKind, uci: string): GuideShape => ({ kind, from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square })

function shapesOf(f: Fact): GuideShape[] {
  switch (f.kind) {
    case 'missed':
      return f.uci ? [arrow('missed', f.uci)] : []
    case 'fork':
      return (f.targetSquares ?? []).map((to) => ({ kind: 'attack' as const, from: f.square, to }))
    case 'pin':
      return f.from ? [{ kind: 'attack', from: f.from, to: f.square }, { kind: 'danger', to: f.square }] : []
    case 'refutation':
      return f.uci ? [arrow('danger', f.uci)] : []
    case 'hanging':
      return [{ kind: 'danger', to: f.square }]
    default:
      return []
  }
}

/** 움직인 기물이 노리는 상대 기물 하나: 방어가 없거나 움직인 기물보다 비싼 것 중 가장 비싼 것. 킹은 체크가 맡는다 */
function threatOf(fen: string, from: Square): GuideShape | null {
  const c = new Chess(fen)
  const mover = c.get(from)
  if (!mover) return null
  // 킹은 가치가 0이라, 방어가 없는 기물만 노림으로 친다
  const moverValue = mover.type === 'k' ? Infinity : PIECE_VALUE[mover.type]
  let best: { sq: Square; value: number } | null = null
  for (const sq of attackedBy(c, from)) {
    const t = c.get(sq)
    if (!t || t.color === mover.color || t.type === 'k') continue
    const undefended = c.attackers(sq, t.color).length === 0
    if (!undefended && PIECE_VALUE[t.type] <= moverValue) continue
    if (!best || PIECE_VALUE[t.type] > best.value) best = { sq, value: PIECE_VALUE[t.type] }
  }
  return best ? { kind: 'attack', from, to: best.sq } : null
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/engine/comment/guide.test.ts`
Expected: PASS

테스트가 예상과 다르게 실패하면(예: 핀 포지션에서 `hanging`이나 `threat`이 더 나옴) 먼저 `extractFacts` 결과를 출력해서 포지션을 확인한다. 테스트 기대값을 바꾸는 것은 그 포지션에서 정말로 그 도형이 맞을 때만 한다. 테스트가 `toContainEqual`이면 추가 도형은 괜찮다.

Run: `npx tsc --noEmit`
Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add src/engine/comment/guide.ts src/engine/comment/guide.test.ts
git commit -m "feat: 수 사실로 보드 가이드 도형 계산"
```

---

### Task 3: 짧은 표기와 해설 검증

**Files:**
- Create: `src/sources/guideNotation.ts`
- Create: `src/sources/guideNotation.test.ts`
- Modify: `src/sources/annotations.ts:3-10`
- Modify: `src/data/annotations/validate.ts`
- Test: `src/data/annotations/annotations.test.ts`

**Interfaces:**
- Consumes: Task 2의 `GuideShape`, `GuideKind`, `GUIDE_MAX`
- Produces:

```ts
// src/sources/guideNotation.ts
export function parseGuideToken(token: string): GuideShape | null
export function parseGuide(list: string[]): GuideShape[]   // 읽을 수 없는 토큰은 버린다
export function guideToken(g: GuideShape): string          // 작성 도구용 역변환
// src/sources/annotations.ts
export interface AnnotatedPly { ply: number; text: string; key?: boolean; guide?: string[] }
```

- [ ] **Step 1: 실패하는 테스트 쓰기**

`src/sources/guideNotation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { guideToken, parseGuide, parseGuideToken } from './guideNotation'

describe('guideNotation', () => {
  it('네 가지 표기를 읽는다', () => {
    expect(parseGuideToken('d3h7')).toEqual({ kind: 'attack', from: 'd3', to: 'h7' })
    expect(parseGuideToken('h7')).toEqual({ kind: 'danger', to: 'h7' })
    expect(parseGuideToken('!d3h7')).toEqual({ kind: 'danger', from: 'd3', to: 'h7' })
    expect(parseGuideToken('?e2e4')).toEqual({ kind: 'missed', from: 'e2', to: 'e4' })
  })
  it('잘못된 표기는 null, 목록에서는 버린다', () => {
    for (const t of ['', 'i9', '!h7', '?h7', 'd3h7q', 'D3H7', 'd3-h7']) expect(parseGuideToken(t)).toBeNull()
    expect(parseGuide(['d3h7', 'zz', 'h7'])).toEqual([{ kind: 'attack', from: 'd3', to: 'h7' }, { kind: 'danger', to: 'h7' }])
  })
  it('역변환', () => {
    for (const t of ['d3h7', 'h7', '!d3h7', '?e2e4']) expect(guideToken(parseGuideToken(t)!)).toBe(t)
  })
})
```

`src/data/annotations/annotations.test.ts`의 `describe('validateAnnotations', …)` 안 끝에 더한다(같은 블록의 `plies`, `base`를 쓴다).

```ts
  describe('가이드', () => {
    const texts = ['시작이에요.', '백이 e4로 시작해요.', '흑도 e5로 받아요.', '백 나이트가 나와요.', '흑 나이트도 나와요.']
    const withGuide = (ply: number, guide: string[]): Annotations => {
      const a = base(texts)
      a.plies[ply] = { ...a.plies[ply], guide }
      return a
    }
    const guideErrors = (a: Annotations) => validateAnnotations(a, plies).filter((e) => e.includes('가이드'))

    it('올바른 가이드는 통과한다', () => {
      expect(guideErrors(withGuide(3, ['f3e5', 'e5', '?g1f3']))).toEqual([])
      expect(guideErrors(withGuide(3, []))).toEqual([])
    })
    it('읽을 수 없거나, 출발 칸이 비었거나, 닿지 않으면 오류', () => {
      expect(guideErrors(withGuide(3, ['zz']))[0]).toContain('읽을 수 없음')
      expect(guideErrors(withGuide(3, ['d4d5']))[0]).toContain('출발 칸이 비어 있음')
      expect(guideErrors(withGuide(3, ['f3e6']))[0]).toContain('닿지 않음')
      expect(guideErrors(withGuide(3, ['?g1g3']))[0]).toContain('둘 수 없는 수')
    })
    it('4개 이상이거나 시작 포지션이면 오류', () => {
      expect(guideErrors(withGuide(3, ['f3e5', 'e5', 'e4', 'f3d4'])).some((e) => e.includes('최대 3개'))).toBe(true)
      expect(guideErrors(withGuide(0, ['e4']))[0]).toContain('시작 포지션')
    })
    it('퀴즈 장면 시작 포지션 가이드가 첫 정답을 보여 주면 오류', () => {
      const a = withGuide(2, ['g1f3'])
      a.scenes = [{ id: 's', startPly: 2, side: 'w', prompt: '둬 보세요.', source: 'authored', steps: [{ answerUci: 'g1f3' }] }]
      expect(validateAnnotations(a, plies).some((e) => e.includes('장면 s') && e.includes('가이드'))).toBe(true)
    })
  })
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/sources/guideNotation.test.ts src/data/annotations/annotations.test.ts`
Expected: FAIL. `./guideNotation`이 없고, `AnnotatedPly`에 `guide`가 없어 타입 오류가 나며, 검증기가 가이드 오류를 내지 않는다.

- [ ] **Step 3: 구현**

`src/sources/guideNotation.ts`:

```ts
import type { Square } from 'chess.js'
import type { GuideKind, GuideShape } from '../engine/comment/guide'

/** "d3h7" 초록 화살표, "h7" 빨간 원, "!d3h7" 빨간 화살표, "?e2e4" 파란 화살표(놓친 수) */
const TOKEN = /^([!?]?)([a-h][1-8])([a-h][1-8])?$/

export function parseGuideToken(token: string): GuideShape | null {
  const m = TOKEN.exec(token)
  if (!m) return null
  const [, mark, a, b] = m
  if (!b) return mark ? null : { kind: 'danger', to: a as Square }
  const kind: GuideKind = mark === '!' ? 'danger' : mark === '?' ? 'missed' : 'attack'
  return { kind, from: a as Square, to: b as Square }
}

export function parseGuide(list: string[]): GuideShape[] {
  return list.map(parseGuideToken).filter((g): g is GuideShape => g !== null)
}

export function guideToken(g: GuideShape): string {
  if (!g.from) return g.to
  const mark = g.kind === 'danger' ? '!' : g.kind === 'missed' ? '?' : ''
  return `${mark}${g.from}${g.to}`
}
```

`src/sources/annotations.ts`의 `AnnotatedPly`에 필드를 더한다.

```ts
export interface AnnotatedPly {
  /** 0 = 시작 포지션(경기 소개), i = i번째 수를 둔 직후 */
  ply: number
  text: string
  /** 핵심 장면 */
  key?: boolean
  /** 보드 가이드(짧은 표기, guideNotation.ts). 있으면 자동 계산 대신 이것만 그린다. [] = 가이드 없음 */
  guide?: string[]
}
```

`src/data/annotations/validate.ts`:

1. import를 더한다.

```ts
import { GUIDE_MAX } from '../../engine/comment/guide'
import { parseGuideToken } from '../../sources/guideNotation'
```

2. 파일 끝(`validateAnnotations` 아래)에 함수를 더한다.

```ts
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
    if (!g.from) continue
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
```

3. 수마다 도는 반복문(`for (const p of a.plies) {` 안, `const after = plies[p.ply].fen` 다음 줄)에 더한다.

```ts
    if (p.guide) errors.push(...guideErrors(p.ply, p.guide, before, after))
```

4. 장면 반복문(`for (const s of a.scenes) {` 안, 범위 검사 `continue` 다음)에 더한다.

```ts
    const first = s.steps[0]?.answerUci.slice(0, 4)
    const startGuide = byPly.get(s.startPly)?.guide ?? []
    if (first && startGuide.some((t) => { const g = parseGuideToken(t); return g?.from !== undefined && g.from + g.to === first })) {
      errors.push(`장면 ${s.id}: 시작 포지션 가이드가 첫 정답을 보여 줌`)
    }
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/sources/guideNotation.test.ts src/data/annotations`
Expected: PASS. 30판 데이터 테스트도 그대로 통과한다(아직 `guide` 필드가 없다).

`guideErrors` 테스트에서 `'f3e5', 'e5', '?g1f3'`가 실패하면 포지션을 확인한다. 3수(2.Nf3) 뒤 f3 나이트는 e5를 공격하고, `?g1f3`는 직전 포지션(2수 뒤, 백 차례)에서 둘 수 있는 수다.

Run: `npx tsc --noEmit`
Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add src/sources/guideNotation.ts src/sources/guideNotation.test.ts src/sources/annotations.ts src/data/annotations/validate.ts src/data/annotations/annotations.test.ts
git commit -m "feat: 해설 가이드 표기와 검증"
```

---

### Task 4: 토글 저장과 도형 변환

**Files:**
- Create: `src/app/guidePref.ts`
- Create: `src/app/guidePref.test.tsx`
- Modify: `src/components/boardShapes.ts`
- Create: `src/components/boardShapes.test.ts`
- Create: `src/features/viewer/pickGuide.ts`
- Create: `src/features/viewer/pickGuide.test.ts`

**Interfaces:**
- Consumes: Task 2 `GuideShape`, Task 3 `parseGuide`
- Produces:

```ts
// src/app/guidePref.ts
export const GUIDE_KEY = 'chessling-guide'
export function useGuidePref(): [on: boolean, setOn: (on: boolean) => void]
export function resetGuidePrefForTest(): void
// src/components/boardShapes.ts
export function guideShape(g: GuideShape): DrawShape
// src/features/viewer/pickGuide.ts
export function pickGuide(o: { authored: string[] | undefined; auto: () => GuideShape[]; sceneStart: boolean }): GuideShape[]
```

- [ ] **Step 1: 실패하는 테스트 쓰기**

`src/app/guidePref.test.tsx`:

```ts
// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { GUIDE_KEY, resetGuidePrefForTest, useGuidePref } from './guidePref'

beforeEach(() => {
  localStorage.clear()
  resetGuidePrefForTest()
})

describe('useGuidePref', () => {
  it('기본값은 켜짐', () => {
    expect(renderHook(() => useGuidePref()).result.current[0]).toBe(true)
  })
  it('끄면 저장하고 다른 구독자에게도 알린다', () => {
    const a = renderHook(() => useGuidePref())
    const b = renderHook(() => useGuidePref())
    act(() => a.result.current[1](false))
    expect(localStorage.getItem(GUIDE_KEY)).toBe('0')
    expect(b.result.current[0]).toBe(false)
  })
  it('저장값 "0"을 읽는다', () => {
    localStorage.setItem(GUIDE_KEY, '0')
    expect(renderHook(() => useGuidePref()).result.current[0]).toBe(false)
  })
})
```

`src/components/boardShapes.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { guideShape } from './boardShapes'

describe('guideShape', () => {
  it('종류별 색과 화살표/원', () => {
    expect(guideShape({ kind: 'attack', from: 'd3', to: 'h7' })).toEqual({ orig: 'd3', dest: 'h7', brush: 'green' })
    expect(guideShape({ kind: 'danger', to: 'h7' })).toEqual({ orig: 'h7', brush: 'red' })
    expect(guideShape({ kind: 'danger', from: 'd8', to: 'd1' })).toEqual({ orig: 'd8', dest: 'd1', brush: 'red' })
    expect(guideShape({ kind: 'missed', from: 'e2', to: 'e4' })).toEqual({ orig: 'e2', dest: 'e4', brush: 'blue' })
  })
})
```

`src/features/viewer/pickGuide.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import type { GuideShape } from '../../engine/comment/guide'
import { pickGuide } from './pickGuide'

const AUTO: GuideShape[] = [
  { kind: 'missed', from: 'e2', to: 'e4' },
  { kind: 'attack', from: 'd3', to: 'h7' },
  { kind: 'danger', to: 'f7' },
]

describe('pickGuide', () => {
  it('직접 지정이 있으면 그것만 쓰고 자동 계산을 하지 않는다', () => {
    const auto = vi.fn(() => AUTO)
    expect(pickGuide({ authored: ['b3b7'], auto, sceneStart: false })).toEqual([{ kind: 'attack', from: 'b3', to: 'b7' }])
    expect(pickGuide({ authored: [], auto, sceneStart: false })).toEqual([])
    expect(auto).not.toHaveBeenCalled()
  })
  it('직접 지정이 없으면 자동', () => {
    expect(pickGuide({ authored: undefined, auto: () => AUTO, sceneStart: false })).toEqual(AUTO)
  })
  it('퀴즈 장면 시작 포지션의 자동 가이드는 노림 화살표만 남긴다', () => {
    expect(pickGuide({ authored: undefined, auto: () => AUTO, sceneStart: true })).toEqual([{ kind: 'attack', from: 'd3', to: 'h7' }])
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/app/guidePref.test.tsx src/components/boardShapes.test.ts src/features/viewer/pickGuide.test.ts`
Expected: FAIL. 모듈과 함수가 없다.

- [ ] **Step 3: 구현**

`src/app/guidePref.ts`:

```ts
import { useCallback, useSyncExternalStore } from 'react'

export const GUIDE_KEY = 'chessling-guide'

function readStored(): boolean {
  try {
    return localStorage.getItem(GUIDE_KEY) !== '0'
  } catch {
    return true
  }
}

let current: boolean | null = null
const listeners = new Set<() => void>()
const snapshot = () => (current ??= readStored())
function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** 보드 가이드 토글. 기본은 켜짐이고, 저장할 수 없으면 이번 세션에만 적용한다 */
export function useGuidePref(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, snapshot)
  const setOn = useCallback((v: boolean) => {
    current = v
    try {
      localStorage.setItem(GUIDE_KEY, v ? '1' : '0')
    } catch {
      // 저장할 수 없어도 이번 세션에는 적용한다
    }
    listeners.forEach((fn) => fn())
  }, [])
  return [on, setOn]
}

export function resetGuidePrefForTest(): void {
  current = null
}
```

`src/components/boardShapes.ts`에 더한다.

```ts
import type { GuideKind, GuideShape } from '../engine/comment/guide'

const GUIDE_BRUSH: Record<GuideKind, string> = { attack: 'green', danger: 'red', missed: 'blue' }

export function guideShape(g: GuideShape): DrawShape {
  const brush = GUIDE_BRUSH[g.kind]
  return g.from ? { orig: g.from as Key, dest: g.to as Key, brush } : { orig: g.to as Key, brush }
}
```

`src/features/viewer/pickGuide.ts`:

```ts
import type { GuideShape } from '../../engine/comment/guide'
import { parseGuide } from '../../sources/guideNotation'

/**
 * 직접 지정한 가이드가 있으면 그것만 쓴다. 없으면 자동 계산.
 * 퀴즈 장면 시작 포지션에서는 놓친 수·반박 수가 곧 정답일 수 있어 노림 화살표만 남긴다.
 * (직접 지정한 가이드의 스포일러는 해설 검증기가 막는다)
 */
export function pickGuide({ authored, auto, sceneStart }: { authored: string[] | undefined; auto: () => GuideShape[]; sceneStart: boolean }): GuideShape[] {
  if (authored) return parseGuide(authored)
  const list = auto()
  return sceneStart ? list.filter((g) => g.kind === 'attack') : list
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/app/guidePref.test.tsx src/components/boardShapes.test.ts src/features/viewer/pickGuide.test.ts`
Expected: PASS

Run: `npx tsc --noEmit`
Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add src/app/guidePref.ts src/app/guidePref.test.tsx src/components/boardShapes.ts src/components/boardShapes.test.ts src/features/viewer/pickGuide.ts src/features/viewer/pickGuide.test.ts
git commit -m "feat: 가이드 토글 저장, 도형 변환, 표시 규칙"
```

---

### Task 5: 뷰어에 연결하고 판정 카드에 토글 두기

**Files:**
- Modify: `src/features/viewer/ViewerPage.tsx` (import 부분, `shapes` useMemo(현재 219~224행 근처), `<JudgmentCard … />`(현재 254~264행 근처))
- Modify: `src/features/viewer/JudgmentCard.tsx` (props, 퀴즈 버튼 줄)
- Modify: `src/styles/features/viewer.css.ts:49` (`quizRow`)
- Modify: `docs/superpowers/specs/2026-10-02-board-guide-design.md` (5절 "가이드를 그리지 않는 경우")
- Test: `src/features/viewer/ViewerPage.test.tsx`, `src/features/viewer/JudgmentCard.test.tsx`(있으면)

**Interfaces:**
- Consumes: `guideFor`(Task 2), `useGuidePref`, `guideShape`, `pickGuide`(Task 4), `resetGuidePrefForTest`
- Produces: `JudgmentCard`의 새 prop `guide?: { on: boolean; onToggle: () => void } | null`. 버튼 이름 "가이드", `aria-pressed`.

- [ ] **Step 1: 실패하는 테스트 쓰기**

`src/features/viewer/ViewerPage.test.tsx`:

1. import에 `import { resetGuidePrefForTest } from '../../app/guidePref'`를 더한다.
2. `afterEach(cleanup)`을 다음으로 바꾼다.

```ts
afterEach(() => {
  cleanup()
  localStorage.clear()
  resetGuidePrefForTest()
})
```

3. `describe('ViewerPage', …)` 안에 테스트를 더한다. 오페라 게임 13수(7.Qb3) 뒤 b3 퀸은 방어 없는 b7 폰을 노린다. f7은 c4 비숍에 막혀 노림이 아니다. 이 파일의 해설 모의 데이터에는 13수 가이드가 없어서 자동 계산이 쓰인다.

```ts
  it('가이드: 수가 노리는 기물에 화살표를 그리고, 끄면 사라지며 다시 열어도 꺼져 있다', async () => {
    renderRoute('/game/classic/opera-game')
    await screen.findByRole('region', { name: '이번 수 판정' })
    for (let i = 0; i < 13; i++) fireEvent.keyDown(window, { key: 'ArrowRight' })
    await waitFor(() => expect(boardProps.current?.shapes).toContainEqual({ orig: 'b3', dest: 'b7', brush: 'green' }))

    const toggle = screen.getByRole('button', { name: '가이드' })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(toggle)
    await waitFor(() => expect(boardProps.current?.shapes ?? []).not.toContainEqual(expect.objectContaining({ brush: 'green' })))
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    cleanup()
    renderRoute('/game/classic/opera-game')
    await screen.findByRole('region', { name: '이번 수 판정' })
    fireEvent.keyDown(window, { key: 'End' })
    expect(await screen.findByRole('button', { name: '가이드' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('가이드: 시작 포지션에는 토글이 없다', async () => {
    renderRoute('/game/classic/opera-game')
    const card = await screen.findByRole('region', { name: '이번 수 판정' })
    expect(within(card).queryByRole('button', { name: '가이드' })).toBeNull()
  })
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/features/viewer/ViewerPage.test.tsx`
Expected: 새 테스트 FAIL. "가이드" 버튼이 없고 shapes에 초록 화살표가 없다. 둘째 테스트는 지금도 통과할 수 있는데, 이는 정상이다(회귀 방지용이다).

- [ ] **Step 3: 구현**

`src/features/viewer/JudgmentCard.tsx`:

1. import에 `MoveUpRight`(lucide-react)와 `Button`(`../../ui/Button`)을 더한다.

```ts
import { Lightbulb, Check, MoveUpRight } from 'lucide-react'
import { Button } from '../../ui/Button'
```

2. props에 더한다.

```ts
  quiz,
  guide,
}: {
  …
  quiz?: { done: boolean; onStart: () => void } | null
  /** 보드 가이드 토글. 시작 포지션에서는 없다 */
  guide?: { on: boolean; onToggle: () => void } | null
}) {
```

3. 퀴즈 버튼 줄을 바꾼다.

```tsx
      {(quiz || guide) && (
        <div className={v.quizRow}>
          {quiz && <QuizButton done={quiz.done} onStart={quiz.onStart} />}
          {guide && (
            <Button tone="secondary" size="sm" icon={MoveUpRight} aria-pressed={guide.on} onClick={guide.onToggle}>
              가이드
            </Button>
          )}
        </div>
      )}
```

`src/styles/features/viewer.css.ts:49`:

```ts
export const quizRow = style({ display: 'flex', flexWrap: 'wrap', justifyContent: 'start', gap: space[2] })
```

`src/features/viewer/ViewerPage.tsx`:

1. import를 더한다(기존 `bestMoveArrow` import 줄을 바꾼다).

```ts
import { useGuidePref } from '../../app/guidePref'
import { bestMoveArrow, guideShape } from '../../components/boardShapes'
import { guideFor } from '../../engine/comment/guide'
import { pickGuide } from './pickGuide'
```

2. `LoadedViewer` 안, `const [hint, setHint] = useState(false)` 근처에 더한다.

```ts
  const [guideOn, setGuideOn] = useGuidePref()
```

3. 기존 `const shapes = useMemo(…)`를 다음으로 바꾼다. `positions`, `labels`, `sceneHere`, `authored`는 이미 위에서 정의돼 있다.

```ts
  const guide = useMemo(() => {
    if (!guideOn || ply === 0) return []
    return pickGuide({
      authored: authored?.guide,
      auto: () => guideFor({ plies, positions, labels: labels ?? [], index: ply, seed: gameKey }),
      sceneStart: sceneHere !== null,
    })
  }, [guideOn, ply, authored, plies, positions, labels, gameKey, sceneHere])
  const shapes = useMemo(() => {
    const ucis = new Set<string>()
    if (hint && hintUci) ucis.add(hintUci.slice(0, 4))
    if (lineUci) ucis.add(lineUci.slice(0, 4))
    // 힌트·라인과 같은 화살표는 힌트 쪽 하나만 그린다
    const extra = guide.filter((g) => !(g.from && ucis.has(g.from + g.to))).map(guideShape)
    return [...[...ucis].map(bestMoveArrow), ...extra]
  }, [hint, hintUci, lineUci, guide])
```

4. `<JudgmentCard … quiz={…} />`에 prop을 더한다.

```tsx
              guide={ply > 0 ? { on: guideOn, onToggle: () => setGuideOn(!guideOn) } : null}
```

5. 스펙 `docs/superpowers/specs/2026-10-02-board-guide-design.md` 5절의 해당 줄을 바꾼다.

   - 바꿀 줄: `  - 퀴즈 장면 시작 포지션의 자동 가이드에서는 \`missed\`를 뺀다. 놓친 수가 곧 퀴즈 정답일 수 있어서다.`
   - 새 줄: `  - 퀴즈 장면 시작 포지션의 자동 가이드는 \`attack\`만 남긴다. 놓친 수·반박 수(\`missed\`·\`danger\`)가 곧 퀴즈 정답일 수 있어서다.`

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/features/viewer`
Expected: PASS. `JudgmentCard.test.tsx`가 퀴즈 버튼 줄 구조에 기대고 있으면 실패 내용을 읽고, 새 prop을 넘기지 않는 기존 동작(가이드 버튼 없음)이 그대로인지 확인한다.

Run: `npx tsc --noEmit`
Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add src/features/viewer src/styles/features/viewer.css.ts docs/superpowers/specs/2026-10-02-board-guide-design.md
git commit -m "feat: 뷰어 보드에 가이드 표시와 판정 카드 토글"
```

---

### Task 6: 명경기 핵심 장면 직접 지정

**Files:**
- Create: `scripts/annotate/view-guide.ts`
- Modify: `package.json` (`scripts`에 `annotate:guide`)
- Modify: `scripts/annotate/README.md`
- Modify: `src/data/annotations/*.json` (30판)

**Interfaces:**
- Consumes: `guideFor`(Task 2), `guideToken`·`parseGuideToken`(Task 3), `validateAnnotations`(Task 3), `pgnToPlies`(`src/chess/pgn`), `getClassic`(`src/sources/classics`)

- [ ] **Step 1: 작성 도구**

`scripts/annotate/view-guide.ts`:

```ts
// npm run annotate:guide -- <slug>
// 핵심 장면과 이미 가이드를 지정한 수마다: 해설, 리뷰 뒤 자동 가이드, 직접 지정한 가이드를 나란히 보여 준다.
// 팩트 시트(scripts/annotate/facts/<slug>.json)가 있으면 리뷰 결과(놓친 수·반박)까지 넣어 계산한다.
import { existsSync, readFileSync } from 'node:fs'
import { moveTitle } from '../../src/chess/moveNumber'
import { pgnToPlies } from '../../src/chess/pgn'
import { guideFor } from '../../src/engine/comment/guide'
import type { MoveLabel } from '../../src/engine/judge'
import type { ReviewedPosition } from '../../src/engine/review'
import type { Annotations } from '../../src/sources/annotations'
import { getClassic } from '../../src/sources/classics'
import { guideToken } from '../../src/sources/guideNotation'

const slug = process.argv[2]
const a = JSON.parse(readFileSync(`src/data/annotations/${slug}.json`, 'utf8')) as Annotations
const plies = pgnToPlies(getClassic(slug)!.pgn)
const factsPath = `scripts/annotate/facts/${slug}.json`
const facts = existsSync(factsPath)
  ? (JSON.parse(readFileSync(factsPath, 'utf8')) as { positions: ReviewedPosition[]; labels: (MoveLabel | null)[] })
  : { positions: [], labels: [] }
const starts = new Set(a.scenes.map((s) => s.startPly))

for (const p of a.plies) {
  if (p.ply === 0 || (!p.key && !p.guide)) continue
  const auto = guideFor({ plies, positions: facts.positions, labels: facts.labels, index: p.ply, seed: slug }).map(guideToken)
  console.log(`[${p.ply}${p.key ? ' 핵심' : ''}${starts.has(p.ply) ? ' 장면시작' : ''}] ${moveTitle(plies, p.ply)}`)
  console.log(`  해설: ${p.text}`)
  console.log(`  자동: ${JSON.stringify(auto)}${p.guide ? `   지정: ${JSON.stringify(p.guide)}` : ''}`)
}
```

`package.json`의 `scripts`에서 `"annotate:probe": …` 다음 줄에 더한다(앞 줄 끝에 쉼표).

```json
    "annotate:guide": "tsx scripts/annotate/view-guide.ts"
```

`scripts/annotate/README.md`의 번호 목록 끝(5번 뒤)에 더한다.

```markdown
6. `npm run annotate:guide -- opera-game`: 핵심 장면마다 해설과 자동 가이드(보드 화살표)를 나란히 보여 줘요. 해설과 어긋나면 해설 JSON의 그 수에 `"guide"`를 직접 넣어요. 표기는 `"d3h7"`(초록 화살표, 노림), `"h7"`(빨간 원, 위험한 기물), `"!d3h7"`(빨간 화살표, 상대의 응징), `"?e2e4"`(파란 화살표, 놓친 수)이고 최대 3개예요. `[]`이면 그 수는 가이드를 그리지 않아요.
```

Run: `npm run -s annotate:guide -- opera-game`
Expected: 핵심 장면(13, 15, 18, 19, 23, 25, 31, 33수)마다 세 줄씩 출력된다.

- [ ] **Step 2: 작성 도구 커밋**

```bash
git add scripts/annotate/view-guide.ts scripts/annotate/README.md package.json
git commit -m "chore: 해설 가이드 작성 도구"
```

- [ ] **Step 3: 판마다 직접 지정(30판)**

`npm run annotate:guide -- <slug>`를 판마다 돌리고, 핵심 장면마다 다음 규칙으로 정한다.

- 해설이 특정 노림(“X가 Y를 노려요”, “Y를 공격해요”, 포크·핀)을 말하는데 자동 결과에 그 화살표가 없거나 다른 화살표가 앞서면, 해설과 같은 화살표를 `guide`로 넣는다. 예: 해설이 "비숍이 h7을 겨눠요"이면 `"guide": ["d3h7"]`.
- 해설이 말하는 놓친 대안(“N.Xx가 나았어요”)을 보여 주고 싶으면 `"?from-to"`를 쓴다. 이 수는 직전 포지션에서 둘 수 있어야 한다.
- 자동 결과가 해설과 맞으면 넣지 않는다(자동이 그린다).
- 자동 결과가 해설과 어긋나는데 보여 줄 화살표가 마땅치 않으면 `"guide": []`로 끈다.
- 퀴즈 장면 시작 포지션(`장면시작` 표시)에는 그 장면의 첫 정답 화살표를 넣지 않는다(검증기가 막는다).
- 화살표는 그 수를 둔 뒤 포지션에서 출발 기물이 도착 칸까지 실제로 닿아야 한다. 사이에 기물이 끼면 검증기가 막는다. 해설 문장이 그런 막힌 줄을 말하고 있다면 해설 문장도 고친다.
- 한 수에 최대 3개.

JSON에는 `"key": true` 다음 줄(핵심이 아니면 `"text"` 다음 줄)에 `"guide": [...]`를 넣는다.

판 10개를 마칠 때마다 다음을 실행한다.

Run: `npx vitest run src/data/annotations`
Expected: PASS(37개)

파일 이름순으로 10판씩 세 묶음으로 나눠 커밋한다.

1묶음: bogoljubov-alekhine-1922 botvinnik-capablanca-1938 botvinnik-portisch-1968 byrne-fischer-1956 capablanca-marshall-1918 capablanca-tartakower-1924 deep-blue-kasparov-1997-g6 ed-lasker-thomas-1912 evergreen-game fischer-spassky-1972-g6

```bash
git add src/data/annotations
git commit -m "feat: 명경기 핵심 장면 가이드 직접 지정 1묶음(bogoljubov-alekhine-1922 ~ fischer-spassky-1972-g6)"
```

2묶음: immortal-game karpov-kasparov-1985-g16 kasparov-topalov-1999 lasker-bauer-1889 lasker-capablanca-1914 levitsky-marshall-1912 mcdonnell-labourdonnais-1834 opera-game paulsen-morphy-1857 petrosian-pachman-1961

```bash
git add src/data/annotations
git commit -m "feat: 명경기 핵심 장면 가이드 직접 지정 2묶음(immortal-game ~ petrosian-pachman-1961)"
```

3묶음: pillsbury-tarrasch-1895 polugaevsky-nezhmetdinov-1958 reti-bogoljubov-1924 reti-tartakower-1910 rotlewi-rubinstein-1907 saemisch-nimzowitsch-1923 short-timman-1991 spassky-bronstein-1960 steinitz-von-bardeleben-1895 zukertort-blackburne-1883

```bash
git add src/data/annotations
git commit -m "feat: 명경기 핵심 장면 가이드 직접 지정 3묶음(pillsbury-tarrasch-1895 ~ zukertort-blackburne-1883)"
```

---

### Task 7: E2E와 전체 확인

**Files:**
- Create: `e2e/guide.spec.ts`

**Interfaces:**
- Consumes: 판정 카드 "가이드" 버튼(Task 5), chessground가 autoShapes를 그리는 `cg-container svg.cg-shapes`

- [ ] **Step 1: E2E 쓰기**

`e2e/guide.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('보드 가이드: 핵심 장면에 화살표가 그려지고, 토글로 끄고 켠다', async ({ page }) => {
  await page.goto('/game/classic/opera-game')
  const card = page.locator('section[aria-label="이번 수 판정"]')
  await expect(card).toBeVisible()
  await page.keyboard.press('Home')
  for (let i = 0; i < 13; i++) await page.keyboard.press('ArrowRight') // 7. Qb3(핵심 장면)

  const arrows = page.locator('cg-container svg.cg-shapes line')
  await expect(arrows.first()).toBeVisible()

  const toggle = card.getByRole('button', { name: '가이드' })
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await toggle.click()
  await expect(arrows).toHaveCount(0)

  await page.reload()
  await page.keyboard.press('Home')
  for (let i = 0; i < 13; i++) await page.keyboard.press('ArrowRight')
  await expect(card.getByRole('button', { name: '가이드' })).toHaveAttribute('aria-pressed', 'false')
  await expect(arrows).toHaveCount(0)
  await card.getByRole('button', { name: '가이드' }).click()
  await expect(arrows.first()).toBeVisible()
})
```

13수에 Task 6에서 `"guide": []`를 넣었다면 이 테스트는 첫 화살표 확인에서 실패한다. 그때는 오페라 게임 JSON의 13수 가이드를 화살표가 있는 값으로 두거나, 테스트를 화살표가 있는 다른 핵심 장면 수로 바꾼다.

- [ ] **Step 2: 실행**

Run: `npx playwright test e2e/guide.spec.ts --reporter=line`
Expected: 1 passed

화살표 선택자가 맞지 않아 실패하면 `error-context.md`의 DOM 스냅숏에서 chessground가 그린 SVG 구조를 확인하고 선택자를 고친다(chessground 버전에 따라 `svg.cg-shapes` 안에 `g > line`으로 그린다).

- [ ] **Step 3: 전체 확인**

명령마다 따로 실행하고 결과를 확인한다.

Run: `npm test`
Expected: 모든 테스트 통과

Run: `npx tsc --noEmit`
Expected: 오류 없음

Run: `npm run build`
Expected: 경고·오류 없이 빌드

Run: `npm run e2e -- --reporter=line`
Expected: 통과(시각 회귀는 `VISUAL=1`이 없으면 건너뜀)

- [ ] **Step 4: 커밋**

```bash
git add e2e/guide.spec.ts
git commit -m "test(e2e): 보드 가이드 표시와 토글"
```
