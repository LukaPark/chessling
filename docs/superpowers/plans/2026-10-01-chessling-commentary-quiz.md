# Chessling 수 해설·퀴즈 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기보·리뷰에서 수마다 코멘트를 붙인다. 명경기에는 해설자 수준의 해설과 직접 고른 퀴즈 장면을, 일반 대국에는 엔진 리뷰로 만든 코멘트와 자동 퀴즈 장면을 붙인다.

**Architecture:**
- 순수 로직은 두 곳에 둔다.
  - `src/engine/comment/`: 사실 감지 → 고르기 → 문장 만들기
  - `src/quiz/`: 장면 선정, 채점
- 명경기 해설은 `src/data/annotations/<slug>.json`에 둔다. `import.meta.glob`으로 경기별 지연 로딩한다.
- 뷰어(`ViewerPage`)에는 두 가지를 더한다.
  - 판정 카드 안 코멘트 블록
  - 퀴즈 모드: 보드 오버레이 버튼, 퀴즈 카드, 이동·평가 잠금
- 퀴즈 결과는 Dexie 새 테이블에 저장한다.
- 명경기 해설 제작은 node 스크립트를 쓴다.
  - 팩트 시트: Stockfish depth 22, MultiPV 3
  - 자동 검증: vitest
  - 해설 작성은 문체·사실 검토를 거친다.

**Tech Stack:** 기존 그대로. React 19, TypeScript, Vanilla Extract, motion, chess.js 1.4(`attackers`/`isAttacked` 사용), Dexie 4, TanStack Query 5, Vitest 4, Playwright, stockfish 19(node 스크립트).

**Spec:** `docs/superpowers/specs/2026-10-01-chessling-commentary-quiz-design.md`

## Global Constraints

- **커밋·PR에 Claude 표시를 넣지 않는다.** `Co-Authored-By: Claude…`, "Generated with Claude Code" 모두 금지(사용자 지시, 세션 기본값보다 우선). 커밋 메시지는 한국어 conventional 형식(`feat: …`, `test: …`, `fix: …`).
- 브랜치: `feat/commentary-quiz` (이미 만들어져 있음). `main`에 직접 커밋하지 않는다. 푸시는 사용자가 요청할 때만.
- 스타일:
  - Vanilla Extract만 쓴다. 문자열 className 금지.
  - 색은 토큰(`vars.color.*`)만 쓴다.
  - 굵기는 400/500만(`weight.regular`/`weight.medium`).
  - 테두리 상자 금지.
  - 터치 영역 44px 이상.
  - 모바일 퍼스트.
  - `prefers-reduced-motion` 존중(`MotionConfig reducedMotion="user"` 전역 + CSS).
- 테스트는 역할·텍스트·`data-*`로 찾는다. Vanilla Extract 클래스 이름으로 찾지 않는다.
- UI 문구는 해요체. 금칙어: "~것입니다", "중요한 순간", "놀라운", "~라고 할 수 있습니다", "매우 흥미로운".
- 스포일러 금지:
  - 해설·코멘트에 앞으로 나올 실제 기보 수를 SAN으로 쓰지 않는다.
  - 최선 수(다음 수)는 힌트·엔진 라인·퀴즈 [정답 보기]에서만 보여 준다.
- 저작권: 기존 출판 해설을 옮기지 않는다. 엔진 분석과 널리 알려진 사실로 새로 쓴다.
- 서버·LLM API 호출 금지. 모든 생성은 브라우저 안에서 한다.
- 포트 5199(사용자 미리보기), 5173, 4173에 서버를 띄우지 않는다. 남의 프로세스를 끄지 않는다. Playwright는 설정대로 4199를 쓴다.
- `.superpowers/`, `.claude/`, `test-results/`, `playwright-report/`, `scripts/annotate/facts/`는 커밋하지 않는다.

## File Structure

| 경로 | 역할 |
|---|---|
| `src/quiz/types.ts` | `QuizScene`, `QuizStep` 타입 |
| `src/sources/annotations.ts` | `Annotations` 타입, `loadAnnotations(slug)` |
| `src/features/viewer/useAnnotations.ts` | 명경기 해설 쿼리 훅 |
| `src/features/viewer/CommentText.tsx` | 코멘트 문단(가정 수순 표기, 접기) |
| `src/engine/comment/korean.ts` | 조사, 기물·칸 이름 |
| `src/engine/comment/facts.ts` | 감지기 → `Fact[]` |
| `src/engine/comment/phrases.ko.ts` | 사실별 문장 틀 |
| `src/engine/comment/compose.ts` | 고르기·문장 만들기 → `MoveComment` |
| `src/engine/comment/index.ts` | `commentFor(input)` 공개 API |
| `src/quiz/selectScenes.ts` | 일반 대국 자동 장면 선정 |
| `src/quiz/grade.ts` | 수 채점(엔진 주입) |
| `src/quiz/refute.ts` | 오답 반박 문장 |
| `src/features/viewer/quiz/QuizButton.tsx` | 보드 오버레이 버튼 |
| `src/features/viewer/quiz/QuizCard.tsx` | 퀴즈 카드(질문·진행·힌트·정답·그만두기·수 입력) |
| `src/features/viewer/quiz/useQuiz.ts` | 퀴즈 상태 기계 |
| `src/styles/features/quiz.css.ts` | 퀴즈 스타일 |
| `src/storage/db.ts` | `quizResults` 테이블 추가(Dexie v2) |
| `scripts/annotate/facts.ts` | 팩트 시트 생성(node + stockfish) |
| `scripts/annotate/preview-comments.ts` | 생성 코멘트 미리보기 |
| `src/data/annotations/<slug>.json` | 명경기 해설·장면 |
| `src/data/annotations/annotations.test.ts` | 해설 자동 검증 |
| `docs/superpowers/annotation-style.md` | 해설 문체 기준(시범 후 확정) |

---

### Task 1: 해설 데이터 형식과 불러오기

**Files:**
- Create: `src/quiz/types.ts`, `src/sources/annotations.ts`, `src/sources/annotations.test.ts`, `src/features/viewer/useAnnotations.ts`
- Create: `src/data/annotations/.gitkeep`

**Interfaces:**
- Produces:
  - `QuizScene`, `QuizStep`
  - `Annotations`, `AnnotatedPly`
  - `loadAnnotations(slug: string): Promise<Annotations | null>`
  - `useAnnotations(ref: GameRef): Annotations | null`

- [ ] **Step 1: 타입 작성** (`src/quiz/types.ts`)

```ts
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
```

