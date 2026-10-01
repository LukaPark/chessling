# Chessling 리뉴얼 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chessling의 UI를 새 디자인 시스템(순백·잉크·청색 강조, Pretendard, 400/500 굵기, 테두리 없는 면 구성, 다크 모드, Motion)으로 모바일 퍼스트 리뉴얼하고, 수 판정을 Chess.com식 9종(탁월·좋은 수·최선·우수·좋음·놓침·부정확·실수·블런더)으로 확장한다.

**Architecture:** Part B(판정 로직)를 먼저 순수 함수로 TDD 구현하고 리뷰 파이프라인을 v2(MultiPV 2)로 올린다. 그다음 Vanilla Extract 토큰 계약과 기본 부품(`src/ui/`)을 만들고, 화면을 하나씩 새 부품으로 옮긴 뒤 옛 `styles.css`를 삭제한다. 모든 화면은 375px 한 열을 기본 스타일로 쓰고 `min-width` 미디어 쿼리에서만 확장한다.

**Tech Stack:** 기존(React 19, React Router 7, TanStack Query 5, chessground 10, chess.js, Stockfish 19 lite, Dexie) + Vanilla Extract(`@vanilla-extract/css` 1.21, `recipes` 0.5, `vite-plugin` 5.2), Motion for React(`motion` 13, import 경로 `motion/react`), `lucide-react` 1.49, `pretendard` 1.3.9.

**Spec:** `docs/superpowers/specs/2026-09-30-chessling-renewal-design.md` (선행 스펙 `docs/superpowers/specs/2026-09-30-chessling-design.md`의 동작 규칙은 그대로 유효)

## Global Constraints

- 색 토큰(라이트/다크): canvas `#ffffff`/`#0f1216`, surface `#ffffff`/`#161a20`, surfaceSubtle `#f3f5f8`/`#1d222a`, ink `#171d26`/`#e8ecf2`, muted `#596372`/`#9aa4b2`, line `#dce1e7`/`#2a313b`, accent `#254acb`/`#6f8cff`, accentHover `#19399f`/`#8aa2ff`, onAccent `#ffffff`/`#0f1216`, boardLight `#eef1f6`/`#3a4254`, boardDark `#8fa0c4`/`#262c38`.
- 서체: Pretendard Variable 자체 호스팅(dynamic subset) + jsDelivr fallback. 굵기는 **400·500만**. 크기: display 48/64/76px(모바일/768/1024), section 30/36px, body 17px, control 15px, meta 13px.
- 간격 4/8/12/16/24/32/48/64/96/144. 모서리: 액션 12px(모바일)/14px(768+), 면 16px. 페이지 최대 1160px, 좌우 20px(모바일)/24px.
- **테두리 박스 금지.** 영역은 여백과 surfaceSubtle 면으로 구분. 예외: 입력 필드 테두리, 평가 바 트랙 윤곽선.
- 문장 속 링크만 밑줄. 그 밖의 액션은 밑줄 없는 단색 버튼(primary/secondary/ghost).
- 아이콘은 lucide-react, `strokeWidth={1.5}`. 예외: GitHub 공식 로고(인라인 SVG).
- 모바일 퍼스트: 기본 스타일 = 375px 한 열. 확장은 `mq.md = 'screen and (min-width: 768px)'`, `mq.lg = 'screen and (min-width: 1024px)'`에서만.
- 모션: easing `[0.22, 1, 0.36, 1]`. opacity/transform만. 블러·스크롤 가로채기 금지. `prefers-reduced-motion`이면 이동·크기·흔들림 없음.
- focus-visible 3px accent 링. 터치 대상 44px 이상. 한글 `word-break: keep-all`.
- 최선 수는 기본 숨김. **[힌트]**(Lightbulb, `aria-pressed`)를 누를 때만 SAN과 화살표 표시, 수를 이동하면 다시 숨김.
- 판정은 색 + 기호 + 한국어 이름을 항상 함께 표시(색 단독 구분 금지).
- 테스트는 역할·텍스트·`data-*` 속성으로 요소를 찾는다. **Vanilla Extract 클래스 이름으로 찾지 않는다**(해시가 붙음).
- 기존 동작 규칙 유지: 429 60초 대기, 엔진 latest-wins, 리뷰 캐시, 키보드 ←/→/Home/End, 변형 체스 차단, GPL 빌드 가드.
- 테스트에서 외부 네트워크 호출 금지(MSW / `page.route`).
- 모든 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` 트레일러.
- 이 컴퓨터에서 5173·4173 포트는 다른 프로세스가 쓴다. 수동 확인은 `npx vite --port 5199 --strictPort`, E2E는 4199.

---

## File Structure (새로 생기거나 크게 바뀌는 파일)

```
src/
├─ chess/material.ts                 # 기물 점수, 희생 판정 (Part B)
├─ engine/judge.ts                   # 판정 9종, 메타, 집계 (Part B)
├─ engine/review.ts                  # v2: MultiPV 2, 판정 적용, REVIEW_VERSION
├─ styles/
│  ├─ tokens.css.ts                  # 토큰 계약 + 라이트/다크 값 + 스케일 상수
│  ├─ global.css.ts                  # 리셋, 서체, 줄바꿈, 포커스, 모션 감소, 테마 전환
│  ├─ index.css.ts                   # tokens → global → features/board
│  └─ features/
│     ├─ board.css.ts                # chessground 쿨톤 보드
│     ├─ layout.css.ts               # 헤더·푸터·셸
│     ├─ gameLayout.css.ts           # 뷰어·분기 대국 공통 그리드
│     ├─ home.css.ts / lists.css.ts / viewer.css.ts / play.css.ts / page.css.ts
├─ ui/                               # 기본 부품
│  ├─ cx.ts, motion.ts, a11y.css.ts
│  ├─ Icon.tsx, Button.tsx(+button.css.ts), ControlBar.tsx(+controlBar.css.ts)
│  ├─ Surface.tsx, Badge.tsx, Segmented.tsx, Field.tsx, Disclosure.tsx, Dialog.tsx
│  ├─ Reveal.tsx, InkText.tsx, Section.tsx (각 *.css.ts)
├─ app/theme.ts, app/ThemeToggle.tsx, app/GitHubMark.tsx
├─ features/home/{HeroTitle,AutoplayBoard,MoveTape,useAutoplay}.tsx
├─ features/viewer/{ViewerHeader,ViewerControls,JudgmentCard,ReviewSummary,useSwipe}.tsx
public/licenses/Pretendard-OFL.txt
e2e/mobile.spec.ts, e2e/visual.spec.ts
```

삭제: `src/styles.css`(Task 14), `src/features/viewer/GameHeader.tsx`(Task 9에서 ViewerHeader로 대체).

## Milestones

- **B. 판정 확장 (Task 1–3):** 순수 로직과 리뷰 v2. 화면은 아직 옛 스타일이지만 새 판정이 기보에 표시된다.
- **A1. 스타일 기반 (Task 4–7):** 토큰·테마·기본 부품·레이아웃. 옛 스타일과 새 스타일이 잠시 공존한다.
- **A2. 화면 이전 (Task 8–13):** 보드 → 뷰어 → 홈 → 목록 → 분기 대국.
- **A3. 마무리 (Task 14–15):** 옛 CSS 삭제, E2E·모바일 시나리오·시각 확인.

---

### Task 1: 기물 점수와 희생 판정

**Files:**
- Create: `src/chess/material.ts`
- Test: `src/chess/material.test.ts`

**Interfaces:**
- Consumes: `turnOf`, `uciToMove` (`src/chess/pgn.ts`), `Turn` (`src/chess/types.ts`)
- Produces:
  - `PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }`
  - `materialBalance(fen: string, side: Turn): number` — side 기물 점수 − 상대 기물 점수
  - `isSacrifice(fenBefore: string, playedUci: string, pvAfter: string[], threshold?: number): boolean` — 둔 수 + PV 최대 2플라이(상대 응수, 내 응수), 즉 **내 수 포함 3플라이** 뒤의 기물 균형이 두기 전보다 `threshold`(기본 2) 이상 낮으면 true. 불법 수를 만나면 그 지점까지만 계산.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { describe, expect, it } from 'vitest'
import { pgnToPlies } from './pgn'
import { getClassic } from '../sources/classics'
import { isSacrifice, materialBalance } from './material'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER_E4_D5 = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2'
const OPERA = pgnToPlies(getClassic('opera-game')!.pgn)

describe('materialBalance', () => {
  it('시작 포지션은 0', () => {
    expect(materialBalance(START, 'w')).toBe(0)
    expect(materialBalance(START, 'b')).toBe(0)
  })
  it('기준 편에서 본 차이', () => {
    const fen = '4k3/8/8/8/8/8/8/Q3K3 w - - 0 1'
    expect(materialBalance(fen, 'w')).toBe(9)
    expect(materialBalance(fen, 'b')).toBe(-9)
  })
})

describe('isSacrifice', () => {
  it('오페라 게임 16.Qb8+ 퀸 희생', () => {
    // plies[30] = 15...Nxd7 이후, 백 차례. 16.Qb8+ Nxb8 17.Rd8#
    expect(OPERA[31].san).toBe('Qb8+')
    expect(isSacrifice(OPERA[30].fen, 'b3b8', ['d7b8', 'd1d8'])).toBe(true)
  })
  it('같은 가치의 교환은 희생이 아니다', () => {
    expect(isSacrifice(AFTER_E4_D5, 'e4d5', ['d8d5'])).toBe(false)
  })
  it('PV가 없으면 둔 수만으로 판단한다', () => {
    expect(isSacrifice(START, 'e2e4', [])).toBe(false)
  })
  it('불법 수는 false, 불법 PV는 그 앞까지만', () => {
    expect(isSacrifice(START, 'e2e5', [])).toBe(false)
    expect(isSacrifice(START, 'e2e4', ['e2e4', 'd7d5'])).toBe(false)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/chess/material.test.ts`
Expected: FAIL — `Failed to resolve import "./material"`

- [ ] **Step 3: 구현** (`src/chess/material.ts`)

```ts
import { Chess } from 'chess.js'
import { turnOf, uciToMove } from './pgn'
import type { Turn } from './types'

export const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 } as const

export function materialBalance(fen: string, side: Turn): number {
  let sum = 0
  for (const row of new Chess(fen).board()) {
    for (const sq of row) {
      if (!sq) continue
      const v = PIECE_VALUE[sq.type]
      sum += sq.color === side ? v : -v
    }
  }
  return sum
}

/** 내 수 + 상대 응수 + 내 응수(최대 3플라이) 뒤 기물 균형이 threshold 이상 줄면 희생 */
export function isSacrifice(fenBefore: string, playedUci: string, pvAfter: string[], threshold = 2): boolean {
  const mover = turnOf(fenBefore)
  const start = materialBalance(fenBefore, mover)
  const chess = new Chess(fenBefore)
  try {
    chess.move(uciToMove(playedUci))
  } catch {
    return false
  }
  for (const uci of pvAfter.slice(0, 2)) {
    try {
      chess.move(uciToMove(uci))
    } catch {
      break
    }
  }
  return start - materialBalance(chess.fen(), mover) >= threshold
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/chess/material.test.ts` → PASS

- [ ] **Step 5: 커밋**

```bash
git add src/chess/material.ts src/chess/material.test.ts
git commit -m "feat(chess): 기물 점수와 희생 판정" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 판정 9종

**Files:**
- Create: `src/engine/judge.ts`
- Test: `src/engine/judge.test.ts`
- Modify: `src/engine/classify.ts` (`classifyMove`, `LABEL_THRESHOLDS`, `MoveLabel` 제거), `src/engine/classify.test.ts` (`classifyMove` describe 삭제), `src/engine/review.ts`, `src/components/MoveList.tsx` (import 경로만), 그 밖에 `MoveLabel`을 `./classify`/`../engine/classify`에서 가져오던 모든 파일

**Interfaces:**
- Consumes: `Score`, `winPercent` (`classify.ts`), `Color`, `Turn`
- Produces:
  - `type MoveLabel = 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'miss' | 'inaccuracy' | 'mistake' | 'blunder'`
  - `MOVE_LABELS: readonly MoveLabel[]` (위 순서)
  - `JUDGMENT_META: Record<MoveLabel, { name: string; glyph: string }>` — 탁월 `!!`, 좋은 수 `!`, 최선 `★`, 우수 `''`, 좋음 `''`, 놓침 `✕`, 부정확 `?!`, 실수 `?`, 블런더 `??`
  - `interface JudgeInput { before: Score; after: Score; mover: Turn; playedUci: string; bestUci: string | null; secondBefore: Score | null; legalMoves: number; sacrifice: boolean; previousLabel: MoveLabel | null }` (점수는 모두 백 기준)
  - `judgeMove(input: JudgeInput): MoveLabel | null`
  - `countJudgments(labels: (MoveLabel | null)[], startTurn: Turn): Record<Color, Record<MoveLabel, number>>` (`labels[i]`는 i번째 수, `labels[0]`은 시작 포지션이라 무시)

- [ ] **Step 1: 실패하는 테스트 작성** (`src/engine/judge.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import { countJudgments, JUDGMENT_META, judgeMove, MOVE_LABELS, type JudgeInput } from './judge'

const base: JudgeInput = {
  before: { cp: 0 },
  after: { cp: 0 },
  mover: 'w',
  playedUci: 'e2e4',
  bestUci: 'e2e4',
  secondBefore: { cp: 0 },
  legalMoves: 20,
  sacrifice: false,
  previousLabel: null,
}
const j = (over: Partial<JudgeInput>) => judgeMove({ ...base, ...over })

describe('judgeMove', () => {
  it('둘 수 있는 수가 하나뿐이면 판정 없음', () => {
    expect(j({ legalMoves: 1 })).toBeNull()
  })

  it('탁월: 희생 + 최선 + 두기 전 90% 미만 + 둔 뒤 50% 이상', () => {
    expect(j({ sacrifice: true })).toBe('brilliant')
  })
  it('탁월: 최선이 아니어도 2%p 이내면 인정', () => {
    // w(50)=54.6, w(40)=53.7 → 손실 0.9
    expect(j({ sacrifice: true, playedUci: 'd2d4', before: { cp: 50 }, after: { cp: 40 } })).toBe('brilliant')
  })
  it('탁월 아님: 둔 뒤 50% 미만이면 최선으로', () => {
    expect(j({ sacrifice: true, after: { cp: -100 } })).toBe('best')
  })
  it('탁월 아님: 이미 90% 이상 이기고 있으면 최선으로', () => {
    expect(j({ sacrifice: true, before: { cp: 800 }, after: { cp: 800 } })).toBe('best')
  })

  it('좋은 수: 최선이고 2순위보다 10%p 이상 높은 유일한 수', () => {
    expect(j({ secondBefore: { cp: -300 } })).toBe('great')
    expect(j({ secondBefore: { cp: -20 } })).toBe('best')
  })
  it('좋은 수: 흑 기준으로도 계산한다', () => {
    expect(j({ mover: 'b', playedUci: 'e7e5', bestUci: 'e7e5', secondBefore: { cp: 300 } })).toBe('great')
  })
  it('2순위 정보가 없으면 최선', () => {
    expect(j({ secondBefore: null })).toBe('best')
  })

  it('손실 구간', () => {
    const other = { playedUci: 'a2a3' }
    expect(j({ ...other, after: { cp: -10 } })).toBe('excellent') // 0.9
    expect(j({ ...other, after: { cp: -30 } })).toBe('good') // 2.8
    expect(j({ ...other, after: { cp: -100 } })).toBe('inaccuracy') // 9.1
    expect(j({ ...other, after: { cp: -130 } })).toBe('mistake') // 11.7
    expect(j({ ...other, after: { cp: -200 } })).toBe('blunder') // 17.6
  })
  it('흑은 반대 방향', () => {
    expect(j({ mover: 'b', playedUci: 'a7a6', bestUci: 'e7e5', after: { cp: 200 } })).toBe('blunder')
    expect(j({ mover: 'b', playedUci: 'a7a6', bestUci: 'e7e5', after: { cp: -200 } })).toBe('excellent')
  })

  it('놓침: 직전 상대 수가 실수·블런더인데 손실 10%p 이상', () => {
    expect(j({ playedUci: 'a2a3', after: { cp: -130 }, previousLabel: 'blunder' })).toBe('miss')
    expect(j({ playedUci: 'a2a3', after: { cp: -200 }, previousLabel: 'mistake' })).toBe('miss')
    expect(j({ playedUci: 'a2a3', after: { cp: -100 }, previousLabel: 'blunder' })).toBe('inaccuracy')
    expect(j({ playedUci: 'a2a3', after: { cp: -130 }, previousLabel: 'inaccuracy' })).toBe('mistake')
  })
})

describe('JUDGMENT_META', () => {
  it('모든 판정에 한국어 이름과 기호가 있다', () => {
    expect(MOVE_LABELS).toHaveLength(9)
    for (const l of MOVE_LABELS) expect(JUDGMENT_META[l].name.length).toBeGreaterThan(0)
    expect(JUDGMENT_META.brilliant).toEqual({ name: '탁월', glyph: '!!' })
    expect(JUDGMENT_META.best.glyph).toBe('★')
    expect(JUDGMENT_META.excellent.glyph).toBe('')
    expect(JUDGMENT_META.blunder).toEqual({ name: '블런더', glyph: '??' })
  })
})

describe('countJudgments', () => {
  it('수를 둔 쪽별로 센다', () => {
    const counts = countJudgments([null, 'best', 'blunder', 'brilliant', null], 'w')
    expect(counts.white.best).toBe(1)
    expect(counts.white.brilliant).toBe(1)
    expect(counts.black.blunder).toBe(1)
    expect(counts.black.best).toBe(0)
  })
  it('흑부터 시작하는 포지션', () => {
    expect(countJudgments([null, 'miss'], 'b').black.miss).toBe(1)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/engine/judge.test.ts` → FAIL (import 오류)

- [ ] **Step 3: 구현** (`src/engine/judge.ts`)

```ts
import type { Color, Turn } from '../chess/types'
import { winPercent, type Score } from './classify'

export type MoveLabel =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'miss'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'

export const MOVE_LABELS: readonly MoveLabel[] = [
  'brilliant',
  'great',
  'best',
  'excellent',
  'good',
  'miss',
  'inaccuracy',
  'mistake',
  'blunder',
]

export const JUDGMENT_META: Record<MoveLabel, { name: string; glyph: string }> = {
  brilliant: { name: '탁월', glyph: '!!' },
  great: { name: '좋은 수', glyph: '!' },
  best: { name: '최선', glyph: '★' },
  excellent: { name: '우수', glyph: '' },
  good: { name: '좋음', glyph: '' },
  miss: { name: '놓침', glyph: '✕' },
  inaccuracy: { name: '부정확', glyph: '?!' },
  mistake: { name: '실수', glyph: '?' },
  blunder: { name: '블런더', glyph: '??' },
}

/** 두는 쪽 승률(%p) 기준 */
export const JUDGE_THRESHOLDS = {
  excellent: 2,
  good: 5,
  inaccuracy: 10,
  mistake: 15,
  miss: 10,
  greatGap: 10,
  brilliantNearBest: 2,
  brilliantMaxBefore: 90,
  brilliantMinAfter: 50,
} as const

export interface JudgeInput {
  before: Score
  after: Score
  mover: Turn
  playedUci: string
  bestUci: string | null
  /** 두기 전 포지션의 2순위 수 점수(백 기준). 없으면 null */
  secondBefore: Score | null
  legalMoves: number
  sacrifice: boolean
  previousLabel: MoveLabel | null
}

export function judgeMove(i: JudgeInput): MoveLabel | null {
  if (i.legalMoves <= 1) return null
  const T = JUDGE_THRESHOLDS
  const pov = (s: Score) => (i.mover === 'w' ? winPercent(s) : 100 - winPercent(s))
  const winBefore = pov(i.before)
  const winAfter = pov(i.after)
  const loss = Math.max(0, winBefore - winAfter)
  const isBest = i.bestUci !== null && i.playedUci === i.bestUci

  if ((isBest || loss <= T.brilliantNearBest) && i.sacrifice && winBefore < T.brilliantMaxBefore && winAfter >= T.brilliantMinAfter)
    return 'brilliant'
  if (isBest && i.secondBefore && winBefore - pov(i.secondBefore) >= T.greatGap) return 'great'
  if (isBest) return 'best'
  if (loss < T.excellent) return 'excellent'
  if (loss < T.good) return 'good'
  if ((i.previousLabel === 'mistake' || i.previousLabel === 'blunder') && loss >= T.miss) return 'miss'
  if (loss < T.inaccuracy) return 'inaccuracy'
  if (loss < T.mistake) return 'mistake'
  return 'blunder'
}

export function countJudgments(labels: (MoveLabel | null)[], startTurn: Turn): Record<Color, Record<MoveLabel, number>> {
  const empty = () => Object.fromEntries(MOVE_LABELS.map((l) => [l, 0])) as Record<MoveLabel, number>
  const counts: Record<Color, Record<MoveLabel, number>> = { white: empty(), black: empty() }
  labels.forEach((label, i) => {
    if (i === 0 || !label) return
    const mover: Color = ((i - 1) % 2 === 0) === (startTurn === 'w') ? 'white' : 'black'
    counts[mover][label]++
  })
  return counts
}
```

- [ ] **Step 4: classify.ts 정리와 호출부 이전**

1. `src/engine/classify.ts`에서 `export type MoveLabel …`, `LABEL_THRESHOLDS`, `classifyMove`를 삭제한다(나머지 함수는 그대로).
2. `src/engine/classify.test.ts`의 import에서 `classifyMove`를 빼고 `describe('classifyMove', …)` 블록 전체를 삭제한다(동일 사례는 judge.test.ts가 대체).
3. 호출부 찾기: `grep -rn "MoveLabel\|classifyMove\|countLabels" src` — 각 파일에서 `MoveLabel`을 `engine/judge`에서 import하도록 바꾼다.
4. `src/engine/review.ts`는 Task 3에서 전면 수정하므로, 이 태스크에서는 컴파일만 되게 한다: `classifyMove` 호출을 임시로 `judgeMove({ before, after, mover, playedUci, bestUci, secondBefore: null, legalMoves: 2, sacrifice: false, previousLabel: null })`로 바꾸고, `countLabels`는 그대로 두되 `type Counted`에 쓰인 `MoveLabel` import 경로만 바꾼다.
5. `src/components/MoveList.tsx`의 `LABEL_GLYPH`를 `JUDGMENT_META`에서 파생하도록 바꾼다:

```ts
import { JUDGMENT_META, type MoveLabel } from '../engine/judge'
export const LABEL_GLYPH: Record<MoveLabel, string> = Object.fromEntries(
  Object.entries(JUDGMENT_META).map(([k, v]) => [k, v.glyph]),
) as Record<MoveLabel, string>
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/engine && npm test && npx tsc --noEmit`
Expected: PASS. `MoveList.test.tsx`의 `label-good` 사례는 `good` 판정이 그대로 존재하므로 통과한다.

- [ ] **Step 6: 커밋**

```bash
git add -A src
git commit -m "feat(engine): 판정 9종 (탁월·좋은 수·놓침 등)과 집계" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 리뷰 v2 — MultiPV 2, 판정 적용, 캐시 버전

**Files:**
- Modify: `src/engine/review.ts`, `src/engine/review.test.ts`, `src/features/viewer/useReview.ts`, `src/features/viewer/useReview.test.tsx`, `src/features/viewer/ReviewPanel.tsx`

**Interfaces:**
- Consumes: `judgeMove`, `countJudgments`, `MoveLabel` (Task 2), `isSacrifice` (Task 1)
- Produces:
  - `REVIEW_VERSION = 2`
  - `interface ReviewedPosition { score: Score; best: string | null; pv: string[]; second: Score | null; legalMoves: number }`
  - `interface GameReview { version: 2; depth: number; positions: ReviewedPosition[]; labels: (MoveLabel | null)[]; accuracy: { white: number | null; black: number | null } }`
  - `reviewGame(engine, plies, opts)` — 포지션마다 `analyze(fen, { depth, multiPv: 2, signal })`
  - `buildReview(plies, positions, depth): GameReview` — 판정은 앞 수부터 차례로 계산(놓침이 직전 판정을 참조)
  - `countLabels`는 삭제. 호출부는 `countJudgments(review.labels, startTurn)` 사용
  - `useReview` — 캐시가 `version !== REVIEW_VERSION`이면 무시

- [ ] **Step 1: review.test.ts 갱신 (실패 상태로)**

`src/engine/review.test.ts` 전체를 다음으로 교체한다:

```ts
import { describe, expect, it, vi } from 'vitest'
import { pgnToPlies } from '../chess/pgn'
import { getClassic } from '../sources/classics'
import { MATED_CP, type Score } from './classify'
import { countJudgments } from './judge'
import { buildReview, REVIEW_VERSION, reviewGame, terminalScore, type ReviewedPosition } from './review'
import type { SearchResult } from './UciEngine'

const SCHOLAR = pgnToPlies('1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0')
const SCORES: Score[] = [{ cp: 30 }, { cp: 30 }, { cp: 30 }, { cp: 20 }, { cp: 40 }, { cp: 40 }, { mate: 1 }]
const BEST = ['e2e4', 'e7e5', 'g1f3', 'g7g6', 'd2d3', 'g7g6', 'h5f7']

function fakeEngine(onCall?: (n: number) => void) {
  let n = 0
  return {
    analyze: vi.fn(async (): Promise<SearchResult> => {
      const i = n++
      onCall?.(n)
      return {
        cancelled: false,
        bestMove: BEST[i],
        lines: [
          { depth: 14, multipv: 1, score: SCORES[i], pv: [BEST[i]] },
          { depth: 14, multipv: 2, score: SCORES[i], pv: ['a2a3'] },
        ],
      }
    }),
  }
}

describe('terminalScore', () => {
  it('메이트·스테일메이트·진행 중', () => {
    expect(terminalScore(SCHOLAR[7].fen)).toEqual({ cp: MATED_CP })
    expect(terminalScore('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')).toEqual({ cp: 0 })
    expect(terminalScore(SCHOLAR[0].fen)).toBeNull()
  })
})

describe('reviewGame v2', () => {
  it('MultiPV 2로 분석하고 판정·정확도·버전을 채운다', async () => {
    const engine = fakeEngine()
    const onProgress = vi.fn()
    const review = await reviewGame(engine, SCHOLAR, { onProgress })
    expect(review.version).toBe(REVIEW_VERSION)
    expect(engine.analyze).toHaveBeenCalledTimes(7)
    expect(engine.analyze).toHaveBeenCalledWith(SCHOLAR[0].fen, expect.objectContaining({ depth: 14, multiPv: 2 }))
    expect(onProgress).toHaveBeenLastCalledWith(8, 8, expect.any(Array))
    expect(review.positions[0]).toEqual({ score: { cp: 30 }, best: 'e2e4', pv: ['e2e4'], second: { cp: 30 }, legalMoves: 20 })
    expect(review.positions[7]).toEqual({ score: { cp: MATED_CP }, best: null, pv: [], second: null, legalMoves: 0 })
    expect(review.labels[0]).toBeNull()
    expect(review.labels[1]).toBe('best') // e4
    expect(review.labels[6]).toBe('blunder') // 3...Nf6??
    expect(review.labels[7]).toBe('best') // Qxf7#
    expect(countJudgments(review.labels, 'w').black.blunder).toBe(1)
  })

  it('중간에 abort하면 AbortError', async () => {
    const ac = new AbortController()
    const engine = fakeEngine((n) => n === 3 && ac.abort())
    await expect(reviewGame(engine, SCHOLAR, { signal: ac.signal })).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('엔진이 cancelled를 돌려주면 AbortError', async () => {
    const engine = { analyze: vi.fn(async (): Promise<SearchResult> => ({ cancelled: true, bestMove: null, lines: [] })) }
    await expect(reviewGame(engine, SCHOLAR)).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('buildReview 판정 연결', () => {
  it('오페라 게임 16.Qb8+는 탁월', () => {
    const plies = pgnToPlies(getClassic('opera-game')!.pgn)
    // 모든 수를 최선으로, 점수는 모두 +1.00. 16.Qb8+ 이후 포지션의 PV만 실제 수순(Nxb8 Rd8#)
    const positions: ReviewedPosition[] = plies.map((_, i) => ({
      score: { cp: 100 },
      best: plies[i + 1]?.uci ?? null,
      pv: i === 31 ? ['d7b8', 'd1d8'] : [],
      second: null,
      legalMoves: 20,
    }))
    const review = buildReview(plies, positions, 14)
    expect(plies[31].san).toBe('Qb8+')
    expect(review.labels[31]).toBe('brilliant')
    expect(review.labels[30]).toBe('best')
  })

  it('놓침은 직전 판정을 참조한다', () => {
    const plies = pgnToPlies('1. e4 e5 2. Nf3 *')
    const positions: ReviewedPosition[] = [
      { score: { cp: 0 }, best: 'e2e4', pv: [], second: null, legalMoves: 20 },
      { score: { cp: 0 }, best: 'd7d5', pv: [], second: null, legalMoves: 20 }, // e5 대신 d5가 최선
      { score: { cp: 300 }, best: 'd2d4', pv: [], second: null, legalMoves: 29 }, // e5는 블런더(흑 기준 −25%p)
      { score: { cp: 100 }, best: null, pv: [], second: null, legalMoves: 20 }, // Nf3로 +3.00 → +1.00, 백 손실 ≥ 10%p
    ]
    const review = buildReview(plies, positions, 14)
    expect(review.labels[2]).toBe('blunder')
    expect(review.labels[3]).toBe('miss')
  })
})
```

Run: `npx vitest run src/engine/review.test.ts` → FAIL (`REVIEW_VERSION` 등 없음)

- [ ] **Step 2: review.ts 구현**

`src/engine/review.ts` 전체를 다음으로 교체한다:

```ts
import { Chess } from 'chess.js'
import { isSacrifice } from '../chess/material'
import { turnOf } from '../chess/pgn'
import type { Ply } from '../chess/types'
import { gameAccuracy, MATED_CP, type Score } from './classify'
import { judgeMove, type MoveLabel } from './judge'
import type { UciEngine } from './UciEngine'

export const REVIEW_DEPTH = 14
export const REVIEW_VERSION = 2

export interface ReviewedPosition {
  score: Score
  best: string | null
  /** 1순위 수순 (best 포함) */
  pv: string[]
  /** 2순위 수 점수(백 기준). 없으면 null */
  second: Score | null
  legalMoves: number
}
export interface GameReview {
  version: typeof REVIEW_VERSION
  depth: number
  positions: ReviewedPosition[]
  labels: (MoveLabel | null)[]
  accuracy: { white: number | null; black: number | null }
}
export interface ReviewOptions {
  depth?: number
  signal?: AbortSignal
  onProgress?: (done: number, total: number, positions: ReviewedPosition[]) => void
}

export function terminalScore(fen: string): Score | null {
  const chess = new Chess(fen)
  if (chess.isCheckmate()) return { cp: chess.turn() === 'w' ? -MATED_CP : MATED_CP }
  if (chess.isStalemate() || chess.isInsufficientMaterial()) return { cp: 0 }
  return null
}

export function buildReview(plies: Ply[], positions: ReviewedPosition[], depth: number): GameReview {
  const labels: (MoveLabel | null)[] = [null]
  for (let i = 1; i < plies.length; i++) {
    const ply = plies[i]
    const before = positions[i - 1]
    if (!ply.uci) {
      labels.push(null)
      continue
    }
    labels.push(
      judgeMove({
        before: before.score,
        after: positions[i].score,
        mover: turnOf(plies[i - 1].fen),
        playedUci: ply.uci,
        bestUci: before.best,
        secondBefore: before.second,
        legalMoves: before.legalMoves,
        sacrifice: isSacrifice(plies[i - 1].fen, ply.uci, positions[i].pv),
        previousLabel: labels[i - 1],
      }),
    )
  }
  return {
    version: REVIEW_VERSION,
    depth,
    positions,
    labels,
    accuracy: gameAccuracy(positions.map((p) => p.score), turnOf(plies[0].fen)),
  }
}

export async function reviewGame(
  engine: Pick<UciEngine, 'analyze'>,
  plies: Ply[],
  opts: ReviewOptions = {},
): Promise<GameReview> {
  const depth = opts.depth ?? REVIEW_DEPTH
  const positions: ReviewedPosition[] = []
  for (const ply of plies) {
    if (opts.signal?.aborted) throw abortError()
    const terminal = terminalScore(ply.fen)
    if (terminal) {
      positions.push({ score: terminal, best: null, pv: [], second: null, legalMoves: 0 })
    } else {
      const r = await engine.analyze(ply.fen, { depth, multiPv: 2, signal: opts.signal })
      if (r.cancelled) throw abortError()
      const [first, second] = r.lines
      positions.push({
        score: first?.score ?? { cp: 0 },
        best: r.bestMove,
        pv: first?.pv ?? [],
        second: second?.score ?? null,
        legalMoves: new Chess(ply.fen).moves().length,
      })
    }
    opts.onProgress?.(positions.length, plies.length, positions)
  }
  return buildReview(plies, positions, depth)
}

function abortError(): DOMException {
  return new DOMException('리뷰가 중단됐습니다', 'AbortError')
}
```

Run: `npx vitest run src/engine/review.test.ts` → PASS

- [ ] **Step 3: useReview 캐시 버전 확인**

`src/features/viewer/useReview.ts`:
- import에 `REVIEW_VERSION` 추가: `import { REVIEW_DEPTH, REVIEW_VERSION, reviewGame, type GameReview, type ReviewedPosition } from '../../engine/review'`
- 캐시 조건을 바꾼다:

```ts
      if (alive && cached && cached.review.version === REVIEW_VERSION && cached.review.positions.length === pliesLength)
        setState({ status: 'done', review: cached.review })
```

`src/features/viewer/useReview.test.tsx`:
- 파일 안의 모든 캐시 fixture 객체(`const review = { depth: 14, positions: …, labels: …, accuracy: … }` 형태)에 `version: 2 as const`를 추가하고, `positions` 항목을 `{ score: { cp: 0 }, best: null, pv: [], second: null, legalMoves: 20 }`로 바꾼다.
- 다음 테스트를 `describe('useReview')` 안에 추가한다:

```tsx
  it('버전이 다른 캐시는 무시한다', async () => {
    const store = createMemoryStore()
    const old = { depth: 14, positions: PLIES.map(() => ({ score: { cp: 0 }, best: null })), labels: [], accuracy: { white: 1, black: 1 } }
    await store.reviews.put({ key: 'classic/opera-game', depth: 14, review: old as never, createdAt: 1 })
    const { hook } = setup(store)
    await new Promise((r) => setTimeout(r, 20))
    expect(hook.result.current.state.status).toBe('idle')
  })
```

- [ ] **Step 4: ReviewPanel 집계 교체**

`src/features/viewer/ReviewPanel.tsx`:
- `import { countLabels } from '../../engine/review'` → `import { countJudgments } from '../../engine/judge'`
- `const counts = countLabels(state.review, startTurn)` → `const counts = countJudgments(state.review.labels, startTurn)`
- 표시 문구는 그대로 둔다(Task 10에서 새 요약으로 교체).

- [ ] **Step 5: 전체 확인**

Run: `npm test && npx tsc --noEmit`
Expected: 전체 PASS. `grep -rn "countLabels\|classifyMove" src`가 아무것도 찾지 않음.

- [ ] **Step 6: 브라우저 확인**

`npx vite --port 5199 --strictPort` → `/game/classic/opera-game` → [리뷰 실행] → 기보에서 16.Qb8+에 `!!`가 붙는지 확인하고 서버를 끈다. (실제 엔진이 Qb8+를 최선으로 보면 탁월, 아니면 최선/우수로 나와도 된다. 결과를 보고서에 적는다.)

- [ ] **Step 7: 커밋**

```bash
git add -A src
git commit -m "feat(engine): 리뷰 v2 — MultiPV 2, 판정 9종 적용, 캐시 버전" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 스타일 기반 — 의존성, 토큰, 전역 스타일, 서체, 테마

**Files:**
- Modify: `package.json`(의존성), `vite.config.ts`, `index.html`, `src/main.tsx`, `src/app/AppProviders.tsx`, `src/test/setup.ts`
- Create: `src/styles/tokens.css.ts`, `src/styles/global.css.ts`, `src/styles/index.css.ts`, `src/ui/cx.ts`, `src/ui/motion.ts`, `src/ui/a11y.css.ts`, `src/app/theme.ts`, `public/licenses/Pretendard-OFL.txt`
- Test: `src/app/theme.test.tsx`

**Interfaces:**
- Produces:
  - `vars` (토큰 계약). `vars.color.{canvas,surface,surfaceSubtle,ink,muted,line,accent,accentHover,onAccent,boardLight,boardDark,highlight,live,liveSurface,evalWhite,evalBlack}`, `vars.color.judgment.{brilliant,…,blunder}`
  - 상수: `mq`, `space`, `radius`, `fontSize`, `weight`, `layout`, `fontStack`
  - `cx(...classes)`, `EASE`, `SPRING`, `visuallyHidden`
  - `type ThemeName = 'light' | 'dark'`, `THEME_KEY = 'chessling-theme'`, `readStoredTheme()`, `systemTheme()`, `applyTheme(theme, { animate? })`, `useTheme(): { theme; toggle }`
  - `AppProviders`가 `MotionConfig reducedMotion="user"`로 감싼다
  - 테스트 환경 폴리필: `matchMedia`, `IntersectionObserver`, `HTMLDialogElement.showModal/close`

- [ ] **Step 1: 의존성 설치**

```bash
npm i motion lucide-react pretendard
npm i -D @vanilla-extract/css @vanilla-extract/recipes @vanilla-extract/dynamic @vanilla-extract/vite-plugin
cp node_modules/pretendard/dist/LICENSE.txt public/licenses/Pretendard-OFL.txt
```
(`public/licenses/`는 git에 포함한다. `public/engine`만 gitignore 대상이다.)

- [ ] **Step 2: Vite 플러그인 연결** (`vite.config.ts`)

import에 `import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'`를 추가하고 `plugins: [react()]`를 `plugins: [react(), vanillaExtractPlugin()]`로 바꾼다. 나머지는 그대로 둔다.

- [ ] **Step 3: 토큰** (`src/styles/tokens.css.ts`)

```ts
import { createGlobalTheme, createGlobalThemeContract } from '@vanilla-extract/css'

const judgmentShape = {
  brilliant: '',
  great: '',
  best: '',
  excellent: '',
  good: '',
  miss: '',
  inaccuracy: '',
  mistake: '',
  blunder: '',
}
const colorShape = {
  canvas: '',
  surface: '',
  surfaceSubtle: '',
  ink: '',
  muted: '',
  line: '',
  accent: '',
  accentHover: '',
  onAccent: '',
  boardLight: '',
  boardDark: '',
  highlight: '',
  live: '',
  liveSurface: '',
  evalWhite: '',
  evalBlack: '',
  judgment: judgmentShape,
}
type Colors = typeof colorShape

export const vars = createGlobalThemeContract({ color: colorShape }, (_value, path) => `cl-${path.join('-')}`)

const light: Colors = {
  canvas: '#ffffff',
  surface: '#ffffff',
  surfaceSubtle: '#f3f5f8',
  ink: '#171d26',
  muted: '#596372',
  line: '#dce1e7',
  accent: '#254acb',
  accentHover: '#19399f',
  onAccent: '#ffffff',
  boardLight: '#eef1f6',
  boardDark: '#8fa0c4',
  highlight: 'rgba(37, 74, 203, 0.28)',
  live: '#c9302c',
  liveSurface: '#fde8e7',
  evalWhite: '#f6f7f9',
  evalBlack: '#2a2f38',
  judgment: {
    brilliant: '#0f8f84',
    great: '#2563d8',
    best: '#23874a',
    excellent: '#596372',
    good: '#596372',
    miss: '#b52d80',
    inaccuracy: '#a86f00',
    mistake: '#c9561c',
    blunder: '#c73232',
  },
}
const dark: Colors = {
  canvas: '#0f1216',
  surface: '#161a20',
  surfaceSubtle: '#1d222a',
  ink: '#e8ecf2',
  muted: '#9aa4b2',
  line: '#2a313b',
  accent: '#6f8cff',
  accentHover: '#8aa2ff',
  onAccent: '#0f1216',
  boardLight: '#3a4254',
  boardDark: '#262c38',
  highlight: 'rgba(111, 140, 255, 0.34)',
  live: '#ff7b72',
  liveSurface: '#3a1d1d',
  evalWhite: '#e8ecf2',
  evalBlack: '#0b0d10',
  judgment: {
    brilliant: '#3cc9b9',
    great: '#7aa2ff',
    best: '#5cc97c',
    excellent: '#9aa4b2',
    good: '#9aa4b2',
    miss: '#e46bb5',
    inaccuracy: '#e8b53c',
    mistake: '#f08c55',
    blunder: '#f06a6a',
  },
}

createGlobalTheme(':root', vars, { color: light })
createGlobalTheme(':root[data-theme="dark"]', vars, { color: dark })

export const mq = { md: 'screen and (min-width: 768px)', lg: 'screen and (min-width: 1024px)' } as const
export const space = { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '24px', 6: '32px', 7: '48px', 8: '64px', 9: '96px', 10: '144px' } as const
export const radius = { action: '12px', actionMd: '14px', surface: '16px', pill: '999px' } as const
export const fontSize = {
  display: '48px',
  displayMd: '64px',
  displayLg: '76px',
  section: '30px',
  sectionMd: '36px',
  title: '20px',
  lead: '18px',
  body: '17px',
  control: '15px',
  meta: '13px',
} as const
export const weight = { regular: '400', medium: '500' } as const
export const layout = { maxWidth: '1160px', headerMax: '1208px', gutter: '20px', gutterMd: '24px' } as const
export const fontStack =
  '"Pretendard Variable", Pretendard, "Pretendard CDN", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif'
```

- [ ] **Step 4: 전역 스타일** (`src/styles/global.css.ts`)

```ts
import { globalFontFace, globalStyle, type GlobalStyleRule } from '@vanilla-extract/css'
import { fontSize, fontStack, vars, weight } from './tokens.css'

// 자체 호스팅(pretendard dynamic subset)이 실패할 때만 쓰이는 네트워크 fallback
globalFontFace('Pretendard CDN', {
  src: 'url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/woff2/PretendardVariable.woff2") format("woff2-variations")',
  fontWeight: '45 920',
  fontStyle: 'normal',
  fontDisplay: 'swap',
})

globalStyle('*, *::before, *::after', { boxSizing: 'border-box' })
globalStyle('html', { WebkitTextSizeAdjust: '100%', background: vars.color.canvas })
globalStyle('body', {
  margin: 0,
  minHeight: '100svh',
  background: vars.color.canvas,
  color: vars.color.ink,
  fontFamily: fontStack,
  fontSize: fontSize.body,
  fontWeight: weight.regular,
  lineHeight: 1.6,
  wordBreak: 'keep-all',
  overflowWrap: 'break-word',
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
})
globalStyle('h1, h2, h3, h4', { margin: 0, fontWeight: weight.medium, lineHeight: 1.25, textWrap: 'balance' } as GlobalStyleRule)
globalStyle('p', { margin: 0, textWrap: 'pretty' } as GlobalStyleRule)
globalStyle('ul, ol', { margin: 0, padding: 0 })
globalStyle('strong, b', { fontWeight: weight.medium })
globalStyle('a', { color: vars.color.accent, textUnderlineOffset: '3px' })
globalStyle('button, input, select, textarea', { font: 'inherit', color: 'inherit' })
globalStyle(':focus-visible', { outline: `3px solid ${vars.color.accent}`, outlineOffset: '2px' })
globalStyle('::selection', { background: vars.color.highlight })

// 테마 토글 중에만 배경·면·선 색을 보간한다 (글자 색은 즉시 교체)
globalStyle(':root[data-theme-transition] *, :root[data-theme-transition] *::before, :root[data-theme-transition] *::after', {
  transition: 'background-color 300ms linear, border-color 300ms linear, fill 300ms linear, stroke 300ms linear !important',
})

globalStyle('*, *::before, *::after', {
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animationDuration: '0.01ms !important',
      animationIterationCount: '1 !important',
      transitionDuration: '0.01ms !important',
      scrollBehavior: 'auto !important',
    },
  },
})
```

`src/styles/index.css.ts`:
```ts
import './tokens.css'
import './global.css'
```
(Task 8에서 `import './features/board.css'`를 추가한다.)

- [ ] **Step 5: 작은 공용 모듈**

`src/ui/cx.ts`:
```ts
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
```

`src/ui/motion.ts`:
```ts
export const EASE = [0.22, 1, 0.36, 1] as const
export const SPRING = { type: 'spring', stiffness: 650, damping: 32 } as const
```

`src/ui/a11y.css.ts`:
```ts
import { style } from '@vanilla-extract/css'

export const visuallyHidden = style({
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
})
```

- [ ] **Step 6: 테마 테스트 작성** (`src/app/theme.test.tsx`)

```tsx
// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyTheme, readStoredTheme, THEME_KEY, useTheme } from './theme'

function mockSystem(dark: boolean) {
  const listeners: ((e: { matches: boolean }) => void)[] = []
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: dark,
      addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.push(fn),
      removeEventListener: () => {},
    })),
  )
  return (next: boolean) => listeners.forEach((fn) => fn({ matches: next }))
}

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})
afterEach(() => vi.unstubAllGlobals())

describe('theme', () => {
  it('저장값이 올바르지 않으면 null', () => {
    localStorage.setItem(THEME_KEY, 'purple')
    expect(readStoredTheme()).toBeNull()
    localStorage.setItem(THEME_KEY, 'dark')
    expect(readStoredTheme()).toBe('dark')
  })

  it('applyTheme은 data-theme과 color-scheme을 설정한다', () => {
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('toggle은 테마를 바꾸고 저장한다', () => {
    mockSystem(false)
    applyTheme('light')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
    act(() => result.current.toggle())
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
  })

  it('명시 선택이 없으면 시스템 변경을 따른다', () => {
    const emit = mockSystem(false)
    applyTheme('light')
    const { result } = renderHook(() => useTheme())
    act(() => emit(true))
    expect(result.current.theme).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBeNull()
  })

  it('명시 선택이 있으면 시스템 변경을 무시한다', () => {
    const emit = mockSystem(false)
    localStorage.setItem(THEME_KEY, 'light')
    applyTheme('light')
    const { result } = renderHook(() => useTheme())
    act(() => emit(true))
    expect(result.current.theme).toBe('light')
  })
})
```

Run: `npx vitest run src/app/theme.test.tsx` → FAIL (import 오류)

- [ ] **Step 7: 테마 구현** (`src/app/theme.ts`)

```ts
import { useCallback, useEffect, useState } from 'react'

export type ThemeName = 'light' | 'dark'
export const THEME_KEY = 'chessling-theme'
const TRANSITION_MS = 300

export function readStoredTheme(): ThemeName | null {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

export function systemTheme(): ThemeName {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function applyTheme(theme: ThemeName, { animate = false }: { animate?: boolean } = {}): void {
  const root = document.documentElement
  if (animate && !prefersReducedMotion()) {
    root.setAttribute('data-theme-transition', '')
    window.setTimeout(() => root.removeAttribute('data-theme-transition'), TRANSITION_MS)
  }
  root.dataset.theme = theme
  root.style.colorScheme = theme
}

function currentTheme(): ThemeName {
  const t = document.documentElement.dataset.theme
  return t === 'dark' || t === 'light' ? t : systemTheme()
}

export function useTheme(): { theme: ThemeName; toggle: () => void } {
  const [theme, setTheme] = useState<ThemeName>(currentTheme)

  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mql = matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: { matches: boolean }) => {
      if (readStoredTheme()) return
      const next: ThemeName = e.matches ? 'dark' : 'light'
      applyTheme(next, { animate: true })
      setTheme(next)
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeName = prev === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(THEME_KEY, next)
      } catch {
        // 저장할 수 없어도 이번 세션에는 적용한다
      }
      applyTheme(next, { animate: true })
      return next
    })
  }, [])

  return { theme, toggle }
}
```

Run: `npx vitest run src/app/theme.test.tsx` → PASS

- [ ] **Step 8: 첫 페인트 전 테마 적용** (`index.html`의 `<head>` 안, `<title>` 다음)

```html
    <script>
      ;(function () {
        var t = null
        try {
          t = localStorage.getItem('chessling-theme')
        } catch (e) {}
        if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        document.documentElement.dataset.theme = t
        document.documentElement.style.colorScheme = t
      })()
    </script>
```

- [ ] **Step 9: 진입점과 Provider**

`src/main.tsx`: `import './styles.css'` 아래에 두 줄을 추가한다(옛 CSS는 Task 14에서 삭제하므로 그때까지 공존. 새 스타일이 뒤에 와야 이긴다):
```tsx
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './styles/index.css'
```

`src/app/AppProviders.tsx`: `import { MotionConfig } from 'motion/react'`를 추가하고, 가장 바깥을 `<MotionConfig reducedMotion="user">…</MotionConfig>`로 감싼다.

- [ ] **Step 10: 테스트 폴리필** (`src/test/setup.ts` 전체 교체)

```ts
import '@testing-library/jest-dom/vitest'

if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  }
  if (!('IntersectionObserver' in window)) {
    class NoopIntersectionObserver {
      readonly root = null
      readonly rootMargin = ''
      readonly thresholds: number[] = []
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
    Object.assign(globalThis, { IntersectionObserver: NoopIntersectionObserver })
  }
  if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      if (!this.hasAttribute('open')) return
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }
  }
}
```

- [ ] **Step 11: 전체 확인과 수동 확인**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: 전체 PASS, 빌드 성공(`dist/assets`에 PretendardVariable subset woff2 파일들이 생긴다).

`npx vite --port 5199 --strictPort` → 브라우저 개발자 도구에서 `document.documentElement.dataset.theme`이 `light` 또는 `dark`이고, 본문 글꼴이 Pretendard로 렌더링되는지(Computed → Rendered Fonts) 확인한다. 서버를 끈다.

- [ ] **Step 12: 커밋**

```bash
git add -A package.json package-lock.json vite.config.ts index.html src public/licenses
git commit -m "feat(ui): Vanilla Extract 토큰·전역 스타일, Pretendard, 다크 모드 기반" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 기본 부품 1 — Icon, Button, ControlBar, Surface, Badge, Banner, ErrorView

**Files:**
- Create: `src/ui/Icon.tsx`, `src/ui/button.css.ts`, `src/ui/Button.tsx`, `src/ui/controlBar.css.ts`, `src/ui/ControlBar.tsx`, `src/ui/surface.css.ts`, `src/ui/Surface.tsx`, `src/ui/badge.css.ts`, `src/ui/Badge.tsx`, `src/ui/feedback.css.ts`
- Modify: `src/components/Banner.tsx`, `src/components/ErrorView.tsx`
- Test: `src/ui/Button.test.tsx`, `src/ui/ControlBar.test.tsx`

**Interfaces:**
- Consumes: `vars`, `mq`, `radius`, `fontSize`, `weight`, `space` (Task 4), `cx`, `visuallyHidden`
- Produces:
  - `Icon({ icon: LucideIcon; size?: number; className?: string })` — strokeWidth 1.5, aria-hidden
  - `Button({ tone?: 'primary'|'secondary'|'ghost'; size?: 'md'|'sm'; icon?: LucideIcon; busy?: boolean; …button props })` — 기본 `type="button"`, busy면 disabled + `aria-busy` + LoaderCircle 회전
  - `LinkButton({ tone?, size?, icon?, …LinkProps })`
  - `IconButton({ icon; label; pressed?; …button props })` — `aria-label`=label, 44px
  - `IconLink({ icon; label; …LinkProps })`
  - `ControlBar({ label: string; className?; children })` — `role="group"`. 모바일은 화면 하단 고정(safe-area), 768+는 일반 흐름
  - `BarButton({ icon?; label; caption?: boolean | string; pressed?; children?; …button props })` — `aria-label`=label, 48px 이상, caption은 aria-hidden 보조 글자
  - `Surface({ as?: 'div'|'section'|'aside'; className?; children; …rest })`
  - `Badge({ tone?: 'neutral'|'live'; children })` — `data-badge={tone}`
  - Banner·ErrorView: 역할(`status`/`alert`)과 문구·동작 유지, 모양만 교체

- [ ] **Step 1: 실패하는 테스트 작성**

`src/ui/Button.test.tsx`:
```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Plus } from 'lucide-react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Button, IconButton, IconLink, LinkButton } from './Button'

afterEach(cleanup)

describe('Button', () => {
  it('기본 type은 button이고 클릭을 전달한다', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>저장</Button>)
    const b = screen.getByRole('button', { name: '저장' })
    expect(b).toHaveAttribute('type', 'button')
    fireEvent.click(b)
    expect(onClick).toHaveBeenCalledOnce()
  })
  it('submit으로 바꿀 수 있다', () => {
    render(<Button type="submit">보내기</Button>)
    expect(screen.getByRole('button', { name: '보내기' })).toHaveAttribute('type', 'submit')
  })
  it('busy면 비활성이고 aria-busy', () => {
    render(<Button busy>시작</Button>)
    const b = screen.getByRole('button', { name: '시작' })
    expect(b).toBeDisabled()
    expect(b).toHaveAttribute('aria-busy', 'true')
  })
  it('아이콘은 접근성 트리에서 숨긴다', () => {
    const { container } = render(<Button icon={Plus}>추가</Button>)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('svg')).toHaveAttribute('stroke-width', '1.5')
  })
})