- [ ] **Step 2: 실패하는 테스트** (`src/sources/annotations.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import { annotationSlugs, loadAnnotations } from './annotations'

describe('loadAnnotations', () => {
  it('없는 경기는 null', async () => {
    expect(await loadAnnotations('no-such-game')).toBeNull()
  })
  it('있는 경기는 slug가 맞는 해설을 돌려준다', async () => {
    for (const slug of annotationSlugs()) {
      const a = await loadAnnotations(slug)
      expect(a?.slug).toBe(slug)
      expect(a?.version).toBe(1)
    }
  })
})
```

Run: `npx vitest run src/sources/annotations.test.ts`
Expected: FAIL. `./annotations` 모듈이 없다.

- [ ] **Step 3: 구현** (`src/sources/annotations.ts`)

```ts
import type { QuizScene } from '../quiz/types'

export interface AnnotatedPly {
  /** 0 = 시작 포지션(경기 소개), i = i번째 수를 둔 직후 */
  ply: number
  text: string
  /** 핵심 장면 */
  key?: boolean
}

export interface Annotations {
  slug: string
  version: 1
  plies: AnnotatedPly[]
  scenes: QuizScene[]
}

const files = import.meta.glob<Annotations>('../data/annotations/*.json', { import: 'default' })
const PREFIX = '../data/annotations/'

export function annotationSlugs(): string[] {
  return Object.keys(files).map((k) => k.slice(PREFIX.length, -'.json'.length))
}

export async function loadAnnotations(slug: string): Promise<Annotations | null> {
  const load = files[`${PREFIX}${slug}.json`]
  return load ? await load() : null
}
```

`src/data/annotations/.gitkeep`은 빈 파일이다.

- [ ] **Step 4: 훅** (`src/features/viewer/useAnnotations.ts`)

```ts
import { useQuery } from '@tanstack/react-query'
import type { GameRef } from '../../chess/gameRef'
import { loadAnnotations, type Annotations } from '../../sources/annotations'

export function useAnnotations(ref: GameRef): Annotations | null {
  const slug = ref.kind === 'classic' ? ref.slug : null
  const q = useQuery({
    queryKey: ['annotations', slug],
    queryFn: () => loadAnnotations(slug!),
    enabled: slug !== null,
    staleTime: Infinity,
  })
  return q.data ?? null
}
```

- [ ] **Step 5: 확인 후 커밋**

Run: `npx vitest run src/sources && npx tsc --noEmit` → PASS

```bash
git add src/quiz/types.ts src/sources/annotations.ts src/sources/annotations.test.ts src/features/viewer/useAnnotations.ts src/data/annotations/.gitkeep
git commit -m "feat: 명경기 해설 데이터 형식과 경기별 지연 로딩"
```

---

### Task 2: 판정 카드에 코멘트 블록

**Files:**
- Create: `src/features/viewer/CommentText.tsx`, `src/features/viewer/CommentText.test.tsx`
- Modify: `src/styles/features/viewer.css.ts`, `src/features/viewer/JudgmentCard.tsx`, `src/features/viewer/ViewerPage.tsx`, `src/features/viewer/ViewerPage.test.tsx`

**Interfaces:**
- Consumes: `useAnnotations` (Task 1)
- Produces:
  - `CommentText({ text })`
    - `[[...]]`는 `<span data-variation>`으로 그린다.
    - 글이 `COMMENT_CLAMP_CHARS`(90자)를 넘으면 2줄로 접고 [더 보기]/[접기] 버튼(`aria-expanded`)을 둔다.
  - `JudgmentCard`의 새 prop: `comment?: { text: string; key?: boolean } | null`
    - `key`면 카드 위에 `<Badge>핵심 장면</Badge>`을 단다.

- [ ] **Step 1: 실패하는 테스트** (`src/features/viewer/CommentText.test.tsx`)

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { COMMENT_CLAMP_CHARS, CommentText } from './CommentText'

it('가정 수순을 변화 수순으로 표시한다', () => {
  const { container } = render(<CommentText text="받으면 [[9...cxd5 10. exd5]]로 줄이 열려요." />)
  expect(container.querySelector('[data-variation]')?.textContent).toBe('9...cxd5 10. exd5')
  expect(screen.getByText(/로 줄이 열려요/)).toBeInTheDocument()
})

it('짧은 글은 접지 않는다', () => {
  render(<CommentText text="킹을 피신시켰어요." />)
  expect(screen.queryByRole('button', { name: '더 보기' })).toBeNull()
})

it('긴 글은 접고 더 보기로 펼친다', () => {
  render(<CommentText text={'가'.repeat(COMMENT_CLAMP_CHARS + 1)} />)
  const more = screen.getByRole('button', { name: '더 보기' })
  expect(more).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(more)
  expect(screen.getByRole('button', { name: '접기' })).toHaveAttribute('aria-expanded', 'true')
})
```

Run: `npx vitest run src/features/viewer/CommentText.test.tsx`
Expected: FAIL. 모듈이 없다.

- [ ] **Step 2: 스타일** (`src/styles/features/viewer.css.ts` 끝에 추가)

```ts
export const comment = style({ display: 'grid', gap: space[1], justifyItems: 'start' })
export const commentText = style({ fontSize: fontSize.body, lineHeight: 1.6, color: vars.color.ink, wordBreak: 'keep-all', overflowWrap: 'anywhere' })
export const commentClamped = style({ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' })
export const variation = style({ color: vars.color.muted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' })
export const moreButton = style({
  minHeight: 44,
  padding: `0 ${space[1]}`,
  border: 0,
  background: 'transparent',
  color: vars.color.accent,
  fontSize: fontSize.control,
  fontWeight: weight.medium,
  cursor: 'pointer',
})
```

`fontSize.body`가 토큰에 없으면 `tokens.css.ts`에 있는 본문 크기 토큰 이름을 쓴다(예: `fontSize.base`). 이름은 `grep -n "fontSize" src/styles/tokens.css.ts`로 확인한다.

- [ ] **Step 3: 구현** (`src/features/viewer/CommentText.tsx`)

```tsx
import { useState } from 'react'
import * as v from '../../styles/features/viewer.css'
import { cx } from '../../ui/cx'

export const COMMENT_CLAMP_CHARS = 90

/** "[[...]]"을 변화 수순 조각으로 나눈다 */
function segments(text: string): { variation: boolean; text: string }[] {
  const out: { variation: boolean; text: string }[] = []
  const re = /\[\[(.+?)\]\]/g
  let last = 0
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({ variation: false, text: text.slice(last, m.index) })
    out.push({ variation: true, text: m[1] })
    last = m.index! + m[0].length
  }
  if (last < text.length) out.push({ variation: false, text: text.slice(last) })
  return out
}

export function CommentText({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const long = text.replace(/\[\[|\]\]/g, '').length > COMMENT_CLAMP_CHARS
  return (
    <div className={v.comment}>
      <p className={cx(v.commentText, long && !open && v.commentClamped)}>
        {segments(text).map((s, i) =>
          s.variation ? (
            <span key={i} className={v.variation} data-variation="">
              {s.text}
            </span>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
      </p>
      {long && (
        <button type="button" className={v.moreButton} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? '접기' : '더 보기'}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 판정 카드에 연결** (`src/features/viewer/JudgmentCard.tsx`)

1. import에 `import { Badge } from '../../ui/Badge'`와 `import { CommentText } from './CommentText'`를 추가한다.
2. props 타입에 `comment?: { text: string; key?: boolean } | null`을 추가한다. 구조 분해에 `comment`를 추가한다.
3. `<p className={v.move}>{title}</p>`를 다음으로 바꾼다.

```tsx
      {comment?.key && <Badge>핵심 장면</Badge>}
      <p className={v.move}>{title}</p>
```

4. 형세 줄 다음, `{hint && (` 앞에 다음을 넣는다. `key={ply}`라서 수를 옮기면 접힘이 초기화된다.

```tsx
      {comment && <CommentText key={ply} text={comment.text} />}
```

- [ ] **Step 5: 뷰어 연결** (`src/features/viewer/ViewerPage.tsx`)

1. `import { useAnnotations } from './useAnnotations'`를 추가한다.
2. `LoadedViewer` 안, `const fen = plies[ply].fen` 아래에 다음을 넣는다.

```tsx
  const annotations = useAnnotations(gameRef)
  const authored = annotations?.plies.find((a) => a.ply === ply) ?? null
```

3. `<JudgmentCard …>`에 `comment={authored ? { text: authored.text, key: authored.key } : null}`를 추가한다. 일반 대국 코멘트는 Task 7에서 같은 prop에 연결한다.

- [ ] **Step 6: 뷰어 테스트** (`src/features/viewer/ViewerPage.test.tsx`)

맨 위 import들 아래에 `vi.mock`을 추가한다. 명경기 해설을 가짜로 넣는다.

```tsx
vi.mock('../../sources/annotations', () => ({
  annotationSlugs: () => ['opera-game'],
  loadAnnotations: async (slug: string) =>
    slug === 'opera-game'
      ? {
          slug,
          version: 1,
          scenes: [],
          plies: [
            { ply: 0, text: '파리 오페라 극장 귀빈석에서 둔 한 판이에요.' },
            { ply: 1, text: '중앙을 차지하며 시작해요.', key: true },
          ],
        }
      : null,
}))
```

테스트를 추가한다.

```tsx
  it('명경기는 리뷰 전에도 해설과 핵심 장면 표시를 보여 준다', async () => {
    renderRoute('/game/classic/opera-game')
    const card = await screen.findByRole('region', { name: '이번 수 판정' })
    expect(await within(card).findByText('파리 오페라 극장 귀빈석에서 둔 한 판이에요.')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(await within(card).findByText('중앙을 차지하며 시작해요.')).toBeInTheDocument()
    expect(within(card).getByText('핵심 장면')).toBeInTheDocument()
  })
```

- [ ] **Step 7: 확인 후 커밋**

Run: `npm test && npx tsc --noEmit` → PASS

```bash
git add src/features/viewer src/styles/features/viewer.css.ts
git commit -m "feat: 판정 카드에 수 해설 표시(가정 수순 표기, 긴 글 접기, 핵심 장면 배지)"
```

---

### Task 3: 한국어 도우미(조사, 기물·칸 이름)

**Files:**
- Create: `src/engine/comment/korean.ts`, `src/engine/comment/korean.test.ts`

**Interfaces:**
- Produces:
  - `PIECE_KO: Record<PieceSymbol, string>`
  - `hasBatchim(word: string): boolean`
  - `withJosa(word: string, pair: '은/는' | '이/가' | '을/를' | '으로/로' | '과/와'): string`
  - `squareKo(sq: string): string`. 그대로 "e5"를 돌려준다. 조사는 `withJosa`로 붙인다.

- [ ] **Step 1: 실패하는 테스트**

```ts
import { describe, expect, it } from 'vitest'
import { hasBatchim, PIECE_KO, withJosa } from './korean'

describe('조사', () => {
  it('한글 받침', () => {
    expect(hasBatchim('폰')).toBe(true)
    expect(hasBatchim('나이트')).toBe(false)
    expect(withJosa('퀸', '을/를')).toBe('퀸을')
    expect(withJosa('나이트', '을/를')).toBe('나이트를')
    expect(withJosa('비숍', '이/가')).toBe('비숍이')
  })
  it('칸 이름은 숫자를 읽는 소리로 판단', () => {
    expect(withJosa('e5', '은/는')).toBe('e5는') // 오
    expect(withJosa('d4', '이/가')).toBe('d4가') // 사
    expect(withJosa('f7', '을/를')).toBe('f7을') // 칠
    expect(withJosa('h8', '은/는')).toBe('h8은') // 팔
  })
  it('으로/로: ㄹ 받침과 받침 없음은 로', () => {
    expect(withJosa('룩', '으로/로')).toBe('룩으로')
    expect(withJosa('e1', '으로/로')).toBe('e1로') // 일(ㄹ)
    expect(withJosa('e2', '으로/로')).toBe('e2로') // 이
    expect(withJosa('e3', '으로/로')).toBe('e3으로') // 삼
  })
  it('SAN 끝의 +, #, =Q는 무시하고 마지막 칸으로 판단', () => {
    expect(withJosa('Qxf7+', '은/는')).toBe('Qxf7+은')
    expect(withJosa('e8=Q', '을/를')).toBe('e8=Q을') // '이팔 퀸'으로 읽음
  })
  it('기물 이름', () => {
    expect(PIECE_KO.n).toBe('나이트')
    expect(PIECE_KO.k).toBe('킹')
  })
})
```

규칙은 다음과 같다.
- `=X`가 있으면 X 기물 이름으로 판단한다.
- 그 밖에는 마지막 숫자로 판단한다.
- `+`, `#`은 버린다.

- [ ] **Step 2: 구현**

```ts
import type { PieceSymbol } from 'chess.js'

export const PIECE_KO: Record<PieceSymbol, string> = { p: '폰', n: '나이트', b: '비숍', r: '룩', q: '퀸', k: '킹' }

/** 0~9를 읽는 소리: 영 일 이 삼 사 오 육 칠 팔 구 */
const DIGIT_BATCHIM: Record<string, 'none' | 'rieul' | 'other'> = {
  '0': 'other', '1': 'rieul', '2': 'none', '3': 'other', '4': 'none',
  '5': 'none', '6': 'other', '7': 'rieul', '8': 'rieul', '9': 'none',
}
const PROMO: Record<string, string> = { Q: '퀸', R: '룩', B: '비숍', N: '나이트' }

function finalSound(word: string): 'none' | 'rieul' | 'other' {
  let w = word.replace(/[+#!?]+$/g, '')
  const promo = w.match(/=([QRBN])$/)
  if (promo) w = PROMO[promo[1]]
  const last = w.at(-1) ?? ''
  if (last in DIGIT_BATCHIM) return DIGIT_BATCHIM[last]
  const code = last.charCodeAt(0) - 0xac00
  if (code < 0 || code > 11171) return 'none'
  const jong = code % 28
  if (jong === 0) return 'none'
  return jong === 8 ? 'rieul' : 'other'
}

export function hasBatchim(word: string): boolean {
  return finalSound(word) !== 'none'
}

export function withJosa(word: string, pair: '은/는' | '이/가' | '을/를' | '으로/로' | '과/와'): string {
  const [withB, withoutB] = pair.split('/')
  const s = finalSound(word)
  if (pair === '으로/로') return word + (s === 'other' ? withB : withoutB)
  return word + (s === 'none' ? withoutB : withB)
}
```

- [ ] **Step 3: 확인 후 커밋**

Run: `npx vitest run src/engine/comment` → PASS

```bash
git add src/engine/comment/korean.ts src/engine/comment/korean.test.ts
git commit -m "feat: 코멘트용 한국어 조사·기물 이름 도우미"
```

---

### Task 4: 사실 감지기

**Files:**
- Create: `src/engine/comment/facts.ts`, `src/engine/comment/facts.test.ts`

**Interfaces:**
- Consumes: `Ply`, `ReviewedPosition`, `MoveLabel`, `winPercent`, `toWhitePov`(필요 시), `materialBalance`, `PIECE_VALUE`, `pvToSan`
- Produces: `extractFacts(input: CommentInput): Fact[]`. `CommentInput`, `Fact`, `Band`도 export한다.

- [ ] **Step 1: 타입과 공개 함수 시그니처**

```ts
import { Chess, type Move, type PieceSymbol, type Square } from 'chess.js'
import { PIECE_VALUE } from '../../chess/material'
import { pvToSan, turnOf } from '../../chess/pgn'
import type { Ply } from '../../chess/types'
import { winPercent, type Score } from '../classify'
import type { MoveLabel } from '../judge'
import type { ReviewedPosition } from '../review'

export interface CommentInput {
  plies: Ply[]
  positions: ReviewedPosition[]
  labels: (MoveLabel | null)[]
  /** 코멘트할 수 (1부터) */
  index: number
  seed: string
}

export type Band = 'whiteWinning' | 'whiteBetter' | 'equal' | 'blackBetter' | 'blackWinning'

export type Fact =
  | { kind: 'mate' }
  | { kind: 'check' }
  | { kind: 'capture'; piece: PieceSymbol; captured: PieceSymbol; square: Square }
  | { kind: 'recapture'; square: Square }
  | { kind: 'promotion'; to: PieceSymbol }
  | { kind: 'castle'; long: boolean }
  | { kind: 'develop'; piece: PieceSymbol }
  | { kind: 'centerPawn'; square: Square }
  | { kind: 'fork'; piece: PieceSymbol; square: Square; targets: PieceSymbol[] }
  | { kind: 'pin'; pinned: PieceSymbol; square: Square; behind: PieceSymbol }
  | { kind: 'hanging'; piece: PieceSymbol; square: Square }
  | { kind: 'rookFile'; file: string; open: boolean }
  | { kind: 'kingShield' }
  | { kind: 'trade'; piece: PieceSymbol }
  | { kind: 'missed'; bestSan: string; gain: 'mate' | 'material' | 'advantage'; amount: number }
  | { kind: 'refutation'; target: PieceSymbol; square: Square; san: string | null }
  | { kind: 'mateThreat'; forWhite: boolean; inMoves: number }
  | { kind: 'band'; from: Band; to: Band }
```

- [ ] **Step 2: 실패하는 테스트** (`src/engine/comment/facts.test.ts`)

포지션은 손으로 만든 FEN을 쓰고, `positions`는 테스트용으로 간단히 만든다.

```ts
import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import type { Ply } from '../../chess/types'
import type { ReviewedPosition } from '../review'
import { bandOf, extractFacts, type CommentInput } from './facts'

function pliesFrom(fen: string, sans: string[]): Ply[] {
  const c = new Chess(fen)
  const out: Ply[] = [{ san: null, uci: null, fen }]
  for (const san of sans) {
    const m = c.move(san)
    out.push({ san: m.san, uci: m.from + m.to + (m.promotion ?? ''), fen: c.fen() })
  }
  return out
}
const pos = (cp: number, best: string | null = null, pv: string[] = []): ReviewedPosition => ({
  score: { cp }, best, pv, second: null, legalMoves: 20,
})
function input(plies: Ply[], positions: ReviewedPosition[], index: number, labels = plies.map(() => null)): CommentInput {
  return { plies, positions, labels, index, seed: 't' }
}
const kinds = (facts: { kind: string }[]) => facts.map((f) => f.kind)

describe('extractFacts', () => {
  it('잡기와 체크', () => {
    const plies = pliesFrom('4k3/8/8/3p4/8/8/8/3QK3 w - - 0 1', ['Qxd5'])
    const f = extractFacts(input(plies, [pos(0), pos(800)], 1))
    expect(f).toContainEqual({ kind: 'capture', piece: 'q', captured: 'p', square: 'd5' })
  })
  it('메이트', () => {
    const plies = pliesFrom('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', ['Ra8#'])
    expect(kinds(extractFacts(input(plies, [pos(0), pos(10000)], 1)))).toContain('mate')
  })
  it('캐슬링과 전개', () => {
    const plies = pliesFrom('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', ['O-O'])
    expect(extractFacts(input(plies, [pos(0), pos(0)], 1))).toContainEqual({ kind: 'castle', long: false })
    const p2 = pliesFrom(new Chess().fen(), ['Nf3'])
    expect(extractFacts(input(p2, [pos(0), pos(0)], 1))).toContainEqual({ kind: 'develop', piece: 'n' })
  })
  it('포크: 나이트가 킹과 룩을 동시에', () => {
    const plies = pliesFrom('r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', ['Nc7+'])
    const fork = extractFacts(input(plies, [pos(0), pos(500)], 1)).find((x) => x.kind === 'fork')
    expect(fork).toMatchObject({ piece: 'n', square: 'c7' })
    expect(fork && 'targets' in fork ? [...fork.targets].sort() : []).toEqual(['k', 'r'])
  })
  it('공짜로 놓인 기물: 움직인 퀸이 폰에게 공격받음', () => {
    const plies = pliesFrom('4k3/8/8/8/2p5/8/8/3QK3 w - - 0 1', ['Qd3'])
    expect(extractFacts(input(plies, [pos(0), pos(-800)], 1))).toContainEqual({ kind: 'hanging', piece: 'q', square: 'd3' })
  })
  it('놓친 수: 실수였고 최선 수가 기물을 땄다', () => {
    const plies = pliesFrom('4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1', ['Ke2'])
    const f = extractFacts(input(plies, [pos(900, 'd1d5', ['d1d5']), pos(-900)], 1, [null, 'blunder']))
    expect(f.find((x) => x.kind === 'missed')).toMatchObject({ bestSan: 'Rxd5', gain: 'material' })
  })
  it('형세 구간 변화', () => {
    expect(bandOf({ cp: 0 })).toBe('equal')
    expect(bandOf({ cp: 900 })).toBe('whiteWinning')
    const plies = pliesFrom(new Chess().fen(), ['e4'])
    expect(extractFacts(input(plies, [pos(0), pos(400)], 1))).toContainEqual({ kind: 'band', from: 'equal', to: 'whiteBetter' })
  })
})
```

Run: `npx vitest run src/engine/comment/facts.test.ts`
Expected: FAIL. 모듈이 없다.

- [ ] **Step 3: 구현**

```ts
// (Step 1의 import와 타입 이어서)

export function bandOf(score: Score): Band {
  const w = winPercent(score)
  if (w >= 90) return 'whiteWinning'
  if (w >= 65) return 'whiteBetter'
  if (w > 35) return 'equal'
  if (w > 10) return 'blackBetter'
  return 'blackWinning'
}

const CENTER = new Set(['d4', 'e4', 'd5', 'e5'])

function lastMove(plies: Ply[], index: number): Move | null {
  const prev = plies[index - 1]
  const ply = plies[index]
  if (!ply.uci) return null
  const c = new Chess(prev.fen)
  try {
    return c.move({ from: ply.uci.slice(0, 2), to: ply.uci.slice(2, 4), promotion: ply.uci[4] })
  } catch {
    return null
  }
}

/** sq에 있는 기물을 공격하는 상대 기물 가운데 가장 싼 값 */
function cheapestAttacker(chess: Chess, sq: Square, by: 'w' | 'b'): number | null {
  const vals = chess.attackers(sq, by).map((a) => PIECE_VALUE[chess.get(a)!.type])
  return vals.length ? Math.min(...vals) : null
}

function isHanging(chess: Chess, sq: Square): boolean {
  const piece = chess.get(sq)
  if (!piece || piece.type === 'k') return false
  const enemy = piece.color === 'w' ? 'b' : 'w'
  const attacker = cheapestAttacker(chess, sq, enemy)
  if (attacker === null) return false
  const defended = chess.attackers(sq, piece.color).length > 0
  return !defended || attacker < PIECE_VALUE[piece.type]
}

export function extractFacts(input: CommentInput): Fact[] {
  const { plies, positions, labels, index } = input
  const move = lastMove(plies, index)
  if (!move) return []
  const after = new Chess(plies[index].fen)
  const mover = move.color
  const enemy = mover === 'w' ? 'b' : 'w'
  const facts: Fact[] = []

  if (after.isCheckmate()) facts.push({ kind: 'mate' })
  else if (after.inCheck()) facts.push({ kind: 'check' })

  if (move.captured) {
    facts.push({ kind: 'capture', piece: move.piece, captured: move.captured, square: move.to })
    const prev = index > 1 ? lastMove(plies, index - 1) : null
    if (prev?.captured && prev.to === move.to) facts.push({ kind: 'recapture', square: move.to })
    // 같은 값의 교환: 잡은 기물을 곧바로 되잡을 수 있으면
    if (PIECE_VALUE[move.piece] === PIECE_VALUE[move.captured] && after.attackers(move.to, enemy).length > 0) {
      facts.push({ kind: 'trade', piece: move.captured })
    }
  }
  if (move.promotion) facts.push({ kind: 'promotion', to: move.promotion })
  if (move.san.startsWith('O-O')) facts.push({ kind: 'castle', long: move.san.startsWith('O-O-O') })

  const backRank = mover === 'w' ? '1' : '8'
  if ((move.piece === 'n' || move.piece === 'b') && move.from[1] === backRank && index <= 24) {
    facts.push({ kind: 'develop', piece: move.piece })
  }
  if (move.piece === 'p' && CENTER.has(move.to) && index <= 16) facts.push({ kind: 'centerPawn', square: move.to })

  // 포크: 움직인 기물이 상대 기물 2개 이상을 공격(킹이거나, 더 비싸거나, 방어가 없음)
  const targets: PieceSymbol[] = []
  for (const sq of attackedBy(after, move.to)) {
    const t = after.get(sq)
    if (!t || t.color !== enemy) continue
    const undefended = after.attackers(sq, enemy).length === 0
    if (t.type === 'k' || PIECE_VALUE[t.type] > PIECE_VALUE[move.piece] || undefended) targets.push(t.type)
  }
  if (targets.length >= 2 && !isHanging(after, move.to)) facts.push({ kind: 'fork', piece: move.piece, square: move.to, targets })

  const pin = findPin(after, move.to)
  if (pin) facts.push(pin)

  // 공짜로 놓인 기물: 움직인 기물, 또는 움직이면서 방어가 풀린 자기 기물
  if (isHanging(after, move.to) && !move.captured) facts.push({ kind: 'hanging', piece: move.piece, square: move.to })

  if (move.piece === 'r') {
    const file = move.to[0]
    const pawns = fileHasPawn(after, file)
    if (!pawns.own) facts.push({ kind: 'rookFile', file, open: !pawns.enemy })
  }
  if (move.piece === 'p' && kingShieldFiles(after, mover).includes(move.from[0]) && !move.captured) facts.push({ kind: 'kingShield' })

  const label = labels[index]
  const before = positions[index - 1]
  if (label && (label === 'mistake' || label === 'blunder' || label === 'miss') && before?.best && before.best !== plies[index].uci) {
    const missed = describeMissed(plies[index - 1].fen, before)
    if (missed) facts.push(missed)
  }
  const reply = positions[index]?.pv[0]
  if (label && (label === 'mistake' || label === 'blunder') && reply) {
    const r = describeRefutation(plies[index].fen, reply, plies[index + 1]?.uci ?? null)
    if (r) facts.push(r)
  }

  const s = positions[index]?.score
  if (s && 'mate' in s && !after.isCheckmate()) facts.push({ kind: 'mateThreat', forWhite: s.mate > 0, inMoves: Math.abs(s.mate) })
  if (before && s) {
    const from = bandOf(before.score)
    const to = bandOf(s)
    if (from !== to) facts.push({ kind: 'band', from, to })
  }
  return facts
}

/** sq의 기물이 공격하는 칸들 */
function attackedBy(chess: Chess, sq: Square): Square[] {
  const piece = chess.get(sq)
  if (!piece) return []
  const out: Square[] = []
  for (const file of 'abcdefgh') {
    for (const rank of '12345678') {
      const t = `${file}${rank}` as Square
      if (t !== sq && chess.attackers(t, piece.color).includes(sq)) out.push(t)
    }
  }
  return out
}

const LINE_DIRS: Record<string, [number, number][]> = {
  b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  q: [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]],
}

/** 움직인 직선 기물이 상대 기물을 더 비싼 기물(킹·퀸)에 묶었는가 */
function findPin(chess: Chess, from: Square): Fact | null {
  const piece = chess.get(from)
  if (!piece || !LINE_DIRS[piece.type]) return null
  for (const [df, dr] of LINE_DIRS[piece.type]) {
    let first: { sq: Square; type: PieceSymbol } | null = null
    let f = from.charCodeAt(0) - 97 + df
    let r = Number(from[1]) - 1 + dr
    while (f >= 0 && f < 8 && r >= 0 && r < 8) {
      const sq = `${String.fromCharCode(97 + f)}${r + 1}` as Square
      const t = chess.get(sq)
      if (t) {
        if (t.color === piece.color) break
        if (!first) first = { sq, type: t.type }
        else {
          if ((t.type === 'k' || t.type === 'q') && PIECE_VALUE[first.type] < PIECE_VALUE[t.type] + (t.type === 'k' ? 100 : 0)) {
            return { kind: 'pin', pinned: first.type, square: first.sq, behind: t.type }
          }
          break
        }
      }
      f += df
      r += dr
    }
  }
  return null
}

function fileHasPawn(chess: Chess, file: string): { own: boolean; enemy: boolean } {
  const turn = chess.turn() // 다음 둘 쪽 = 상대
  let own = false
  let enemy = false
  for (const rank of '12345678') {
    const p = chess.get(`${file}${rank}` as Square)
    if (p?.type === 'p') {
      if (p.color === turn) enemy = true
      else own = true
    }
  }
  return { own, enemy }
}

function kingShieldFiles(chess: Chess, color: 'w' | 'b'): string[] {
  const king = chess.board().flat().find((p) => p?.type === 'k' && p.color === color)
  if (!king) return []
  const f = king.square.charCodeAt(0) - 97
  return [f - 1, f, f + 1].filter((x) => x >= 0 && x < 8).map((x) => String.fromCharCode(97 + x))
}

function describeMissed(fenBefore: string, before: ReviewedPosition): Fact | null {
  const bestSan = pvToSan(fenBefore, [before.best!], 1)[0]
  if (!bestSan) return null
  if ('mate' in before.score) return { kind: 'missed', bestSan, gain: 'mate', amount: Math.abs(before.score.mate) }
  const c = new Chess(fenBefore)
  const m = c.move({ from: before.best!.slice(0, 2), to: before.best!.slice(2, 4), promotion: before.best![4] })
  if (m.captured) return { kind: 'missed', bestSan, gain: 'material', amount: PIECE_VALUE[m.captured] }
  return { kind: 'missed', bestSan, gain: 'advantage', amount: 0 }
}

/** 상대의 최선 응수가 무엇을 따는지. 실제 다음 기보 수와 같으면 SAN을 숨긴다 */
function describeRefutation(fenAfter: string, replyUci: string, nextGameUci: string | null): Fact | null {
  const c = new Chess(fenAfter)
  let m: Move
  try {
    m = c.move({ from: replyUci.slice(0, 2), to: replyUci.slice(2, 4), promotion: replyUci[4] })
  } catch {
    return null
  }
  if (!m.captured || PIECE_VALUE[m.captured] < 3) return null
  return { kind: 'refutation', target: m.captured, square: m.to, san: replyUci === nextGameUci ? null : m.san }
}
```

`turnOf`, `pvToSan` import가 쓰이지 않으면 지운다. `attackedBy`는 64칸 × `attackers`라 느리다. 수마다 한 번만 부르고, 성능이 문제면 Task 6 미리보기 스크립트로 1,879수 처리 시간을 잰다(목표: 전체 2초 이내).

- [ ] **Step 4: 확인 후 커밋**

Run: `npx vitest run src/engine/comment && npx tsc --noEmit` → PASS

```bash
git add src/engine/comment/facts.ts src/engine/comment/facts.test.ts
git commit -m "feat: 코멘트용 사실 감지기(전술·조용한 수·놓친 수·형세 구간)"
```

---

### Task 5: 문장 틀과 조립

**Files:**
- Create: `src/engine/comment/phrases.ko.ts`, `src/engine/comment/compose.ts`, `src/engine/comment/index.ts`, `src/engine/comment/compose.test.ts`

**Interfaces:**
- Consumes: `extractFacts`, `Fact`, `CommentInput` (Task 4), `withJosa`, `PIECE_KO` (Task 3)
- Produces:
  - `commentFor(input: CommentInput): MoveComment | null`
  - `MoveComment = { text: string; facts: Fact['kind'][] }`
  - `commentsForGame(base: Omit<CommentInput, 'index'>): (MoveComment | null)[]`. 반복 방지를 위해 앞 수부터 차례로 만든다. 인덱스 0은 null이다.

- [ ] **Step 1: 실패하는 테스트**

```ts
import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import type { Ply } from '../../chess/types'
import type { ReviewedPosition } from '../review'
import { commentsForGame } from './index'

const BANNED = [/것입니다/, /중요한 순간/, /놀라운/, /라고 할 수 있/, /매우 흥미로운/]

function game(sans: string[]): Ply[] {
  const c = new Chess()
  const out: Ply[] = [{ san: null, uci: null, fen: c.fen() }]
  for (const s of sans) {
    const m = c.move(s)
    out.push({ san: m.san, uci: m.from + m.to + (m.promotion ?? ''), fen: c.fen() })
  }
  return out
}
const flat = (n: number): ReviewedPosition[] => Array.from({ length: n }, () => ({ score: { cp: 20 }, best: null, pv: [], second: null, legalMoves: 20 }))

describe('commentsForGame', () => {
  const plies = game(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6'])
  const base = { plies, positions: flat(plies.length), labels: plies.map(() => null), seed: 'g1' }

  it('모든 수에 한마디씩, 0번은 null', () => {
    const out = commentsForGame(base)
    expect(out[0]).toBeNull()
    for (let i = 1; i < plies.length; i++) expect(out[i]?.text.length).toBeGreaterThan(0)
  })
  it('같은 입력이면 같은 문장', () => {
    expect(commentsForGame(base).map((c) => c?.text)).toEqual(commentsForGame(base).map((c) => c?.text))
  })
  it('바로 이어지는 두 수에 같은 문장을 쓰지 않는다', () => {
    const texts = commentsForGame(base).map((c) => c?.text)
    for (let i = 2; i < texts.length; i++) expect(texts[i]).not.toBe(texts[i - 1])
  })
  it('금칙어가 없다', () => {
    for (const c of commentsForGame(base)) for (const b of BANNED) expect(c?.text ?? '').not.toMatch(b)
  })
  it('캐슬링 코멘트는 킹 안전을 말한다', () => {
    expect(commentsForGame(base)[7]?.facts).toContain('castle')
  })
})
```

Run: `npx vitest run src/engine/comment/compose.test.ts` → FAIL

- [ ] **Step 2: 문장 틀** (`src/engine/comment/phrases.ko.ts`)

틀은 `(f, ctx) => string` 함수다. `ctx`에는 `{ mover: '백' | '흑', enemy: '흑' | '백', label }`이 들어간다. 사실마다 3~6개를 둔다. 아래는 시작 세트다. 구현자는 같은 결로 사실마다 최소 3개를 채운다.

```ts
import type { Fact } from './facts'
import { PIECE_KO, withJosa } from './korean'

export interface PhraseCtx {
  mover: '백' | '흑'
  enemy: '흑' | '백'
}
type Of<K extends Fact['kind']> = Extract<Fact, { kind: K }>
type Phrase<K extends Fact['kind']> = (f: Of<K>, c: PhraseCtx) => string

const P = (t: string) => PIECE_KO[t as keyof typeof PIECE_KO]

export const PHRASES: { [K in Fact['kind']]: Phrase<K>[] } = {
  mate: [
    (_, c) => `체크메이트. ${c.mover}가 이겼어요.`,
    () => '더 피할 칸이 없어요. 체크메이트예요.',
    (_, c) => `${c.enemy} 킹이 갇혔어요. 경기 끝.`,
  ],
  check: [
    (_, c) => `체크. ${c.enemy}는 킹부터 챙겨야 해요.`,
    () => '체크를 걸어 상대의 손을 묶어요.',
    (_, c) => `${c.enemy} 킹을 몰아세우는 체크예요.`,
  ],
  capture: [
    (f) => `${f.square}에서 ${withJosa(P(f.captured), '을/를')} 잡았어요.`,
    (f) => `${withJosa(P(f.piece), '으로/로')} ${withJosa(P(f.captured), '을/를')} 땄어요.`,
    (f) => `${f.square}의 ${withJosa(P(f.captured), '을/를')} 가져가요.`,
  ],
  recapture: [
    () => '곧바로 되잡아 균형을 맞춰요.',
    (f) => `${f.square}에서 되잡았어요.`,
    () => '잡힌 만큼 돌려받았어요.',
  ],
  trade: [
    (f) => `${withJosa(P(f.piece), '을/를')} 맞바꾸자는 수예요.`,
    (f) => `같은 값의 ${P(f.piece)} 교환이에요.`,
    () => '기물을 정리하며 단순하게 가요.',
  ],
  promotion: [
    (f) => `폰이 끝까지 가서 ${withJosa(P(f.to), '이/가')} 됐어요.`,
    (f) => `승진! 새 ${withJosa(P(f.to), '이/가')} 판에 들어와요.`,
    () => '폰이 마지막 줄에 닿았어요.',
  ],
  castle: [
    () => '킹을 피신시키고 룩을 연결했어요.',
    (f) => `${f.long ? '퀸 쪽' : '킹 쪽'}으로 캐슬링. 킹이 한결 안전해졌어요.`,
    () => '캐슬링으로 킹 집을 지었어요.',
  ],
  develop: [
    (f) => `${withJosa(P(f.piece), '을/를')} 꺼내 전개를 이어가요.`,
    (f) => `${withJosa(P(f.piece), '이/가')} 싸움터로 나왔어요.`,
    () => '잠자던 기물을 깨웠어요.',
  ],
  centerPawn: [
    (f) => `${withJosa(f.square, '을/를')} 차지해 중앙에 깃발을 꽂아요.`,
    () => '중앙 폰으로 공간을 넓혀요.',
    (f) => `${f.square} 폰이 가운데를 지켜요.`,
  ],
  fork: [
    (f) => `${withJosa(P(f.piece), '이/가')} ${f.targets.map(P).join('와 ')}를 한꺼번에 노려요.`,
    (f) => `포크! ${f.square}의 ${withJosa(P(f.piece), '이/가')} 두 곳을 동시에 겨눠요.`,
    (_, c) => `${c.enemy}는 둘 중 하나밖에 못 지켜요.`,
  ],
  pin: [
    (f) => `${f.square}의 ${withJosa(P(f.pinned), '을/를')} ${P(f.behind)} 앞에 묶었어요.`,
    (f) => `핀이에요. ${withJosa(P(f.pinned), '이/가')} 움직이면 뒤의 ${withJosa(P(f.behind), '이/가')} 드러나요.`,
    (f) => `${withJosa(P(f.pinned), '은/는')} 이제 꼼짝하기 어려워요.`,
  ],
  hanging: [
    (f) => `${f.square}의 ${withJosa(P(f.piece), '이/가')} 그냥 놓였어요.`,
    (f) => `${withJosa(P(f.piece), '을/를')} 지켜 줄 기물이 없어요.`,
    (f) => `${withJosa(P(f.piece), '이/가')} 공짜로 잡힐 수 있는 자리예요.`,
  ],
  rookFile: [
    (f) => `룩을 ${f.file}줄에 올려 ${f.open ? '열린 줄' : '반쯤 열린 줄'}을 쥐어요.`,
    (f) => `${f.file}줄로 룩이 숨을 쉬어요.`,
    () => '룩이 일할 길을 찾았어요.',
  ],
  kingShield: [
    () => '킹 앞 폰을 밀어서 집에 틈이 생겼어요.',
    () => '킹을 감싸던 폰이 움직였어요. 나중에 약점이 될 수 있어요.',
    () => '킹 주변이 조금 헐거워졌어요.',
  ],
  missed: [
    (f) => (f.gain === 'mate' ? `${withJosa(f.bestSan, '이/가')}면 ${f.amount}수 안에 메이트였어요.` : f.gain === 'material' ? `${f.bestSan}로 기물을 딸 수 있었어요.` : `${withJosa(f.bestSan, '이/가')} 더 나았어요.`),
    (f) => `${f.bestSan}${f.gain === 'material' ? '면 공짜로 기물이 생겼어요' : f.gain === 'mate' ? '면 끝낼 수 있었어요' : '를 두었다면 형세가 훨씬 좋았어요'}.`,
    (f) => `아까운 장면이에요. ${f.bestSan}${f.gain === 'mate' ? '가 결정타였어요' : '를 놓쳤어요'}.`,
  ],
  refutation: [
    (f, c) => (f.san ? `${f.san}로 ${withJosa(P(f.target), '이/가')} 떨어져요.` : `${c.enemy}가 ${f.square}의 ${withJosa(P(f.target), '을/를')} 노릴 수 있어요.`),
    (f) => `${f.square}의 ${withJosa(P(f.target), '이/가')} 위험해졌어요.`,
    (f, c) => `${c.enemy}에게 ${withJosa(P(f.target), '을/를')} 딸 기회를 줬어요.`,
  ],
  mateThreat: [
    (f) => `${f.forWhite ? '백' : '흑'}에게 ${f.inMoves}수 메이트가 보여요.`,
    (f) => `이제 ${f.inMoves}수 안에 끝낼 길이 있어요.`,
    (f) => `메이트까지 ${f.inMoves}수.`,
  ],
  band: [
    (f) => BAND_LINE[f.to][0],
    (f) => BAND_LINE[f.to][1],
    (f) => BAND_LINE[f.to][2],
  ],
}

const BAND_LINE: Record<Of<'band'>['to'], [string, string, string]> = {
  whiteWinning: ['백이 이기는 흐름이에요.', '백 쪽으로 크게 기울었어요.', '이제 백이 주도권을 쥐었어요.'],
  whiteBetter: ['백이 조금 앞서요.', '저울이 백 쪽으로 기울어요.', '백이 편한 쪽이에요.'],
  equal: ['형세는 다시 팽팽해요.', '균형을 되찾았어요.', '어느 쪽도 앞서지 않아요.'],
  blackBetter: ['흑이 조금 앞서요.', '저울이 흑 쪽으로 기울어요.', '흑이 편한 쪽이에요.'],
  blackWinning: ['흑이 이기는 흐름이에요.', '흑 쪽으로 크게 기울었어요.', '이제 흑이 주도권을 쥐었어요.'],
}

/** 특별한 사실이 없는 수에 쓰는 짧은 말 */
export const QUIET: ((c: PhraseCtx) => string)[] = [
  (c) => `${c.mover}가 차분히 자리를 고르는 수예요.`,
  () => '조용히 다음을 준비해요.',
  () => '자리를 다지는 수예요.',
  (c) => `${c.mover}는 서두르지 않아요.`,
]
```

`withJosa`는 받침에 따라 달라지는 조사만 다룬다. '에서', '의'처럼 받침과 무관한 조사는 그냥 붙인다.

- [ ] **Step 3: 조립** (`src/engine/comment/compose.ts`)

```ts
import { turnOf } from '../../chess/pgn'
import { extractFacts, type CommentInput, type Fact } from './facts'
import { PHRASES, QUIET, type PhraseCtx } from './phrases.ko'

export interface MoveComment {
  text: string
  facts: Fact['kind'][]
}

const BAD = new Set(['mistake', 'blunder', 'miss', 'inaccuracy'])

/** 우선순위가 낮을수록 먼저 말한다 */
const PRIORITY_BAD: Fact['kind'][] = ['mate', 'refutation', 'hanging', 'missed', 'mateThreat', 'capture', 'check', 'kingShield', 'band']
const PRIORITY_GOOD: Fact['kind'][] = ['mate', 'promotion', 'fork', 'pin', 'mateThreat', 'capture', 'recapture', 'check', 'castle', 'trade', 'rookFile', 'develop', 'centerPawn', 'band']

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** used: 직전 3수에서 쓴 틀 키("kind:idx") */
export function compose(input: CommentInput, used: string[]): { comment: MoveComment; keys: string[] } | null {
  const facts = extractFacts(input)
  const mover = turnOf(input.plies[input.index - 1].fen) === 'w' ? '백' : '흑'
  const ctx: PhraseCtx = { mover, enemy: mover === '백' ? '흑' : '백' }
  const label = input.labels[input.index]
  const order = label && BAD.has(label) ? PRIORITY_BAD : PRIORITY_GOOD
  const picked = order.flatMap((k) => facts.filter((f) => f.kind === k)).filter((f, i, arr) => arr.findIndex((g) => g.kind === f.kind) === i)
  const main = picked.filter((f) => f.kind !== 'band').slice(0, 2)
  const band = picked.find((f) => f.kind === 'band')
  const chosen = band ? [...main, band] : main
  const keys: string[] = []
  const parts: string[] = []
  const seed = hash(`${input.seed}:${input.index}`)
  if (chosen.length === 0) {
    const i = pickIndex(seed, QUIET.length, 'quiet', used)
    keys.push(`quiet:${i}`)
    parts.push(QUIET[i](ctx))
  }
  for (const f of chosen) {
    const list = PHRASES[f.kind] as ((f: Fact, c: PhraseCtx) => string)[]
    const i = pickIndex(seed + keys.length, list.length, f.kind, used)
    keys.push(`${f.kind}:${i}`)
    parts.push(list[i](f, ctx))
  }
  return { comment: { text: parts.join(' '), facts: chosen.map((f) => f.kind) }, keys }
}

function pickIndex(seed: number, n: number, kind: string, used: string[]): number {
  for (let k = 0; k < n; k++) {
    const i = (seed + k) % n
    if (!used.includes(`${kind}:${i}`)) return i
  }
  return seed % n
}
```

`src/engine/comment/index.ts`:

```ts
import { compose, type MoveComment } from './compose'
import type { CommentInput } from './facts'

export type { MoveComment } from './compose'
export type { CommentInput, Fact } from './facts'

export function commentFor(input: CommentInput): MoveComment | null {
  return compose(input, [])?.comment ?? null
}

/** 반복 방지를 위해 앞에서부터 차례로 만든다. 0번은 null */
export function commentsForGame(base: Omit<CommentInput, 'index'>): (MoveComment | null)[] {
  const out: (MoveComment | null)[] = [null]
  const recent: string[][] = []
  for (let index = 1; index < base.plies.length; index++) {
    const r = compose({ ...base, index }, recent.flat())
    out.push(r?.comment ?? null)
    recent.push(r?.keys ?? [])
    if (recent.length > 3) recent.shift()
  }
  return out
}
```

- [ ] **Step 4: 확인 후 커밋**

Run: `npx vitest run src/engine/comment && npx tsc --noEmit` → PASS

```bash
git add src/engine/comment
git commit -m "feat: 일반 대국 수 코멘트 생성기(사실 고르기·문장 틀·반복 방지)"
```

---

### Task 6: 팩트 시트·미리보기 스크립트

**Files:**
- Create: `scripts/annotate/facts.ts`, `scripts/annotate/preview-comments.ts`, `scripts/annotate/README.md`
- Modify: `.gitignore` (`scripts/annotate/facts/` 추가), `package.json` (스크립트 2개 추가)

**Interfaces:**
- Produces:
  - `npm run annotate:facts -- <slug|all> [--depth 22]` → `scripts/annotate/facts/<slug>.json`
  - `npm run annotate:preview -- <slug>` → 표준 출력에 수마다 `번호 SAN 판정 | 생성 코멘트`
- 팩트 시트 형식: `{ slug, depth, plies: Ply[], positions: ReviewedPosition[] (MultiPV 3의 1순위 기준), alternatives: { uci, san, score }[][], labels }`

- [ ] **Step 1: node 엔진 래퍼와 팩트 시트** (`scripts/annotate/facts.ts`)

```ts
// npx tsx scripts/annotate/facts.ts <slug|all> [--depth 22]
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { Chess } from 'chess.js'
import { pgnToPlies, pvToSan, turnOf } from '../../src/chess/pgn'
import { toWhitePov, type Score } from '../../src/engine/classify'
import { buildReview, terminalScore, type ReviewedPosition } from '../../src/engine/review'
import { parseBestMove, parseInfo } from '../../src/engine/uci'
import data from '../../src/data/classics.json' with { type: 'json' }

const require = createRequire(import.meta.url)
const initEngine = require('stockfish')

const args = process.argv.slice(2)
const target = args[0] ?? 'all'
const depth = Number(args[args.indexOf('--depth') + 1]) || 22

const engine = await initEngine('lite-single')
let listener: ((line: string) => void) | null = null
engine.listener = (line: string) => listener?.(line)
const send = (cmd: string) => engine.sendCommand(cmd)

function search(fen: string): Promise<{ lines: { multipv: number; score: Score; pv: string[] }[]; best: string | null }> {
  return new Promise((resolve) => {
    const lines = new Map<number, { multipv: number; score: Score; pv: string[] }>()
    listener = (line) => {
      const info = parseInfo(line)
      if (info && info.pv.length) lines.set(info.multipv, { multipv: info.multipv, score: toWhitePov(info.score, turnOf(fen)), pv: info.pv })
      const best = parseBestMove(line)
      if (best !== undefined) resolve({ lines: [...lines.values()].sort((a, b) => a.multipv - b.multipv), best })
    }
    send(`position fen ${fen}`)
    send(`go depth ${depth}`)
  })
}

send('uci')
send('setoption name MultiPV value 3')
send('setoption name Hash value 128')

mkdirSync('scripts/annotate/facts', { recursive: true })
const games = (data as { slug: string; pgn: string }[]).filter((g) => target === 'all' || g.slug === target)
for (const g of games) {
  const plies = pgnToPlies(g.pgn)
  const positions: ReviewedPosition[] = []
  const alternatives: { uci: string; san: string; score: Score }[][] = []
  for (const [i, p] of plies.entries()) {
    const term = terminalScore(p.fen)
    if (term) {
      positions.push({ score: term, best: null, pv: [], second: null, legalMoves: 0 })
      alternatives.push([])
      continue
    }
    const r = await search(p.fen)
    const [first, second] = r.lines
    positions.push({ score: first?.score ?? { cp: 0 }, best: r.best, pv: first?.pv ?? [], second: second?.score ?? null, legalMoves: new Chess(p.fen).moves().length })
    alternatives.push(r.lines.map((l) => ({ uci: l.pv[0], san: pvToSan(p.fen, [l.pv[0]], 1)[0] ?? l.pv[0], score: l.score })))
    process.stderr.write(`\r${g.slug} ${i + 1}/${plies.length}`)
  }
  const review = buildReview(plies, positions, depth)
  writeFileSync(`scripts/annotate/facts/${g.slug}.json`, JSON.stringify({ slug: g.slug, depth, plies, positions, alternatives, labels: review.labels }, null, 1))
  process.stderr.write(`\n${g.slug} 완료\n`)
}
process.exit(0)
```

`parseInfo`와 `parseBestMove`의 실제 시그니처는 `src/engine/uci.ts`에서 확인하고 맞춘다. 예를 들어 `parseBestMove`가 bestmove 줄이 아니면 `null`을 돌려준다면 비교를 그에 맞게 고친다. JSON import 속성(`with { type: 'json' }`)이 tsx에서 안 되면 `readFileSync` + `JSON.parse`로 바꾼다.

- [ ] **Step 2: 미리보기** (`scripts/annotate/preview-comments.ts`)

```ts
// npx tsx scripts/annotate/preview-comments.ts <slug>
import { readFileSync } from 'node:fs'
import { moveTitle } from '../../src/chess/moveNumber'
import { commentsForGame } from '../../src/engine/comment'
import { JUDGMENT_META } from '../../src/engine/judge'

const slug = process.argv[2]
const f = JSON.parse(readFileSync(`scripts/annotate/facts/${slug}.json`, 'utf8'))
const t0 = performance.now()
const out = commentsForGame({ plies: f.plies, positions: f.positions, labels: f.labels, seed: slug })
const ms = performance.now() - t0
for (let i = 1; i < f.plies.length; i++) {
  const label = f.labels[i] ? JUDGMENT_META[f.labels[i] as keyof typeof JUDGMENT_META].name : '-'
  console.log(`${moveTitle(f.plies, i).padEnd(14)} ${label.padEnd(5)} | ${out[i]?.text ?? ''}`)
}
console.error(`${f.plies.length - 1}수, ${ms.toFixed(0)}ms`)
```

- [ ] **Step 3: package.json, .gitignore, README**

`package.json`의 `scripts`에 추가한다.

```json
"annotate:facts": "tsx scripts/annotate/facts.ts",
"annotate:preview": "tsx scripts/annotate/preview-comments.ts"
```

`.gitignore`에 `scripts/annotate/facts/`를 추가한다.

`scripts/annotate/README.md`에 다음 사용법 세 줄을 적는다.
1. `npm run annotate:facts -- opera-game`
2. `npm run annotate:preview -- opera-game`
3. 해설을 작성한 뒤 `npx vitest run src/data/annotations`를 돌린다.

- [ ] **Step 4: 실제로 돌려 본다**

Run: `npm run annotate:facts -- opera-game -- --depth 12` (빠른 확인용)
Expected: `scripts/annotate/facts/opera-game.json`이 생긴다. 34개 포지션이다.

Run: `npm run annotate:preview -- opera-game`
Expected: 33줄에 코멘트가 출력된다. 처리 시간은 200ms 이내다.

출력에서 어색한 문장, 사실과 다른 문장(예: 잡지 않았는데 "잡았어요")을 찾아 Task 4·5 코드를 고친다. 고친 내용은 같은 커밋에 넣는다.

- [ ] **Step 5: 커밋**

```bash
git add scripts/annotate package.json .gitignore
git commit -m "chore: 명경기 팩트 시트·코멘트 미리보기 스크립트"
```

---

### Task 7: 일반 대국 코멘트를 뷰어에 연결

**Files:**
- Modify: `src/features/viewer/ViewerPage.tsx`, `src/features/viewer/ViewerPage.test.tsx`

**Interfaces:**
- Consumes: `commentsForGame` (Task 5), `comment` prop (Task 2)

- [ ] **Step 1: 실패하는 테스트**

`ViewerPage.test.tsx`에 추가한다. 리뷰가 없는 명경기 대신 해설이 없는 경기로 확인한다. `vi.mock`의 `loadAnnotations`는 `opera-game`만 돌려주므로, 다른 명경기(예: `immortal-game`)로 테스트한다.

```tsx
  it('해설이 없는 경기는 리뷰 뒤 생성 코멘트를 보여 준다', async () => {
    renderRoute('/game/classic/immortal-game', { engines: { analysis: analysisEngine() } })
    const card = await screen.findByRole('region', { name: '이번 수 판정' })
    fireEvent.click(within(card).getByRole('button', { name: '리뷰 실행' }))
    await screen.findByText(/백 정확도/)
    fireEvent.keyDown(window, { key: 'Home' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(within(card).getByText(/중앙|공간|가운데/)).toBeInTheDocument() // 1. e4
  })
```

Run: `npx vitest run src/features/viewer/ViewerPage.test.tsx` → FAIL

- [ ] **Step 2: 구현** (`ViewerPage.tsx`)

1. `import { commentsForGame } from '../../engine/comment'`를 추가한다.
2. `const labels = …` 아래에 다음을 넣는다.

```tsx
  const generated = useMemo(
    () =>
      review.status === 'done' && !annotations
        ? commentsForGame({ plies, positions: review.review.positions, labels: review.review.labels, seed: refKey(gameRef) })
        : null,
    [review, annotations, plies, gameRef],
  )
  const comment = authored
    ? { text: authored.text, key: authored.key }
    : generated?.[ply]
      ? { text: generated[ply]!.text }
      : null
```

3. `<JudgmentCard … comment={…} />`를 `comment={comment}`로 바꾼다.
4. `refKey`는 이미 import 돼 있다. 없으면 `../../chess/gameRef`에서 추가한다.

- [ ] **Step 3: 확인 후 커밋**

Run: `npm test && npx tsc --noEmit` → PASS

```bash
git add src/features/viewer
git commit -m "feat: 리뷰한 일반 대국에 수 코멘트 표시"
```

---

### Task 8: 해설 자동 검증

**Files:**
- Create: `src/data/annotations/annotations.test.ts`, `src/data/annotations/validate.ts`

**Interfaces:**
- Produces: `validateAnnotations(a: Annotations, plies: Ply[]): string[]`. 오류 메시지 목록을 돌려주고, 비어 있으면 통과다.

- [ ] **Step 1: 검증 함수** (`src/data/annotations/validate.ts`)

```ts
import { Chess } from 'chess.js'
import type { Ply } from '../../chess/types'
import type { Annotations } from '../../sources/annotations'

const SAN = /\b(?:O-O(?:-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)[+#]?/g
export const BANNED = [/것입니다/, /중요한 순간/, /놀라운/, /라고 할 수 있/, /매우 흥미로운/]

function legalSans(fen: string): Set<string> {
  return new Set(new Chess(fen).moves().map((s) => s.replace(/[+#]$/, '')))
}
/** "[[9...cxd5 10. exd5]]"의 수들을 fen에서 차례로 둘 수 있는가 */
function lineOk(fen: string, line: string): boolean {
  const c = new Chess(fen)
  const moves = line.replace(/\d+\.(\.\.)?/g, ' ').split(/\s+/).filter(Boolean)
  try {
    for (const m of moves) c.move(m)
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
  const keys = a.plies.filter((p) => p.key).length
  if (keys < 2 || keys > 10) errors.push(`핵심 장면 ${keys}개 (2~10개여야 함)`)
  const played = plies.map((p) => p.san?.replace(/[+#]$/, '') ?? '')
  for (const p of a.plies) {
    for (const b of BANNED) if (b.test(p.text)) errors.push(`${p.ply}수: 금칙어 ${b}`)
    const before = plies[Math.max(0, p.ply - 1)].fen
    const after = plies[p.ply].fen
    const lines = [...p.text.matchAll(/\[\[(.+?)\]\]/g)].map((m) => m[1])
    for (const l of lines) if (!lineOk(before, l) && !lineOk(after, l)) errors.push(`${p.ply}수: 가정 수순을 둘 수 없음 "${l}"`)
    const lineMoves = new Set(lines.flatMap((l) => l.replace(/\d+\.(\.\.)?/g, ' ').split(/\s+/).filter(Boolean).map((s) => s.replace(/[+#]$/, ''))))
    const okBefore = legalSans(before)
    const okAfter = legalSans(after)
    const past = new Set(played.slice(1, p.ply + 1))
    const future = new Set(played.slice(p.ply + 1))
    for (const m of p.text.replace(/\[\[.+?\]\]/g, ' ').matchAll(SAN)) {
      const san = m[0].replace(/[+#]$/, '')
      const legal = past.has(san) || okBefore.has(san) || okAfter.has(san)
      if (!legal && !lineMoves.has(san)) errors.push(`${p.ply}수: 둘 수 없는 수 표기 "${m[0]}"`)
      if (future.has(san) && !past.has(san) && !okBefore.has(san) && !lineMoves.has(san)) errors.push(`${p.ply}수: 앞으로 나올 수 언급 "${m[0]}"`)
    }
  }
  for (const s of a.scenes) {
    const c = new Chess(plies[s.startPly].fen)
    if ((c.turn() === 'w' ? 'w' : 'b') !== s.side) errors.push(`장면 ${s.id}: 둘 쪽이 맞지 않음`)
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
```

스포일러 판정에서 `okBefore`(해당 수 직전 포지션의 합법 수)에 들어 있으면 허용한다. "안 둔 대안"이기 때문이다. 같은 SAN이 나중에 실제로 나와도 그 시점의 대안으로 읽는다. 이 예외로 스포일러가 새면 작성 단계 사실 검토에서 잡는다.

- [ ] **Step 2: 테스트** (`src/data/annotations/annotations.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import { pgnToPlies } from '../../chess/pgn'
import { annotationSlugs, loadAnnotations } from '../../sources/annotations'
import { getClassic } from '../../sources/classics'
import { validateAnnotations } from './validate'

describe.each(annotationSlugs())('해설 %s', (slug) => {
  it('검증 규칙을 모두 통과한다', async () => {
    const a = (await loadAnnotations(slug))!
    const c = getClassic(slug)
    expect(c, `classics.json에 ${slug}가 없음`).toBeDefined()
    expect(validateAnnotations(a, pgnToPlies(c!.pgn))).toEqual([])
  })
})

it('검증기는 잘못된 해설을 잡는다', () => {
  const plies = pgnToPlies('1. e4 e5 2. Nf3 *')
  const errors = validateAnnotations(
    {
      slug: 't',
      version: 1,
      scenes: [],
      plies: [
        { ply: 0, text: '시작이에요.' },
        { ply: 1, text: '곧 Nf3가 나와요. 이것은 매우 흥미로운 수입니다.', key: true },
        { ply: 2, text: 'Qh5는 둘 수 없어요.' },
      ],
    },
    plies,
  )
  expect(errors.some((e) => e.includes('3수 해설이 비어'))).toBe(true)
  expect(errors.some((e) => e.includes('핵심 장면 1개'))).toBe(true)
  expect(errors.some((e) => e.includes('금칙어'))).toBe(true)
  expect(errors.some((e) => e.includes('둘 수 없는 수 표기 "Qh5"'))).toBe(true)
})
```

`annotationSlugs()`가 비어 있으면 `describe.each([])`가 빈 묶음이 되어 경고 없이 통과하는지 확인한다. 경고가 나면 `if (slugs.length)`로 감싼다. 두 번째 테스트에서 "곧 Nf3가 나와요"는 1수 직후 포지션(흑 차례)에서 Nf3가 합법이 아니고 미래 수이므로 잡혀야 한다. 기대 목록에 `'앞으로 나올 수 언급 "Nf3"'`도 추가한다.

- [ ] **Step 3: 확인 후 커밋**

Run: `npx vitest run src/data/annotations` → PASS

```bash
git add src/data/annotations/validate.ts src/data/annotations/annotations.test.ts
git commit -m "test: 명경기 해설 자동 검증(범위·수 표기·스포일러·금칙어·장면)"
```

---

### Task 9: 퀴즈 로직(장면 자동 선정·채점·반박)

**Files:**
- Create: `src/quiz/selectScenes.ts`, `src/quiz/selectScenes.test.ts`, `src/quiz/grade.ts`, `src/quiz/grade.test.ts`, `src/quiz/refute.ts`

**Interfaces:**
- Consumes: `QuizScene` (Task 1), `GameReview`, `winPercent`, `extractFacts`, `PIECE_KO`, `withJosa`
- Produces:
  - `QUIZ_ONLY_MOVE_GAP = 10`, `QUIZ_MAX_STEPS = 4`, `QUIZ_MAX_SCENES = 5`, `QUIZ_ALT_TOLERANCE = 3`
  - `selectScenes(plies: Ply[], review: GameReview, side: 'w' | 'b' | null): QuizScene[]`
  - `gradeMove(args): Promise<Grade>`
    - `Grade = { kind: 'correct' } | { kind: 'alternative' } | { kind: 'wrong'; refutation: string | null }`
  - `refutationText(fenAfterUserMove: string, replyUci: string): string | null`

- [ ] **Step 1: 실패하는 테스트** (`src/quiz/selectScenes.test.ts`)

```ts
import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import type { Ply } from '../chess/types'
import type { GameReview, ReviewedPosition } from '../engine/review'
import type { MoveLabel } from '../engine/judge'
import { QUIZ_MAX_STEPS, selectScenes } from './selectScenes'

function game(sans: string[]): Ply[] {
  const c = new Chess()
  const out: Ply[] = [{ san: null, uci: null, fen: c.fen() }]
  for (const s of sans) {
    const m = c.move(s)
    out.push({ san: m.san, uci: m.from + m.to, fen: c.fen() })
  }
  return out
}
function review(plies: Ply[], labels: (MoveLabel | null)[], onlyMove: boolean[], cps: number[]): GameReview {
  const positions: ReviewedPosition[] = plies.map((p, i) => ({
    score: { cp: cps[i] ?? 0 },
    best: plies[i + 1]?.uci ?? null,
    pv: plies.slice(i + 1, i + 6).map((x) => x.uci!),
    second: onlyMove[i] ? { cp: (cps[i] ?? 0) - 600 } : { cp: cps[i] ?? 0 },
    legalMoves: 20,
  }))
  return { version: 2, depth: 14, positions, labels, accuracy: { white: null, black: null } }
}

describe('selectScenes', () => {
  const plies = game(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4', 'Nxe5', 'Qg5', 'Nxf7', 'Qxg2'])
  it('승부처가 없으면 장면 없음', () => {
    expect(selectScenes(plies, review(plies, plies.map(() => null), [], []), null)).toEqual([])
  })
  it('좋은 수 앞의 외길 빌드업부터 시작한다', () => {
    const labels: (MoveLabel | null)[] = plies.map(() => null)
    labels[9] = 'great' // 5. Nxf7
    const only = plies.map(() => false)
    only[6] = true // 4. Nxe5 직전 포지션(백 차례)이 외길
    only[8] = true
    const scenes = selectScenes(plies, review(plies, labels, only, plies.map(() => 200)), null)
    expect(scenes).toHaveLength(1)
    expect(scenes[0]).toMatchObject({ startPly: 6, side: 'w', source: 'auto' })
    expect(scenes[0].steps.map((s) => s.answerUci)).toEqual([plies[7].uci, plies[9].uci])
    expect(scenes[0].steps[0].replyUci).toBe(plies[8].uci)
  })
  it('외길이 없으면 승부처 바로 전 한 수짜리', () => {
    const labels: (MoveLabel | null)[] = plies.map(() => null)
    labels[8] = 'blunder' // 4... Qg5 (흑)
    const s = selectScenes(plies, review(plies, labels, [], plies.map(() => 0)), null)
    expect(s[0]).toMatchObject({ startPly: 7, side: 'b' })
    expect(s[0].steps).toHaveLength(1)
  })
  it('사용자 쪽만', () => {
    const labels: (MoveLabel | null)[] = plies.map(() => null)
    labels[8] = 'blunder'
    expect(selectScenes(plies, review(plies, labels, [], []), 'w')).toEqual([])
  })
  it('사용자 수는 최대 4개', () => {
    const labels: (MoveLabel | null)[] = plies.map(() => null)
    labels[9] = 'great'
    const s = selectScenes(plies, review(plies, labels, plies.map(() => true), plies.map(() => 200)), null)
    expect(s[0].steps.length).toBeLessThanOrEqual(QUIZ_MAX_STEPS)
  })
})
```

Run: `npx vitest run src/quiz` → FAIL

- [ ] **Step 2: 장면 선정 구현** (`src/quiz/selectScenes.ts`)

```ts
import { turnOf } from '../chess/pgn'
import type { Ply } from '../chess/types'
import { winPercent } from '../engine/classify'
import type { MoveLabel } from '../engine/judge'
import type { GameReview } from '../engine/review'
import type { QuizScene, QuizStep } from './types'

export const QUIZ_ONLY_MOVE_GAP = 10
export const QUIZ_MAX_STEPS = 4
export const QUIZ_MAX_SCENES = 5
export const QUIZ_ALT_TOLERANCE = 3

const BAD: MoveLabel[] = ['blunder', 'mistake', 'miss']
const GOOD: MoveLabel[] = ['great', 'brilliant']

/** 둘 쪽 기준 승률 */
const povWin = (w: number, side: 'w' | 'b') => (side === 'w' ? w : 100 - w)

/** i번째 포지션(둘 차례)에서 최선 수가 사실상 외길인가 */
function isOnlyMove(review: GameReview, i: number, side: 'w' | 'b'): boolean {
  const p = review.positions[i]
  if (!p?.second) return false
  return povWin(winPercent(p.score), side) - povWin(winPercent(p.second), side) >= QUIZ_ONLY_MOVE_GAP
}

export function selectScenes(plies: Ply[], review: GameReview, side: 'w' | 'b' | null): QuizScene[] {
  const candidates: { scene: QuizScene; swing: number }[] = []
  for (let c = 1; c < plies.length; c++) {
    const label = review.labels[c]
    if (!label || (!BAD.includes(label) && !GOOD.includes(label))) continue
    const mover = turnOf(plies[c - 1].fen)
    if (side && mover !== side) continue
    const good = GOOD.includes(label)
    // c번째 수를 두기 전 포지션 = c-1. 빌드업: 같은 편의 이전 수(c-2, c-4 …)가 최선이었고 외길이었으면 시작을 당긴다
    let start = c - 1
    if (good) {
      while (
        start - 2 >= 0 &&
        (c - 1 - (start - 2)) / 2 + 1 <= QUIZ_MAX_STEPS &&
        plies[start - 1]?.uci === review.positions[start - 2]?.best &&
        isOnlyMove(review, start - 2, mover)
      ) start -= 2
    } else if (isOnlyMove(review, c - 1, mover)) {
      while (start - 2 >= 0 && plies[start - 1]?.uci === review.positions[start - 2]?.best && isOnlyMove(review, start - 2, mover) && (c - 1 - (start - 2)) / 2 + 1 <= QUIZ_MAX_STEPS) start -= 2
    }
    const steps: QuizStep[] = []
    for (let i = start; i < c - 1; i += 2) steps.push({ answerUci: plies[i + 1].uci!, replyUci: plies[i + 2].uci! })
    if (good) {
      steps.push({ answerUci: plies[c].uci! })
    } else {
      const best = review.positions[c - 1].best
      if (!best) continue
      // 실수류: 승부처부터는 엔진 1순위 수순 [사용자, 상대, 사용자, …]을 따른다. 외길일 때만 늘린다.
      const pv = review.positions[c - 1].pv
      const line = pv[0] === best ? pv : [best]
      const extend = isOnlyMove(review, c - 1, mover)
      for (let k = 0; k < line.length && steps.length < QUIZ_MAX_STEPS; k += 2) {
        steps.push({ answerUci: line[k], replyUci: extend ? line[k + 1] : undefined })
        if (!extend || !line[k + 1]) break
      }
      const lastStep = steps.at(-1)!
      if (lastStep.replyUci && steps.length === QUIZ_MAX_STEPS) delete lastStep.replyUci
    }
    const swing = Math.abs(winPercent(review.positions[c].score) - winPercent(review.positions[c - 1].score))
    candidates.push({
      swing,
      scene: {
        id: `auto-${start}-${mover}`,
        startPly: start,
        side: mover,
        prompt: promptFor(mover, good, steps.length),
        steps,
        source: 'auto',
      },
    })
  }
  const picked: QuizScene[] = []
  for (const { scene } of candidates.sort((a, b) => b.swing - a.swing)) {
    const end = scene.startPly + scene.steps.length * 2
    if (picked.some((p) => scene.startPly <= p.startPly + p.steps.length * 2 && p.startPly <= end)) continue
    picked.push(scene)
    if (picked.length === QUIZ_MAX_SCENES) break
  }
  return picked.sort((a, b) => a.startPly - b.startPly)
}

function promptFor(side: 'w' | 'b', good: boolean, n: number): string {
  const who = side === 'w' ? '백' : '흑'
  if (n > 1) return `${who}가 공격을 이어갈 차례예요. ${n}수를 찾아보세요.`
  return good ? `여기서 ${who}는 무엇을 둘까요?` : `${who}에게 더 좋은 수가 있었어요. 찾아보세요.`
}
```

실수류 장면은 승부처 직전 포지션이 외길일 때만 엔진 수순으로 단계를 늘린다. pv 안쪽 포지션은 엔진 데이터가 없으므로 외길 여부를 다시 따지지 않고 `QUIZ_MAX_STEPS` 안에서만 늘린다. 마지막 단계에는 응수를 두지 않는다. 테스트를 하나 추가한다: 실수 직전이 외길이고 pv가 5수면 단계가 3개(사용자 수 3개)이고 마지막 단계에 `replyUci`가 없다.

- [ ] **Step 3: 채점** (`src/quiz/grade.ts`, `src/quiz/refute.ts`)

`src/quiz/refute.ts`:

```ts
import { Chess } from 'chess.js'
import { PIECE_VALUE } from '../chess/material'
import { PIECE_KO, withJosa } from '../engine/comment/korean'

/** 사용자 수를 둔 포지션에서 상대 최선 응수가 무엇을 따는지 한 줄로 */
export function refutationText(fenAfterUserMove: string, replyUci: string): string | null {
  const c = new Chess(fenAfterUserMove)
  try {
    const m = c.move({ from: replyUci.slice(0, 2), to: replyUci.slice(2, 4), promotion: replyUci[4] })
    if (c.isCheckmate()) return `${m.san}로 바로 메이트당해요.`
    if (m.captured && PIECE_VALUE[m.captured] >= 3) return `${withJosa(m.san, '이/가')} 나오면 ${withJosa(PIECE_KO[m.captured], '을/를')} 잃어요.`
    if (m.captured) return `${m.san}로 폰을 내줘요.`
    return `${m.san}로 받아치면 이점이 사라져요.`
  } catch {
    return null
  }
}
```

`src/quiz/grade.ts`:

```ts
import { Chess } from 'chess.js'
import { winPercent, type Score } from '../engine/classify'
import { QUIZ_ALT_TOLERANCE } from './selectScenes'
import { refutationText } from './refute'
import type { QuizStep } from './types'

export type Grade = { kind: 'correct' } | { kind: 'alternative' } | { kind: 'wrong'; refutation: string | null }

/** 엔진: fen(백 기준 점수)과 최선 응수를 돌려준다 */
export type Evaluate = (fen: string) => Promise<{ score: Score; best: string | null }>

export async function gradeMove({ fen, uci, step, side, evaluate }: { fen: string; uci: string; step: QuizStep; side: 'w' | 'b'; evaluate: Evaluate }): Promise<Grade> {
  if (uci === step.answerUci || step.acceptUci?.includes(uci)) return { kind: 'correct' }
  const authored = step.refutations?.find((r) => r.uci === uci)
  const pov = (s: Score) => (side === 'w' ? winPercent(s) : 100 - winPercent(s))
  const afterUser = play(fen, uci)
  const afterAnswer = play(fen, step.answerUci)
  if (!afterUser || !afterAnswer) return { kind: 'wrong', refutation: null }
  // 분석 엔진은 latest-wins라 동시에 보내면 앞의 평가가 취소된다. 차례로 기다린다.
  const mine = await evaluate(afterUser)
  const answer = await evaluate(afterAnswer)
  if (!authored && pov(answer.score) - pov(mine.score) <= QUIZ_ALT_TOLERANCE) return { kind: 'alternative' }
  return { kind: 'wrong', refutation: authored?.text ?? (mine.best ? refutationText(afterUser, mine.best) : null) }
}

function play(fen: string, uci: string): string | null {
  const c = new Chess(fen)
  try {
    c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
    return c.fen()
  } catch {
    return null
  }
}
```

`evaluate`는 뷰어에서 분석 엔진으로 만든다(Task 11 Step 5).

`src/quiz/grade.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { gradeMove } from './grade'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('gradeMove', () => {
  const step = { answerUci: 'e2e4' }
  it('정답', async () => {
    expect(await gradeMove({ fen: START, uci: 'e2e4', step, side: 'w', evaluate: async () => ({ score: { cp: 0 }, best: null }) })).toEqual({ kind: 'correct' })
  })
  it('비슷하게 좋은 대안', async () => {
    const g = await gradeMove({ fen: START, uci: 'd2d4', step, side: 'w', evaluate: async () => ({ score: { cp: 30 }, best: null }) })
    expect(g.kind).toBe('alternative')
  })
  it('나쁜 수는 반박과 함께 오답', async () => {
    let n = 0
    const g = await gradeMove({
      fen: START,
      uci: 'f2f3',
      step,
      side: 'w',
      evaluate: async () => (n++ === 0 ? { score: { cp: -300 }, best: 'e7e5' } : { score: { cp: 40 }, best: null }),
    })
    expect(g.kind).toBe('wrong')
  })
  it('작성자 반박이 있으면 그것을 쓴다', async () => {
    const g = await gradeMove({
      fen: START,
      uci: 'g2g4',
      step: { answerUci: 'e2e4', refutations: [{ uci: 'g2g4', text: '킹 앞이 비어요.' }] },
      side: 'w',
      evaluate: async () => ({ score: { cp: 0 }, best: null }),
    })
    expect(g).toEqual({ kind: 'wrong', refutation: '킹 앞이 비어요.' })
  })
})
```

- [ ] **Step 4: 확인 후 커밋**

Run: `npx vitest run src/quiz && npx tsc --noEmit` → PASS

```bash
git add src/quiz
git commit -m "feat: 퀴즈 장면 자동 선정·채점·오답 반박"
```

---

### Task 10: 퀴즈 결과 저장(Dexie v2)

**Files:**
- Modify: `src/storage/db.ts`, `src/storage/db.test.ts`

**Interfaces:**
- Produces:
  - `QuizResult = { key: string /* `${gameKey}|${sceneId}` */; gameKey: string; sceneId: string; solvedSteps: number; totalSteps: number; attempts: number; completedAt: number }`
  - `Store.quiz: { list(gameKey): Promise<QuizResult[]>; put(r: QuizResult): Promise<void> }`

- [ ] **Step 1: 실패하는 테스트** (`db.test.ts`에 추가. 기존 테스트처럼 메모리 저장소와 fake-indexeddb 양쪽에 돌린다. 파일의 기존 패턴을 따른다)

```ts
  it('퀴즈 결과를 경기별로 저장하고 불러온다', async () => {
    const r = { key: 'classic/opera-game|s1', gameKey: 'classic/opera-game', sceneId: 's1', solvedSteps: 2, totalSteps: 3, attempts: 4, completedAt: 1 }
    await store.quiz.put(r)
    await store.quiz.put({ ...r, key: 'lichess/x|s1', gameKey: 'lichess/x' })
    expect(await store.quiz.list('classic/opera-game')).toEqual([r])
  })
```

- [ ] **Step 2: 구현**

1. `QuizResult` 인터페이스를 export한다. `Store`에 `quiz`를 추가한다.
2. `ChesslingDb`에 `quizResults!: EntityTable<QuizResult, 'key'>`를 선언한다. 그리고 다음 버전을 추가한다(기존 v1은 그대로 둔다).

```ts
    this.version(2).stores({ forks: 'id, updatedAt', reviews: 'key', quizResults: 'key, gameKey' })
```

3. Dexie 구현:

```ts
    quiz: {
      list: (gameKey) => db.quizResults.where('gameKey').equals(gameKey).toArray(),
      put: async (r) => {
        await db.quizResults.put(r)
      },
    },
```

4. 메모리 구현:

```ts
  const quiz = new Map<string, QuizResult>()
  // …
    quiz: {
      list: async (gameKey) => [...quiz.values()].filter((r) => r.gameKey === gameKey).map((r) => structuredClone(r)),
      put: async (r) => {
        quiz.set(r.key, structuredClone(r))
      },
    },
```

5. `Store`를 직접 만드는 다른 테스트 도우미가 있으면(`grep -rn "persistent:" src`) 모두 `quiz`를 추가한다.

- [ ] **Step 3: 확인 후 커밋**

Run: `npm test && npx tsc --noEmit` → PASS

```bash
git add src/storage
git commit -m "feat: 퀴즈 결과 저장 테이블(Dexie v2)"
```

---

### Task 11: 퀴즈 화면

**Files:**
- Create: `src/styles/features/quiz.css.ts`, `src/features/viewer/quiz/QuizButton.tsx`, `src/features/viewer/quiz/QuizCard.tsx`, `src/features/viewer/quiz/useQuiz.ts`, `src/features/viewer/quiz/QuizCard.test.tsx`
- Modify: `src/features/viewer/ViewerPage.tsx`, `src/features/viewer/ViewerPage.test.tsx`, `src/components/MoveList.tsx`, `src/features/viewer/ReviewSummary.tsx`, `src/features/player/GameList.tsx`
- Modify: `src/styles/features/gameLayout.css.ts` (`boardWrap`에 `position: 'relative'`)

**Interfaces:**
- Consumes: `QuizScene`, `selectScenes`, `gradeMove`, `Store.quiz`, `useAnnotations`, `legalDests`, `toUci`, `userColor`
- Produces:
  - `useQuiz({ scene, plies, evaluate, onFinish })` returns `{ fen, stepIndex, status: 'thinking' | 'waiting' | 'feedback' | 'done', feedback, solved, hintSquare, play(uci), hint(), reveal(), quit() }`
  - `QuizButton({ onStart, done })`: 오버레이 버튼, 이름 "퀴즈: 이 장면 직접 두기"
  - `QuizCard({ scene, quiz, onContinue })`: `<section aria-label="퀴즈">`
  - `MoveList`의 새 prop `quizPlies?: Set<number>`: 해당 수에 `data-quiz` 표시
  - `ReviewSummary`의 새 prop `quiz?: { solved: number; total: number }`: "퀴즈 3/5"
  - GameList 링크에 `state={{ me: username }}`

- [ ] **Step 1: 상태 기계** (`src/features/viewer/quiz/useQuiz.ts`)

```ts
import { Chess } from 'chess.js'
import { useCallback, useRef, useState } from 'react'
import { gradeMove, type Evaluate, type Grade } from '../../../quiz/grade'
import type { QuizScene } from '../../../quiz/types'
import type { Ply } from '../../../chess/types'

export type QuizStatus = 'waiting' | 'thinking' | 'feedback' | 'done'

export function useQuiz({ scene, plies, evaluate, reducedMotion, onFinish }: {
  scene: QuizScene
  plies: Ply[]
  evaluate: Evaluate
  reducedMotion: boolean
  onFinish: (r: { solvedSteps: number; totalSteps: number; attempts: number }) => void
}) {
  const [fen, setFen] = useState(plies[scene.startPly].fen)
  const [lastUci, setLastUci] = useState<string | null>(plies[scene.startPly].uci)
  const [stepIndex, setStepIndex] = useState(0)
  const [status, setStatus] = useState<QuizStatus>('waiting')
  const [feedback, setFeedback] = useState<Grade | null>(null)
  const [hintSquare, setHintSquare] = useState<string | null>(null)
  const solved = useRef(0)
  const attempts = useRef(0)
  const missedThisStep = useRef(false)
  const step = scene.steps[stepIndex]

  const advance = useCallback(
    (playedFen: string, uci: string) => {
      const reply = scene.steps[stepIndex].replyUci
      const next = stepIndex + 1
      const finish = () => {
        setStatus('done')
        onFinish({ solvedSteps: solved.current, totalSteps: scene.steps.length, attempts: attempts.current })
      }
      if (!reply || next >= scene.steps.length) {
        setFen(playedFen)
        setLastUci(uci)
        finish()
        return
      }
      setFen(playedFen)
      setLastUci(uci)
      const doReply = () => {
        const c = new Chess(playedFen)
        c.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: reply[4] })
        setFen(c.fen())
        setLastUci(reply)
        setStepIndex(next)
        setStatus('waiting')
        setFeedback(null)
        setHintSquare(null)
        missedThisStep.current = false
      }
      if (reducedMotion) doReply()
      else setTimeout(doReply, 600)
    },
    [scene, stepIndex, onFinish, reducedMotion],
  )

  const play = useCallback(
    async (uci: string) => {
      if (status === 'thinking' || status === 'done') return
      attempts.current++
      setStatus('thinking')
      const grade = await gradeMove({ fen, uci, step, side: scene.side, evaluate })
      setFeedback(grade)
      if (grade.kind === 'wrong') {
        missedThisStep.current = true
        setStatus('feedback')
        return
      }
      if (!missedThisStep.current) solved.current++
      const c = new Chess(fen)
      c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
      if (grade.kind === 'alternative') {
        setFen(c.fen())
        setLastUci(uci)
        setStatus('done')
        onFinish({ solvedSteps: solved.current, totalSteps: scene.steps.length, attempts: attempts.current })
        return
      }
      setStatus('feedback')
      advance(c.fen(), uci)
    },
    [status, fen, step, scene, evaluate, advance, onFinish],
  )

  const hint = useCallback(() => {
    missedThisStep.current = true
    setHintSquare(step.answerUci.slice(0, 2))
  }, [step])

  const reveal = useCallback(() => {
    missedThisStep.current = true
    const c = new Chess(fen)
    c.move({ from: step.answerUci.slice(0, 2), to: step.answerUci.slice(2, 4), promotion: step.answerUci[4] })
    setFeedback(null)
    advance(c.fen(), step.answerUci)
  }, [fen, step, advance])

  return { fen, lastUci, stepIndex, status, feedback, hintSquare, step, solved: solved.current, play, hint, reveal }
}
```

- [ ] **Step 2: 스타일** (`src/styles/features/quiz.css.ts`)

```ts
import { keyframes, style } from '@vanilla-extract/css'
import { fontSize, radius, space, vars, weight } from '../tokens.css'

export const overlay = style({
  position: 'absolute',
  top: space[2],
  right: space[2],
  zIndex: 3,
  width: 44,
  height: 44,
  display: 'grid',
  placeItems: 'center',
  borderRadius: '50%',
  border: 0,
  background: vars.color.accent,
  color: vars.color.canvas,
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(0,0,0,.25)',
})
export const done = style({ background: vars.color.surfaceSubtle, color: vars.color.ink })
export const card = style({ display: 'grid', gap: space[3], padding: space[4], borderRadius: radius.surface, background: vars.color.surfaceSubtle })
export const prompt = style({ fontSize: fontSize.lead, fontWeight: weight.medium })
export const steps = style({ display: 'flex', gap: space[1] })
export const dot = style({ width: 10, height: 10, borderRadius: '50%', background: vars.color.line })
export const dotOn = style({ background: vars.color.accent })
export const actions = style({ display: 'flex', flexWrap: 'wrap', gap: space[2] })
export const feedbackGood = style({ color: vars.color.judgment.best })
export const feedbackBad = style({ color: vars.color.judgment.mistake })
const shake = keyframes({ '0%,100%': { transform: 'none' }, '30%': { transform: 'translateX(-4px)' }, '60%': { transform: 'translateX(4px)' } })
export const shakeOnce = style({ animation: `${shake} 280ms ease-out`, '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } } })
export const sanForm = style({ display: 'flex', gap: space[2], alignItems: 'end' })
```

`vars.color.judgment.*`의 실제 토큰 이름은 `src/components/judgment.css.ts`와 `tokens.css.ts`에서 확인해 맞춘다.

- [ ] **Step 3: 퀴즈 카드** (`src/features/viewer/quiz/QuizCard.tsx`)

```tsx
import { Chess } from 'chess.js'
import { useState } from 'react'
import type { QuizScene } from '../../../quiz/types'
import * as q from '../../../styles/features/quiz.css'
import { Button } from '../../../ui/Button'
import { cx } from '../../../ui/cx'
import { TextField } from '../../../ui/TextField'
import type { useQuiz } from './useQuiz'

export function QuizCard({ scene, quiz, onContinue, onQuit }: { scene: QuizScene; quiz: ReturnType<typeof useQuiz>; onContinue: () => void; onQuit: () => void }) {
  const [san, setSan] = useState('')
  const [sanError, setSanError] = useState<string | null>(null)
  const message =
    quiz.status === 'thinking'
      ? '확인하는 중…'
      : quiz.feedback?.kind === 'correct'
        ? '정답이에요!'
        : quiz.feedback?.kind === 'alternative'
          ? '좋은 수예요. 실제로는 다른 수를 뒀어요.'
          : quiz.feedback?.kind === 'wrong'
            ? (quiz.feedback.refutation ?? '그 수는 잘 통하지 않아요. 다시 둬 보세요.')
            : null
  const submitSan = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const m = new Chess(quiz.fen).move(san.trim())
      setSanError(null)
      setSan('')
      void quiz.play(m.from + m.to + (m.promotion ?? ''))
    } catch {
      setSanError('둘 수 없는 수예요')
    }
  }
  return (
    <section aria-label="퀴즈" className={q.card}>
      <p className={q.prompt}>{scene.prompt}</p>
      {scene.steps.length > 1 && (
        <p className={q.steps} aria-label={`${scene.steps.length}수 중 ${quiz.stepIndex + 1}번째`}>
          {scene.steps.map((_, i) => (
            <span key={i} className={cx(q.dot, i <= quiz.stepIndex && q.dotOn)} />
          ))}
        </p>
      )}
      <p aria-live="polite" className={cx(quiz.feedback?.kind === 'wrong' ? cx(q.feedbackBad, q.shakeOnce) : quiz.feedback && q.feedbackGood)}>
        {quiz.status === 'done' ? `${scene.steps.length}수 중 ${quiz.solved}수 맞혔어요.` : message}
      </p>
      {quiz.hintSquare && quiz.status !== 'done' && <p>{quiz.step.hint ?? `${quiz.hintSquare}의 기물을 움직여 보세요.`}</p>}
      {quiz.status === 'done' ? (
        <div className={q.actions}>
          <Button onClick={onContinue}>이어서 보기</Button>
        </div>
      ) : (
        <>
          <div className={q.actions}>
            <Button variant="secondary" size="sm" onClick={quiz.hint} disabled={quiz.status === 'thinking'}>힌트</Button>
            <Button variant="secondary" size="sm" onClick={quiz.reveal} disabled={quiz.status === 'thinking'}>정답 보기</Button>
            <Button variant="ghost" size="sm" onClick={onQuit}>그만두기</Button>
          </div>
          <form className={q.sanForm} onSubmit={submitSan}>
            <TextField label="수 입력 (예: Nf3)" value={san} onChange={(e) => setSan(e.target.value)} error={sanError ?? undefined} />
            <Button type="submit" size="sm">두기</Button>
          </form>
        </>
      )}
    </section>
  )
}
```

`Button`의 `variant`/`size`, `TextField`의 `label`/`error` prop 이름은 `src/ui/Button.tsx`, `src/ui/TextField.tsx`의 실제 정의에 맞춘다.

- [ ] **Step 4: 오버레이 버튼** (`src/features/viewer/quiz/QuizButton.tsx`)

```tsx
import { Puzzle, Check } from 'lucide-react'
import * as q from '../../../styles/features/quiz.css'
import { cx } from '../../../ui/cx'
import { Icon } from '../../../ui/Icon'

export function QuizButton({ onStart, done }: { onStart: () => void; done: boolean }) {
  return (
    <button type="button" className={cx(q.overlay, done && q.done)} aria-label={done ? '퀴즈: 다시 풀기 (푼 장면)' : '퀴즈: 이 장면 직접 두기'} onClick={onStart}>
      <Icon icon={done ? Check : Puzzle} size={22} />
    </button>
  )
}
```

- [ ] **Step 5: 뷰어 연결** (`ViewerPage.tsx`)

1. `gameLayout.css.ts`의 `boardWrap`에 `position: 'relative'`를 추가한다.
2. 장면 목록을 만든다.

```tsx
  const location = useLocation()
  const me: string | undefined = (location.state as { me?: string } | null)?.me ?? (gameRef.kind === 'chesscom' ? gameRef.user : undefined)
  const mySide = me ? (record.white.name.toLowerCase() === me.toLowerCase() ? 'w' : record.black.name.toLowerCase() === me.toLowerCase() ? 'b' : null) : null
  const scenes = useMemo(
    () => annotations?.scenes ?? (review.status === 'done' ? selectScenes(plies, review.review, mySide) : []),
    [annotations, review, plies, mySide],
  )
  const sceneHere = scenes.find((s) => s.startPly === ply) ?? null
  const [activeScene, setActiveScene] = useState<QuizScene | null>(null)
  const [results, setResults] = useState<Map<string, QuizResult>>(new Map())
  useEffect(() => {
    void store.quiz.list(refKey(gameRef)).then((rs) => setResults(new Map(rs.map((r) => [r.sceneId, r]))))
  }, [store, gameRef])
```

3. 엔진 평가 함수(순차 호출, latest-wins 대응):

```tsx
  const { analysis } = useEngines()
  const evaluate = useCallback(
    async (f: string) => {
      const r = await analysis.analyze(f, { movetime: 300 })
      return { score: r.lines[0]?.score ?? { cp: 0 }, best: r.bestMove }
    },
    [analysis],
  )
```

4. 퀴즈 중에는 다음을 바꾼다.
   - `useKeyboardNav`, 스와이프, 조작 막대: `enabled` 조건과 `ViewerControls`의 `disabled`에 `activeScene === null`을 더한다. `ViewerControls`에 `disabled?: boolean` prop을 추가해 모든 BarButton에 넘긴다.
   - `useLiveAnalysis(fen, … && !activeScene)`.
   - `EvalBar`는 `activeScene ? null : score`를 받는다. EvalBar가 `score={null}`을 받으면 빈 막대를 그리는지 확인한다.
   - `shapes`는 퀴즈 중에는 `[]`다.
   - `Board`
     - `fen`: `quiz.fen`
     - `lastMoveUci`: `quiz.lastUci`
     - `movable`: `{ color: scene.side === 'w' ? 'white' : 'black', dests: legalDests(quiz.fen), onMove: (from, to) => quiz.play(toUci(quiz.fen, from, to)) }`. 단 `status === 'thinking' | 'done'`이면 `null`.
     - `shapes`: 힌트가 있으면 `quiz.hintSquare`를 원으로 표시(`{ orig: hintSquare, brush: 'green' }`).
   - 패널: `JudgmentCard`·`ReviewSummary`·`EvalGraph`·엔진 라인 대신 `QuizCard`만 보인다.

   이를 위해 퀴즈 중 부분을 `<ActiveQuiz scene plies evaluate onExit />` 하위 컴포넌트로 분리한다. 이 컴포넌트가 `useQuiz`를 호출하고, Board·QuizCard를 그린다. `useQuiz`는 장면마다 새 상태가 필요하므로 `key={scene.id}`로 마운트한다.
5. 장면 시작 포지션이면 보드 래퍼 안에 `<QuizButton onStart={() => setActiveScene(sceneHere)} done={results.has(sceneHere.id)} />`를 넣는다.
6. `onFinish`에서 다음을 저장한다.

```tsx
store.quiz.put({ key: `${refKey(gameRef)}|${scene.id}`, gameKey: refKey(gameRef), sceneId: scene.id, ...r, completedAt: Date.now() })
```

   그 뒤 `results`를 갱신한다.
7. `onContinue`: `setActiveScene(null)`, 그다음 `go(scene.startPly + scene.steps.length * 2 - 1)`로 승부처 수로 이동한다. 마지막 단계에 응수가 없으면 사용자 마지막 수의 ply다.
8. `MoveList`에 `quizPlies={new Set(scenes.map((s) => s.startPly + 1))}`를 넘긴다. `MoveList`는 해당 버튼에 `data-quiz=""`를 달고, `aria-label`에 "퀴즈 있음"을 덧붙인다.
9. `ReviewSummary`에 `quiz={{ solved: results.size, total: scenes.length }}`를 넘기고 "퀴즈 {solved}/{total}"을 표시한다. `scenes.length === 0`이면 숨긴다.
10. `GameList.tsx`의 `<Link to=…>`에 `state={username ? { me: username } : undefined}`를 추가한다.

- [ ] **Step 6: 테스트**

`QuizCard.test.tsx`: `useQuiz` 결과를 가짜 객체로 넘긴다.
- 질문이 보인다.
- [힌트]·[정답 보기]·[그만두기] 버튼이 있다.
- 수 입력에 "Qh9"를 넣으면 "둘 수 없는 수예요"가 나온다.
- `status: 'done'`이면 "3수 중 2수 맞혔어요."와 [이어서 보기]가 보인다.

`ViewerPage.test.tsx`: `vi.mock` 해설에 장면을 추가한다.

```ts
scenes: [{ id: 's1', startPly: 0, side: 'w', prompt: '첫 수를 둬 보세요.', steps: [{ answerUci: 'e2e4' }], source: 'authored' }]
```

(오페라 게임 첫 수는 e4. 실제 PGN에서 확인한다.)

```tsx
  it('퀴즈: 시작 포지션에서 버튼을 눌러 풀고, 결과를 저장한다', async () => {
    const { store } = renderRoute('/game/classic/opera-game', { engines: { analysis: analysisEngine() } })
    fireEvent.click(await screen.findByRole('button', { name: '퀴즈: 이 장면 직접 두기' }))
    const quiz = screen.getByRole('region', { name: '퀴즈' })
    expect(within(quiz).getByText('첫 수를 둬 보세요.')).toBeInTheDocument()
    expect(screen.queryByRole('meter', { name: '평가' })?.getAttribute('aria-valuenow') ?? null).toBeNull()
    expect(screen.getByRole('button', { name: '다음 수' })).toBeDisabled()
    fireEvent.change(within(quiz).getByLabelText('수 입력 (예: Nf3)'), { target: { value: 'e4' } })
    fireEvent.click(within(quiz).getByRole('button', { name: '두기' }))
    expect(await within(quiz).findByText('1수 중 1수 맞혔어요.')).toBeInTheDocument()
    expect((await store.quiz.list('classic/opera-game'))[0]).toMatchObject({ sceneId: 's1', solvedSteps: 1 })
    fireEvent.click(within(quiz).getByRole('button', { name: '이어서 보기' }))
    expect(await screen.findByText('1. e4')).toBeInTheDocument()
  })
```

평가 바 확인은 EvalBar가 `score=null`일 때 내는 실제 속성에 맞춰 고친다.

- [ ] **Step 7: 확인 후 커밋**

Run: `npm test && npx tsc --noEmit && npm run build` → PASS, 경고 없음

```bash
git add src
git commit -m "feat: 퀴즈 화면(보드 오버레이 버튼, 퀴즈 카드, 이동·평가 잠금, 결과 저장)"
```

---

### Task 12: 시범 해설 2판 (사용자 확인 지점)

**Files:**
- Create: `src/data/annotations/opera-game.json`, `src/data/annotations/byrne-fischer-1956.json`

이 태스크는 코드가 아니라 **해설 작성**이다. 순서:

- [ ] **Step 1: 팩트 시트**

Run: `npm run annotate:facts -- opera-game` 그리고 `npm run annotate:facts -- byrne-fischer-1956` (depth 22, 시간이 걸린다)

- [ ] **Step 2: 해설 작성**

팩트 시트(`positions`, `alternatives`, `labels`)와 경기의 역사적 맥락을 근거로 쓴다. 맥락은 선수, 시대, 대회, 널리 알려진 일화다.
- 0번: 경기 소개 1~2문장.
- 모든 수: 1~2문장으로 이 수의 의도를 말한다. 형세가 크게 바뀌는 수는 이유도 쓴다.
- 핵심 장면(`key: true`, 판마다 4~8개): 3~6문장.
  - 왜 이 수인가
  - 상대가 무엇을 놓쳤나
  - 다른 수를 뒀다면 어땠나(`[[…]]` 가정 수순)
- 앞으로 나올 실제 기보 수는 SAN으로 쓰지 않는다. "퀸을 내줄 준비"처럼 의도로 쓴다.
- 기존 출판 해설을 옮기지 않는다.

- [ ] **Step 3: 장면 작성**

판마다 2~5개. 빌드업이 중요하면 준비 수부터 시작한다. 단계마다 다음을 넣는다.
- `hint` 한 줄
- 자주 나올 오답 1~2개의 `refutations`. 팩트 시트 `alternatives`에서 그럴듯하지만 나쁜 수를 고른다.

- [ ] **Step 4: 검증·검토**

1. `npx vitest run src/data/annotations`가 통과해야 한다.
2. 문체 검토: `humanize-korean:naturalness-reviewer`. AI 티, 번역투, 과한 수사를 점검하고 지적을 반영한다.
3. 사실 검토: 해설의 형세 서술("백이 이긴다", "기물을 딴다")을 팩트 시트와 대조한다.
4. 브라우저(개발 서버 5199, 사용자가 이미 띄워 둠)에서 두 판을 넘기며 읽는다. 장면 퀴즈를 직접 풀어 본다. 375px에서 카드 접기를 확인한다.

- [ ] **Step 5: 커밋 후 사용자 확인**

```bash
git add src/data/annotations/opera-game.json src/data/annotations/byrne-fischer-1956.json
git commit -m "feat: 시범 명경기 해설·퀴즈 2판(오페라 게임, 세기의 대국)"
```

**여기서 멈추고 사용자에게 두 판을 보여 준다.** 문체, 깊이, 퀴즈 장면 고르기를 확인받는다. 피드백을 반영한 뒤 `docs/superpowers/annotation-style.md`에 확정 기준을 적어 커밋한다(`docs: 명경기 해설 문체 기준`). 기준에는 다음을 담는다.
- 좋은 예 5개, 나쁜 예 5개
- 금칙어
- 문장 길이
- 핵심 장면 고르는 법
- 장면 시작점 고르는 법

---

### Task 13: 나머지 28판 해설

**Files:**
- Create: `src/data/annotations/<slug>.json` × 28

- [ ] **Step 1: 팩트 시트 일괄 생성**

Run: `npm run annotate:facts -- all`. 이미 있는 2판은 다시 만들어도 된다.

- [ ] **Step 2: 4묶음(7판씩)으로 작성**

경기마다 Task 12의 Step 2~4를 `annotation-style.md` 기준으로 반복한다. 묶음이 끝날 때마다 다음을 한다.
1. `npx vitest run src/data/annotations`
2. 묶음 전체 문체 검토
3. 무작위로 고른 경기 2판 브라우저 확인
4. 커밋: `feat: 명경기 해설·퀴즈 N묶음(<slug>, …)`

---

### Task 14: E2E와 마무리

**Files:**
- Create: `e2e/quiz.spec.ts`
- Modify: `e2e/mobile.spec.ts`

- [ ] **Step 1: E2E**

`e2e/quiz.spec.ts`:
1. `/game/classic/opera-game`을 연다.
2. 첫 장면의 시작 수까지 이동한다.
3. "퀴즈: 이 장면 직접 두기"를 누른다.
4. 정답을 "수 입력"으로 둔다. 장면의 단계 수만큼 반복한다.
5. "맞혔어요"를 확인한다.
6. 새로고침한 뒤 같은 수에서 버튼 이름이 "퀴즈: 다시 풀기 (푼 장면)"인지 확인한다.

`e2e/mobile.spec.ts`: 375px에서 핵심 장면 해설이 접히고 [더 보기]가 44px 이상인지, 가로 스크롤이 없는지 확인한다.

내 대국 코멘트: 기존 review.spec의 모의 데이터로 리뷰를 돌린 뒤 판정 카드에 코멘트 문단이 있는지 확인한다.

- [ ] **Step 2: 전체 확인**

Run: `npm test && npx tsc --noEmit && npm run build && npm run e2e` → 모두 통과, 빌드 경고 없음

확인할 것:
- 번들: 해설 JSON이 경기별 청크로 분리됐는지 `ls dist/assets | grep -i annot`로 확인한다. 초기 index 청크에 해설이 들어가지 않아야 한다.

- [ ] **Step 3: 커밋**

```bash
git add e2e
git commit -m "test(e2e): 퀴즈 풀기와 해설 모바일 확인"
```