describe('LinkButton / IconButton / IconLink', () => {
  it('LinkButton은 링크 역할', () => {
    render(
      <MemoryRouter>
        <LinkButton to="/classics">명국</LinkButton>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: '명국' })).toHaveAttribute('href', '/classics')
  })
  it('IconButton은 label을 접근성 이름으로 쓴다', () => {
    render(<IconButton icon={Plus} label="추가" pressed />)
    expect(screen.getByRole('button', { name: '추가' })).toHaveAttribute('aria-pressed', 'true')
  })
  it('IconLink', () => {
    render(
      <MemoryRouter>
        <IconLink icon={Plus} label="이어 두기" to="/play/1" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: '이어 두기' })).toHaveAttribute('href', '/play/1')
  })
})
```

`src/ui/ControlBar.test.tsx`:
```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { Lightbulb } from 'lucide-react'
import { afterEach, expect, it } from 'vitest'
import { BarButton, ControlBar } from './ControlBar'

afterEach(cleanup)

it('그룹 이름과 버튼 이름', () => {
  render(
    <ControlBar label="수 이동">
      <BarButton icon={Lightbulb} label="힌트" pressed={false} />
      <BarButton label="기보 전체 보기 (3 / 10)">
        <span>3 / 10</span>
      </BarButton>
      <BarButton icon={Lightbulb} label="무르기" caption />
    </ControlBar>,
  )
  expect(screen.getByRole('group', { name: '수 이동' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '힌트' })).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getByRole('button', { name: '기보 전체 보기 (3 / 10)' })).toHaveTextContent('3 / 10')
  expect(screen.getByRole('button', { name: '무르기' })).toHaveTextContent('무르기')
})
```

Run: `npx vitest run src/ui` → FAIL

- [ ] **Step 2: 구현 — 아이콘과 버튼**

`src/ui/Icon.tsx`:
```tsx
import type { LucideIcon } from 'lucide-react'

export function Icon({ icon: Glyph, size = 20, className }: { icon: LucideIcon; size?: number; className?: string }) {
  return <Glyph size={size} strokeWidth={1.5} aria-hidden="true" focusable="false" className={className} />
}
```

`src/ui/button.css.ts`:
```ts
import { keyframes, style } from '@vanilla-extract/css'
import { recipe, type RecipeVariants } from '@vanilla-extract/recipes'
import { fontSize, mq, radius, vars, weight } from '../styles/tokens.css'

const rotate = keyframes({ to: { transform: 'rotate(360deg)' } })
export const spin = style({
  animation: `${rotate} 1s linear infinite`,
  '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
})

export const button = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    paddingInline: 18,
    border: 0,
    borderRadius: radius.action,
    fontSize: fontSize.control,
    fontWeight: weight.regular,
    lineHeight: 1.2,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background-color 160ms ease, color 160ms ease',
    selectors: { '&:disabled, &[aria-disabled="true"]': { opacity: 0.5, cursor: 'not-allowed' } },
    '@media': { [mq.md]: { minHeight: 48, paddingInline: 22, borderRadius: radius.actionMd } },
  },
  variants: {
    tone: {
      primary: {
        background: vars.color.accent,
        color: vars.color.onAccent,
        selectors: { '&:hover:not(:disabled)': { background: vars.color.accentHover } },
      },
      secondary: { background: vars.color.surfaceSubtle, color: vars.color.ink },
      ghost: {
        background: 'transparent',
        color: vars.color.ink,
        selectors: { '&:hover:not(:disabled)': { background: vars.color.surfaceSubtle } },
      },
    },
    size: {
      md: {},
      sm: { minHeight: 40, paddingInline: 14, '@media': { [mq.md]: { minHeight: 40, paddingInline: 16 } } },
    },
  },
  defaultVariants: { tone: 'primary', size: 'md' },
})
export type ButtonVariants = NonNullable<RecipeVariants<typeof button>>

export const iconButton = style({
  display: 'inline-grid',
  placeItems: 'center',
  flexShrink: 0,
  width: 44,
  height: 44,
  padding: 0,
  border: 0,
  borderRadius: radius.action,
  background: 'transparent',
  color: vars.color.ink,
  cursor: 'pointer',
  textDecoration: 'none',
  selectors: {
    '&:hover:not(:disabled)': { background: vars.color.surfaceSubtle },
    '&[aria-pressed="true"]': { background: vars.color.surfaceSubtle, color: vars.color.accent },
    '&:disabled': { opacity: 0.4, cursor: 'not-allowed' },
  },
})
```

`src/ui/Button.tsx`:
```tsx
import { LoaderCircle, type LucideIcon } from 'lucide-react'
import { motion, type HTMLMotionProps } from 'motion/react'
import type { ComponentProps } from 'react'
import { Link, type LinkProps } from 'react-router'
import { button, iconButton, spin, type ButtonVariants } from './button.css'
import { cx } from './cx'
import { Icon } from './Icon'

const MotionLink = motion.create(Link)
const hover = { y: -2 }
const tap = { scale: 0.98 }

type Common = ButtonVariants & { icon?: LucideIcon }
type MotionConflicts = 'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragOver' | 'onDragEnter' | 'onDragLeave' | 'onDrop'

export function Button({
  tone,
  size,
  icon,
  busy = false,
  disabled,
  className,
  children,
  ...rest
}: Common & { busy?: boolean } & HTMLMotionProps<'button'>) {
  const inactive = Boolean(disabled || busy)
  return (
    <motion.button
      type="button"
      whileHover={inactive ? undefined : hover}
      whileTap={inactive ? undefined : tap}
      className={cx(button({ tone, size }), className)}
      disabled={inactive}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? <Icon icon={LoaderCircle} size={18} className={spin} /> : icon ? <Icon icon={icon} size={18} /> : null}
      {children}
    </motion.button>
  )
}

export function LinkButton({ tone, size, icon, className, children, ...rest }: Common & Omit<LinkProps, MotionConflicts>) {
  return (
    <MotionLink whileHover={hover} whileTap={tap} className={cx(button({ tone, size }), className)} {...rest}>
      {icon && <Icon icon={icon} size={18} />}
      {children}
    </MotionLink>
  )
}

export function IconButton({
  icon,
  label,
  pressed,
  className,
  ...rest
}: { icon: LucideIcon; label: string; pressed?: boolean } & Omit<ComponentProps<'button'>, 'aria-label' | 'children'>) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={pressed} className={cx(iconButton, className)} {...rest}>
      <Icon icon={icon} />
    </button>
  )
}

export function IconLink({ icon, label, className, ...rest }: { icon: LucideIcon; label: string } & Omit<LinkProps, 'children'>) {
  return (
    <Link aria-label={label} title={label} className={cx(iconButton, className)} {...rest}>
      <Icon icon={icon} />
    </Link>
  )
}
```

- [ ] **Step 3: 구현 — ControlBar, Surface, Badge**

`src/ui/controlBar.css.ts`:
```ts
import { style } from '@vanilla-extract/css'
import { fontSize, mq, radius, space, vars } from '../styles/tokens.css'

export const bar = style({
  position: 'fixed',
  insetInline: 0,
  bottom: 0,
  zIndex: 20,
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'center',
  gap: space[1],
  padding: `${space[2]} ${space[2]} calc(${space[2]} + env(safe-area-inset-bottom))`,
  background: vars.color.surfaceSubtle,
  '@media': {
    [mq.md]: { position: 'static', justifyContent: 'flex-start', padding: 0, background: 'transparent', gap: space[2] },
  },
})

export const item = style({
  display: 'grid',
  placeItems: 'center',
  alignContent: 'center',
  gap: 2,
  minWidth: 48,
  minHeight: 48,
  paddingInline: space[1],
  border: 0,
  borderRadius: radius.action,
  background: 'transparent',
  color: vars.color.ink,
  cursor: 'pointer',
  fontSize: fontSize.control,
  fontVariantNumeric: 'tabular-nums',
  selectors: {
    '&:hover:not(:disabled)': { background: vars.color.surface },
    '&[aria-pressed="true"]': { background: vars.color.surface, color: vars.color.accent },
    '&:disabled': { opacity: 0.35, cursor: 'not-allowed' },
  },
  '@media': {
    [mq.md]: {
      selectors: {
        '&:hover:not(:disabled)': { background: vars.color.surfaceSubtle },
        '&[aria-pressed="true"]': { background: vars.color.surfaceSubtle },
      },
    },
  },
})

export const caption = style({ fontSize: '12px', color: vars.color.muted, lineHeight: 1.2 })
```

`src/ui/ControlBar.tsx`:
```tsx
import type { LucideIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import * as s from './controlBar.css'
import { cx } from './cx'
import { Icon } from './Icon'

export function ControlBar({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className={cx(s.bar, className)}>
      {children}
    </div>
  )
}

export function BarButton({
  icon,
  label,
  caption = false,
  pressed,
  className,
  children,
  ...rest
}: {
  icon?: LucideIcon
  label: string
  caption?: boolean | string
  pressed?: boolean
  children?: ReactNode
} & Omit<ComponentProps<'button'>, 'aria-label' | 'children'>) {
  const captionText = caption === true ? label : caption || null
  return (
    <button type="button" aria-label={label} aria-pressed={pressed} className={cx(s.item, className)} {...rest}>
      {children ?? (icon && <Icon icon={icon} size={22} />)}
      {captionText && (
        <span className={s.caption} aria-hidden="true">
          {captionText}
        </span>
      )}
    </button>
  )
}
```

`src/ui/surface.css.ts`:
```ts
import { style } from '@vanilla-extract/css'
import { mq, radius, space, vars } from '../styles/tokens.css'

export const surface = style({
  background: vars.color.surfaceSubtle,
  borderRadius: radius.surface,
  padding: space[4],
  '@media': { [mq.md]: { padding: space[5] } },
})
```

`src/ui/Surface.tsx`:
```tsx
import type { ComponentProps } from 'react'
import { cx } from './cx'
import { surface } from './surface.css'

type As = 'div' | 'section' | 'aside'
export function Surface({ as: As = 'div', className, ...rest }: { as?: As } & ComponentProps<'div'>) {
  return <As className={cx(surface, className)} {...rest} />
}
```

`src/ui/badge.css.ts`:
```ts
import { style, styleVariants } from '@vanilla-extract/css'
import { fontSize, radius, vars, weight } from '../styles/tokens.css'

const base = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 24,
  paddingInline: 10,
  borderRadius: radius.pill,
  fontSize: fontSize.meta,
  fontWeight: weight.medium,
  whiteSpace: 'nowrap',
})
export const badge = styleVariants({
  neutral: [base, { background: vars.color.surfaceSubtle, color: vars.color.muted }],
  live: [base, { background: vars.color.liveSurface, color: vars.color.live }],
})
export const dot = style({ width: 6, height: 6, borderRadius: radius.pill, background: 'currentColor' })
```

`src/ui/Badge.tsx`:
```tsx
import type { ReactNode } from 'react'
import * as s from './badge.css'

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'live'; children: ReactNode }) {
  return (
    <span data-badge={tone} className={s.badge[tone]}>
      {tone === 'live' && <span className={s.dot} aria-hidden="true" />}
      {children}
    </span>
  )
}
```

- [ ] **Step 4: Banner·ErrorView 모양 교체**

`src/ui/feedback.css.ts`:
```ts
import { style, styleVariants } from '@vanilla-extract/css'
import { fontSize, radius, space, vars } from '../styles/tokens.css'

const box = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: space[2],
  padding: `${space[3]} ${space[4]}`,
  borderRadius: radius.action,
  background: vars.color.surfaceSubtle,
  fontSize: fontSize.control,
})
export const banner = styleVariants({
  info: [box, { color: vars.color.ink }],
  warn: [box, { color: vars.color.ink, background: vars.color.liveSurface }],
})
export const icon = style({ flexShrink: 0, marginTop: 2 })
export const error = style([box, { flexDirection: 'column', alignItems: 'flex-start', gap: space[3], padding: space[4] }])
export const errorHead = style({ display: 'flex', gap: space[2], alignItems: 'flex-start' })
```

`src/components/Banner.tsx` 전체 교체:
```tsx
import { Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Icon } from '../ui/Icon'
import * as s from '../ui/feedback.css'

export function Banner({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) {
  return (
    <div role="status" className={s.banner[tone]}>
      <Icon icon={tone === 'warn' ? TriangleAlert : Info} size={18} className={s.icon} />
      <span>{children}</span>
    </div>
  )
}
```

`src/components/ErrorView.tsx`: `message()` 함수와 상태·타이머 로직은 그대로 두고, `return` 부분만 다음으로 교체하고 import를 추가한다:
```tsx
import { RotateCcw, TriangleAlert } from 'lucide-react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import * as s from '../ui/feedback.css'
```
```tsx
  return (
    <div className={s.error} role="alert">
      <div className={s.errorHead}>
        <Icon icon={TriangleAlert} size={18} className={s.icon} />
        <p>{message(error, remaining)}</p>
      </div>
      {onRetry && (
        <Button tone="secondary" size="sm" icon={RotateCcw} onClick={onRetry} disabled={waiting}>
          다시 시도
        </Button>
      )}
    </div>
  )
```

- [ ] **Step 5: 통과 확인**

Run: `npm test && npx tsc --noEmit`
Expected: 새 테스트 PASS, 기존 ErrorView·Banner 관련 테스트(문구·역할·60초 잠금)도 PASS.

- [ ] **Step 6: 커밋**

```bash
git add -A src
git commit -m "feat(ui): 버튼·아이콘·조작 막대·면·배지, 배너와 에러 화면 새 모양" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 기본 부품 2 — Segmented, Field, Disclosure, Dialog, Reveal, InkText, Section

**Files:**
- Create: `src/ui/segmented.css.ts`, `src/ui/Segmented.tsx`, `src/ui/field.css.ts`, `src/ui/Field.tsx`, `src/ui/disclosure.css.ts`, `src/ui/Disclosure.tsx`, `src/ui/dialog.css.ts`, `src/ui/Dialog.tsx`, `src/ui/Reveal.tsx`, `src/ui/inkText.css.ts`, `src/ui/InkText.tsx`, `src/ui/section.css.ts`, `src/ui/Section.tsx`
- Test: `src/ui/Segmented.test.tsx`, `src/ui/Field.test.tsx`, `src/ui/Disclosure.test.tsx`, `src/ui/Dialog.test.tsx`, `src/ui/InkText.test.tsx`

**Interfaces:**
- Produces:
  - `Segmented<T extends string>({ legend; name; value: T; options: { value: T; label: string }[]; onChange(v: T); className? })` — 네이티브 radio(키보드 화살표 이동 기본 제공), 각 옵션은 `<label>`로 감쌈
  - `TextField({ label; hideLabel?; className?; …input })`, `SelectField({ label; hideLabel?; className?; children; …select })` — `<label htmlFor>` 연결
  - `Disclosure({ title; children; defaultOpen?; open?; onOpenChange?; testId? })` — 트리거 `button[aria-expanded]`, 닫힌 내용은 `aria-hidden`·`inert`(DOM에는 남아 있음), `data-testid`는 내용 영역에
  - `Dialog({ title; onClose; children; variant?: 'center'|'sheet'; className? })` — **마운트되면 열림**(부모가 조건부 렌더), 네이티브 `<dialog>` `showModal()`, Esc(`cancel`)·배경 클릭·[닫기] → `onClose`
  - `Reveal({ children; variant?: 'text'|'graphic'; index?: number; className? })` — 첫 화면 밖 요소만 1회 등장 모션
  - `InkText({ text; step?: number; delay?: number; className? })` — `aria-hidden` 시각 전용. 호출자가 접근성 텍스트를 따로 제공
  - `Section({ id?; title; description?; action?; children; className? })` — `<section aria-labelledby>`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/ui/Segmented.test.tsx`:
```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Segmented } from './Segmented'

afterEach(cleanup)

it('라디오 그룹으로 선택을 알린다', () => {
  const onChange = vi.fn()
  render(
    <Segmented
      legend="플랫폼"
      name="p"
      value="chesscom"
      onChange={onChange}
      options={[
        { value: 'chesscom', label: 'Chess.com' },
        { value: 'lichess', label: 'Lichess' },
      ]}
    />,
  )
  expect(screen.getByRole('group', { name: '플랫폼' })).toBeInTheDocument()
  expect(screen.getByLabelText('Chess.com')).toBeChecked()
  fireEvent.click(screen.getByLabelText('Lichess'))
  expect(onChange).toHaveBeenCalledWith('lichess')
})
```

`src/ui/Field.test.tsx`:
```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { SelectField, TextField } from './Field'

afterEach(cleanup)

it('라벨과 입력이 연결된다', () => {
  render(
    <>
      <TextField label="아이디" hideLabel placeholder="아이디" />
      <SelectField label="라운드">
        <option value="r1">1라운드</option>
      </SelectField>
    </>,
  )
  expect(screen.getByLabelText('아이디')).toHaveAttribute('placeholder', '아이디')
  expect(screen.getByLabelText('라운드')).toHaveValue('r1')
})
```

`src/ui/Disclosure.test.tsx`:
```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Disclosure } from './Disclosure'

afterEach(cleanup)

it('기본은 닫힘이고 누르면 펼친다', () => {
  const onOpenChange = vi.fn()
  render(
    <Disclosure title="기보 전체" onOpenChange={onOpenChange} testId="moves">
      <button type="button">e4</button>
    </Disclosure>,
  )
  const trigger = screen.getByRole('button', { name: '기보 전체' })
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByTestId('moves')).toHaveAttribute('aria-hidden', 'true')
  expect(screen.queryByRole('button', { name: 'e4' })).toBeNull()
  fireEvent.click(trigger)
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  expect(onOpenChange).toHaveBeenCalledWith(true)
  expect(screen.getByRole('button', { name: 'e4' })).toBeInTheDocument()
})

it('제어 모드', () => {
  render(
    <Disclosure title="엔진 라인" open onOpenChange={() => {}}>
      내용
    </Disclosure>,
  )
  expect(screen.getByRole('button', { name: '엔진 라인' })).toHaveAttribute('aria-expanded', 'true')
})
```

`src/ui/Dialog.test.tsx`:
```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Dialog } from './Dialog'

afterEach(cleanup)

it('열린 상태로 마운트되고 닫기·Esc로 onClose', () => {
  const onClose = vi.fn()
  render(
    <Dialog title="기보" onClose={onClose}>
      <p>내용</p>
    </Dialog>,
  )
  const dialog = screen.getByRole('dialog', { name: '기보' })
  expect(dialog).toHaveAttribute('open')
  fireEvent.click(screen.getByRole('button', { name: '닫기' }))
  expect(onClose).toHaveBeenCalledTimes(1)
  fireEvent(dialog, new Event('cancel', { cancelable: true }))
  expect(onClose).toHaveBeenCalledTimes(2)
})
```

`src/ui/InkText.test.tsx`:
```tsx
// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { InkText } from './InkText'

afterEach(cleanup)

it('글자를 모두 그리고 접근성 트리에서는 숨긴다', () => {
  const { container } = render(<InkText text="직접 참여" />)
  const root = container.firstElementChild!
  expect(root).toHaveAttribute('aria-hidden', 'true')
  expect(root.textContent).toContain('직')
  expect(root.textContent).toContain('여')
})
```

Run: `npx vitest run src/ui` → FAIL (새 파일 없음)

- [ ] **Step 2: 구현 — Segmented, Field**

`src/ui/segmented.css.ts`:
```ts
import { style } from '@vanilla-extract/css'
import { fontSize, mq, radius, vars } from '../styles/tokens.css'

export const root = style({
  display: 'inline-flex',
  flexWrap: 'wrap',
  gap: 4,
  margin: 0,
  padding: 4,
  border: 0,
  borderRadius: radius.action,
  background: vars.color.surfaceSubtle,
  '@media': { [mq.md]: { borderRadius: radius.actionMd } },
})
export const option = style({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 36,
  paddingInline: 14,
  borderRadius: 9,
  color: vars.color.muted,
  fontSize: fontSize.control,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  selectors: {
    '&:has(input:checked)': { background: vars.color.surface, color: vars.color.ink },
    '&:has(input:focus-visible)': { outline: `3px solid ${vars.color.accent}`, outlineOffset: 1 },
  },
  '@media': { [mq.md]: { minHeight: 40 } },
})
export const input = style({ position: 'absolute', inset: 0, margin: 0, opacity: 0, cursor: 'pointer' })
```

`src/ui/Segmented.tsx`:
```tsx
import { visuallyHidden } from './a11y.css'
import { cx } from './cx'
import * as s from './segmented.css'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export function Segmented<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  className,
}: {
  legend: string
  name: string
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <fieldset className={cx(s.root, className)}>
      <legend className={visuallyHidden}>{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className={s.option}>
          <input
            type="radio"
            className={s.input}
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  )
}
```

`src/ui/field.css.ts`:
```ts
import { style } from '@vanilla-extract/css'
import { fontSize, radius, vars } from '../styles/tokens.css'

export const field = style({ display: 'grid', gap: 6, minWidth: 0 })
export const label = style({ fontSize: fontSize.meta, color: vars.color.muted })
export const control = style({
  width: '100%',
  height: 48,
  paddingInline: 14,
  border: `1px solid ${vars.color.line}`,
  borderRadius: radius.action,
  background: vars.color.surface,
  color: vars.color.ink,
  fontSize: '16px',
  outline: 'none',
  selectors: {
    '&:focus-visible': { borderColor: vars.color.accent, outline: `3px solid ${vars.color.accent}`, outlineOffset: 0 },
    '&::placeholder': { color: vars.color.muted },
  },
})
export const selectWrap = style({ position: 'relative' })
export const select = style([control, { appearance: 'none', paddingRight: 40, cursor: 'pointer' }])
export const chevron = style({ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: vars.color.muted })
```

`src/ui/Field.tsx`:
```tsx
import { ChevronDown } from 'lucide-react'
import { useId, type ComponentProps, type ReactNode } from 'react'
import { visuallyHidden } from './a11y.css'
import { cx } from './cx'
import * as s from './field.css'
import { Icon } from './Icon'

export function TextField({
  label,
  hideLabel = false,
  className,
  ...input
}: { label: string; hideLabel?: boolean } & ComponentProps<'input'>) {
  const id = useId()
  return (
    <div className={cx(s.field, className)}>
      <label htmlFor={id} className={hideLabel ? visuallyHidden : s.label}>
        {label}
      </label>
      <input id={id} className={s.control} {...input} />
    </div>
  )
}

export function SelectField({
  label,
  hideLabel = false,
  className,
  children,
  ...select
}: { label: string; hideLabel?: boolean; children: ReactNode } & ComponentProps<'select'>) {
  const id = useId()
  return (
    <div className={cx(s.field, className)}>
      <label htmlFor={id} className={hideLabel ? visuallyHidden : s.label}>
        {label}
      </label>
      <div className={s.selectWrap}>
        <select id={id} className={s.select} {...select}>
          {children}
        </select>
        <Icon icon={ChevronDown} size={18} className={s.chevron} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 구현 — Disclosure, Dialog**

`src/ui/disclosure.css.ts`:
```ts
import { style } from '@vanilla-extract/css'
import { fontSize, radius, space, vars, weight } from '../styles/tokens.css'

export const root = style({ background: vars.color.surfaceSubtle, borderRadius: radius.surface })
export const trigger = style({
  display: 'flex',
  width: '100%',
  alignItems: 'center',
  justifyContent: 'space-between',
  minHeight: 52,
  padding: `0 ${space[4]}`,
  border: 0,
  borderRadius: radius.surface,
  background: 'transparent',
  color: vars.color.ink,
  fontSize: fontSize.control,
  fontWeight: weight.medium,
  cursor: 'pointer',
})
export const chevron = style({ transition: 'transform 250ms ease', color: vars.color.muted })
export const chevronOpen = style([chevron, { transform: 'rotate(180deg)' }])
export const content = style({ overflow: 'hidden' })
export const inner = style({ padding: `0 ${space[4]} ${space[4]}` })
```

`src/ui/Disclosure.tsx`:
```tsx
import { ChevronDown } from 'lucide-react'
import { motion } from 'motion/react'
import { useId, useState, type ReactNode } from 'react'
import * as s from './disclosure.css'
import { Icon } from './Icon'
import { EASE } from './motion'

export function Disclosure({
  title,
  children,
  defaultOpen = false,
  open: controlled,
  onOpenChange,
  testId,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  testId?: string
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const open = controlled ?? uncontrolled
  const id = useId()
  const toggle = () => {
    const next = !open
    if (controlled === undefined) setUncontrolled(next)
    onOpenChange?.(next)
  }
  return (
    <section className={s.root}>
      <button type="button" className={s.trigger} aria-expanded={open} aria-controls={id} onClick={toggle}>
        <span>{title}</span>
        <Icon icon={ChevronDown} size={18} className={open ? s.chevronOpen : s.chevron} />
      </button>
      <motion.div
        id={id}
        className={s.content}
        initial={false}
        animate={open ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
        transition={{ height: { duration: 0.32, ease: EASE }, opacity: { duration: 0.18 } }}
        aria-hidden={!open}
        inert={!open}
        data-testid={testId}
      >
        <div className={s.inner}>{children}</div>
      </motion.div>
    </section>
  )
}
```

`src/ui/dialog.css.ts`:
```ts
import { keyframes, style, styleVariants } from '@vanilla-extract/css'
import { fontSize, mq, radius, space, vars } from '../styles/tokens.css'

const rise = keyframes({ from: { transform: 'translateY(24px)', opacity: 0 }, to: { transform: 'none', opacity: 1 } })
const fade = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } })

const base = style({
  padding: 0,
  border: 0,
  color: vars.color.ink,
  background: vars.color.surface,
  maxHeight: '85svh',
  overflow: 'auto',
  selectors: { '&::backdrop': { background: 'rgb(9 12 16 / 0.45)', backdropFilter: 'blur(4px)', animation: `${fade} 250ms ease` } },
})
export const dialog = styleVariants({
  center: [base, { width: 'min(440px, calc(100% - 40px))', borderRadius: radius.surface, animation: `${fade} 250ms ease` }],
  sheet: [
    base,
    {
      width: '100%',
      maxWidth: '100%',
      margin: 'auto 0 0',
      borderRadius: `${radius.surface} ${radius.surface} 0 0`,
      paddingBottom: 'env(safe-area-inset-bottom)',
      animation: `${rise} 250ms cubic-bezier(.22,1,.36,1)`,
      '@media': {
        [mq.md]: { width: 'min(520px, calc(100% - 48px))', margin: 'auto', borderRadius: radius.surface, animation: `${fade} 250ms ease` },
      },
    },
  ],
})
export const panel = style({ display: 'grid', gap: space[4], padding: space[5] })
export const head = style({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space[2] })
export const title = style({ fontSize: fontSize.title })
```

`src/ui/Dialog.tsx`:
```tsx
import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { IconButton } from './Button'
import { cx } from './cx'
import * as s from './dialog.css'

export function Dialog({
  title,
  onClose,
  children,
  variant = 'center',
  className,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  variant?: 'center' | 'sheet'
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    return () => {
      if (d?.open) d.close()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cx(s.dialog[variant], className)}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={s.panel}>
        <div className={s.head}>
          <h2 id={titleId} className={s.title}>
            {title}
          </h2>
          <IconButton icon={X} label="닫기" onClick={onClose} />
        </div>
        {children}
      </div>
    </dialog>
  )
}
```

- [ ] **Step 4: 구현 — Reveal, InkText, Section**

`src/ui/Reveal.tsx`:
```tsx
import { motion, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { EASE } from './motion'

const VARIANTS = {
  text: { hidden: { opacity: 0, y: 18 }, shown: { opacity: 1, y: 0, scale: 1 }, duration: 0.6 },
  graphic: { hidden: { opacity: 0, y: 28, scale: 0.985 }, shown: { opacity: 1, y: 0, scale: 1 }, duration: 0.76 },
} as const

/** 첫 화면 밖에 있던 요소만 뷰포트 하단 48px 안쪽에 들어올 때 한 번 등장한다 */
export function Reveal({
  children,
  variant = 'text',
  index = 0,
  className,
}: {
  children: ReactNode
  variant?: keyof typeof VARIANTS
  index?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const inView = useInView(ref, { once: true, margin: '0px 0px -48px 0px' })
  const [armed, setArmed] = useState(false)
  const [shown, setShown] = useState(false)

  useLayoutEffect(() => {
    if (reduce || !ref.current) return
    if (ref.current.getBoundingClientRect().top > window.innerHeight - 48) setArmed(true)
  }, [reduce])
  useEffect(() => {
    if (inView) setShown(true)
  }, [inView])

  const v = VARIANTS[variant]
  const hidden = armed && !shown
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={hidden ? v.hidden : v.shown}
      transition={hidden ? { duration: 0 } : { duration: v.duration, ease: EASE, delay: Math.min(index * 0.08, 0.16) }}
      onFocusCapture={() => setShown(true)}
    >
      {children}
    </motion.div>
  )
}
```

`src/ui/inkText.css.ts`:
```ts
import { style } from '@vanilla-extract/css'
import { vars } from '../styles/tokens.css'

export const root = style({ display: 'inline' })
export const char = style({ position: 'relative', display: 'inline-block', whiteSpace: 'pre' })
export const ink = style({ color: 'inherit' })
export const glow = style({
  position: 'absolute',
  inset: 0,
  backgroundImage: `linear-gradient(90deg, ${vars.color.accent}, #1fb5c9, #7b5cff)`,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  '@media': { '(forced-colors: active)': { display: 'none' } },
})
```

`src/ui/InkText.tsx`:
```tsx
import { motion, useReducedMotion } from 'motion/react'
import { cx } from './cx'
import * as s from './inkText.css'

/** 글자가 왼쪽부터 청색 그라디언트로 드러났다가 잉크색으로 정착한다. 시각 전용(aria-hidden) */
export function InkText({ text, step = 0.12, delay = 0, className }: { text: string; step?: number; delay?: number; className?: string }) {
  const reduce = useReducedMotion()
  if (reduce) {
    return (
      <span aria-hidden="true" className={className}>
        {text}
      </span>
    )
  }
  return (
    <span aria-hidden="true" className={cx(s.root, className)}>
      {Array.from(text).map((ch, i) => {
        const at = delay + i * step
        return (
          <span key={i} className={s.char}>
            <motion.span className={s.ink} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.55, delay: at + 0.12 }}>
              {ch}
            </motion.span>
            <motion.span
              className={s.glow}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.67, times: [0, 0.18, 1], delay: at }}
            >
              {ch}
            </motion.span>
          </span>
        )
      })}
    </span>
  )
}
```

`src/ui/section.css.ts`:
```ts
import { style } from '@vanilla-extract/css'
import { fontSize, mq, space, vars } from '../styles/tokens.css'

export const section = style({ display: 'grid', gap: space[5], '@media': { [mq.md]: { gap: space[6] } } })
export const head = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: space[3],
})
export const title = style({ fontSize: fontSize.section, '@media': { [mq.md]: { fontSize: fontSize.sectionMd } } })
export const description = style({ color: vars.color.muted, maxWidth: '34rem' })
```

`src/ui/Section.tsx`:
```tsx
import { useId, type ReactNode } from 'react'
import { cx } from './cx'
import { Reveal } from './Reveal'
import * as s from './section.css'

export function Section({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  id?: string
  title: string
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  const titleId = useId()
  return (
    <section id={id} aria-labelledby={titleId} className={cx(s.section, className)}>
      <Reveal>
        <div className={s.head}>
          <div>
            <h2 id={titleId} className={s.title}>
              {title}
            </h2>
            {description && <p className={s.description}>{description}</p>}
          </div>
          {action}
        </div>
      </Reveal>
      <Reveal variant="graphic" index={1}>
        {children}
      </Reveal>
    </section>
  )
}
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/ui && npm test && npx tsc --noEmit`
Expected: PASS. (React 19는 `inert` boolean prop을 지원한다. 타입 오류가 나면 `inert={!open || undefined}`로 바꾸고 보고서에 적는다.)

- [ ] **Step 6: 커밋**

```bash
git add -A src/ui
git commit -m "feat(ui): 세그먼트·필드·접이식·다이얼로그·등장 모션·잉크 효과·섹션" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 레이아웃 — 헤더·푸터·테마 토글·본문 바로가기, NotFound·라이선스

**Files:**
- Create: `src/styles/features/layout.css.ts`, `src/styles/features/page.css.ts`, `src/app/ThemeToggle.tsx`, `src/app/GitHubMark.tsx`
- Modify: `src/app/Layout.tsx`, `src/features/NotFound.tsx`, `src/features/licenses/LicensesPage.tsx`
- Test: `src/app/Layout.test.tsx`, `src/app/routes.test.tsx`(기존 유지)

**Interfaces:**
- Consumes: `useTheme` (Task 4), `IconButton`, `LinkButton`, `Icon`, `Banner` (Task 5)
- Produces: 헤더(워드마크 "Chessling" + 강조색 점, ghost 메뉴 대회·명국·내 분기, 테마 토글, GitHub 로고), `<main id="main">`, 푸터. `page.css.ts`: `page`(페이지 여백), `pageHead`, `pageTitle`, `lead`, `reading`(640px 읽기 폭) — 목록·라이선스 화면이 공유

- [ ] **Step 1: 실패하는 테스트 작성** (`src/app/Layout.test.tsx`)

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { applyTheme, THEME_KEY } from './theme'
import { renderRoute } from '../test/renderRoute'

beforeEach(() => {
  localStorage.clear()
  applyTheme('light')
})
afterEach(cleanup)

it('본문 바로가기와 주요 메뉴', () => {
  renderRoute('/licenses')
  expect(screen.getByRole('link', { name: '본문 바로가기' })).toHaveAttribute('href', '#main')
  const nav = screen.getByRole('navigation', { name: '주요 메뉴' })
  expect(nav).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '대회' })).toHaveAttribute('href', '/events')
  expect(screen.getByRole('link', { name: '명국' })).toHaveAttribute('href', '/classics')
  expect(screen.getByRole('link', { name: '내 분기' })).toHaveAttribute('href', '/forks')
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
})

it('테마 토글', () => {
  renderRoute('/licenses')
  fireEvent.click(screen.getByRole('button', { name: '다크 모드로 전환' }))
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem(THEME_KEY)).toBe('dark')
  expect(screen.getByRole('button', { name: '라이트 모드로 전환' })).toBeInTheDocument()
})

it('소스 주소가 없으면 GitHub 링크를 숨긴다', () => {
  renderRoute('/licenses')
  expect(screen.queryByRole('link', { name: 'GitHub 저장소' })).toBeNull()
})
```

Run: `npx vitest run src/app/Layout.test.tsx` → FAIL

- [ ] **Step 2: 구현**

`src/styles/features/layout.css.ts`:
```ts
import { style } from '@vanilla-extract/css'
import { fontSize, layout, mq, radius, space, vars, weight } from '../tokens.css'

export const shell = style({ minHeight: '100svh', display: 'flex', flexDirection: 'column' })
export const skip = style({
  position: 'absolute',
  left: space[4],
  top: -60,
  zIndex: 50,
  padding: `${space[2]} ${space[4]}`,
  borderRadius: radius.action,
  background: vars.color.accent,
  color: vars.color.onAccent,
  textDecoration: 'none',
  selectors: { '&:focus-visible': { top: space[2] } },
})
export const header = style({
  position: 'sticky',
  top: 0,
  zIndex: 30,
  width: '100%',
  background: vars.color.canvas,
})
export const headerInner = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: space[2],
  maxWidth: layout.headerMax,
  height: 52,
  margin: '0 auto',
  paddingInline: layout.gutter,
  '@media': { [mq.md]: { height: 60, paddingInline: layout.gutterMd } },
})
export const wordmark = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  color: vars.color.ink,
  fontSize: fontSize.title,
  fontWeight: weight.medium,
  letterSpacing: '-0.01em',
  textDecoration: 'none',
})
export const dot = style({ width: 7, height: 7, borderRadius: radius.pill, background: vars.color.accent, marginTop: 6 })
export const nav = style({ display: 'flex', alignItems: 'center', gap: 2, '@media': { [mq.md]: { gap: space[1] } } })
export const navLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  height: 32,
  paddingInline: 8,
  borderRadius: 8,
  color: vars.color.muted,
  fontSize: fontSize.control,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  selectors: { '&:hover': { background: vars.color.surfaceSubtle, color: vars.color.ink } },
  '@media': { [mq.md]: { paddingInline: 12 } },
})
export const navActive = style({ color: vars.color.ink })
export const themeIcon = style({ display: 'inline-grid', placeItems: 'center' })
export const github = style({ color: vars.color.ink })
export const main = style({
  flex: 1,
  width: '100%',
  maxWidth: layout.maxWidth,
  margin: '0 auto',
  paddingInline: layout.gutter,
  paddingTop: space[4],
  outline: 'none',
  '@media': { [mq.md]: { paddingInline: layout.gutterMd, paddingTop: space[5] } },
})
export const bannerSlot = style({ marginBottom: space[4] })
export const footer = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: space[3],
  justifyContent: 'space-between',
  width: '100%',
  maxWidth: layout.maxWidth,
  margin: '0 auto',
  padding: `${space[8]} ${layout.gutter} ${space[6]}`,
  color: vars.color.muted,
  fontSize: fontSize.meta,
  '@media': { [mq.md]: { paddingInline: layout.gutterMd } },
})
export const footerLink = style({ color: vars.color.muted })
```

`src/styles/features/page.css.ts`:
```ts
import { style } from '@vanilla-extract/css'
import { fontSize, mq, space, vars } from '../tokens.css'

export const page = style({ display: 'grid', gap: space[6], paddingBottom: space[7], '@media': { [mq.md]: { gap: space[7] } } })
export const pageHead = style({ display: 'grid', gap: space[2] })
export const pageTitle = style({ fontSize: fontSize.section, '@media': { [mq.md]: { fontSize: fontSize.sectionMd } } })
export const lead = style({ color: vars.color.muted, fontSize: fontSize.lead })
export const meta = style({ color: vars.color.muted, fontSize: fontSize.meta })
export const reading = style({ display: 'grid', gap: space[4], maxWidth: 640 })
export const list = style({ display: 'grid', gap: space[2], paddingLeft: '1.2em' })
export const bigNumber = style({ fontSize: fontSize.displayMd, color: vars.color.muted, lineHeight: 1 })
```

`src/app/GitHubMark.tsx`:
```tsx
// GitHub Octicon "mark-github" (MIT) 공식 형태
export function GitHubMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
    </svg>
  )
}
```

`src/app/ThemeToggle.tsx`:
```tsx
import { Moon, Sun } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { iconButton } from '../ui/button.css'
import { Icon } from '../ui/Icon'
import * as s from '../styles/features/layout.css'
import { useTheme } from './theme'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const label = theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'
  return (
    <button type="button" className={iconButton} aria-label={label} title={label} onClick={toggle}>
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={theme}
          className={s.themeIcon}
          initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 30, scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          <Icon icon={theme === 'dark' ? Moon : Sun} />
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
```

`src/app/Layout.tsx` 전체 교체:
```tsx
import { Link, NavLink, Outlet } from 'react-router'
import { Banner } from '../components/Banner'
import * as s from '../styles/features/layout.css'
import { cx } from '../ui/cx'
import { GitHubMark } from './GitHubMark'
import { useStore } from './StoreContext'
import { ThemeToggle } from './ThemeToggle'

const SOURCE_URL = import.meta.env.VITE_SOURCE_URL
const navClass = ({ isActive }: { isActive: boolean }) => cx(s.navLink, isActive && s.navActive)

export function Layout() {
  const store = useStore()
  return (
    <div className={s.shell}>
      <a href="#main" className={s.skip}>
        본문 바로가기
      </a>
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link to="/" className={s.wordmark} aria-label="Chessling 홈">
            Chessling
            <span className={s.dot} aria-hidden="true" />
          </Link>
          <nav aria-label="주요 메뉴" className={s.nav}>
            <NavLink to="/events" className={navClass}>
              대회
            </NavLink>
            <NavLink to="/classics" className={navClass}>
              명국
            </NavLink>
            <NavLink to="/forks" className={navClass}>
              내 분기
            </NavLink>
            <ThemeToggle />
            {SOURCE_URL && (
              <a href={SOURCE_URL} className={cx(s.navLink, s.github)} aria-label="GitHub 저장소">
                <GitHubMark />
              </a>
            )}
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} className={s.main}>
        {!store.persistent && (
          <div className={s.bannerSlot}>
            <Banner tone="warn">이 브라우저에서는 저장소를 쓸 수 없어서 분기 대국과 리뷰가 저장되지 않아요.</Banner>
          </div>
        )}
        <Outlet />
      </main>
      <footer className={s.footer}>
        <span>Chessling · GPL-3.0-or-later</span>
        <Link to="/licenses" className={s.footerLink}>
          라이선스·소스 코드
        </Link>
      </footer>
    </div>
  )
}
```

`src/features/NotFound.tsx` 전체 교체:
```tsx
import { House } from 'lucide-react'
import * as p from '../styles/features/page.css'
import { LinkButton } from '../ui/Button'

export function NotFound() {
  return (
    <div className={p.reading}>
      <p className={p.bigNumber} aria-hidden="true">
        404
      </p>
      <h1 className={p.pageTitle}>페이지를 찾을 수 없어요</h1>
      <div>
        <LinkButton to="/" tone="secondary" icon={House}>
          홈으로
        </LinkButton>
      </div>
    </div>
  )
}
```

`src/features/licenses/LicensesPage.tsx`: `DEPENDENCIES` 배열에 다음 항목을 추가하고, 루트 `<div className="card">`를 `<div className={p.reading}>`로, `<h1>`에 `className={p.pageTitle}`를 붙이고, `<ul>`에 `className={p.list}`를 붙인다(`import * as p from '../../styles/features/page.css'`). 기존 문구·링크는 유지한다.
```ts
  { name: 'Pretendard', license: 'OFL-1.1', url: 'https://github.com/orioncactus/pretendard', licenseFile: '/licenses/Pretendard-OFL.txt' },
  { name: 'Lucide', license: 'ISC', url: 'https://lucide.dev' },
  { name: 'Motion', license: 'MIT', url: 'https://motion.dev' },
  { name: 'Vanilla Extract', license: 'MIT', url: 'https://vanilla-extract.style' },
```
그리고 목록 렌더링에서 `d.copying` 링크 옆에 `licenseFile`이 있으면 `<a href={d.licenseFile}>라이선스 전문</a>`을 같은 방식으로 표시한다(배열 요소 타입에 `copying?: boolean; licenseFile?: string`을 명시).

- [ ] **Step 3: 통과 확인**

Run: `npm test && npx tsc --noEmit`
Expected: Layout 테스트 PASS, 기존 routes·HomePage 테스트(“저장되지 않아요” 배너, NotFound 제목 “페이지를 찾을 수 없어요”, 라이선스 링크) PASS.

- [ ] **Step 4: 수동 확인**

`npx vite --port 5199 --strictPort` → 375px(모바일)과 1280px에서 헤더가 한 줄에 들어가는지, 테마 토글로 전체 배경이 300ms 동안 부드럽게 바뀌는지, 새로고침해도 선택이 유지되는지 확인하고 서버를 끈다.

- [ ] **Step 5: 커밋**

```bash
git add -A src
git commit -m "feat(layout): 새 헤더·푸터·테마 토글·본문 바로가기, 404·라이선스 화면" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 쿨톤 보드와 분석 표시 부품 — Board, EvalBar, MoveList, EngineLines, EvalGraph

**Files:**
- Create: `src/styles/features/board.css.ts`, `src/components/judgment.css.ts`, `src/components/evalBar.css.ts`, `src/components/moveList.css.ts`, `src/components/engineLines.css.ts`, `src/components/evalGraph.css.ts`
- Modify: `src/styles/index.css.ts`, `src/components/Board.tsx`, `src/components/EvalBar.tsx`, `src/components/MoveList.tsx`, `src/components/EngineLines.tsx`, `src/components/EvalGraph.tsx`, `src/components/MoveList.test.tsx`, `src/components/EvalGraph.test.tsx`

**Interfaces:**
- Consumes: `vars`, `mq`, `space`, `radius`, `fontSize`, `weight` (Task 4), `MOVE_LABELS`, `JUDGMENT_META` (Task 2), `EASE`
- Produces:
  - 보드: `.cg-wrap cg-board` 쿨톤 체크무늬(`boardLight`/`boardDark`), 마지막 수·선택·이동 가능 칸은 `highlight`. `Board` props 불변
  - `glyphColor: Record<MoveLabel, string>` (`judgment.css.ts`) — 판정별 색 클래스
  - `EvalBar` props 불변. 모바일은 가로 막대(라벨 오른쪽), 768+는 세로 막대(라벨 위). `aria-valuetext` 추가
  - `MoveList` props 불변. 각 수 버튼에 `data-label={label}`
  - `EvalGraph({ scores; current; onSelect; reveal?: boolean })` — `reveal`이면 왼쪽부터 한 번 드러남

- [ ] **Step 1: 테스트 갱신 (실패 상태로)**

`src/components/MoveList.test.tsx`의 세 줄을 바꾼다:
```tsx
  expect(screen.getByRole('button', { name: 'Nf3??' })).toHaveAttribute('data-label', 'blunder')
  expect(screen.getByRole('button', { name: 'e4★' })).toHaveAttribute('data-label', 'best')
  expect(screen.getByRole('button', { name: 'e5' })).toHaveAttribute('data-label', 'good')
```

`src/components/EvalGraph.test.tsx`에 테스트를 추가한다:
```tsx
it('reveal이어도 클릭 영역은 그대로 동작한다', () => {
  const onSelect = vi.fn()
  render(<EvalGraph scores={[{ cp: 0 }, { cp: 50 }, { cp: -20 }]} current={0} onSelect={onSelect} reveal />)
  fireEvent.click(screen.getByLabelText('1번째 포지션으로 이동'))
  expect(onSelect).toHaveBeenCalledWith(1)
})
```

Run: `npx vitest run src/components` → MoveList FAIL (`data-label` 없음)

- [ ] **Step 2: 보드 테마** (`src/styles/features/board.css.ts`)

```ts
import { globalStyle, style } from '@vanilla-extract/css'
import { fontSize, vars } from '../tokens.css'

export const boardRoot = style({ position: 'relative', width: '100%', aspectRatio: '1 / 1' })
export const boardHost = style({ width: '100%', height: '100%' })

// a8(왼쪽 위)이 밝은 칸: 2×2 타일의 왼쪽 위·오른쪽 아래가 밝다
globalStyle('.cg-wrap cg-board', {
  backgroundColor: vars.color.boardLight,
  backgroundImage: `conic-gradient(${vars.color.boardDark} 0deg 90deg, ${vars.color.boardLight} 90deg 180deg, ${vars.color.boardDark} 180deg 270deg, ${vars.color.boardLight} 270deg 360deg)`,
  backgroundSize: '25% 25%',
  borderRadius: 6,
})
globalStyle('.cg-wrap cg-board square.last-move, .cg-wrap cg-board square.selected', { backgroundColor: vars.color.highlight })
globalStyle('.cg-wrap cg-board square.move-dest', {
  background: `radial-gradient(${vars.color.highlight} 22%, transparent 23%)`,
})
globalStyle('.cg-wrap cg-board square.oc.move-dest', {
  background: `radial-gradient(transparent 0%, transparent 79%, ${vars.color.highlight} 80%)`,
})
globalStyle('.cg-wrap cg-board square.check', {
  background: 'radial-gradient(ellipse at center, rgba(199, 50, 50, 0.9) 0%, rgba(199, 50, 50, 0.35) 45%, transparent 72%)',
})
globalStyle('.cg-wrap coords coord', { color: vars.color.muted, fontSize: fontSize.meta, fontWeight: 500 })
```

`src/styles/index.css.ts`에 `import './features/board.css'`를 추가한다.

`src/components/Board.tsx`:
- `import '@lichess-org/chessground/assets/chessground.brown.css'` 줄을 삭제한다(base와 cburnett는 유지).
- `import { boardHost, boardRoot } from '../styles/features/board.css'`를 추가한다.
- 반환부를 다음으로 바꾼다:
```tsx
  return (
    <div className={boardRoot}>
      <div ref={host} className={boardHost} />
    </div>
  )
```

- [ ] **Step 3: 판정 색과 평가 바**

`src/components/judgment.css.ts`:
```ts
import { styleVariants } from '@vanilla-extract/css'
import { MOVE_LABELS, type MoveLabel } from '../engine/judge'
import { vars } from '../styles/tokens.css'

export const glyphColor = styleVariants(
  Object.fromEntries(MOVE_LABELS.map((l) => [l, { color: vars.color.judgment[l] }])) as Record<MoveLabel, { color: string }>,
)
```

`src/components/evalBar.css.ts`:
```ts
import { createVar, style } from '@vanilla-extract/css'
import { fontSize, mq, radius, space, vars, weight } from '../styles/tokens.css'

export const whiteShare = createVar()

export const root = style({
  vars: { [whiteShare]: '50%' },
  display: 'flex',
  alignItems: 'center',
  gap: space[3],
  '@media': { [mq.md]: { flexDirection: 'column-reverse', height: '100%', gap: space[2] } },
})
export const track = style({
  display: 'flex',
  flex: 1,
  height: 12,
  overflow: 'hidden',
  borderRadius: radius.pill,
  background: vars.color.evalBlack,
  outline: `1px solid ${vars.color.line}`,
  selectors: { [`${root}[data-orientation="black"] &`]: { flexDirection: 'row-reverse' } },
  '@media': {
    [mq.md]: {
      width: 12,
      height: 'auto',
      alignSelf: 'center',
      flexDirection: 'column-reverse',
      selectors: { [`${root}[data-orientation="black"] &`]: { flexDirection: 'column' } },
    },
  },
})
export const fill = style({
  width: whiteShare,
  background: vars.color.evalWhite,
  transition: 'width 300ms ease, height 300ms ease',
  '@media': { [mq.md]: { width: '100%', height: whiteShare } },
})
export const label = style({
  minWidth: '3.4em',
  textAlign: 'right',
  fontSize: fontSize.meta,
  fontWeight: weight.medium,
  fontVariantNumeric: 'tabular-nums',
  '@media': { [mq.md]: { textAlign: 'center' } },
})
```

`src/components/EvalBar.tsx` 전체 교체:
```tsx
import { assignInlineVars } from '@vanilla-extract/dynamic'
import type { Color } from '../chess/types'
import { formatScore, winPercent, type Score } from '../engine/classify'
import * as s from './evalBar.css'

export function EvalBar({ score, orientation }: { score: Score | null; orientation: Color }) {
  const white = score ? winPercent(score) : 50
  const text = score ? formatScore(score) : '…'
  return (
    <div
      className={s.root}
      data-orientation={orientation}
      role="meter"
      aria-label="평가"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(white)}
      aria-valuetext={score ? `백 기준 ${text}` : '분석 중'}
      style={assignInlineVars({ [s.whiteShare]: `${white}%` })}
    >
      <div className={s.track}>
        <div className={s.fill} />
      </div>
      <span className={s.label}>{text}</span>
    </div>
  )
}
```

- [ ] **Step 4: 기보·엔진 라인·평가 그래프**

`src/components/moveList.css.ts`:
```ts
import { style } from '@vanilla-extract/css'
import { fontSize, radius, vars, weight } from '../styles/tokens.css'

export const list = style({ display: 'flex', flexWrap: 'wrap', gap: '2px 6px', listStyle: 'none' })
export const item = style({ display: 'inline-flex', alignItems: 'center', gap: 2 })
export const number = style({ color: vars.color.muted, fontSize: fontSize.meta, fontVariantNumeric: 'tabular-nums' })
export const move = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 2,
  minHeight: 32,
  paddingInline: 6,
  border: 0,
  borderRadius: 8,
  background: 'transparent',
  color: vars.color.ink,
  fontSize: fontSize.control,
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: vars.color.surface },
    '&[aria-current="step"]': { background: vars.color.surface, fontWeight: weight.medium },
  },
})
export const glyph = style({ fontWeight: weight.medium, fontSize: fontSize.meta })
```

`src/components/MoveList.tsx`: 로직은 그대로 두고 className만 바꾼다(`import * as s from './moveList.css'`, `import { glyphColor } from './judgment.css'`, `import { cx } from '../ui/cx'`):
- `<ol className="movelist">` → `<ol className={s.list}>`
- `<li key={i}>` → `<li key={i} className={s.item}>`
- `<span className="move-no">` → `<span className={s.number}>`
- 버튼: `className={label ? \`label-${label}\` : undefined}` → `className={s.move}` 그리고 `data-label={label ?? undefined}` 추가
- 기호: `<span className="glyph">` → `<span className={cx(s.glyph, glyphColor[label])}>`

`src/components/engineLines.css.ts`:
```ts
import { style } from '@vanilla-extract/css'
import { fontSize, vars, weight } from '../styles/tokens.css'

export const list = style({ display: 'grid', gap: 8, listStyle: 'none' })
export const line = style({ display: 'flex', gap: 12, alignItems: 'baseline', fontSize: fontSize.control, minWidth: 0 })
export const score = style({ flexShrink: 0, minWidth: '4.2em', fontWeight: weight.medium, fontVariantNumeric: 'tabular-nums' })
export const pv = style({ color: vars.color.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })
```

`src/components/EngineLines.tsx` 전체 교체:
```tsx
import { pvToSan } from '../chess/pgn'
import { formatScore } from '../engine/classify'
import type { EngineLine } from '../engine/UciEngine'
import * as s from './engineLines.css'

export function EngineLines({ fen, lines }: { fen: string; lines: EngineLine[] }) {
  return (
    <ul className={s.list} aria-label="엔진 라인">
      {lines.map((l) => (
        <li key={l.multipv} className={s.line}>
          <strong className={s.score}>{formatScore(l.score)}</strong>
          <span className={s.pv}>{pvToSan(fen, l.pv, 8).join(' ')}</span>
        </li>
      ))}
    </ul>
  )
}
```

`src/components/evalGraph.css.ts`:
```ts
import { style } from '@vanilla-extract/css'
import { radius, vars } from '../styles/tokens.css'

export const frame = style({ transformOrigin: 'left center' })
export const svg = style({ display: 'block', width: '100%', height: 88, borderRadius: radius.action, background: vars.color.surfaceSubtle, cursor: 'pointer' })
export const area = style({ fill: vars.color.muted, fillOpacity: 0.35 })
export const mid = style({ stroke: vars.color.line, strokeWidth: 1, strokeDasharray: '4 4' })
export const cursor = style({ stroke: vars.color.accent, strokeWidth: 2 })
```

`src/components/EvalGraph.tsx` 전체 교체:
```tsx
import { motion } from 'motion/react'
import { winPercent, type Score } from '../engine/classify'
import { EASE } from '../ui/motion'
import * as s from './evalGraph.css'

const W = 600
const H = 100

export function EvalGraph({
  scores,
  current,
  onSelect,
  reveal = false,
}: {
  scores: (Score | null)[]
  current: number
  onSelect: (i: number) => void
  reveal?: boolean
}) {
  const n = scores.length
  if (n < 2) return null
  const step = W / (n - 1)
  const points = scores.map((sc, i) => `${i * step},${H - (sc ? winPercent(sc) : 50)}`).join(' ')
  return (
    <motion.div
      className={s.frame}
      initial={reveal ? { scaleX: 0, opacity: 0 } : false}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ duration: 0.9, ease: EASE }}
    >
      <svg className={s.svg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="group" aria-label="평가 그래프">
        <polygon points={`0,${H} ${points} ${W},${H}`} className={s.area} />
        <line x1={0} x2={W} y1={H / 2} y2={H / 2} className={s.mid} />
        <line x1={current * step} x2={current * step} y1={0} y2={H} className={s.cursor} />
        {scores.map((_, i) => (
          <rect
            key={i}
            x={Math.max(0, i * step - step / 2)}
            y={0}
            width={step}
            height={H}
            fill="transparent"
            aria-label={`${i}번째 포지션으로 이동`}
            onClick={() => onSelect(i)}
          />
        ))}
      </svg>
    </motion.div>
  )
}
```

- [ ] **Step 5: 통과 확인**

Run: `npm test && npx tsc --noEmit` → PASS

- [ ] **Step 6: 보드 방향 확인 (필수)**

`npx vite --port 5199 --strictPort` → `/game/classic/opera-game`에서 **a1(왼쪽 아래)이 어두운 칸, h1(오른쪽 아래)이 밝은 칸**인지 확인한다. [보드 뒤집기]를 해도 오른쪽 아래가 밝은 칸이어야 한다. 반대로 나오면 conic-gradient의 네 구간 색 순서를 뒤집는다(dark↔light). 라이트·다크 모드 모두에서 기물과 좌표가 잘 보이는지 확인하고 서버를 끈다. 결과를 보고서에 적는다.

- [ ] **Step 7: 커밋**

```bash
git add -A src package.json package-lock.json
git commit -m "feat(board): 쿨톤 보드, 새 평가 바·기보·엔진 라인·평가 그래프" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 뷰어 재구성 — 보드 중심 레이아웃, 하단 조작 막대, 스와이프, 기보 시트

**Files:**
- Create: `src/styles/features/gameLayout.css.ts`, `src/features/viewer/ViewerHeader.tsx`, `src/features/viewer/ViewerControls.tsx`, `src/features/viewer/useSwipe.ts`, `src/features/viewer/useSwipe.test.tsx`
- Modify: `src/features/viewer/ViewerPage.tsx` (전체 교체), `src/features/viewer/ViewerPage.test.tsx`, `src/features/viewer/ReviewPanel.tsx`
- Delete: `src/features/viewer/GameHeader.tsx`

**Interfaces:**
- Consumes: `ControlBar`, `BarButton`, `IconButton`, `Button`, `Badge`, `Disclosure`, `Dialog` (Task 5·6), Task 8의 표시 부품
- Produces:
  - `gameLayout.css.ts`: `page`, `header`, `headRow`, `title`, `vs`, `meta`, `result`, `stage`, `boardWrap`, `panel`, `controls`, `note` — 뷰어와 분기 대국(Task 13)이 공유
  - `ViewerHeader({ record; onRefresh?; onFlip; children? })` — h1에 대국자, [보드 뒤집기] IconButton, 진행 중 배지·[새로고침]
  - `ViewerControls({ ply; last; onGo(p); onOpenMoves; onFork; forkDisabled; hint?; onHint?; hintDisabled?; className? })` — 그룹 이름 "수 이동". 버튼: 처음, 이전 수, `기보 전체 보기 (n / N)`, 다음 수, 마지막, (onHint가 있으면) 힌트, 여기서 분기
  - `useSwipe({ onPrev; onNext; threshold? })` → `{ onTouchStart, onTouchEnd }` (가로 40px 이상, 세로보다 가로가 클 때)
  - 뷰어 동작: 실시간 분석은 리뷰 중이 아니면 항상 켜짐(평가 바용). **최선 수 화살표는 "엔진 라인"을 펼쳤을 때만**. 기보는 "기보 전체" 접이식 + 시트
- `ReviewPanel`은 idle/running/error만 그리고 done이면 `null`을 반환한다(done 표시는 Task 10의 ReviewSummary). 이 태스크에서는 임시로 done 요약을 ReviewPanel 밖에서 한 줄로 보여준다.

- [ ] **Step 1: 스와이프 테스트 작성** (`src/features/viewer/useSwipe.test.tsx`)

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useSwipe } from './useSwipe'

afterEach(cleanup)

function Probe({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  const swipe = useSwipe({ onPrev, onNext })
  return <div data-testid="area" {...swipe} />
}

it('왼쪽 스와이프는 다음, 오른쪽은 이전, 세로·짧은 움직임은 무시', () => {
  const onPrev = vi.fn()
  const onNext = vi.fn()
  render(<Probe onPrev={onPrev} onNext={onNext} />)
  const area = screen.getByTestId('area')
  fireEvent.touchStart(area, { touches: [{ clientX: 300, clientY: 100 }] })
  fireEvent.touchEnd(area, { changedTouches: [{ clientX: 200, clientY: 110 }] })
  expect(onNext).toHaveBeenCalledTimes(1)
  fireEvent.touchStart(area, { touches: [{ clientX: 100, clientY: 100 }] })
  fireEvent.touchEnd(area, { changedTouches: [{ clientX: 180, clientY: 100 }] })
  expect(onPrev).toHaveBeenCalledTimes(1)
  fireEvent.touchStart(area, { touches: [{ clientX: 100, clientY: 100 }] })
  fireEvent.touchEnd(area, { changedTouches: [{ clientX: 120, clientY: 100 }] })
  fireEvent.touchStart(area, { touches: [{ clientX: 100, clientY: 100 }] })
  fireEvent.touchEnd(area, { changedTouches: [{ clientX: 160, clientY: 300 }] })
  expect(onNext).toHaveBeenCalledTimes(1)
  expect(onPrev).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: 뷰어 테스트 갱신 (실패 상태로)**

`src/features/viewer/ViewerPage.test.tsx`:
1. 파일 상단 import에 `import { boardProps } from '../../test/boardMock'`를 추가한다.
2. 첫 테스트에서 `fireEvent.keyDown(window, { key: 'End' })` 다음 줄을 다음 두 줄로 바꾼다:
```tsx
    fireEvent.click(screen.getByRole('button', { name: '기보 전체' }))
    expect(screen.getByRole('button', { name: 'Rd8#' })).toHaveAttribute('aria-current', 'step')
```
3. `'기보의 수를 클릭하면 이동한다'` 테스트의 본문을 다음으로 바꾼다:
```tsx
    renderRoute('/game/classic/opera-game')
    fireEvent.click(await screen.findByRole('button', { name: '기보 전체' }))
    fireEvent.click(screen.getByRole('button', { name: 'e4' }))
    expect(screen.getByTestId('board')).toHaveAttribute('data-fen', AFTER_E4)
```
4. `'엔진 라인 체크박스에 포커스가 있어도 화살표 키로 이동한다'` 테스트를 다음으로 교체한다:
```tsx
  it('접이식 버튼에 포커스가 있어도 화살표 키로 이동한다', async () => {
    renderRoute('/game/classic/opera-game', { engines: { analysis: analysisEngine() } })
    const trigger = await screen.findByRole('button', { name: '엔진 라인' })
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowRight' })
    expect(screen.getByTestId('board')).toHaveAttribute('data-fen', AFTER_E4)
  })
```
5. `describe('ViewerPage')` 안에 다음 테스트를 추가한다:
```tsx
  it('최선 수 화살표는 엔진 라인을 펼쳤을 때만 그린다', async () => {
    renderRoute('/game/classic/opera-game', { engines: { analysis: analysisEngine() } })
    expect((await screen.findAllByText('+0.25')).length).toBeGreaterThan(0)
    expect(boardProps.current?.shapes ?? []).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: '엔진 라인' }))
    await waitFor(() => expect(boardProps.current?.shapes).toHaveLength(1))
  })

  it('가운데 카운터로 기보 시트를 열고, 수를 고르면 닫힌다', async () => {
    renderRoute('/game/classic/opera-game')
    fireEvent.click(await screen.findByRole('button', { name: /기보 전체 보기/ }))
    const sheet = screen.getByRole('dialog', { name: '기보' })
    fireEvent.click(within(sheet).getByRole('button', { name: 'e4' }))
    expect(screen.queryByRole('dialog', { name: '기보' })).toBeNull()
    expect(screen.getByTestId('board')).toHaveAttribute('data-fen', AFTER_E4)
  })

  it('보드를 스와이프해 수를 넘긴다', async () => {
    renderRoute('/game/classic/opera-game')
    const area = await screen.findByTestId('board-swipe')
    fireEvent.touchStart(area, { touches: [{ clientX: 300, clientY: 100 }] })
    fireEvent.touchEnd(area, { changedTouches: [{ clientX: 200, clientY: 100 }] })
    expect(screen.getByTestId('board')).toHaveAttribute('data-fen', AFTER_E4)
  })

  it('첫 포지션에서는 처음·이전 수 버튼이 비활성', async () => {
    renderRoute('/game/classic/opera-game')
    expect(await screen.findByRole('button', { name: '처음' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '이전 수' })).toBeDisabled()
  })
```

Run: `npx vitest run src/features/viewer` → FAIL

- [ ] **Step 3: 공통 게임 레이아웃** (`src/styles/features/gameLayout.css.ts`)

```ts
import { style } from '@vanilla-extract/css'
import { fontSize, mq, space, vars, weight } from '../tokens.css'

export const page = style({
  display: 'grid',
  gap: space[4],
  paddingBottom: `calc(88px + env(safe-area-inset-bottom))`,
  '@media': {
    [mq.md]: {
      gridTemplateColumns: 'minmax(0, 640px) minmax(280px, 1fr)',
      columnGap: space[6],
      rowGap: space[4],
      alignItems: 'start',
      paddingBottom: space[7],
    },
  },
})
export const header = style({ display: 'grid', gap: space[2], '@media': { [mq.md]: { gridColumn: '1 / -1' } } })
export const headRow = style({ display: 'flex', alignItems: 'center', gap: space[2] })
export const title = style({
  flex: 1,
  minWidth: 0,
  fontSize: fontSize.title,
  '@media': { [mq.md]: { fontSize: fontSize.section } },
})
export const vs = style({ color: vars.color.muted, fontWeight: weight.regular })
export const meta = style({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: space[2],
  color: vars.color.muted,
  fontSize: fontSize.meta,
})
export const result = style({ color: vars.color.ink, fontWeight: weight.medium, fontVariantNumeric: 'tabular-nums' })
export const stage = style({
  display: 'grid',
  gap: space[3],
  '@media': { [mq.md]: { gridColumn: 1, gridTemplateColumns: 'auto minmax(0, 1fr)', alignItems: 'stretch' } },
})
export const boardWrap = style({ width: '100%', touchAction: 'pan-y' })
export const panel = style({
  display: 'grid',
  gap: space[4],
  alignContent: 'start',
  '@media': { [mq.md]: { gridColumn: 2, gridRow: '2 / span 2' } },
})
export const controls = style({ '@media': { [mq.md]: { gridColumn: 1 } } })
export const note = style({ color: vars.color.muted, fontSize: fontSize.control })
```

- [ ] **Step 4: 구현 — 헤더·조작 막대·스와이프**

`src/features/viewer/useSwipe.ts`:
```ts
import { useRef, type TouchEvent } from 'react'

export function useSwipe({ onPrev, onNext, threshold = 40 }: { onPrev: () => void; onNext: () => void; threshold?: number }) {
  const start = useRef<{ x: number; y: number } | null>(null)
  return {
    onTouchStart: (e: TouchEvent) => {
      const t = e.touches[0]
      start.current = t ? { x: t.clientX, y: t.clientY } : null
    },
    onTouchEnd: (e: TouchEvent) => {
      const s = start.current
      start.current = null
      const t = e.changedTouches[0]
      if (!s || !t) return
      const dx = t.clientX - s.x
      const dy = t.clientY - s.y
      if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) return
      if (dx < 0) onNext()
      else onPrev()
    },
  }
}
```

`src/features/viewer/ViewerHeader.tsx`:
```tsx
import { ArrowUpDown, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import type { GameRecord } from '../../chess/types'
import { playerLabel } from '../../components/playerLabel'
import * as g from '../../styles/features/gameLayout.css'
import { Badge } from '../../ui/Badge'
import { Button, IconButton } from '../../ui/Button'

export function ViewerHeader({
  record,
  onRefresh,
  onFlip,
  children,
}: {
  record: GameRecord
  onRefresh?: () => void
  onFlip: () => void
  children?: ReactNode
}) {
  const live = record.ref.kind === 'broadcast' && record.result === '*'
  const meta = [record.event, record.date, record.timeControl].filter(Boolean).join(' · ')
  return (
    <header className={g.header}>
      <div className={g.headRow}>
        <h1 className={g.title}>
          {playerLabel(record.white)} <span className={g.vs}>vs</span> {playerLabel(record.black)}
        </h1>
        <IconButton icon={ArrowUpDown} label="보드 뒤집기" onClick={onFlip} />
      </div>
      <p className={g.meta}>
        {meta && <span>{meta}</span>}
        <span className={g.result}>{record.result}</span>
        {live && (
          <>
            <Badge tone="live">진행 중</Badge>
            <Button tone="ghost" size="sm" icon={RefreshCw} onClick={onRefresh}>
              새로고침
            </Button>
          </>
        )}
      </p>
      {children}
    </header>
  )
}
```

`src/features/viewer/ViewerControls.tsx`:
```tsx
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Lightbulb, Split } from 'lucide-react'
import { BarButton, ControlBar } from '../../ui/ControlBar'

export interface ViewerControlsProps {
  ply: number
  last: number
  onGo: (ply: number) => void
  onOpenMoves: () => void
  onFork: () => void
  forkDisabled: boolean
  hint?: boolean
  onHint?: () => void
  hintDisabled?: boolean
  className?: string
}

export function ViewerControls({ ply, last, onGo, onOpenMoves, onFork, forkDisabled, hint, onHint, hintDisabled, className }: ViewerControlsProps) {
  return (
    <ControlBar label="수 이동" className={className}>
      <BarButton icon={ChevronsLeft} label="처음" disabled={ply === 0} onClick={() => onGo(0)} />
      <BarButton icon={ChevronLeft} label="이전 수" disabled={ply === 0} onClick={() => onGo(ply - 1)} />
      <BarButton label={`기보 전체 보기 (${ply} / ${last})`} onClick={onOpenMoves}>
        <span>
          {ply} / {last}
        </span>
      </BarButton>
      <BarButton icon={ChevronRight} label="다음 수" disabled={ply === last} onClick={() => onGo(ply + 1)} />
      <BarButton icon={ChevronsRight} label="마지막" disabled={ply === last} onClick={() => onGo(last)} />
      {onHint && <BarButton icon={Lightbulb} label="힌트" pressed={Boolean(hint)} disabled={hintDisabled} onClick={onHint} />}
      <BarButton icon={Split} label="여기서 분기" disabled={forkDisabled} onClick={onFork} />
    </ControlBar>
  )
}
```

`src/features/viewer/ReviewPanel.tsx` 전체 교체 (done 상태는 그리지 않는다):
```tsx
import { Play } from 'lucide-react'
import { ErrorView } from '../../components/ErrorView'
import * as g from '../../styles/features/gameLayout.css'
import { Button } from '../../ui/Button'
import type { ReviewState } from './useReview'

export function ReviewPanel({ state, onStart }: { state: ReviewState; onStart: () => void }) {
  switch (state.status) {
    case 'idle':
      return (
        <div>
          <Button icon={Play} onClick={onStart}>
            리뷰 실행
          </Button>
        </div>
      )
    case 'running':
      return (
        <p className={g.note} role="status">
          <progress max={state.total} value={state.done} /> 분석 중 {state.done}/{state.total}
        </p>
      )
    case 'error':
      return <ErrorView key={state.attempt} error={state.error} onRetry={onStart} />
    case 'done':
      return null
  }
}
```

- [ ] **Step 5: 뷰어 페이지 교체** (`src/features/viewer/ViewerPage.tsx` 전체)

```tsx
import { useQueryClient } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useStore } from '../../app/StoreContext'
import { createFork } from '../../chess/fork'
import { pathToRef, refKey, type GameRef } from '../../chess/gameRef'
import { isCheck, turnOf } from '../../chess/pgn'
import type { Color, GameRecord, Ply } from '../../chess/types'
import { Banner } from '../../components/Banner'
import { Board } from '../../components/Board'
import { bestMoveArrow } from '../../components/boardShapes'
import { EngineLines } from '../../components/EngineLines'
import { ErrorView } from '../../components/ErrorView'
import { EvalBar } from '../../components/EvalBar'
import { EvalGraph } from '../../components/EvalGraph'
import { MoveList } from '../../components/MoveList'
import { isMultiThreaded } from '../../engine/engines'
import { terminalScore } from '../../engine/review'
import { queryKeys } from '../../sources'
import * as g from '../../styles/features/gameLayout.css'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { Disclosure } from '../../ui/Disclosure'
import { NotFound } from '../NotFound'
import { ForkDialog } from '../play/ForkDialog'
import { ReviewPanel } from './ReviewPanel'
import { useGame } from './useGame'
import { useLiveAnalysis } from './useLiveAnalysis'
import { useReview } from './useReview'
import { useSwipe } from './useSwipe'
import { ViewerControls } from './ViewerControls'
import { ViewerHeader } from './ViewerHeader'

export function ViewerPage() {
  const { pathname } = useLocation()
  const ref = useMemo(() => pathToRef(pathname), [pathname])
  if (!ref) return <NotFound />
  return <GameViewer key={refKey(ref)} gameRef={ref} />
}

function GameViewer({ gameRef }: { gameRef: GameRef }) {
  const qc = useQueryClient()
  const game = useGame(gameRef)
  if (game.isPending) return <p className={g.note}>불러오는 중…</p>
  if (game.isError) return <ErrorView key={game.errorUpdatedAt} error={game.error} onRetry={() => void game.refetch()} />
  if (game.data.record.variant !== 'standard') return <p className={g.note}>지원하지 않는 변형 체스예요.</p>
  const refresh = async () => {
    if (gameRef.kind === 'broadcast') await qc.invalidateQueries({ queryKey: queryKeys.broadcastRound(gameRef.roundId) })
    await qc.invalidateQueries({ queryKey: queryKeys.game(gameRef) })
  }
  return <LoadedViewer gameRef={gameRef} record={game.data.record} plies={game.data.plies} onRefresh={() => void refresh()} />
}

interface LoadedViewerProps {
  gameRef: GameRef
  record: GameRecord
  plies: Ply[]
  onRefresh: () => void
}

function LoadedViewer({ gameRef, record, plies, onRefresh }: LoadedViewerProps) {
  const [ply, setPly] = useState(0)
  const [orientation, setOrientation] = useState<Color>('white')
  const [linesOpen, setLinesOpen] = useState(false)
  const [movesOpen, setMovesOpen] = useState(false)
  const [forking, setForking] = useState(false)
  const [forkError, setForkError] = useState(false)
  const [forkPending, setForkPending] = useState(false)
  const forkBusy = useRef(false)
  const qc = useQueryClient()
  const store = useStore()
  const navigate = useNavigate()
  const last = plies.length - 1
  const go = useCallback((p: number) => setPly(Math.max(0, Math.min(last, p))), [last])
  const fen = plies[ply].fen

  const startFork = async ({ playerColor, engineElo }: { playerColor: Color; engineElo: number }) => {
    if (forkBusy.current) return
    const fork = createFork({
      origin: gameRef,
      originPly: ply,
      startFen: fen,
      playerColor,
      engineElo,
      title: `${record.white.name} vs ${record.black.name} · ${Math.ceil(ply / 2)}수째에서 분기`,
    })
    forkBusy.current = true
    setForkPending(true)
    setForkError(false)
    try {
      await store.forks.put(fork)
    } catch {
      forkBusy.current = false
      setForkPending(false)
      setForkError(true)
      return
    }
    await qc.invalidateQueries({ queryKey: ['forks'] })
    navigate(`/play/${fork.id}`)
  }

  const { state: review, start: startReview } = useReview(gameRef, plies, record.result !== '*')
  const reviewing = review.status === 'running'
  const live = useLiveAnalysis(fen, !reviewing)
  useKeyboardNav(last, setPly, !forking && !movesOpen)
  const swipe = useSwipe({
    onPrev: () => setPly((p) => Math.max(0, p - 1)),
    onNext: () => setPly((p) => Math.min(last, p + 1)),
  })

  const positions = review.status === 'done' ? review.review.positions : review.status === 'running' ? review.partial : []
  const labels = review.status === 'done' ? review.review.labels : undefined
  const graphScores = useMemo(() => plies.map((_, i) => positions[i]?.score ?? null), [plies, positions])
  const terminal = useMemo(() => terminalScore(fen), [fen])
  const score = positions[ply]?.score ?? terminal ?? live.lines[0]?.score ?? null
  const lineUci = linesOpen && !reviewing ? live.lines[0]?.pv[0] : undefined
  const shapes = useMemo(() => (lineUci ? [bestMoveArrow(lineUci)] : []), [lineUci])

  return (
    <div className={g.page}>
      <ViewerHeader record={record} onRefresh={onRefresh} onFlip={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}>
        {!isMultiThreaded() && <Banner>이 브라우저에서는 엔진이 싱글스레드로 동작해서 분석이 느릴 수 있어요.</Banner>}
        {live.error !== null && <Banner tone="warn">엔진을 실행할 수 없어요. 새로고침해 주세요.</Banner>}
      </ViewerHeader>

      <div className={g.stage}>
        <EvalBar score={score} orientation={orientation} />
        <div className={g.boardWrap} data-testid="board-swipe" {...swipe}>
          <Board fen={fen} orientation={orientation} lastMoveUci={plies[ply].uci} check={isCheck(fen)} shapes={shapes} />
        </div>
      </div>

      <div className={g.panel}>
        <ReviewPanel state={review} onStart={() => void startReview()} />
        {review.status === 'done' && (
          <p className={g.note}>
            백 정확도 {fmt(review.review.accuracy.white)} · 흑 정확도 {fmt(review.review.accuracy.black)}{' '}
            <Button tone="ghost" size="sm" icon={RotateCcw} onClick={() => void startReview()}>
              리뷰 다시 실행
            </Button>
          </p>
        )}
        {positions.length > 0 && (
          <EvalGraph key={review.status} scores={graphScores} current={ply} onSelect={go} reveal={review.status === 'done'} />
        )}
        <Disclosure title="엔진 라인" open={linesOpen} onOpenChange={setLinesOpen}>
          {reviewing ? <p className={g.note}>리뷰 중에는 실시간 분석을 잠시 멈춰요.</p> : <EngineLines fen={fen} lines={live.lines} />}
        </Disclosure>
        <Disclosure title="기보 전체">
          <MoveList plies={plies} current={ply} onSelect={go} labels={labels} />
        </Disclosure>
      </div>

      <ViewerControls
        className={g.controls}
        ply={ply}
        last={last}
        onGo={go}
        onOpenMoves={() => setMovesOpen(true)}
        onFork={() => setForking(true)}
        forkDisabled={terminal !== null}
      />

      {movesOpen && (
        <Dialog variant="sheet" title="기보" onClose={() => setMovesOpen(false)}>
          <MoveList
            plies={plies}
            current={ply}
            labels={labels}
            onSelect={(i) => {
              go(i)
              setMovesOpen(false)
            }}
          />
        </Dialog>
      )}
      {forking && (
        <ForkDialog
          defaultColor={turnOf(fen) === 'w' ? 'white' : 'black'}
          pending={forkPending}
          error={forkError}
          onCancel={() => setForking(false)}
          onConfirm={(o) => void startFork(o)}
        />
      )}
    </div>
  )
}

const fmt = (v: number | null) => (v === null ? '-' : `${v.toFixed(1)}%`)

function useKeyboardNav(last: number, setPly: Dispatch<SetStateAction<number>>, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      if (isTextEntry(e.target)) return
      if (e.key === 'ArrowLeft') setPly((p) => Math.max(0, p - 1))
      else if (e.key === 'ArrowRight') setPly((p) => Math.min(last, p + 1))
      else if (e.key === 'Home') setPly(0)
      else if (e.key === 'End') setPly(last)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last, setPly, enabled])
}

const TEXT_INPUT_TYPES = new Set(['text', 'range', 'radio', 'search', 'email', 'url', 'password', 'number', 'tel'])

function isTextEntry(target: EventTarget | null): boolean {
  if (target instanceof Element && target.closest('dialog, [role="dialog"]')) return true
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true
  if (target instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(target.type)
  return target instanceof HTMLElement && target.isContentEditable
}
```

`src/features/viewer/GameHeader.tsx`를 삭제한다(`git rm src/features/viewer/GameHeader.tsx`).

- [ ] **Step 6: 통과 확인**

Run: `npx vitest run src/features/viewer && npm test && npx tsc --noEmit`
Expected: 전체 PASS. (`useReview` 테스트의 ErrorView attempt, `리뷰 다시 실행`, `/백 정확도/` 사례는 새 한 줄 요약으로 통과한다.)

- [ ] **Step 7: 수동 확인 (모바일 우선)**

`npx vite --port 5199 --strictPort` → `/game/classic/opera-game`을 **375px 폭**에서 연다.
- 순서가 가로 평가 바 → 보드(전체 폭) → 리뷰 버튼 → 접이식 → 하단 고정 조작 막대인지 확인한다.
- 조작 막대가 콘텐츠를 가리지 않는지 확인한다.
- 개발자 도구 터치 에뮬레이션으로 스와이프가 되는지 확인한다.
- 1280px에서 2열로 바뀌고 평가 바가 세로가 되는지 확인한다.

확인한 뒤 서버를 끄고, 결과를 보고서에 적는다.

- [ ] **Step 8: 커밋**

```bash
git add -A src
git commit -m "feat(viewer): 보드 중심 모바일 레이아웃, 하단 조작 막대, 스와이프, 기보 시트" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 판정 카드·힌트·리뷰 요약

**Files:**
- Create: `src/chess/moveNumber.ts`, `src/chess/moveNumber.test.ts`, `src/ui/useDebounced.ts`, `src/features/viewer/JudgmentCard.tsx`, `src/features/viewer/ReviewSummary.tsx`, `src/styles/features/viewer.css.ts`
- Modify: `src/components/MoveList.tsx`(번호 계산을 moveNumber로), `src/features/viewer/ViewerPage.tsx`, `src/features/viewer/ViewerPage.test.tsx`

**Interfaces:**
- Consumes: `JUDGMENT_META`, `countJudgments`, `MoveLabel` (Task 2), `GameReview` (Task 3), `glyphColor` (Task 8), `ReviewPanel`, `ViewerControls`의 `hint/onHint/hintDisabled` (Task 9)
- Produces:
  - `moveNumberOf(startFen: string, plyIndex: number): { number: number; white: boolean }`, `moveTitle(plies: Ply[], i: number): string` (예: `"1. e4"`, `"1... e5"`)
  - `useDebounced<T>(value: T, ms: number): T`
  - `JudgmentCard({ plies; ply; review: ReviewState; onStartReview; hint: boolean; hintUci: string | null })` — `<section aria-label="이번 수 판정">`. 판정 이름·기호·형세 변화, 리뷰 전에는 ReviewPanel, 힌트가 켜지면 `힌트: <SAN>`. 스크린리더용 `aria-live="polite"` 문장은 400ms 디바운스
  - `ReviewSummary({ review: GameReview; startTurn: Turn; onRerun })` — "백 정확도 x% · 흑 정확도 y%", [리뷰 다시 실행], 접이식 "판정 요약" 표
  - 뷰어: [힌트] 토글. 힌트 수는 리뷰 결과의 `positions[ply].best` → 없으면 실시간 1순위 수. 수를 옮기면 힌트가 꺼진다. 화살표 = 힌트 수(켜졌을 때) + 엔진 라인 1순위(펼쳤을 때), 중복 제거

- [ ] **Step 1: 실패하는 테스트 작성**

`src/chess/moveNumber.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { moveNumberOf, moveTitle } from './moveNumber'
import { pgnToPlies } from './pgn'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('moveNumber', () => {
  it('백부터 시작', () => {
    expect(moveNumberOf(START, 1)).toEqual({ number: 1, white: true })
    expect(moveNumberOf(START, 2)).toEqual({ number: 1, white: false })
    expect(moveNumberOf(START, 3)).toEqual({ number: 2, white: true })
  })
  it('흑부터 시작', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 5'
    expect(moveNumberOf(fen, 1)).toEqual({ number: 5, white: false })
    expect(moveNumberOf(fen, 2)).toEqual({ number: 6, white: true })
  })
  it('moveTitle', () => {
    const plies = pgnToPlies('1. e4 e5 2. Nf3 *')
    expect(moveTitle(plies, 1)).toBe('1. e4')
    expect(moveTitle(plies, 2)).toBe('1... e5')
    expect(moveTitle(plies, 3)).toBe('2. Nf3')
  })
})
```

`src/features/viewer/ViewerPage.test.tsx`의 `describe` 안에 추가:
```tsx
  it('리뷰 전에는 판정 카드에 리뷰 안내가, 리뷰 후에는 판정이 보인다', async () => {
    renderRoute('/game/classic/opera-game', { engines: { analysis: analysisEngine() } })
    const card = await screen.findByRole('region', { name: '이번 수 판정' })
    expect(within(card).getByText('시작 포지션')).toBeInTheDocument()
    fireEvent.click(within(card).getByRole('button', { name: '리뷰 실행' }))
    expect(await screen.findByText(/백 정확도/)).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(within(card).getByText('1. e4')).toBeInTheDocument()
    expect(within(card).getByText('최선')).toBeInTheDocument()
    expect(within(card).getByText(/형세/)).toBeInTheDocument()
  })

  it('힌트는 기본으로 숨기고, 누르면 보이며, 수를 옮기면 다시 숨긴다', async () => {
    renderRoute('/game/classic/opera-game', { engines: { analysis: analysisEngine() } })
    const card = await screen.findByRole('region', { name: '이번 수 판정' })
    await screen.findAllByText('+0.25')
    expect(within(card).queryByText(/힌트:/)).toBeNull()
    const hint = screen.getByRole('button', { name: '힌트' })
    await waitFor(() => expect(hint).toBeEnabled())
    fireEvent.click(hint)
    expect(hint).toHaveAttribute('aria-pressed', 'true')
    expect(within(card).getByText('힌트: e4')).toBeInTheDocument()
    expect(boardProps.current?.shapes).toHaveLength(1)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByRole('button', { name: '힌트' })).toHaveAttribute('aria-pressed', 'false')
    expect(within(card).queryByText(/힌트:/)).toBeNull()
  })
```

Run: `npx vitest run src/chess/moveNumber.test.ts src/features/viewer` → FAIL

- [ ] **Step 2: 구현 — 수 번호, 디바운스**

`src/chess/moveNumber.ts`:
```ts
import { turnOf } from './pgn'
import type { Ply } from './types'

/** plyIndex: 1 = 첫 수 */
export function moveNumberOf(startFen: string, plyIndex: number): { number: number; white: boolean } {
  const blackFirst = turnOf(startFen) === 'b'
  const first = Number(startFen.split(' ')[5]) || 1
  const idx = plyIndex - 1
  return { number: first + Math.floor((idx + (blackFirst ? 1 : 0)) / 2), white: (idx % 2 === 0) !== blackFirst }
}

export function moveTitle(plies: Ply[], i: number): string {
  const { number, white } = moveNumberOf(plies[0].fen, i)
  return `${number}${white ? '.' : '...'} ${plies[i].san}`
}
```

`src/components/MoveList.tsx`: 루프 안의 `whiteMove`/`moveNo` 계산을 `const { number: moveNo, white: whiteMove } = moveNumberOf(plies[0].fen, i)`로 바꾸고, 쓰지 않게 된 `blackFirst`/`firstMoveNo` 선언을 지운다(`import { moveNumberOf } from '../chess/moveNumber'`). `prefix` 계산은 그대로 둔다.

`src/ui/useDebounced.ts`:
```ts
import { useEffect, useState } from 'react'

export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}
```

- [ ] **Step 3: 구현 — 카드와 요약**

`src/styles/features/viewer.css.ts`:
```ts
import { style } from '@vanilla-extract/css'
import { fontSize, radius, space, vars, weight } from '../tokens.css'

export const card = style({
  display: 'grid',
  gap: space[2],
  minHeight: 112,
  padding: space[4],
  borderRadius: radius.surface,
  background: vars.color.surfaceSubtle,
  alignContent: 'start',
})
export const move = style({ fontSize: fontSize.title, fontWeight: weight.medium, fontVariantNumeric: 'tabular-nums' })
export const judgment = style({ display: 'inline-flex', alignItems: 'baseline', gap: space[2], fontSize: fontSize.lead, fontWeight: weight.medium })
export const glyph = style({ fontSize: fontSize.title })
export const detail = style({ color: vars.color.muted, fontSize: fontSize.control, fontVariantNumeric: 'tabular-nums' })
export const hint = style({ display: 'inline-flex', alignItems: 'center', gap: space[2], color: vars.color.accent, fontSize: fontSize.control, fontWeight: weight.medium })
export const summary = style({ display: 'grid', gap: space[3] })
export const accuracy = style({ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: space[3], fontSize: fontSize.control })
export const table = style({ width: '100%', borderCollapse: 'collapse', fontSize: fontSize.control, fontVariantNumeric: 'tabular-nums' })
export const th = style({ textAlign: 'left', fontWeight: weight.regular, padding: `${space[1]} 0` })
export const td = style({ textAlign: 'right', padding: `${space[1]} 0`, width: '4em' })
```

`src/features/viewer/JudgmentCard.tsx`:
```tsx
import { Lightbulb } from 'lucide-react'
import { motion } from 'motion/react'
import { moveTitle } from '../../chess/moveNumber'
import { pvToSan } from '../../chess/pgn'
import type { Ply } from '../../chess/types'
import { glyphColor } from '../../components/judgment.css'
import { formatScore } from '../../engine/classify'
import { JUDGMENT_META, type MoveLabel } from '../../engine/judge'
import * as v from '../../styles/features/viewer.css'
import { visuallyHidden } from '../../ui/a11y.css'
import { cx } from '../../ui/cx'
import { Icon } from '../../ui/Icon'
import { SPRING } from '../../ui/motion'
import { useDebounced } from '../../ui/useDebounced'
import { ReviewPanel } from './ReviewPanel'
import type { ReviewState } from './useReview'

export function JudgmentCard({
  plies,
  ply,
  review,
  onStartReview,
  hint,
  hintUci,
}: {
  plies: Ply[]
  ply: number
  review: ReviewState
  onStartReview: () => void
  hint: boolean
  hintUci: string | null
}) {
  const data = review.status === 'done' ? review.review : null
  const label = data && ply > 0 ? data.labels[ply] : null
  const before = data && ply > 0 ? data.positions[ply - 1]?.score : undefined
  const after = data ? data.positions[ply]?.score : undefined
  const title = ply === 0 ? '시작 포지션' : moveTitle(plies, ply)
  const hintSan = hint && hintUci ? (pvToSan(plies[ply].fen, [hintUci], 1)[0] ?? null) : null
  const announce = useDebounced(
    [title, label ? JUDGMENT_META[label].name : null, hintSan ? `힌트 ${hintSan}` : null].filter(Boolean).join(', '),
    400,
  )

  return (
    <section aria-label="이번 수 판정" className={v.card}>
      <p className={v.move}>{title}</p>
      {!data && <ReviewPanel state={review} onStart={onStartReview} />}
      {data && ply > 0 && (label ? <JudgmentLine label={label} /> : <p className={v.detail}>강제 수</p>)}
      {data && before && after && (
        <p className={v.detail}>
          형세 {formatScore(before)} → {formatScore(after)}
        </p>
      )}
      {hint && (
        <p className={v.hint}>
          <Icon icon={Lightbulb} size={16} />
          {hintSan ? `힌트: ${hintSan}` : '힌트를 찾는 중…'}
        </p>
      )}
      <p className={visuallyHidden} aria-live="polite">
        {announce}
      </p>
    </section>
  )
}

function JudgmentLine({ label }: { label: MoveLabel }) {
  const meta = JUDGMENT_META[label]
  return (
    <motion.p
      key={label}
      className={cx(v.judgment, glyphColor[label])}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={label === 'blunder' ? { opacity: 1, scale: 1, x: [0, -4, 4, -2, 0] } : { opacity: 1, scale: 1 }}
      transition={{ default: SPRING, x: { duration: 0.32, ease: 'easeOut' } }}
    >
      {meta.glyph && <span className={v.glyph}>{meta.glyph}</span>}
      <span>{meta.name}</span>
    </motion.p>
  )
}
```

`src/features/viewer/ReviewSummary.tsx`:
```tsx
import { RotateCcw } from 'lucide-react'
import type { Turn } from '../../chess/types'
import { glyphColor } from '../../components/judgment.css'
import { countJudgments, JUDGMENT_META, type MoveLabel } from '../../engine/judge'
import type { GameReview } from '../../engine/review'
import * as v from '../../styles/features/viewer.css'
import { Button } from '../../ui/Button'
import { Disclosure } from '../../ui/Disclosure'

const SUMMARY_LABELS: MoveLabel[] = ['brilliant', 'great', 'best', 'miss', 'inaccuracy', 'mistake', 'blunder']
const fmt = (x: number | null) => (x === null ? '-' : `${x.toFixed(1)}%`)

export function ReviewSummary({ review, startTurn, onRerun }: { review: GameReview; startTurn: Turn; onRerun: () => void }) {
  const counts = countJudgments(review.labels, startTurn)
  return (
    <div className={v.summary}>
      <p className={v.accuracy}>
        <span>
          백 정확도 <strong>{fmt(review.accuracy.white)}</strong> · 흑 정확도 <strong>{fmt(review.accuracy.black)}</strong>
        </span>
        <Button tone="ghost" size="sm" icon={RotateCcw} onClick={onRerun}>
          리뷰 다시 실행
        </Button>
      </p>
      <Disclosure title="판정 요약">
        <table className={v.table}>
          <thead>
            <tr>
              <th scope="col" className={v.th}>
                판정
              </th>
              <th scope="col" className={v.td}>
                백
              </th>
              <th scope="col" className={v.td}>
                흑
              </th>
            </tr>
          </thead>
          <tbody>
            {SUMMARY_LABELS.map((l) => (
              <tr key={l}>
                <th scope="row" className={v.th}>
                  <span className={glyphColor[l]}>{JUDGMENT_META[l].glyph}</span> {JUDGMENT_META[l].name}
                </th>
                <td className={v.td}>{counts.white[l]}</td>
                <td className={v.td}>{counts.black[l]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Disclosure>
    </div>
  )
}
```

- [ ] **Step 4: 뷰어에 연결** (`src/features/viewer/ViewerPage.tsx`)

1. import 추가: `import { JudgmentCard } from './JudgmentCard'`, `import { ReviewSummary } from './ReviewSummary'`. 쓰지 않게 되는 `ReviewPanel` import, `RotateCcw`, `Button`을 지운다.
2. `const [movesOpen, setMovesOpen] = useState(false)` 다음 줄에 추가:
```tsx
  const [hint, setHint] = useState(false)
```
3. `const fen = plies[ply].fen` 다음 줄에 추가:
```tsx
  useEffect(() => setHint(false), [ply])
```
4. `const lineUci = …`와 `const shapes = …` 두 줄을 다음으로 바꾼다:
```tsx
  const hintUci = positions[ply]?.best ?? live.lines[0]?.pv[0] ?? null
  const lineUci = linesOpen && !reviewing ? live.lines[0]?.pv[0] : undefined
  const shapes = useMemo(() => {
    const ucis = new Set<string>()
    if (hint && hintUci) ucis.add(hintUci)
    if (lineUci) ucis.add(lineUci)
    return [...ucis].map(bestMoveArrow)
  }, [hint, hintUci, lineUci])
```
5. panel 안의 `<ReviewPanel … />`과 `{review.status === 'done' && (<p …>…</p>)}` 두 덩어리를 다음으로 바꾼다:
```tsx
        <JudgmentCard plies={plies} ply={ply} review={review} onStartReview={() => void startReview()} hint={hint} hintUci={hintUci} />
        {review.status === 'done' && (
          <ReviewSummary review={review.review} startTurn={turnOf(plies[0].fen)} onRerun={() => void startReview()} />
        )}
```
6. `<ViewerControls …>`에 props 추가: `hint={hint} onHint={() => setHint((h) => !h)} hintDisabled={!hintUci}`
7. 파일 아래쪽의 `const fmt = …` 줄을 지운다(ReviewSummary로 옮겨감).

- [ ] **Step 5: 통과 확인**

Run: `npm test && npx tsc --noEmit` → PASS

- [ ] **Step 6: 수동 확인**

`npx vite --port 5199 --strictPort` → 오페라 게임에서 [리뷰 실행] → 수를 넘기며 판정 카드의 색·기호·이름, 블런더에서 흔들림(모션 감소 설정 시 없음), [힌트] 토글과 화살표를 확인한다. 라이트/다크 모두에서 판정 색이 읽히는지 확인하고 서버를 끈다.

- [ ] **Step 7: 커밋**

```bash
git add -A src
git commit -m "feat(viewer): 판정 카드·힌트 토글·리뷰 요약" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: 홈 — 히어로(잉크 제목·자동 재생 보드)와 아래 섹션

**Files:**
- Create: `src/features/home/useAutoplay.ts`, `src/features/home/useAutoplay.test.tsx`, `src/features/home/HeroTitle.tsx`, `src/features/home/MoveTape.tsx`, `src/features/home/AutoplayBoard.tsx`, `src/styles/features/home.css.ts`
- Modify: `src/features/home/HomePage.tsx` (전체 교체), `src/features/home/HomePage.test.tsx`

**Interfaces:**
- Consumes: `InkText`, `Segmented`, `TextField`, `Button`, `LinkButton`, `Section` (Task 5·6), `Board` (Task 8), `moveNumberOf` (Task 10), `todaysClassic`, `classics` (`sources/classics`), `listTopBroadcasts`, `isHighlighted`, `queryKeys`
- Produces:
  - `useAutoplay(total, { intervalMs = 900, reduced = false }) → { ply; playing; finished; start(); pause(); play(); restart() }` — `start`는 처음 한 번만 재생 시작, 탭이 숨으면 멈춤, `reduced`면 `ply = total`에서 고정
  - `HeroTitle({ id; lead; ink })` — h1 접근성 이름은 `lead + ink`, 시각적으로는 `ink` 부분에 InkText
  - `MoveTape({ plies; current; onPointerDown? })` — `<ol aria-label="재생 중인 기보">`
  - `AutoplayBoard({ classic })` — `<figure aria-label="오늘의 명국 자동 재생">`, 버튼: 멈춤/재생, 처음부터, 이 대국 분석하기(링크)
  - 홈 섹션: 오늘의 명국(제목 링크 + 소개 + [분석하기]), 진행 중인 대회(최대 3개, 실패·없음이면 숨김), 명국 컬렉션 맛보기(오늘의 명국을 뺀 4판)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/features/home/useAutoplay.test.tsx`:
```tsx
// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutoplay } from './useAutoplay'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useAutoplay', () => {
  it('start 전에는 멈춰 있고, start하면 900ms마다 한 수씩, 끝에서 멈춘다', () => {
    const { result } = renderHook(() => useAutoplay(3))
    expect(result.current).toMatchObject({ ply: 0, playing: false, finished: false })
    act(() => result.current.start())
    act(() => {
      vi.advanceTimersByTime(900)
    })
    expect(result.current.ply).toBe(1)
    act(() => {
      vi.advanceTimersByTime(1800)
    })
    expect(result.current).toMatchObject({ ply: 3, playing: false, finished: true })
  })

  it('start는 처음 한 번만 동작한다', () => {
    const { result } = renderHook(() => useAutoplay(5))
    act(() => result.current.start())
    act(() => result.current.pause())
    act(() => result.current.start())
    expect(result.current.playing).toBe(false)
    act(() => result.current.play())
    expect(result.current.playing).toBe(true)
  })

  it('끝난 뒤 play와 restart는 처음부터 다시', () => {
    const { result } = renderHook(() => useAutoplay(1))
    act(() => result.current.start())
    act(() => {
      vi.advanceTimersByTime(900)
    })
    expect(result.current.finished).toBe(true)
    act(() => result.current.play())
    expect(result.current).toMatchObject({ ply: 0, playing: true })
    act(() => result.current.restart())
    expect(result.current).toMatchObject({ ply: 0, playing: true })
  })

  it('탭이 숨겨지면 멈춘다', () => {
    const { result } = renderHook(() => useAutoplay(5))
    act(() => result.current.start())
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current.playing).toBe(false)
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  })

  it('모션 감소면 마지막 포지션에 고정', () => {
    const { result } = renderHook(() => useAutoplay(5, { reduced: true }))
    expect(result.current).toMatchObject({ ply: 5, finished: true })
    act(() => result.current.start())
    act(() => result.current.play())
    expect(result.current.playing).toBe(false)
  })
})
```

`src/features/home/HomePage.test.tsx` 전체 교체:
```tsx
// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { todaysClassic } from '../../sources/classics'
import { useMswServer } from '../../test/msw'
import { renderRoute } from '../../test/renderRoute'

const server = useMswServer()
const TOP_EMPTY = { active: [], upcoming: [], past: { currentPageResults: [] } }
beforeEach(() => server.use(http.get('https://lichess.org/api/broadcast/top', () => HttpResponse.json(TOP_EMPTY))))
afterEach(cleanup)

describe('HomePage', () => {
  it('히어로 제목', () => {
    renderRoute('/')
    expect(screen.getByRole('heading', { level: 1, name: '역사적인 대국에 직접 참여하세요.' })).toBeInTheDocument()
  })

  it('플랫폼과 아이디로 플레이어 페이지로 이동한다', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/')
    await user.click(screen.getByLabelText('Lichess'))
    await user.type(screen.getByLabelText('아이디'), '  DrNykterstein ')
    await user.click(screen.getByRole('button', { name: '불러오기' }))
    expect(router.state.location.pathname).toBe('/player/lichess/DrNykterstein')
  })

  it('빈 아이디는 이동하지 않는다', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/')
    await user.click(screen.getByRole('button', { name: '불러오기' }))
    expect(router.state.location.pathname).toBe('/')
  })

  it('오늘의 명국 링크와 자동 재생 조작', () => {
    renderRoute('/')
    const today = todaysClassic()
    expect(screen.getByRole('link', { name: today.title })).toHaveAttribute('href', `/game/classic/${today.slug}`)
    expect(screen.getByRole('link', { name: '오늘의 명국 보기' })).toHaveAttribute('href', `/game/classic/${today.slug}`)
    const figure = screen.getByRole('figure', { name: '오늘의 명국 자동 재생' })
    expect(figure).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '재생' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '이 대국 분석하기' })).toHaveAttribute('href', `/game/classic/${today.slug}`)
  })

  it('진행 중인 대회가 없으면 섹션을 숨긴다', async () => {
    renderRoute('/')
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByRole('heading', { name: '진행 중인 대회' })).toBeNull()
  })

  it('진행 중인 대회가 있으면 보여준다', async () => {
    server.use(
      http.get('https://lichess.org/api/broadcast/top', () =>
        HttpResponse.json({ ...TOP_EMPTY, active: [{ tour: { id: 'A', name: '46th FIDE Chess Olympiad', slug: 'o' } }] }),
      ),
    )
    renderRoute('/')
    expect(await screen.findByRole('link', { name: '46th FIDE Chess Olympiad' })).toHaveAttribute('href', '/events/A')
  })

  it('메모리 저장소면 저장되지 않는다는 배너', () => {
    renderRoute('/')
    expect(screen.getByText(/저장되지 않아요/)).toBeInTheDocument()
  })
})
```

Run: `npx vitest run src/features/home` → FAIL

- [ ] **Step 2: 구현 — 자동 재생 훅**

`src/features/home/useAutoplay.ts`:
```ts
import { useCallback, useEffect, useRef, useState } from 'react'

export interface Autoplay {
  ply: number
  playing: boolean
  finished: boolean
  start: () => void
  pause: () => void
  play: () => void
  restart: () => void
}

export function useAutoplay(total: number, { intervalMs = 900, reduced = false }: { intervalMs?: number; reduced?: boolean } = {}): Autoplay {
  const [ply, setPly] = useState(reduced ? total : 0)
  const [playing, setPlaying] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setPly((p) => Math.min(total, p + 1)), intervalMs)
    return () => window.clearInterval(id)
  }, [playing, intervalMs, total])

  useEffect(() => {
    if (playing && ply >= total) setPlaying(false)
  }, [playing, ply, total])

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) setPlaying(false)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const start = useCallback(() => {
    if (started.current || reduced) return
    started.current = true
    setPlaying(true)
  }, [reduced])
  const pause = useCallback(() => setPlaying(false), [])
  const play = useCallback(() => {
    if (reduced) return
    started.current = true
    setPly((p) => (p >= total ? 0 : p))
    setPlaying(true)
  }, [reduced, total])
  const restart = useCallback(() => {
    if (reduced) return
    started.current = true
    setPly(0)
    setPlaying(true)
  }, [reduced])

  return { ply, playing, finished: ply >= total, start, pause, play, restart }
}
```

- [ ] **Step 3: 구현 — 스타일과 히어로 부품**

`src/styles/features/home.css.ts`:
```ts
import { style } from '@vanilla-extract/css'
import { fontSize, mq, radius, space, vars, weight } from '../tokens.css'

export const home = style({ display: 'grid', rowGap: 88, paddingBottom: space[8], '@media': { [mq.md]: { rowGap: 144 } } })
export const hero = style({
  display: 'grid',
  justifyItems: 'center',
  alignContent: 'start',
  gap: space[5],
  minHeight: ['100vh', '100svh'],
  paddingTop: space[7],
  textAlign: 'center',
  '@media': { [mq.md]: { paddingTop: space[8], gap: space[6] } },
})
export const title = style({
  maxWidth: '12em',
  fontSize: fontSize.display,
  lineHeight: 1.12,
  letterSpacing: '-0.02em',
  '@media': { [mq.md]: { fontSize: fontSize.displayMd }, [mq.lg]: { fontSize: fontSize.displayLg } },
})
export const lead = style({ maxWidth: '34rem', color: vars.color.muted, fontSize: fontSize.lead })
export const form = style({
  display: 'grid',
  gap: space[2],
  width: '100%',
  maxWidth: 560,
  justifyItems: 'stretch',
  '@media': { [mq.md]: { gridTemplateColumns: 'auto 1fr auto', alignItems: 'center' } },
})
export const platform = style({ justifySelf: 'center', '@media': { [mq.md]: { justifySelf: 'stretch' } } })
export const showcase = style({ display: 'grid', gap: space[3], width: '100%', maxWidth: 640, margin: `${space[5]} 0 0`, '@media': { [mq.md]: { marginTop: space[7] } } })
export const showcaseBoard = style({ width: '100%' })
export const tape = style({
  display: 'flex',
  gap: space[2],
  minHeight: 32,
  overflowX: 'auto',
  listStyle: 'none',
  scrollbarWidth: 'none',
  whiteSpace: 'nowrap',
  fontSize: fontSize.control,
  fontVariantNumeric: 'tabular-nums',
  selectors: { '&::-webkit-scrollbar': { display: 'none' } },
})
export const tapeItem = style({ display: 'inline-flex', gap: 4, flexShrink: 0 })
export const tapeNo = style({ color: vars.color.muted })
export const caption = style({ color: vars.color.muted, fontSize: fontSize.meta })
export const controls = style({ display: 'flex', flexWrap: 'wrap', gap: space[2], justifyContent: 'center' })
export const story = style({ display: 'grid', gap: space[5], '@media': { [mq.md]: { gridTemplateColumns: '1fr auto', alignItems: 'end' } } })
export const storyTitle = style({ fontSize: fontSize.title, marginBottom: space[2] })
export const storyLink = style({ color: vars.color.ink, textDecoration: 'none', selectors: { '&:hover': { textDecoration: 'underline' } } })
export const actions = style({ display: 'flex', flexWrap: 'wrap', gap: space[2] })
export const cards = style({ display: 'grid', gap: space[3], listStyle: 'none', '@media': { [mq.md]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } } })
export const cardLink = style({
  display: 'grid',
  gap: space[1],
  padding: space[4],
  borderRadius: radius.surface,
  background: vars.color.surfaceSubtle,
  color: vars.color.ink,
  textDecoration: 'none',
  selectors: { '&:hover': { background: vars.color.highlight } },
})
export const cardTitle = style({ fontWeight: weight.medium })
export const cardMeta = style({ color: vars.color.muted, fontSize: fontSize.meta })
```

`src/features/home/HeroTitle.tsx`:
```tsx
import * as h from '../../styles/features/home.css'
import { visuallyHidden } from '../../ui/a11y.css'
import { InkText } from '../../ui/InkText'

export function HeroTitle({ id, lead, ink }: { id: string; lead: string; ink: string }) {
  return (
    <h1 id={id} className={h.title}>
      <span className={visuallyHidden}>
        {lead}
        {ink}
      </span>
      <span aria-hidden="true">
        {lead}
        <InkText text={ink} delay={0.2} />
      </span>
    </h1>
  )
}
```

`src/features/home/MoveTape.tsx`:
```tsx
import { useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { moveNumberOf } from '../../chess/moveNumber'
import type { Ply } from '../../chess/types'
import * as h from '../../styles/features/home.css'
import { visuallyHidden } from '../../ui/a11y.css'
import { InkText } from '../../ui/InkText'

export function MoveTape({ plies, current, onPointerDown }: { plies: Ply[]; current: number; onPointerDown?: () => void }) {
  const ref = useRef<HTMLOListElement>(null)
  const reduce = useReducedMotion()
  useEffect(() => {
    const el = ref.current
    el?.scrollTo?.({ left: el.scrollWidth, behavior: reduce ? 'auto' : 'smooth' })
  }, [current, reduce])
  return (
    <ol ref={ref} className={h.tape} aria-label="재생 중인 기보" onPointerDown={onPointerDown}>
      {plies.slice(1, current + 1).map((p, idx) => {
        const i = idx + 1
        const { number, white } = moveNumberOf(plies[0].fen, i)
        const prefix = white ? `${number}.` : idx === 0 ? `${number}...` : ''
        return (
          <li key={i} className={h.tapeItem}>
            {prefix && <span className={h.tapeNo}>{prefix}</span>}
            <span>
              <span className={visuallyHidden}>{p.san}</span>
              <InkText text={p.san ?? ''} step={0.04} />
            </span>
          </li>
        )
      })}
    </ol>
  )
}
```

`src/features/home/AutoplayBoard.tsx`:
```tsx
import { ArrowRight, Pause, Play, RotateCcw } from 'lucide-react'
import { useInView, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef } from 'react'
import { refToPath } from '../../chess/gameRef'
import { isCheck, pgnToPlies } from '../../chess/pgn'
import { Board } from '../../components/Board'
import type { Classic } from '../../sources/classics'
import * as h from '../../styles/features/home.css'
import { Button, LinkButton } from '../../ui/Button'
import { MoveTape } from './MoveTape'
import { useAutoplay } from './useAutoplay'

export function AutoplayBoard({ classic }: { classic: Classic }) {
  const plies = useMemo(() => pgnToPlies(classic.pgn), [classic.pgn])
  const reduce = useReducedMotion() ?? false
  const auto = useAutoplay(plies.length - 1, { reduced: reduce })
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { amount: 0.35 })
  const { start, pause } = auto
  useEffect(() => {
    if (inView) start()
    else pause()
  }, [inView, start, pause])
  const cur = plies[auto.ply]

  return (
    <figure ref={ref} className={h.showcase} aria-label="오늘의 명국 자동 재생">
      <div className={h.showcaseBoard} onPointerDown={pause}>
        <Board fen={cur.fen} orientation="white" lastMoveUci={cur.uci} check={isCheck(cur.fen)} />
      </div>
      <MoveTape plies={plies} current={auto.ply} onPointerDown={pause} />
      <figcaption className={h.caption}>
        {classic.title} · {classic.white} vs {classic.black} · {classic.year}
      </figcaption>
      <div className={h.controls}>
        {!reduce && !auto.finished && (
          <Button tone="ghost" size="sm" icon={auto.playing ? Pause : Play} onClick={auto.playing ? auto.pause : auto.play}>
            {auto.playing ? '멈춤' : '재생'}
          </Button>
        )}
        {!reduce && (
          <Button tone="ghost" size="sm" icon={RotateCcw} onClick={auto.restart}>
            처음부터
          </Button>
        )}
        <LinkButton tone="ghost" size="sm" icon={ArrowRight} to={refToPath({ kind: 'classic', slug: classic.slug })}>
          이 대국 분석하기
        </LinkButton>
      </div>
    </figure>
  )
}
```

- [ ] **Step 4: 홈 페이지 교체** (`src/features/home/HomePage.tsx` 전체)

```tsx
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChartLine } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { refToPath } from '../../chess/gameRef'
import { queryKeys } from '../../sources'
import { listTopBroadcasts } from '../../sources/broadcast'
import { classics, todaysClassic, type Classic } from '../../sources/classics'
import * as h from '../../styles/features/home.css'
import { Button, LinkButton } from '../../ui/Button'
import { TextField } from '../../ui/Field'
import { Section } from '../../ui/Section'
import { Segmented } from '../../ui/Segmented'
import { AutoplayBoard } from './AutoplayBoard'
import { HeroTitle } from './HeroTitle'

type Platform = 'chesscom' | 'lichess'

export function HomePage() {
  const navigate = useNavigate()
  const [platform, setPlatform] = useState<Platform>('chesscom')
  const [username, setUsername] = useState('')
  const today = todaysClassic()

  return (
    <div className={h.home}>
      <section className={h.hero} aria-labelledby="hero-title">
        <HeroTitle id="hero-title" lead="역사적인 대국에 " ink="직접 참여하세요." />
        <p className={h.lead}>Chess.com·Lichess에서 둔 내 대국도 브라우저 속 Stockfish로 분석하고, 원하는 수에서 엔진과 이어 둘 수 있어요.</p>
        <form
          className={h.form}
          onSubmit={(e) => {
            e.preventDefault()
            const u = username.trim()
            if (u) navigate(`/player/${platform}/${encodeURIComponent(u)}`)
          }}
        >
          <Segmented
            className={h.platform}
            legend="플랫폼"
            name="platform"
            value={platform}
            onChange={setPlatform}
            options={[
              { value: 'chesscom', label: 'Chess.com' },
              { value: 'lichess', label: 'Lichess' },
            ]}
          />
          <TextField
            label="아이디"
            hideLabel
            placeholder="아이디"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Button type="submit">불러오기</Button>
        </form>
        <LinkButton tone="secondary" to={refToPath({ kind: 'classic', slug: today.slug })}>
          오늘의 명국 보기
        </LinkButton>
        <AutoplayBoard classic={today} />
      </section>

      <TodayStory classic={today} />
      <LiveEvents />
      <ClassicsTeaser exclude={today.slug} />
    </div>
  )
}

function TodayStory({ classic }: { classic: Classic }) {
  const to = refToPath({ kind: 'classic', slug: classic.slug })
  return (
    <Section title="오늘의 명국" description={`${classic.white} vs ${classic.black} · ${classic.event ? `${classic.event}, ` : ''}${classic.year}`}>
      <div className={h.story}>
        <div>
          <h3 className={h.storyTitle}>
            <Link to={to} className={h.storyLink}>
              {classic.title}
            </Link>
          </h3>
          <p>{classic.summaryKo}</p>
        </div>
        <div className={h.actions}>
          <LinkButton to={to} icon={ChartLine}>
            분석하기
          </LinkButton>
        </div>
      </div>
    </Section>
  )
}

function LiveEvents() {
  const top = useQuery({ queryKey: queryKeys.broadcastTop(), queryFn: ({ signal }) => listTopBroadcasts(signal), retry: false })
  const tours = top.data?.active.slice(0, 3) ?? []
  if (tours.length === 0) return null
  return (
    <Section
      title="진행 중인 대회"
      action={
        <LinkButton tone="ghost" size="sm" icon={ArrowRight} to="/events">
          전체 대회
        </LinkButton>
      }
    >
      <ul className={h.cards}>
        {tours.map((t) => (
          <li key={t.id}>
            <Link to={`/events/${t.id}`} className={h.cardLink}>
              <span className={h.cardTitle}>{t.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function ClassicsTeaser({ exclude }: { exclude: string }) {
  const pool = classics.filter((c) => c.slug !== exclude)
  const picks = [...new Set([0, 1 / 3, 2 / 3, 1].map((f) => Math.round(f * (pool.length - 1))))].map((i) => pool[i])
  return (
    <Section
      title="명국 컬렉션"
      description="시대마다 체스의 흐름을 바꾼 대국들이에요."
      action={
        <LinkButton tone="ghost" size="sm" icon={ArrowRight} to="/classics">
          컬렉션 전체
        </LinkButton>
      }
    >
      <ul className={h.cards}>
        {picks.map((c) => (
          <li key={c.slug}>
            <Link to={refToPath({ kind: 'classic', slug: c.slug })} className={h.cardLink}>
              <span className={h.cardTitle}>{c.title}</span>
              <span className={h.cardMeta}>
                {c.white} vs {c.black} · {c.year}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  )
}
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/features/home && npm test && npx tsc --noEmit` → PASS
(ClassicsTeaser 링크의 접근성 이름은 "제목 + 대국자·연도"라서 오늘의 명국 제목 링크 테스트와 겹치지 않는다.)

- [ ] **Step 6: 수동 확인**

`npx vite --port 5199 --strictPort` → 홈을 375px와 1280px에서 연다.
- 제목의 "직접 참여하세요."가 왼쪽부터 청색으로 드러났다가 잉크색으로 정착하는지 확인한다.
- 보드가 화면에 들어오면 한 수씩 두어지고 기보 띠가 따라 스크롤되는지 확인한다.
- 보드를 누르면 멈추는지, 스크롤로 벗어났다 돌아오면 자동 재개되지 않는지 확인한다.
- 개발자 도구의 Rendering → "prefers-reduced-motion: reduce"에서는 최종 포지션이 바로 보이는지 확인한다.

확인한 뒤 서버를 끈다.

- [ ] **Step 7: 커밋**

```bash
git add -A src
git commit -m "feat(home): 잉크 제목·오늘의 명국 자동 재생 히어로, 대회·명국 섹션" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: 목록 화면 — 유저 대국, 대회, 명국 컬렉션

**Files:**
- Create: `src/styles/features/lists.css.ts`
- Modify: `src/features/player/GameList.tsx`, `src/features/player/PlayerPage.tsx`, `src/features/events/EventsPage.tsx`, `src/features/events/EventDetailPage.tsx`, `src/features/classics/ClassicsPage.tsx`, `src/features/player/PlayerPage.test.tsx`, `src/features/events/EventsPage.test.tsx`, `src/features/events/EventDetailPage.test.tsx`

**Interfaces:**
- Consumes: `Badge`, `Button`, `IconButton`, `Segmented`, `SelectField` (Task 5·6), `page.css.ts` (Task 7)
- Produces: 행 목록(테두리 없음, hover 면), 월 표기 `"2026년 9월"`, 월 이동 IconButton `이전 달`/`다음 달`, 색·결과 필터는 Segmented, 시간 제한은 SelectField, 대회 분류는 Segmented(`추천`/`올림피아드`/`월드챔피언십`/`캔디데이츠`), 강조 대회는 `data-highlight="true"`

- [ ] **Step 1: 테스트 갱신 (실패 상태로)**

`src/features/player/PlayerPage.test.tsx`:
- `findByText('2026.09')` → `findByText('2026년 9월')`
- `getByRole('button', { name: '← 이전 달' })` → `getByRole('button', { name: '이전 달' })`
- 그 뒤에 이어지는 월 확인이 있으면 `'2026.08'` → `'2026년 8월'`

`src/features/events/EventsPage.test.tsx`:
- `expect(olympiad.closest('li')).toHaveClass('highlight')` → `expect(olympiad.closest('li')).toHaveAttribute('data-highlight', 'true')`
- `await user.click(screen.getByRole('button', { name: '월드챔피언십' }))` → `await user.click(screen.getByLabelText('월드챔피언십'))`

`src/features/events/EventDetailPage.test.tsx`:
- `screen.getByText('진행 중', { selector: '.badge' })` → `screen.getByText('진행 중', { selector: '[data-badge]' })`

Run: `npx vitest run src/features/player src/features/events` → FAIL

- [ ] **Step 2: 목록 스타일** (`src/styles/features/lists.css.ts`)

```ts
import { style } from '@vanilla-extract/css'
import { fontSize, mq, radius, space, vars, weight } from '../tokens.css'

export const rows = style({ display: 'grid', gap: 2, listStyle: 'none' })
export const row = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gridTemplateAreas: '"meta end" "main main"',
  columnGap: space[3],
  rowGap: 2,
  padding: space[3],
  margin: `0 calc(${space[3]} * -1)`,
  borderRadius: radius.action,
  color: vars.color.ink,
  textDecoration: 'none',
  selectors: {
    'a&:hover': { background: vars.color.surfaceSubtle },
    '&[aria-disabled="true"]': { color: vars.color.muted },
  },
  '@media': {
    [mq.md]: { gridTemplateColumns: '11rem minmax(0, 1fr) auto', gridTemplateAreas: '"meta main end"', alignItems: 'center' },
  },
})
export const rowMeta = style({ gridArea: 'meta', color: vars.color.muted, fontSize: fontSize.meta, fontVariantNumeric: 'tabular-nums' })
export const rowMain = style({ gridArea: 'main', minWidth: 0 })
export const rowEnd = style({ gridArea: 'end', justifySelf: 'end', display: 'flex', alignItems: 'center', gap: space[2], fontVariantNumeric: 'tabular-nums' })
export const toolbar = style({ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: space[3] })
export const monthNav = style({ display: 'flex', alignItems: 'center', gap: space[1] })
export const monthLabel = style({ minWidth: '7.5em', textAlign: 'center', fontWeight: weight.medium })
export const tourRow = style([
  row,
  {
    gridTemplateAreas: '"main end" "meta meta"',
    '@media': { [mq.md]: { gridTemplateColumns: 'minmax(0, 1fr) auto', gridTemplateAreas: '"main meta"' } },
  },
])
export const tourName = style({
  gridArea: 'main',
  display: 'inline-flex',
  alignItems: 'center',
  gap: space[2],
  minWidth: 0,
  selectors: { '[data-highlight="true"] &': { fontWeight: weight.medium } },
})
export const tourDot = style({ width: 7, height: 7, flexShrink: 0, borderRadius: radius.pill, background: vars.color.accent })
export const classicGrid = style({ display: 'grid', gap: space[3], listStyle: 'none', '@media': { [mq.md]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } } })
export const classicItem = style({ display: 'grid', gap: space[2], alignContent: 'start', padding: space[5], borderRadius: radius.surface, background: vars.color.surfaceSubtle })
export const classicYear = style({ fontSize: fontSize.section, lineHeight: 1, color: vars.color.muted, fontVariantNumeric: 'tabular-nums' })
export const classicTitle = style({ fontSize: fontSize.title })
export const classicLink = style({ color: vars.color.ink, textDecoration: 'none', selectors: { '&:hover': { textDecoration: 'underline' } } })
export const clamp = style({ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: vars.color.muted })
```

- [ ] **Step 3: GameList** (`src/features/player/GameList.tsx`의 `GameList`와 `Row` 교체, `SPEED_LABEL`은 유지)

```tsx
import { Link } from 'react-router'
import { refKey, refToPath } from '../../chess/gameRef'
import type { GameSummary, Speed } from '../../chess/types'
import { playerLabel } from '../../components/playerLabel'
import * as l from '../../styles/features/lists.css'
import * as p from '../../styles/features/page.css'
import { Badge } from '../../ui/Badge'
```
```tsx
export function GameList({ games }: { games: GameSummary[] }) {
  if (games.length === 0) return <p className={p.meta}>조건에 맞는 대국이 없어요.</p>
  return (
    <ul className={l.rows}>
      {games.map((g) => (
        <li key={refKey(g.ref)}>
          {g.variant === 'standard' ? (
            <Link to={refToPath(g.ref)} className={l.row}>
              <Row g={g} />
            </Link>
          ) : (
            <div className={l.row} aria-disabled="true">
              <Row g={g} unsupported />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

function Row({ g, unsupported = false }: { g: GameSummary; unsupported?: boolean }) {
  return (
    <>
      <span className={l.rowMeta}>
        {g.date} · {SPEED_LABEL[g.speed]}
      </span>
      <span className={l.rowMain}>
        {playerLabel(g.white)} vs {playerLabel(g.black)}
      </span>
      <span className={l.rowEnd}>
        {unsupported && <Badge>지원하지 않음</Badge>}
        {g.result === '*' ? <Badge tone="live">진행 중</Badge> : g.result}
      </span>
    </>
  )
}
```

- [ ] **Step 4: PlayerPage** (`src/features/player/PlayerPage.tsx`)

import 추가:
```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react'
import * as l from '../../styles/features/lists.css'
import * as p from '../../styles/features/page.css'
import { Badge } from '../../ui/Badge'
import { Button, IconButton } from '../../ui/Button'
import { SelectField } from '../../ui/Field'
import { Segmented } from '../../ui/Segmented'
```
- `PlayerPage` 반환부:
```tsx
    <div className={p.page}>
      <header className={p.pageHead}>
        <h1 className={p.pageTitle}>{username}</h1>
        <div>
          <Badge>{platform === 'chesscom' ? 'Chess.com' : 'Lichess'}</Badge>
        </div>
      </header>
      {platform === 'chesscom' ? <ChesscomGames key={username} username={username} /> : <LichessGames key={username} username={username} />}
    </div>
```
- `ChesscomGames`의 `<p>불러오는 중…</p>`은 `<p className={p.meta}>불러오는 중…</p>`로, `<p className="meta">대국이 없어요.</p>`는 `className={p.meta}`로 바꾸고, 월 이동 부분을 다음으로 바꾼다:
```tsx
      <div className={l.monthNav}>
        <IconButton icon={ChevronLeft} label="이전 달" disabled={current <= 0} onClick={() => setIndex(current - 1)} />
        <span className={l.monthLabel}>
          {month.yyyy}년 {Number(month.mm)}월
        </span>
        <IconButton icon={ChevronRight} label="다음 달" disabled={current >= months.length - 1} onClick={() => setIndex(current + 1)} />
      </div>
```
- `LichessGames`의 `불러오는 중…`은 `className={p.meta}`, [더 보기]는 `<Button tone="secondary" onClick={loadMore}>더 보기</Button>`로 바꾼다(감싸는 `<div>`에 넣는다).
- `FilteredGames`의 필터 영역을 다음으로 바꾼다:
```tsx
      <div className={l.toolbar}>
        <SelectField label="시간 제한" value={filter.speed} onChange={(e) => setFilter({ ...filter, speed: e.target.value as Speed | 'all' })}>
          <option value="all">전체</option>
          {speeds.map((s) => (
            <option key={s} value={s}>
              {SPEED_LABEL[s]}
            </option>
          ))}
        </SelectField>
        <Segmented
          legend="색"
          name="filter-color"
          value={filter.color}
          onChange={(color) => setFilter({ ...filter, color })}
          options={[
            { value: 'all', label: '전체' },
            { value: 'white', label: '백' },
            { value: 'black', label: '흑' },
          ]}
        />
        <Segmented
          legend="결과"
          name="filter-result"
          value={filter.result}
          onChange={(result) => setFilter({ ...filter, result })}
          options={[
            { value: 'all', label: '전체' },
            { value: 'win', label: '승' },
            { value: 'loss', label: '패' },
            { value: 'draw', label: '무' },
          ]}
        />
      </div>
```
(색과 결과 Segmented가 둘 다 "전체" 라벨을 쓰지만, 각자 다른 fieldset 이름이라 문제없다.)

- [ ] **Step 5: 대회·명국 화면**

`src/features/events/EventsPage.tsx`:
- import: `import * as l from '../../styles/features/lists.css'`, `import * as p from '../../styles/features/page.css'`, `import { Segmented } from '../../ui/Segmented'`, `import { Section } from '../../ui/Section'`
- `QUICK` 배열은 유지하고, 칩 영역(`<div className="chips">…</div>`)을 다음으로 바꾼다:
```tsx
      <Segmented
        legend="대회 분류"
        name="events-filter"
        value={q ?? ''}
        onChange={(v) => setQ(v === '' ? null : v)}
        options={[{ value: '', label: '추천' }, ...QUICK.map((x) => ({ value: x.q, label: x.label }))]}
      />
```
- 루트를 `<div className={p.page}>`, 제목을 `<h1 className={p.pageTitle}>대회</h1>`, `불러오는 중…`은 `className={p.meta}`로 바꾼다. 추천 목록의 `<h2>진행 중</h2><TourList … /><h2>최근</h2><TourList … />`를 `<Section title="진행 중"><TourList tours={top.data.active} /></Section><Section title="최근"><TourList tours={top.data.past} /></Section>`로 바꾼다.
- `TourList` 교체:
```tsx
function TourList({ tours }: { tours: BroadcastTour[] }) {
  if (tours.length === 0) return <p className={p.meta}>대회가 없어요.</p>
  return (
    <ul className={l.rows}>
      {tours.map((t) => (
        <li key={t.id} data-highlight={isHighlighted(t) ? 'true' : undefined}>
          <Link to={`/events/${t.id}`} className={l.tourRow}>
            <span className={l.tourName}>
              {isHighlighted(t) && <span className={l.tourDot} aria-hidden="true" />}
              {t.name}
            </span>
            {t.dates?.[0] !== undefined && <span className={l.rowMeta}>{new Date(t.dates[0]).toISOString().slice(0, 10)}</span>}
          </Link>
        </li>
      ))}
    </ul>
  )
}
```
(링크의 접근성 이름은 대회 이름 + 날짜가 된다. EventsPage 테스트는 `getByRole('link', { name: '46th FIDE Chess Olympiad' })`처럼 **날짜가 없는 fixture**를 쓰므로 그대로 통과한다.)

`src/features/events/EventDetailPage.tsx`:
- import: `RefreshCw`, `* as p from page.css`, `{ Button }`, `{ SelectField }`
- 루트 `<div className={p.page}>`, 제목 `<h1 className={p.pageTitle}>`, 라운드 영역:
```tsx
      <div className={l.toolbar}>
        <SelectField label="라운드" value={selected ?? ''} onChange={(e) => setRoundId(e.target.value)}>
          {detail.rounds.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
              {r.ongoing ? ' (진행 중)' : ''}
            </option>
          ))}
        </SelectField>
        {selected && (
          <Button tone="ghost" icon={RefreshCw} onClick={() => void qc.invalidateQueries({ queryKey: queryKeys.broadcastRound(selected) })}>
            새로고침
          </Button>
        )}
      </div>
```
- `불러오는 중…`, `라운드가 없어요.`는 `className={p.meta}`. (`import * as l from '../../styles/features/lists.css'`도 추가)

`src/features/classics/ClassicsPage.tsx` 전체 교체:
```tsx
import { Link } from 'react-router'
import { refToPath } from '../../chess/gameRef'
import { classics } from '../../sources/classics'
import * as l from '../../styles/features/lists.css'
import * as p from '../../styles/features/page.css'
import { Reveal } from '../../ui/Reveal'

export function ClassicsPage() {
  return (
    <div className={p.page}>
      <header className={p.pageHead}>
        <h1 className={p.pageTitle}>명국 컬렉션</h1>
        <p className={p.lead}>시대마다 체스의 흐름을 바꾼 대국 {classics.length}판을 모았어요.</p>
      </header>
      <ul className={l.classicGrid} aria-label="명국 목록">
        {classics.map((c, i) => (
          <li key={c.slug}>
            <Reveal index={i % 2} className={l.classicItem}>
              <span className={l.classicYear}>{c.year}</span>
              <h2 className={l.classicTitle}>
                <Link to={refToPath({ kind: 'classic', slug: c.slug })} className={l.classicLink}>
                  {c.title}
                </Link>
              </h2>
              <p className={p.meta}>
                {c.white} vs {c.black}
                {c.event ? ` · ${c.event}` : ''}
              </p>
              <p className={l.clamp}>{c.summaryKo}</p>
            </Reveal>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 6: 통과 확인**

Run: `npm test && npx tsc --noEmit` → PASS

- [ ] **Step 7: 수동 확인**

`npx vite --port 5199 --strictPort` → `/player/chesscom/hikaru`, `/player/lichess/DrNykterstein`, `/events`, `/classics`를 375px·1280px에서 확인한다(행 구분이 여백과 hover 면으로만 되는지, 필터가 모바일에서 줄바꿈되는지). 서버를 끈다.

- [ ] **Step 8: 커밋**

```bash
git add -A src
git commit -m "feat(lists): 유저 대국·대회·명국 목록 새 디자인" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: 분기 대국·분기 다이얼로그·내 분기

**Files:**
- Create: `src/styles/features/play.css.ts`
- Modify: `src/features/play/PlayPage.tsx`, `src/features/play/ForkDialog.tsx`, `src/features/play/EloSlider.tsx`, `src/features/forks/ForksPage.tsx`

**Interfaces:**
- Consumes: `gameLayout.css.ts` (Task 9), `Dialog`, `Disclosure`, `Segmented`, `ControlBar`, `BarButton`, `Button`, `IconButton`, `IconLink`, `Banner`
- Produces:
  - `ForkDialog` props 불변. 네이티브 dialog(이름 "여기서 분기해서 두기"), 내 색 Segmented, Elo 슬라이더, [취소] secondary, [시작] primary(busy)
  - PlayPage: 보드 중심 + 하단 조작 막대(그룹 이름 "대국 조작": 무르기·기권·엔진 세기·PGN 내보내기). 엔진 세기 버튼은 시트로 슬라이더를 연다. 기보는 접이식 "기보"(내용 영역 `data-testid="play-moves"`), 원래 수순은 접이식 "원래 대국의 수순"
  - ForksPage: 행 목록, 액션은 IconLink "이어 두기"·IconButton "PGN"·IconButton "삭제"

- [ ] **Step 1: 스타일** (`src/styles/features/play.css.ts`)

```ts
import { style } from '@vanilla-extract/css'
import { fontSize, space, vars, weight } from '../tokens.css'

export const status = style({ display: 'inline-flex', alignItems: 'center', gap: space[2], fontSize: fontSize.lead, fontWeight: weight.medium })
export const turnDot = style({ width: 8, height: 8, borderRadius: 999, background: vars.color.accent })
export const dialogBody = style({ display: 'grid', gap: space[5] })
export const actions = style({ display: 'flex', justifyContent: 'flex-end', gap: space[2] })
export const elo = style({ display: 'grid', gap: space[2] })
export const eloValue = style({ fontSize: fontSize.section, fontWeight: weight.medium, fontVariantNumeric: 'tabular-nums' })
export const eloLabel = style({ color: vars.color.muted, fontSize: fontSize.meta })
export const range = style({ width: '100%', accentColor: vars.color.accent, height: 32 })
export const original = style({ color: vars.color.muted, fontSize: fontSize.control })
export const forkActions = style({ gridArea: 'end', display: 'flex', gap: 2 })
```

- [ ] **Step 2: EloSlider·ForkDialog 교체**

`src/features/play/EloSlider.tsx` 전체:
```tsx
import { ELO_MAX, ELO_MIN } from '../../chess/fork'
import * as s from '../../styles/features/play.css'

export function EloSlider({ value, onChange }: { value: number; onChange: (elo: number) => void }) {
  return (
    <label className={s.elo}>
      <span className={s.eloLabel}>엔진 Elo</span>
      <strong className={s.eloValue}>{value}</strong>
      <input
        type="range"
        className={s.range}
        min={ELO_MIN}
        max={ELO_MAX}
        step={10}
        value={value}
        aria-label="엔진 Elo"
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}
```

`src/features/play/ForkDialog.tsx` 전체:
```tsx
import { useState } from 'react'
import { DEFAULT_ELO } from '../../chess/fork'
import type { Color } from '../../chess/types'
import { Banner } from '../../components/Banner'
import * as s from '../../styles/features/play.css'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { Segmented } from '../../ui/Segmented'
import { EloSlider } from './EloSlider'

export interface ForkDialogProps {
  defaultColor: Color
  onConfirm: (options: { playerColor: Color; engineElo: number }) => void
  onCancel: () => void
  pending?: boolean
  error?: boolean
}

export function ForkDialog({ defaultColor, onConfirm, onCancel, pending = false, error = false }: ForkDialogProps) {
  const [color, setColor] = useState<Color>(defaultColor)
  const [elo, setElo] = useState(DEFAULT_ELO)
  return (
    <Dialog title="여기서 분기해서 두기" onClose={onCancel}>
      <div className={s.dialogBody}>
        <Segmented
          legend="내 색"
          name="fork-color"
          value={color}
          onChange={setColor}
          options={[
            { value: 'white', label: '백' },
            { value: 'black', label: '흑' },
          ]}
        />
        <EloSlider value={elo} onChange={setElo} />
        {error && <Banner tone="warn">분기를 저장하지 못했어요.</Banner>}
        <div className={s.actions}>
          <Button tone="secondary" onClick={onCancel}>
            취소
          </Button>
          <Button busy={pending} onClick={() => onConfirm({ playerColor: color, engineElo: elo })}>
            시작
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
```

- [ ] **Step 3: PlayPage 교체**

`src/features/play/PlayPage.tsx`: `PlayPage`, `ForkGame`의 상태·효과·핸들러 로직은 **그대로 두고**, import와 반환 JSX, `OriginalLine`만 바꾼다.

import 추가·교체:
```tsx
import { Download, Flag, Gauge, LoaderCircle, Undo2 } from 'lucide-react'
import * as g from '../../styles/features/gameLayout.css'
import * as s from '../../styles/features/play.css'
import { spin } from '../../ui/button.css'
import { BarButton, ControlBar } from '../../ui/ControlBar'
import { Dialog } from '../../ui/Dialog'
import { Disclosure } from '../../ui/Disclosure'
import { Icon } from '../../ui/Icon'
```
`ForkGame` 안에 상태 하나를 추가한다(`const [engineError, …]` 다음 줄):
```tsx
  const [eloOpen, setEloOpen] = useState(false)
```
`PlayPage`의 `<p>불러오는 중…</p>` → `<p className={g.note}>불러오는 중…</p>`

`ForkGame`의 `return (…)` 전체를 다음으로 교체한다:
```tsx
  return (
    <div className={g.page}>
      <header className={g.header}>
        <div className={g.headRow}>
          <h1 className={g.title}>{fork.title}</h1>
        </div>
        <p className={g.meta}>
          <Link to={refToPath(fork.origin)}>원래 대국으로</Link>
        </p>
        {engineError !== null && <Banner tone="warn">엔진을 실행할 수 없어요. 새로고침해 주세요.</Banner>}
      </header>

      <div className={g.stage}>
        <p className={s.status}>
          {status.over ? (
            `${status.result} · ${REASON_TEXT[status.reason!]}`
          ) : engineTurn ? (
            <>
              <Icon icon={LoaderCircle} size={18} className={spin} />
              엔진이 생각 중…
            </>
          ) : (
            <>
              <span className={s.turnDot} aria-hidden="true" />내 차례
            </>
          )}
        </p>
        <div className={g.boardWrap}>
          <Board
            fen={status.fen}
            orientation={fork.playerColor}
            lastMoveUci={status.lastMove}
            check={status.check}
            movable={{ color: fork.playerColor, dests, onMove }}
          />
        </div>
      </div>

      <div className={g.panel}>
        <Disclosure title="기보" testId="play-moves">
          <MoveList plies={plies} current={plies.length - 1} onSelect={() => {}} />
        </Disclosure>
        {original.data && (
          <Disclosure title="원래 대국의 수순">
            <OriginalLine plies={original.data.plies} fromPly={fork.originPly} />
          </Disclosure>
        )}
      </div>

      <ControlBar label="대국 조작" className={g.controls}>
        <BarButton
          icon={Undo2}
          label="무르기"
          caption
          disabled={!canTakeback}
          onClick={() => {
            play.stop()
            save(takeback(forkRef.current))
          }}
        />
        <BarButton
          icon={Flag}
          label="기권"
          caption
          disabled={status.over}
          onClick={() => {
            if (window.confirm('기권할까요?')) save(resign(forkRef.current))
          }}
        />
        <BarButton icon={Gauge} label={`엔진 세기 (Elo ${fork.engineElo})`} caption={`Elo ${fork.engineElo}`} onClick={() => setEloOpen(true)} />
        <BarButton
          icon={Download}
          label="PGN 내보내기"
          caption="PGN"
          onClick={() => downloadText(`chessling-${fork.id.slice(0, 8)}.pgn`, forkToPgn(fork))}
        />
      </ControlBar>

      {eloOpen && (
        <Dialog variant="sheet" title="엔진 세기" onClose={() => setEloOpen(false)}>
          <EloSlider value={fork.engineElo} onChange={(elo) => save({ ...forkRef.current, engineElo: elo, updatedAt: Date.now() })} />
        </Dialog>
      )}
    </div>
  )
```
`OriginalLine` 교체:
```tsx
function OriginalLine({ plies, fromPly }: { plies: Ply[]; fromPly: number }) {
  const next = plies.slice(fromPly + 1, fromPly + 13)
  if (next.length === 0) return <p className={s.original}>원래 대국은 여기서 끝났어요.</p>
  return <p className={s.original}>{next.map((p) => p.san).join(' ')}</p>
}
```
(PlayPage 테스트의 `findByText('내 차례')`는 점 span이 aria-hidden 형제라 `<p>`의 텍스트가 "내 차례"로 매칭된다. 매칭이 안 되면 `<span>내 차례</span>`로 감싸 보고서에 적는다.)

- [ ] **Step 4: ForksPage 교체**

`src/features/forks/ForksPage.tsx`: `remove` 로직은 그대로 두고, import와 반환부를 바꾼다.
```tsx
import { Download, Play, Trash2 } from 'lucide-react'
import * as l from '../../styles/features/lists.css'
import * as p from '../../styles/features/page.css'
import * as s from '../../styles/features/play.css'
import { IconButton, IconLink } from '../../ui/Button'
```
```tsx
  if (q.isPending) return <p className={p.meta}>불러오는 중…</p>
  const forks = q.data ?? []
  return (
    <div className={p.page}>
      <header className={p.pageHead}>
        <h1 className={p.pageTitle}>내 분기</h1>
      </header>
      {forks.length === 0 ? (
        <p className={p.lead}>아직 분기한 대국이 없어요. 대국 뷰어에서 "여기서 분기"를 눌러 보세요.</p>
      ) : (
        <ul className={l.rows}>
          {forks.map((f) => (
            <li key={f.id} className={l.row}>
              <span className={l.rowMeta}>
                {f.moves.length}수 진행 · {f.result === '*' ? '진행 중' : f.result} · Elo {f.engineElo} · {new Date(f.updatedAt).toLocaleString('ko-KR')}
              </span>
              <h2 className={l.rowMain}>{f.title}</h2>
              <div className={s.forkActions}>
                <IconLink icon={Play} label="이어 두기" to={`/play/${f.id}`} />
                <IconButton icon={Download} label="PGN" onClick={() => downloadText(`chessling-${f.id.slice(0, 8)}.pgn`, forkToPgn(f))} />
                <IconButton icon={Trash2} label="삭제" onClick={() => void remove(f.id)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
```
`h2` 크기는 `rowMain` 기본(body)을 따르도록 lists.css.ts의 `rowMain`에 `fontSize: fontSize.body, fontWeight: weight.medium`을 더한다.

- [ ] **Step 5: 통과 확인**

Run: `npm test && npx tsc --noEmit`
Expected: 전체 PASS. 특히 ViewerPage의 분기 테스트 4개(`dialog` 이름, 슬라이더 화살표 키, 두 번 누르기, 저장 실패 경고), PlayPage 테스트(`무르기`, `내 차례`, `원래 대국의 수순` 텍스트 `/^d4 Bg4 dxe5/`), ForksPage 테스트(`이어 두기` 링크, `삭제`, 제목 heading level 2)가 통과해야 한다.

- [ ] **Step 6: 수동 확인**

`npx vite --port 5199 --strictPort` → 뷰어 → [여기서 분기] 다이얼로그를 확인한다.
- Esc로 닫히는지 확인한다.
- 포커스가 [여기서 분기] 버튼으로 돌아오는지 확인한다.
- 모바일에서 대국 화면의 하단 막대가 동작하는지 확인한다(무르기·기권·엔진 세기 시트·PGN).
- `/forks`를 확인한다.

확인한 뒤 서버를 끈다.

- [ ] **Step 7: 커밋**

```bash
git add -A src
git commit -m "feat(play): 분기 대국·다이얼로그·내 분기 새 디자인" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: 옛 스타일 제거와 정리

**Files:**
- Delete: `src/styles.css`
- Modify: `src/main.tsx`, 문자열 className이 남은 파일 전부

**Interfaces:**
- Produces: 모든 스타일이 Vanilla Extract에서 온다. 코드베이스에 `className="…"` 문자열 리터럴이 없다.

- [ ] **Step 1: 남은 문자열 클래스 찾기**

Run: `grep -rn 'className="' src --include=*.tsx`
Expected: 결과가 있으면 각 위치를 해당 화면의 `*.css.ts` 스타일로 옮긴다. `sr-only`는 `visuallyHidden`, `meta`는 `page.css.ts`의 `meta`, `card`는 `Surface`로 옮긴다. 테스트 파일은 대상이 아니다.

- [ ] **Step 2: 옛 CSS 삭제**

```bash
git rm src/styles.css
```
`src/main.tsx`에서 `import './styles.css'` 줄을 지운다.

- [ ] **Step 3: 확인**

Run: `grep -rn 'className="' src --include=*.tsx | grep -v '\.test\.tsx'` → 결과 없음
Run: `npm test && npx tsc --noEmit && npm run build` → PASS

- [ ] **Step 4: 전 화면 수동 확인**

`npx vite --port 5199 --strictPort` → 홈, 뷰어(리뷰·힌트·분기), 대국 목록, 대회, 명국, 분기 대국, 내 분기, 라이선스, 404를 **라이트·다크 × 375px·1280px**로 훑는다.
- 옛 스타일이 사라져서 깨진 곳(여백 없음, 기본 버튼 모양, 700 굵기 등)이 없는지 확인한다.
- `getComputedStyle(document.body).fontFamily`에 Pretendard가 먼저 있는지 확인한다.

확인한 뒤 서버를 끈다.

- [ ] **Step 5: 커밋**

```bash
git add -A src
git commit -m "refactor(styles): 옛 styles.css 제거, 모든 스타일을 Vanilla Extract로" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: E2E 갱신 — 선택자, 모바일 시나리오, 시각 확인

**Files:**
- Modify: `e2e/helpers.ts`, `e2e/review.spec.ts`, `e2e/isolation.spec.ts`, `e2e/fork.spec.ts`
- Create: `e2e/mobile.spec.ts`, `e2e/visual.spec.ts`

**Interfaces:**
- Consumes: 완성된 화면의 역할·이름·`data-*` (Task 7–13)
- Produces: `mockLichessTop(page)` 도우미. `npm run e2e`(기본 3 + 모바일 3), `VISUAL=1 npx playwright test e2e/visual.spec.ts`(스크린샷 24장 → `test-results/visual/`)

- [ ] **Step 1: 도우미 추가** (`e2e/helpers.ts` 끝에)

```ts
import { CORS } from './fixtures'

/** 홈의 "진행 중인 대회" 섹션이 실제 Lichess를 부르지 않도록 빈 응답으로 막는다 */
export async function mockLichessTop(page: Page) {
  await page.route('https://lichess.org/api/broadcast/top', (route) =>
    route.fulfill({
      status: 200,
      headers: CORS,
      contentType: 'application/json',
      body: JSON.stringify({ active: [], upcoming: [], past: { currentPageResults: [] } }),
    }),
  )
}
```
(`import type { Page }`는 이미 파일 상단에 있다. 없으면 추가한다.)

- [ ] **Step 2: 기존 시나리오 선택자 갱신**

`e2e/review.spec.ts`:
- import에 `import { mockLichessTop } from './helpers'`를 추가하고, `await page.goto('/')` 앞에 `await mockLichessTop(page)`를 넣는다.
- 마지막 줄을 다음 두 줄로 바꾼다:
```ts
  await page.getByRole('button', { name: '기보 전체', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Nf6/ })).toHaveAttribute('data-label', 'blunder')
```

`e2e/isolation.spec.ts`: `.engine-lines li` 줄을 다음으로 바꾼다:
```ts
  await page.getByRole('button', { name: '엔진 라인', exact: true }).click()
  await expect(page.getByRole('list', { name: '엔진 라인' }).getByRole('listitem').first()).toBeVisible({ timeout: 30_000 })
```

`e2e/fork.spec.ts`: `page.locator('.play-moves button')`를 모두 `page.locator('[data-testid="play-moves"] button')`로, `page.locator('.play-moves')`를 `page.locator('[data-testid="play-moves"]')`로 바꾼다. `getByRole('button', { name: '여기서 분기' })`에는 `exact: true`를 붙인다.

- [ ] **Step 3: 모바일 시나리오** (`e2e/mobile.spec.ts`)

```ts
import { expect, test } from '@playwright/test'
import { mockLichessTop } from './helpers'

test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })

test('모바일 뷰어: 하단 막대로 이동하고 힌트를 켜고 끈다', async ({ page }) => {
  await page.goto('/game/classic/opera-game')
  const bar = page.getByRole('group', { name: '수 이동' })
  await expect(bar).toBeVisible()
  const box = await bar.boundingBox()
  expect(box!.y + box!.height).toBeGreaterThan(812 - 4) // 화면 하단에 고정

  await bar.getByRole('button', { name: '다음 수' }).click()
  const card = page.getByRole('region', { name: '이번 수 판정' })
  await expect(card).toContainText('1. e4')

  const hint = bar.getByRole('button', { name: '힌트' })
  await expect(hint).toBeEnabled({ timeout: 30_000 })
  await hint.click()
  await expect(card).toContainText('힌트:')
  await bar.getByRole('button', { name: '다음 수' }).click()
  await expect(hint).toHaveAttribute('aria-pressed', 'false')
})

test('모바일 뷰어: 리뷰 후 마지막 수에 판정이 붙는다', async ({ page }) => {
  await page.goto('/game/classic/opera-game')
  const card = page.getByRole('region', { name: '이번 수 판정' })
  await card.getByRole('button', { name: '리뷰 실행' }).click()
  await expect(page.getByText(/백 정확도/)).toBeVisible({ timeout: 90_000 })
  await page.getByRole('group', { name: '수 이동' }).getByRole('button', { name: '마지막' }).click()
  await expect(card).toContainText('17. Rd8#')
  await expect(card).toContainText(/탁월|좋은 수|최선|우수/)
})

test('다크 모드 선택이 새로고침 뒤에도 유지된다', async ({ page }) => {
  await mockLichessTop(page)
  await page.goto('/')
  await page.getByRole('button', { name: '다크 모드로 전환' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})
```

- [ ] **Step 4: 시각 확인용 스크린샷** (`e2e/visual.spec.ts`)

```ts
import { test } from '@playwright/test'
import { mockLichessTop } from './helpers'

const SIZES = [
  { w: 375, h: 812 },
  { w: 768, h: 1024 },
  { w: 1280, h: 800 },
]
const PAGES = [
  { name: 'home', path: '/' },
  { name: 'viewer', path: '/game/classic/opera-game' },
  { name: 'classics', path: '/classics' },
  { name: 'forks', path: '/forks' },
]

test.skip(!process.env.VISUAL, 'VISUAL=1일 때만 실행한다')

for (const theme of ['light', 'dark'] as const) {
  for (const size of SIZES) {
    for (const p of PAGES) {
      test(`${p.name} ${size.w} ${theme}`, async ({ page }) => {
        await mockLichessTop(page)
        await page.setViewportSize({ width: size.w, height: size.h })
        await page.addInitScript((t) => localStorage.setItem('chessling-theme', t), theme)
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto(p.path)
        await page.waitForLoadState('networkidle')
        await page.screenshot({ path: `test-results/visual/${p.name}-${size.w}-${theme}.png`, fullPage: true })
      })
    }
  }
}
```

- [ ] **Step 5: 실행**

Run: `npm run e2e`
Expected: 6 passed (review, isolation, fork, mobile ×3), visual은 skipped. 포트 4199에 서버가 남아 있지 않은지 `lsof -iTCP:4199 -sTCP:LISTEN`으로 확인한다.

Run: `VISUAL=1 npx playwright test e2e/visual.spec.ts`
Expected: 24 passed, `test-results/visual/`에 PNG 24장. (컨트롤러가 이미지를 직접 확인한다. 이 파일들은 커밋하지 않는다.)

- [ ] **Step 6: 커밋**

```bash
git add e2e
git commit -m "test(e2e): 새 선택자, 모바일 시나리오, 시각 확인 스크린샷" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## 스펙 대비 추적표

| 스펙 항목 | 태스크 |
|---|---|
| §2 스택 (VE·Motion·lucide·Pretendard) | 4, 5, 6 |
| §3.1–3.3 토큰·서체·간격·테두리 금지·밑줄 규칙 | 4, 5–13 |
| §3.4 다크 모드 (시스템·저장·첫 페인트·300ms 전환) | 4, 7 |
| §4.1 헤더·푸터·본문 바로가기·GitHub | 7 |
| §4.2 기본 부품 | 5, 6 |
| §5.1 히어로 (제목·잉크·부제·폼·자동 재생 보드·기보 띠·멈춤 조건·모션 감소) | 11 |
| §5.2 홈 아래 섹션 | 11 |
| §6.1 뷰어 보드 중심·모바일 하단 막대·스와이프·판정 카드·접이식·768+ 2열 | 9, 10 |
| §6.2 목록·대회·명국 | 12 |
| §6.3 분기 대국·다이얼로그·내 분기 | 13 |
| §6.4 라이선스·404 | 7 |
| §7 모션 | 6 (Reveal·InkText·Disclosure·Dialog), 5 (버튼), 8 (그래프), 10 (판정), 11 (히어로), 4 (전환·모션 감소) |
| §8.1 판정 9종·색·기호 | 2, 8, 10 |
| §8.2 희생 판정 | 1 |
| §8.3 리뷰 MultiPV 2·version | 3 |
| §8.4 판정 카드·힌트 | 10 |
| §9 접근성 | 4–13 |
| §10 테스트 | 각 태스크, 15 |
| §11 라이선스 고지 | 4, 7 |
