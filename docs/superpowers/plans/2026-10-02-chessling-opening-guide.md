# 오프닝 안내 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기보의 수마다 오프닝·변화 이름과 한국어 설명을 보여 주고, 대표 수순 끝과 이론 이탈 직전 포지션에서 분기할 수 있게 한다.

**Architecture:** Lichess `chess-openings` TSV를 빌드 스크립트로 EPD 색인(`src/data/openings/index.json`)으로 만들고, 직접 쓴 한국어 데이터(`ko.json`)와 함께 지연 로드한다. 순수 함수 `identifyOpening`이 수마다 현재 오프닝과 이론 이탈 지점을 계산하고, 뷰어는 판정 카드 한 줄·오프닝 섹션·기존 `ForkDialog`로 이를 보여 준다.

**Tech Stack:** React 19, TypeScript, Vanilla Extract, chess.js 1.4, TanStack Query, Vitest + Testing Library, Playwright, tsx(스크립트)

**Spec:** `docs/superpowers/specs/2026-10-02-chessling-opening-guide-design.md`

## Global Constraints

- 커밋·PR에 Claude 표시를 넣지 않는다. `Co-Authored-By: Claude…`, "Generated with Claude Code" 모두 금지.
- `main`에 직접 커밋하지 않는다(브랜치 `feat/opening-guide`). 푸시는 사용자가 요청할 때만.
- 포트 5199(사용자 미리보기), 5173, 4173에 서버를 띄우지 않는다. 남의 프로세스를 끄지 않는다.
- `.superpowers/`, `.claude/`, `test-results/`, `playwright-report/`, `scripts/annotate/facts/`는 커밋하지 않는다.
- 앱 실행 중 외부 API를 부르지 않는다. 오프닝 데이터는 번들에 넣고 `import()`로 지연 로드한다.
- 한국어 설명은 `docs/superpowers/annotation-style.md` 문체(해요체, "엔진"·평가 숫자 금지, 반복 틀 금지)를 따른다. 출판물·위키 문장을 옮기지 않는다.
- 이름 표기: 한국어 + 원문 병기. 한국어 변화명이 없으면 "한국어 계열명 · 영어 변화명".
- 수 표기는 SAN, 칸 이름은 소문자(`e4`).
- 검증 명령: 테스트 `npx vitest run <경로>`, 타입 `npx tsc --noEmit`. 테스트와 커밋은 한 줄로 잇지 않는다(파이프가 실패를 가린 적이 있다).

## File Structure

| 파일 | 책임 |
|---|---|
| `scripts/openings/source/{a..e}.tsv` | Lichess 원본(CC0) |
| `scripts/openings/build.ts` | TSV → `src/data/openings/index.json` |
| `src/openings/types.ts` | `OpeningEntry`, `KoOpenings`, `OpeningData`, `OpeningAt`, `OpeningTrack` |
| `src/openings/line.ts` | `epdOf`, `START_EPD`, `sanLineToUci` |
| `src/openings/buildIndex.ts` | TSV 행 → 색인(EPD 충돌 처리), 순수 함수 |
| `src/openings/identify.ts` | `buildLookup`, `identifyOpening`, `theoryMoves` |
| `src/openings/view.ts` | 표시 이름, 판정 카드용 모델, 대표 수순 비교 |
| `src/data/openings/index.json` | 생성된 색인(커밋) |
| `src/data/openings/ko.json` | 직접 쓴 한국어 데이터 |
| `src/data/openings/validate.ts` + `openings.test.ts` | `ko.json` 검증 |
| `src/sources/openings.ts` | 지연 로드 |
| `src/features/viewer/useOpening.ts` | 로드 + 판별 훅 |
| `src/features/viewer/OpeningPanel.tsx` | "오프닝" 섹션 |
| `src/features/viewer/JudgmentCard.tsx` | 이름 줄·배지·설명·이탈 줄 추가 |
| `src/features/viewer/ViewerPage.tsx` | 훅 연결, 섹션 배치, 분기 대상 일반화 |
| `src/features/play/ForkDialog.tsx` | `title`·`note` 선택 prop |
| `src/features/licenses/LicensesPage.tsx` | 데이터 출처 표기 |
| `scripts/openings/select.ts` | 설명 대상 선정 목록 출력 |
| `e2e/opening.spec.ts` | E2E |

---

### Task 1: 오프닝 색인 데이터

**Files:**
- Create: `scripts/openings/source/a.tsv` ~ `e.tsv`, `src/openings/types.ts`, `src/openings/line.ts`, `src/openings/buildIndex.ts`, `src/openings/buildIndex.test.ts`, `scripts/openings/build.ts`, `src/data/openings/index.json`
- Modify: `package.json` (scripts), `src/features/licenses/LicensesPage.tsx`

**Interfaces:**
- Produces:
  - `src/openings/types.ts`: `OpeningEntry { eco: string; name: string; uci: string[]; epd: string }`
  - `src/openings/line.ts`: `epdOf(fen: string): string`, `START_EPD: string`, `sanLineToUci(line: string, startFen?: string): { uci: string[]; fens: string[] }` (불법 수면 `Error`를 던진다. `fens[i]`는 i+1번째 수 뒤 FEN)
  - `src/openings/buildIndex.ts`: `buildIndex(rows: { eco: string; name: string; pgn: string }[]): { entries: OpeningEntry[]; conflicts: string[] }`

- [ ] **Step 1: 원본 TSV 받기**

```bash
mkdir -p scripts/openings/source
for f in a b c d e; do curl -fsSL "https://raw.githubusercontent.com/lichess-org/chess-openings/master/$f.tsv" -o scripts/openings/source/$f.tsv; done
head -3 scripts/openings/source/b.tsv
wc -l scripts/openings/source/*.tsv
```
Expected: 첫 줄 `eco	name	pgn`, 합계 3,000줄 이상.

- [ ] **Step 2: 타입과 수순 유틸 작성**

`src/openings/types.ts`:
```ts
export interface OpeningEntry {
  eco: string
  /** "Sicilian Defense: Najdorf Variation" */
  name: string
  /** 대표 수순(시작 포지션부터) */
  uci: string[]
  /** 최종 포지션 FEN의 앞 네 필드 */
  epd: string
}

export interface KoFamily {
  name: string
  idea: string
  plans: { white: string; black: string }
}

export interface KoVariation {
  name: string
  summary: string
  /** 대표 수순 SAN("1. e4 c5 2. Nf3 ...") */
  line: string
}

export interface KoOpenings {
  /** 키: 원문 계열명("Sicilian Defense") */
  families: Record<string, KoFamily>
  /** 키: 원문 전체 이름("Sicilian Defense: Najdorf Variation") */
  variations: Record<string, KoVariation>
}

export interface OpeningData {
  index: OpeningEntry[]
  ko: KoOpenings
}

export interface OpeningAt {
  /** 이 이름이 처음 맞은 수 */
  ply: number
  entry: OpeningEntry
  family: KoFamily | null
  variation: KoVariation | null
  /** variation을 찾은 ko.variations 키 */
  variationKey: string | null
}

export interface OpeningTrack {
  /** 수마다 그 시점의 오프닝(0수는 null) */
  byPly: (OpeningAt | null)[]
  /** ply: 이론에서 벗어난 첫 수, theory: 직전 포지션에서 색인이 이어 가는 수(UCI, 최대 3개) */
  deviation: { ply: number; theory: string[] } | null
}
```

`src/openings/line.ts`:
```ts
import { Chess, DEFAULT_POSITION } from 'chess.js'

/** 수 번호와 50수 규칙 카운터를 뺀 포지션 키 */
export function epdOf(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ')
}

export const START_EPD = epdOf(DEFAULT_POSITION)

const MOVE_NUMBER = /\d+\.(\.\.)?/g

/** "1. e4 c5 2. Nf3"를 UCI로 바꾼다. 둘 수 없는 수가 있으면 Error */
export function sanLineToUci(line: string, startFen: string = DEFAULT_POSITION): { uci: string[]; fens: string[] } {
  const chess = new Chess(startFen)
  const uci: string[] = []
  const fens: string[] = []
  for (const san of line.replace(MOVE_NUMBER, ' ').split(/\s+/).filter(Boolean)) {
    let m
    try {
      m = chess.move(san)
    } catch {
      throw new Error(`둘 수 없는 수: ${san} (${line})`)
    }
    uci.push(m.from + m.to + (m.promotion ?? ''))
    fens.push(chess.fen())
  }
  return { uci, fens }
}
```

- [ ] **Step 3: 색인 빌드 실패 테스트 작성**

`src/openings/buildIndex.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { buildIndex } from './buildIndex'
import { epdOf, sanLineToUci } from './line'

describe('buildIndex', () => {
  it('수순을 UCI와 최종 포지션 EPD로 바꾼다', () => {
    const { entries } = buildIndex([{ eco: 'B20', name: 'Sicilian Defense', pgn: '1. e4 c5' }])
    expect(entries).toEqual([
      { eco: 'B20', name: 'Sicilian Defense', uci: ['e2e4', 'c7c5'], epd: epdOf(sanLineToUci('1. e4 c5').fens[1]) },
    ])
  })

  it('같은 포지션이면 수순이 긴 이름을 남기고 충돌을 알린다', () => {
    const { entries, conflicts } = buildIndex([
      { eco: 'A', name: 'Short', pgn: '1. d4 Nf6 2. c4 e6' },
      { eco: 'B', name: 'Long', pgn: '1. Nf3 Nf6 2. d4 e6 3. c4' },
      { eco: 'C', name: 'Other', pgn: '1. c4 e6 2. d4 Nf6' },
    ])
    // Short와 Other는 같은 포지션(전치), 수순 길이가 같으면 먼저 온 것을 남긴다
    expect(entries.map((e) => e.name)).toEqual(['Short', 'Long'])
    expect(conflicts).toEqual(['Other → Short'])
  })

  it('둘 수 없는 수순이 있으면 이름과 함께 실패한다', () => {
    expect(() => buildIndex([{ eco: 'X', name: 'Broken', pgn: '1. e5' }])).toThrow(/Broken/)
  })
})
```

- [ ] **Step 4: 실패 확인**

Run: `npx vitest run src/openings/buildIndex.test.ts`
Expected: FAIL (`./buildIndex` 없음)

- [ ] **Step 5: 구현**

`src/openings/buildIndex.ts`:
```ts
import { epdOf, sanLineToUci } from './line'
import type { OpeningEntry } from './types'

export function buildIndex(rows: { eco: string; name: string; pgn: string }[]): { entries: OpeningEntry[]; conflicts: string[] } {
  const byEpd = new Map<string, OpeningEntry>()
  const conflicts: string[] = []
  for (const row of rows) {
    let line
    try {
      line = sanLineToUci(row.pgn)
    } catch (e) {
      throw new Error(`${row.name}: ${(e as Error).message}`)
    }
    const entry: OpeningEntry = { eco: row.eco, name: row.name, uci: line.uci, epd: epdOf(line.fens.at(-1)!) }
    const prev = byEpd.get(entry.epd)
    if (!prev) {
      byEpd.set(entry.epd, entry)
    } else if (entry.uci.length > prev.uci.length) {
      conflicts.push(`${prev.name} → ${entry.name}`)
      byEpd.set(entry.epd, entry)
    } else {
      conflicts.push(`${entry.name} → ${prev.name}`)
    }
  }
  return { entries: [...byEpd.values()], conflicts }
}
```

- [ ] **Step 6: 통과 확인**

Run: `npx vitest run src/openings/buildIndex.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 7: 빌드 스크립트와 npm 스크립트**

`scripts/openings/build.ts`:
```ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { buildIndex } from '../../src/openings/buildIndex'

const rows = ['a', 'b', 'c', 'd', 'e'].flatMap((f) =>
  readFileSync(`scripts/openings/source/${f}.tsv`, 'utf8')
    .split('\n')
    .slice(1)
    .filter(Boolean)
    .map((l) => {
      const [eco, name, pgn] = l.split('\t')
      return { eco, name, pgn }
    }),
)
const { entries, conflicts } = buildIndex(rows)
mkdirSync('src/data/openings', { recursive: true })
writeFileSync('src/data/openings/index.json', JSON.stringify(entries) + '\n')
console.log(`항목 ${entries.length}개 (원본 ${rows.length}행), 충돌 ${conflicts.length}건`)
for (const c of conflicts) console.log(`  ${c}`)
```

`package.json`의 `scripts`에 추가:
```json
"openings:build": "tsx scripts/openings/build.ts",
```

Run: `npm run openings:build`
Expected: `항목 3xxx개 …`가 출력되고 `src/data/openings/index.json`이 생긴다.

- [ ] **Step 8: 라이선스 표기**

`src/features/licenses/LicensesPage.tsx`의 마지막 `<p>`를 다음으로 바꾼다:
```tsx
      <p>대국 데이터는 Chess.com 공개 API와 Lichess API에서 가져옵니다. 명경기 소개 글은 Chessling이 직접 작성했습니다.</p>
      <p>
        오프닝 이름과 수순은 <a href="https://github.com/lichess-org/chess-openings">lichess-org/chess-openings</a>(CC0)를 썼고,
        한국어 오프닝 설명은 Chessling이 직접 작성했습니다.
      </p>
```

- [ ] **Step 9: 타입 확인과 커밋**

Run: `npx tsc --noEmit`
Expected: 오류 없음

```bash
git add scripts/openings src/openings src/data/openings/index.json package.json src/features/licenses/LicensesPage.tsx
git commit -m "feat: Lichess 오프닝 데이터로 포지션 색인 생성"
```

---

### Task 2: 한국어 데이터 형식·검증·로더

**Files:**
- Create: `src/data/openings/ko.json`, `src/data/openings/validate.ts`, `src/data/openings/openings.test.ts`, `src/sources/openings.ts`

**Interfaces:**
- Consumes: Task 1의 `OpeningEntry`, `KoOpenings`, `OpeningData`, `sanLineToUci`, `epdOf`
- Produces:
  - `validateKoOpenings(ko: KoOpenings, index: OpeningEntry[]): string[]` (오류 문장 목록, 비면 통과)
  - `loadOpeningData(): Promise<OpeningData>`

- [ ] **Step 1: 씨앗 데이터 작성**

`src/data/openings/ko.json`(E2E와 화면 테스트가 쓰는 최소 데이터. 나머지는 Task 8에서 채운다):
```json
{
  "families": {
    "Philidor Defense": {
      "name": "필리도르 디펜스",
      "idea": "흑이 2...d6으로 e5 폰을 단단히 받치는 오프닝이에요. 공간은 좁지만 쉽게 무너지지 않는 진형을 만들어요.",
      "plans": {
        "white": "d4로 중앙을 열고 기물을 빨리 꺼내 흑의 좁은 진형을 압박해요.",
        "black": "e5 폰을 지키며 Nf6, Be7, 캐슬링 순서로 차분히 전개해요."
      }
    },
    "Sicilian Defense": {
      "name": "시실리안 디펜스",
      "idea": "흑이 1...c5로 d4 칸을 다투는 오프닝이에요. 양쪽 진형이 비대칭이 되어 싸움이 날카로워져요.",
      "plans": {
        "white": "d4로 c폰과 바꾼 뒤 빠른 전개로 킹 쪽 공격을 노려요.",
        "black": "열린 c줄과 퀸 쪽 폰 다수를 살려 반격해요."
      }
    }
  },
  "variations": {
    "Sicilian Defense: Najdorf Variation": {
      "name": "나이도르프 변화",
      "summary": "흑이 5...a6으로 b5 칸을 막고, e5와 e6 중 하나를 고를 여지를 남겨요. 시실리안에서 가장 깊게 연구된 변화 중 하나예요.",
      "line": "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 7. Nb3 Be6 8. f3 Be7"
    }
  }
}
```

- [ ] **Step 2: 검증 실패 테스트 작성**

`src/data/openings/openings.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import type { KoOpenings, OpeningEntry } from '../../openings/types'
import index from './index.json'
import ko from './ko.json'
import { validateKoOpenings } from './validate'

const INDEX = index as OpeningEntry[]

const base = (): KoOpenings => JSON.parse(JSON.stringify(ko))

describe('ko.json', () => {
  it('실제 데이터가 검증을 통과한다', () => {
    // 씨앗 데이터의 필리도르 디펜스에는 아직 변화 설명이 없다. Task 8 Step 5에서 옵션을 지운다
    expect(validateKoOpenings(ko as KoOpenings, INDEX, { requireVariations: false })).toEqual([])
  })
})

describe('validateKoOpenings', () => {
  it('색인에 없는 이름을 잡는다', () => {
    const k = base()
    k.variations['Sicilian Defense: Nonexistent'] = { ...k.variations['Sicilian Defense: Najdorf Variation'] }
    expect(validateKoOpenings(k, INDEX)).toContain('변화 "Sicilian Defense: Nonexistent": 색인에 없는 이름')
  })

  it('둘 수 없는 대표 수순과 변화 포지션을 지나지 않는 수순을 잡는다', () => {
    const k = base()
    k.variations['Sicilian Defense: Najdorf Variation'].line = '1. e4 c5 2. Ke3'
    expect(validateKoOpenings(k, INDEX).some((e) => e.includes('둘 수 없는 수'))).toBe(true)
    k.variations['Sicilian Defense: Najdorf Variation'].line = '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6'
    expect(validateKoOpenings(k, INDEX)).toContain('변화 "Sicilian Defense: Najdorf Variation": 대표 수순이 이 변화 포지션을 지나지 않음')
  })

  it('금칙어, 문장 수, 긴 문장, 변화 없는 계열을 잡는다', () => {
    const k = base()
    k.families['Sicilian Defense'].idea = '엔진이 좋아하는 오프닝이에요.'
    k.families['Philidor Defense'].plans.white = '첫 문장이에요. 둘째 문장이에요.'
    k.variations['Sicilian Defense: Najdorf Variation'].summary =
      '이 문장은 일부러 아주 길게 써서 한 문장 길이 제한을 넘기도록 만든 시험용 문장이고 끝까지 마침표 없이 이어져요.'
    const errors = validateKoOpenings(k, INDEX)
    expect(errors).toContain('계열 "Sicilian Defense" idea: 금칙어 /엔진/')
    expect(errors).toContain('계열 "Philidor Defense" plans.white: 문장 2개 (1개까지)')
    expect(errors.some((e) => e.includes('summary: 60자 넘는 문장'))).toBe(true)
    expect(errors).toContain('계열 "Philidor Defense": 설명한 변화가 없음')
  })
})
```

참고: "계열마다 변화가 1개 이상" 규칙은 Task 8이 끝나야 의미가 있다. 그래서 `validateKoOpenings`의 세 번째 인자 `{ requireVariations?: boolean }`(기본 `true`)로 끌 수 있게 하고, 실제 데이터 테스트만 Task 8 전까지 끈다.

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run src/data/openings`
Expected: FAIL (`./validate` 없음)

- [ ] **Step 4: 구현**

`src/data/openings/validate.ts`:
```ts
import { BANNED } from '../annotations/validate'
import { epdOf, sanLineToUci } from '../../openings/line'
import type { KoOpenings, OpeningEntry } from '../../openings/types'

const MAX_SENTENCE = 60

function sentences(text: string): string[] {
  return text.split(/(?<=[.?!])\s+/).filter((s) => s.trim())
}

function checkText(where: string, text: string, maxSentences: number): string[] {
  const errors: string[] = []
  if (!text.trim()) errors.push(`${where}: 비어 있음`)
  for (const b of BANNED) if (b.test(text)) errors.push(`${where}: 금칙어 ${b}`)
  const ss = sentences(text)
  if (ss.length > maxSentences) errors.push(`${where}: 문장 ${ss.length}개 (${maxSentences}개까지)`)
  if (ss.some((s) => s.length > MAX_SENTENCE)) errors.push(`${where}: ${MAX_SENTENCE}자 넘는 문장`)
  return errors
}

export function validateKoOpenings(ko: KoOpenings, index: OpeningEntry[], opts: { requireVariations?: boolean } = {}): string[] {
  const { requireVariations = true } = opts
  const errors: string[] = []
  const names = new Map(index.map((e) => [e.name, e]))
  const familyNames = new Set(index.map((e) => e.name.split(':')[0]))

  for (const [key, f] of Object.entries(ko.families)) {
    const where = `계열 "${key}"`
    if (!familyNames.has(key)) errors.push(`${where}: 색인에 없는 계열`)
    if (!f.name.trim()) errors.push(`${where}: 한국어 이름이 비어 있음`)
    errors.push(...checkText(`${where} idea`, f.idea, 2))
    errors.push(...checkText(`${where} plans.white`, f.plans.white, 1))
    errors.push(...checkText(`${where} plans.black`, f.plans.black, 1))
    if (requireVariations && !Object.keys(ko.variations).some((v) => v.split(':')[0] === key)) errors.push(`${where}: 설명한 변화가 없음`)
  }

  for (const [key, v] of Object.entries(ko.variations)) {
    const where = `변화 "${key}"`
    const entry = names.get(key)
    if (!entry) {
      errors.push(`${where}: 색인에 없는 이름`)
      continue
    }
    if (!ko.families[key.split(':')[0]]) errors.push(`${where}: 계열 설명이 없음`)
    if (!v.name.trim()) errors.push(`${where}: 한국어 이름이 비어 있음`)
    errors.push(...checkText(`${where} summary`, v.summary, 2))
    let fens: string[]
    try {
      fens = sanLineToUci(v.line).fens
    } catch (e) {
      errors.push(`${where}: ${(e as Error).message}`)
      continue
    }
    if (!fens.some((f) => epdOf(f) === entry.epd)) errors.push(`${where}: 대표 수순이 이 변화 포지션을 지나지 않음`)
  }
  return errors
}
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/data/openings`
Expected: PASS (4 tests). 실패하면 씨앗 데이터의 키가 Lichess 이름과 정확히 같은지(`grep -P '\tPhilidor Defense\t' scripts/openings/source/c.tsv`) 확인한다.

- [ ] **Step 6: 지연 로더**

`src/sources/openings.ts`:
```ts
import type { KoOpenings, OpeningData, OpeningEntry } from '../openings/types'

/** 색인(약 3,500개)과 한국어 설명은 첫 화면 번들에 넣지 않고 처음 필요할 때 불러온다 */
export async function loadOpeningData(): Promise<OpeningData> {
  const [index, ko] = await Promise.all([import('../data/openings/index.json'), import('../data/openings/ko.json')])
  return { index: index.default as OpeningEntry[], ko: ko.default as KoOpenings }
}
```

- [ ] **Step 7: 타입 확인과 커밋**

Run: `npx tsc --noEmit`
Expected: 오류 없음

```bash
git add src/data/openings/ko.json src/data/openings/validate.ts src/data/openings/openings.test.ts src/sources/openings.ts
git commit -m "feat: 한국어 오프닝 설명 형식과 검증"
```

---

### Task 3: 오프닝 판별

**Files:**
- Create: `src/openings/identify.ts`, `src/openings/identify.test.ts`

**Interfaces:**
- Consumes: `OpeningData`, `OpeningEntry`, `OpeningAt`, `OpeningTrack`, `epdOf`, `START_EPD`, `buildIndex`(테스트 데이터), `pgnToPlies`(`src/chess/pgn.ts`)
- Produces:
  - `buildLookup(index: OpeningEntry[]): Map<string, OpeningEntry>`
  - `identifyOpening(plies: Ply[], data: OpeningData, lookup?: Map<string, OpeningEntry>): OpeningTrack | null`
  - `theoryMoves(fen: string, lookup: Map<string, OpeningEntry>): string[]`

- [ ] **Step 1: 실패 테스트 작성**

`src/openings/identify.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { pgnToPlies } from '../chess/pgn'
import { buildIndex } from './buildIndex'
import { identifyOpening } from './identify'
import type { OpeningData } from './types'

const NAJDORF = '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6'
const { entries } = buildIndex([
  { eco: 'B20', name: 'Sicilian Defense', pgn: '1. e4 c5' },
  { eco: 'B50', name: 'Sicilian Defense', pgn: '1. e4 c5 2. Nf3 d6' },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation', pgn: NAJDORF },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation, English Attack', pgn: `${NAJDORF} 6. Be3` },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation, Adams Attack', pgn: `${NAJDORF} 6. h3` },
  { eco: 'A10', name: 'English Opening', pgn: '1. c4' },
  { eco: 'A13', name: 'English Opening: Agincourt Defense', pgn: '1. c4 e6' },
  { eco: 'E00', name: 'Indian Defense: Normal Variation', pgn: '1. d4 Nf6 2. c4 e6' },
])
const DATA: OpeningData = {
  index: entries,
  ko: {
    families: { 'Sicilian Defense': { name: '시실리안 디펜스', idea: 'i', plans: { white: 'w', black: 'b' } } },
    variations: { 'Sicilian Defense: Najdorf Variation': { name: '나이도르프 변화', summary: 's', line: NAJDORF } },
  },
}
const game = (moves: string) => pgnToPlies(`${moves} *`)

describe('identifyOpening', () => {
  it('수마다 마지막으로 맞은 오프닝을 이어 가고, 처음 맞은 수를 기억한다', () => {
    const t = identifyOpening(game('1. e4 c5 2. Nf3 d6 3. d4'), DATA)!
    expect(t.byPly[0]).toBeNull()
    expect(t.byPly[1]).toBeNull() // 1.e4는 이 색인에 없다
    expect(t.byPly[2]).toMatchObject({ ply: 2, entry: { eco: 'B20' } })
    expect(t.byPly[3]).toMatchObject({ ply: 2, entry: { eco: 'B20' } })
    expect(t.byPly[4]).toMatchObject({ ply: 4, entry: { eco: 'B50' }, family: { name: '시실리안 디펜스' }, variation: null })
  })

  it('하위 변화는 가장 긴 접두어로 한국어 설명을 물려받는다', () => {
    const t = identifyOpening(game(`${NAJDORF} 6. Be3`), DATA)!
    expect(t.byPly[11]).toMatchObject({
      entry: { name: 'Sicilian Defense: Najdorf Variation, English Attack' },
      variation: { name: '나이도르프 변화' },
      variationKey: 'Sicilian Defense: Najdorf Variation',
    })
  })

  it('전치로 같은 포지션에 오면 같은 오프닝으로 본다', () => {
    const t = identifyOpening(game('1. c4 e6 2. d4 Nf6'), DATA)!
    expect(t.byPly[2]?.entry.name).toBe('English Opening: Agincourt Defense')
    expect(t.byPly[4]).toMatchObject({ ply: 4, entry: { name: 'Indian Defense: Normal Variation' } })
  })

  it('이론에서 벗어난 첫 수와 직전 포지션의 이론 수를 알려 준다', () => {
    const t = identifyOpening(game(`${NAJDORF} 6. f3`), DATA)!
    // 수순 길이가 같으면 이름순: Adams Attack(h3)이 English Attack(Be3)보다 앞
    expect(t.deviation).toEqual({ ply: 11, theory: ['h2h3', 'c1e3'] })
  })

  it('이론 끝까지 두었거나 이어 갈 이론이 없으면 이탈은 없다', () => {
    expect(identifyOpening(game(`${NAJDORF} 6. Be3`), DATA)!.deviation).toBeNull()
    expect(identifyOpening(game(`${NAJDORF} 6. Be3 e5`), DATA)!.deviation).toBeNull()
  })

  it('표준이 아닌 시작 포지션은 판별하지 않는다', () => {
    const plies = pgnToPlies('[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/8/4K2R w K - 0 1"]\n\n1. O-O *')
    expect(identifyOpening(plies, DATA)).toBeNull()
  })
})
```

참고: `6. Be3 e5`는 마지막으로 맞은 수가 11(Be3)이고, 그 포지션에서 한 수로 닿는 색인 항목이 없으므로 이탈이 없다.

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/openings/identify.test.ts`
Expected: FAIL (`./identify` 없음)

- [ ] **Step 3: 구현**

`src/openings/identify.ts`:
```ts
import { Chess } from 'chess.js'
import type { Ply } from '../chess/types'
import { epdOf, START_EPD } from './line'
import type { KoOpenings, OpeningAt, OpeningData, OpeningEntry, OpeningTrack } from './types'

const MAX_THEORY = 3

export function buildLookup(index: OpeningEntry[]): Map<string, OpeningEntry> {
  return new Map(index.map((e) => [e.epd, e]))
}

function describe(ply: number, entry: OpeningEntry, ko: KoOpenings): OpeningAt {
  const family = ko.families[entry.name.split(':')[0]] ?? null
  let variationKey: string | null = null
  for (const key of Object.keys(ko.variations)) {
    const hit = entry.name === key || entry.name.startsWith(`${key},`)
    if (hit && (variationKey === null || key.length > variationKey.length)) variationKey = key
  }
  return { ply, entry, family, variation: variationKey ? ko.variations[variationKey] : null, variationKey }
}

/** 이 포지션에서 한 수를 두어 색인에 닿는 수들(수순이 짧은 순, 같으면 이름순) */
export function theoryMoves(fen: string, lookup: Map<string, OpeningEntry>): string[] {
  return new Chess(fen)
    .moves({ verbose: true })
    .map((m) => ({ uci: m.from + m.to + (m.promotion ?? ''), entry: lookup.get(epdOf(m.after)) }))
    .filter((x): x is { uci: string; entry: OpeningEntry } => x.entry !== undefined)
    .sort((a, b) => a.entry.uci.length - b.entry.uci.length || a.entry.name.localeCompare(b.entry.name))
    .slice(0, MAX_THEORY)
    .map((x) => x.uci)
}

export function identifyOpening(plies: Ply[], data: OpeningData, lookup = buildLookup(data.index)): OpeningTrack | null {
  if (epdOf(plies[0].fen) !== START_EPD) return null
  const byPly: (OpeningAt | null)[] = [null]
  let current: OpeningAt | null = null
  let lastMatched = 0
  for (let i = 1; i < plies.length; i++) {
    const entry = lookup.get(epdOf(plies[i].fen))
    if (entry) {
      current = describe(i, entry, data.ko)
      lastMatched = i
    }
    byPly.push(current)
  }
  let deviation: OpeningTrack['deviation'] = null
  if (lastMatched < plies.length - 1) {
    const theory = theoryMoves(plies[lastMatched].fen, lookup)
    if (theory.length > 0) deviation = { ply: lastMatched + 1, theory }
  }
  return { byPly, deviation }
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/openings/identify.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/openings/identify.ts src/openings/identify.test.ts
git commit -m "feat: 포지션 색인으로 수마다 오프닝과 이론 이탈 판별"
```

---

### Task 4: 판정 카드에 오프닝 표시

**Files:**
- Create: `src/openings/view.ts`, `src/openings/view.test.ts`, `src/features/viewer/useOpening.ts`
- Modify: `src/features/viewer/JudgmentCard.tsx`, `src/styles/features/viewer.css.ts`, `src/features/viewer/ViewerPage.tsx`, `src/features/viewer/ViewerPage.test.tsx`

**Interfaces:**
- Consumes: `OpeningAt`, `OpeningTrack`, `identifyOpening`, `buildLookup`, `loadOpeningData`, `pvToSan`(`src/chess/pgn.ts`), `moveNumberOf`(`src/chess/moveNumber.ts`)
- Produces:
  - `openingLabel(at: OpeningAt): string`
  - `interface CardOpening { label: string; changed: boolean; summary: string | null; deviation: string | null }`
  - `cardOpening(track: OpeningTrack, plies: Ply[], ply: number): CardOpening | null`
  - `useOpening(plies: Ply[]): OpeningTrack | null`
  - `JudgmentCard`의 새 prop `opening?: CardOpening | null`

- [ ] **Step 1: 표시 모델 실패 테스트 작성**

`src/openings/view.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { pgnToPlies } from '../chess/pgn'
import { buildIndex } from './buildIndex'
import { identifyOpening } from './identify'
import type { OpeningData } from './types'
import { cardOpening, openingLabel } from './view'

const NAJDORF = '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6'
const { entries } = buildIndex([
  { eco: 'B20', name: 'Sicilian Defense', pgn: '1. e4 c5' },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation', pgn: NAJDORF },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation, English Attack', pgn: `${NAJDORF} 6. Be3` },
  { eco: 'C20', name: "King's Pawn Game", pgn: '1. e4 e5' },
])
const DATA: OpeningData = {
  index: entries,
  ko: {
    families: { 'Sicilian Defense': { name: '시실리안 디펜스', idea: '계열 아이디어예요.', plans: { white: 'w', black: 'b' } } },
    variations: { 'Sicilian Defense: Najdorf Variation': { name: '나이도르프 변화', summary: '변화 요약이에요.', line: NAJDORF } },
  },
}
const plies = pgnToPlies(`${NAJDORF} 6. f3 *`)
const track = identifyOpening(plies, DATA)!

describe('openingLabel', () => {
  it('한국어 계열·변화명 뒤에 원문 변화명을 붙인다', () => {
    expect(openingLabel(track.byPly[10]!)).toBe('B90 · 시실리안 디펜스: 나이도르프 변화 · Najdorf Variation')
    expect(openingLabel(track.byPly[2]!)).toBe('B20 · 시실리안 디펜스')
  })

  it('한국어 변화명이 없으면 계열명 뒤에 영어 변화명을, 계열도 없으면 원문 전체를 쓴다', () => {
    const t = identifyOpening(pgnToPlies(`${NAJDORF} 6. Be3 *`), DATA)!
    expect(openingLabel(t.byPly[11]!)).toBe('B90 · 시실리안 디펜스: 나이도르프 변화 · Najdorf Variation, English Attack')
    const k = identifyOpening(pgnToPlies('1. e4 e5 *'), DATA)!
    expect(openingLabel(k.byPly[2]!)).toBe("C20 · King's Pawn Game")
  })
})

describe('cardOpening', () => {
  it('이름이 바뀌는 수에서만 설명을 붙이고, 변화 설명이 없으면 계열 아이디어를 쓴다', () => {
    expect(cardOpening(track, plies, 0)).toBeNull()
    expect(cardOpening(track, plies, 2)).toMatchObject({ changed: true, summary: '계열 아이디어예요.' })
    expect(cardOpening(track, plies, 3)).toMatchObject({ changed: false, summary: null })
    expect(cardOpening(track, plies, 10)).toMatchObject({ changed: true, summary: '변화 요약이에요.' })
  })

  it('이탈 수에서 수 번호를 붙인 이론 수를 알려 준다', () => {
    expect(cardOpening(track, plies, 11)).toMatchObject({ changed: false, deviation: '이론대로라면 6.Be3' })
    expect(cardOpening(track, plies, 10)?.deviation).toBeNull()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/openings/view.test.ts`
Expected: FAIL (`./view` 없음)

- [ ] **Step 3: 구현**

`src/openings/view.ts`:
```ts
import { moveNumberOf } from '../chess/moveNumber'
import { pvToSan } from '../chess/pgn'
import type { Ply } from '../chess/types'
import type { OpeningAt, OpeningTrack } from './types'

export function openingLabel(at: OpeningAt): string {
  const [, ...rest] = at.entry.name.split(':')
  const variationEn = rest.join(':').trim()
  if (!at.family) return `${at.entry.eco} · ${at.entry.name}`
  const head = at.variation ? `${at.family.name}: ${at.variation.name}` : at.family.name
  return variationEn ? `${at.entry.eco} · ${head} · ${variationEn}` : `${at.entry.eco} · ${head}`
}

export interface CardOpening {
  label: string
  /** 이 수에서 오프닝 이름이 바뀌었다 */
  changed: boolean
  summary: string | null
  /** "이론대로라면 6.Be3 또는 6.h3" */
  deviation: string | null
}

export function cardOpening(track: OpeningTrack, plies: Ply[], ply: number): CardOpening | null {
  const at = track.byPly[ply]
  if (!at) return null
  const changed = at.ply === ply
  let deviation: string | null = null
  if (track.deviation?.ply === ply) {
    const { number, white } = moveNumberOf(plies[0].fen, ply)
    const prefix = `${number}${white ? '.' : '...'}`
    const sans = track.deviation.theory.map((u) => `${prefix}${pvToSan(plies[ply - 1].fen, [u], 1)[0]}`)
    deviation = `이론대로라면 ${sans.join(' 또는 ')}`
  }
  return {
    label: openingLabel(at),
    changed,
    summary: changed ? (at.variation?.summary ?? at.family?.idea ?? null) : null,
    deviation,
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/openings/view.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: 훅 작성**

`src/features/viewer/useOpening.ts`:
```ts
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import type { Ply } from '../../chess/types'
import { buildLookup, identifyOpening } from '../../openings/identify'
import type { OpeningTrack } from '../../openings/types'
import { loadOpeningData } from '../../sources/openings'

export function useOpening(plies: Ply[]): OpeningTrack | null {
  const q = useQuery({
    queryKey: ['openings'],
    queryFn: async () => {
      const data = await loadOpeningData()
      return { data, lookup: buildLookup(data.index) }
    },
    staleTime: Infinity,
    retry: false,
  })
  useEffect(() => {
    if (q.error) console.warn('[opening] 오프닝 데이터를 불러오지 못했어요', q.error)
  }, [q.error])
  return useMemo(() => (q.data ? identifyOpening(plies, q.data.data, q.data.lookup) : null), [plies, q.data])
}
```

- [ ] **Step 6: 판정 카드 스타일과 렌더**

`src/styles/features/viewer.css.ts` 끝에 추가:
```ts
export const openingName = style({ color: vars.color.muted, fontSize: fontSize.control, wordBreak: 'keep-all', overflowWrap: 'anywhere' })
export const badges = style({ display: 'flex', flexWrap: 'wrap', gap: space[2] })
```

`src/features/viewer/JudgmentCard.tsx`:
- import 추가: `import type { CardOpening } from '../../openings/view'`
- props 타입에 추가:
```ts
  /** 지금 수의 오프닝(판별하지 못하면 null) */
  opening?: CardOpening | null
```
- 구조 분해에 `opening`을 추가한다.
- `{comment?.key && <Badge>핵심 장면</Badge>}` 줄을 다음으로 바꾼다:
```tsx
      {opening && <p className={v.openingName}>{opening.label}</p>}
      {(comment?.key || opening?.changed || opening?.deviation) && (
        <div className={v.badges}>
          {comment?.key && <Badge>핵심 장면</Badge>}
          {opening?.changed && <Badge>오프닝</Badge>}
          {opening?.deviation && <Badge>이론 이탈</Badge>}
        </div>
      )}
```
- `{comment && <CommentText key={ply} text={comment.text} />}` 위에 추가:
```tsx
      {opening?.summary && <CommentText key={`opening-${ply}`} text={opening.summary} />}
      {opening?.deviation && <p className={v.detail}>{opening.deviation}</p>}
```

- [ ] **Step 7: 뷰어 연결**

`src/features/viewer/ViewerPage.tsx`:
- import 추가:
```ts
import { cardOpening } from '../../openings/view'
import { useOpening } from './useOpening'
```
- `const authored = …` 줄 아래에 추가:
```ts
  const openingTrack = useOpening(plies)
  const opening = openingTrack ? cardOpening(openingTrack, plies, ply) : null
```
- `<JudgmentCard … comment={comment}` 다음 줄에 `opening={opening}`을 추가한다.

- [ ] **Step 8: 뷰어 테스트 추가(실제 색인과 씨앗 ko.json 사용)**

`src/features/viewer/ViewerPage.test.tsx`의 `describe('ViewerPage', …)` 안 첫 테스트 앞에 추가:
```ts
  it('오프닝 이름을 보여 주고, 이름이 바뀌는 수에 배지와 설명을 붙인다', async () => {
    renderRoute('/game/classic/opera-game')
    const card = await screen.findByRole('region', { name: '이번 수 판정' })
    for (let i = 0; i < 4; i++) fireEvent.keyDown(window, { key: 'ArrowRight' }) // 1.e4 e5 2.Nf3 d6
    expect(await within(card).findByText(/필리도르 디펜스/, {}, { timeout: 3000 })).toBeInTheDocument()
    expect(within(card).getByText('오프닝')).toBeInTheDocument()
    expect(within(card).getByText(/e5 폰을 단단히 받치는/)).toBeInTheDocument()
  })
```

Run: `npx vitest run src/features/viewer`
Expected: PASS(새 테스트 포함). 기존 테스트의 "핵심 장면" 확인도 그대로 통과해야 한다.

- [ ] **Step 9: 타입 확인과 커밋**

Run: `npx tsc --noEmit`
Expected: 오류 없음

```bash
git add src/openings/view.ts src/openings/view.test.ts src/features/viewer/useOpening.ts src/features/viewer/JudgmentCard.tsx src/styles/features/viewer.css.ts src/features/viewer/ViewerPage.tsx src/features/viewer/ViewerPage.test.tsx
git commit -m "feat: 판정 카드에 오프닝 이름·설명·이론 이탈 표시"
```

---

### Task 5: "오프닝" 섹션

**Files:**
- Create: `src/features/viewer/OpeningPanel.tsx`, `src/features/viewer/OpeningPanel.test.tsx`
- Modify: `src/openings/view.ts`, `src/openings/view.test.ts`, `src/styles/features/viewer.css.ts`, `src/features/viewer/ViewerPage.tsx`

**Interfaces:**
- Consumes: `OpeningTrack`, `OpeningAt`, `openingLabel`, `sanLineToUci`, `pvToSan`
- Produces:
  - `practiceLine(at: OpeningAt): { san: string[]; uci: string[]; endFen: string }`
  - `compareLine(lineUci: string[], plies: Ply[]): number` (실제 대국과 같은 앞부분 수)
  - `OpeningPanel` props:
    ```ts
    { track: OpeningTrack; plies: Ply[]; ply: number; onPractice: (at: OpeningAt) => void; onBranchAtDeviation: () => void }
    ```

- [ ] **Step 1: 수순 유틸 실패 테스트 추가**

`src/openings/view.test.ts` 끝에 추가:
```ts
import { compareLine, practiceLine } from './view'

describe('practiceLine', () => {
  it('한국어 대표 수순이 있으면 그것을, 없으면 색인 수순을 쓴다', () => {
    const najdorf = practiceLine(track.byPly[10]!)
    expect(najdorf.san).toEqual(['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'])
    expect(najdorf.endFen).toBe(plies[10].fen)
    const sicilian = practiceLine(track.byPly[2]!)
    expect(sicilian.uci).toEqual(['e2e4', 'c7c5'])
  })
})

describe('compareLine', () => {
  it('실제 대국과 같은 앞부분 수를 센다', () => {
    const line = practiceLine(track.byPly[10]!).uci
    expect(compareLine(line, plies)).toBe(10)
    expect(compareLine([...line, 'c1e3'], plies)).toBe(10)
    expect(compareLine(['d2d4'], plies)).toBe(0)
  })
})
```
(파일 위쪽 import에 `compareLine, practiceLine`을 합쳐도 된다.)

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/openings/view.test.ts`
Expected: FAIL (`practiceLine` 없음)

- [ ] **Step 3: 구현**

`src/openings/view.ts`에 추가:
```ts
import { DEFAULT_POSITION } from 'chess.js'
import { sanLineToUci } from './line'

/** 연습에 쓸 대표 수순: 한국어 데이터의 line, 없으면 색인의 수순 */
export function practiceLine(at: OpeningAt): { san: string[]; uci: string[]; endFen: string } {
  const uci = at.variation ? sanLineToUci(at.variation.line).uci : at.entry.uci
  const san = pvToSan(DEFAULT_POSITION, uci, uci.length)
  const { fens } = sanLineToUci(san.join(' '))
  return { san, uci, endFen: fens.at(-1) ?? DEFAULT_POSITION }
}

export function compareLine(lineUci: string[], plies: Ply[]): number {
  let n = 0
  while (n < lineUci.length && plies[n + 1]?.uci === lineUci[n]) n++
  return n
}
```
참고: `Najdorf` 테스트 데이터의 `line`이 `NAJDORF`(5...a6까지)라서 끝 포지션이 `plies[10]`과 같다.

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/openings/view.test.ts`
Expected: PASS

- [ ] **Step 5: 섹션 스타일과 컴포넌트**

`src/styles/features/viewer.css.ts` 끝에 추가:
```ts
export const openingPanel = style({ display: 'grid', gap: space[3] })
export const openingLine = style({ display: 'flex', flexWrap: 'wrap', gap: `${space[1]} ${space[2]}`, fontVariantNumeric: 'tabular-nums' })
export const lineSame = style({ fontWeight: weight.medium, color: vars.color.ink })
export const lineOther = style({ color: vars.color.accent })
export const openingActions = style({ display: 'flex', flexWrap: 'wrap', gap: space[2] })
```

`src/features/viewer/OpeningPanel.tsx`:
```tsx
import { DEFAULT_POSITION } from 'chess.js'
import { moveNumberOf } from '../../chess/moveNumber'
import type { Ply } from '../../chess/types'
import type { OpeningAt, OpeningTrack } from '../../openings/types'
import { compareLine, openingLabel, practiceLine } from '../../openings/view'
import * as v from '../../styles/features/viewer.css'
import { Button } from '../../ui/Button'
import { cx } from '../../ui/cx'

export interface OpeningPanelProps {
  track: OpeningTrack
  plies: Ply[]
  ply: number
  onPractice: (at: OpeningAt) => void
  onBranchAtDeviation: () => void
}

/** 지금 수의 오프닝(0수면 처음 판별된 오프닝)과 대표 수순, 분기 버튼 */
export function OpeningPanel({ track, plies, ply, onPractice, onBranchAtDeviation }: OpeningPanelProps) {
  const at = track.byPly[ply] ?? track.byPly.find((x) => x !== null) ?? null
  if (!at) return <p className={v.detail}>아직 알려진 오프닝 수순에 들어서지 않았어요.</p>
  const line = practiceLine(at)
  const same = compareLine(line.uci, plies)
  return (
    <div className={v.openingPanel}>
      <p className={v.move}>{openingLabel(at)}</p>
      {at.family && (
        <>
          <p>{at.family.idea}</p>
          <p className={v.detail}>백: {at.family.plans.white}</p>
          <p className={v.detail}>흑: {at.family.plans.black}</p>
        </>
      )}
      {at.variation && <p>{at.variation.summary}</p>}
      <p className={v.openingLine} aria-label="대표 수순">
        {line.san.map((san, i) => {
          const { number, white } = moveNumberOf(DEFAULT_POSITION, i + 1)
          return (
            <span key={i} className={cx(i < same ? v.lineSame : v.lineOther)}>
              {white ? `${number}.` : ''}
              {san}
            </span>
          )
        })}
      </p>
      <div className={v.openingActions}>
        <Button size="sm" onClick={() => onPractice(at)}>
          이 수순으로 연습
        </Button>
        {track.deviation && (
          <Button size="sm" tone="secondary" onClick={onBranchAtDeviation}>
            이탈 지점에서 분기
          </Button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: 컴포넌트 테스트**

`src/features/viewer/OpeningPanel.test.tsx`:
```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { pgnToPlies } from '../../chess/pgn'
import { buildIndex } from '../../openings/buildIndex'
import { identifyOpening } from '../../openings/identify'
import type { OpeningData } from '../../openings/types'
import { OpeningPanel } from './OpeningPanel'

afterEach(cleanup)

const NAJDORF = '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6'
const { entries } = buildIndex([
  { eco: 'B20', name: 'Sicilian Defense', pgn: '1. e4 c5' },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation', pgn: NAJDORF },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation, English Attack', pgn: `${NAJDORF} 6. Be3` },
])
const DATA: OpeningData = {
  index: entries,
  ko: {
    families: { 'Sicilian Defense': { name: '시실리안 디펜스', idea: '계열 아이디어예요.', plans: { white: '백 계획이에요.', black: '흑 계획이에요.' } } },
    variations: { 'Sicilian Defense: Najdorf Variation': { name: '나이도르프 변화', summary: '변화 요약이에요.', line: `${NAJDORF} 6. Be3` } },
  },
}

describe('OpeningPanel', () => {
  it('계열·변화 설명과 대표 수순을 보여 주고, 버튼으로 연습과 이탈 분기를 부른다', () => {
    const plies = pgnToPlies(`${NAJDORF} 6. f3 *`)
    const track = identifyOpening(plies, DATA)!
    const onPractice = vi.fn()
    const onBranch = vi.fn()
    render(<OpeningPanel track={track} plies={plies} ply={10} onPractice={onPractice} onBranchAtDeviation={onBranch} />)
    expect(screen.getByText('B90 · 시실리안 디펜스: 나이도르프 변화 · Najdorf Variation')).toBeInTheDocument()
    expect(screen.getByText('계열 아이디어예요.')).toBeInTheDocument()
    expect(screen.getByText('백: 백 계획이에요.')).toBeInTheDocument()
    expect(screen.getByText('변화 요약이에요.')).toBeInTheDocument()
    expect(screen.getByLabelText('대표 수순')).toHaveTextContent('1.e4c52.Nf3d63.d4cxd44.Nxd4Nf65.Nc3a66.Be3')
    fireEvent.click(screen.getByRole('button', { name: '이 수순으로 연습' }))
    expect(onPractice).toHaveBeenCalledWith(track.byPly[10])
    fireEvent.click(screen.getByRole('button', { name: '이탈 지점에서 분기' }))
    expect(onBranch).toHaveBeenCalled()
  })

  it('이론에서 벗어나지 않았으면 이탈 분기 버튼을 숨긴다', () => {
    const plies = pgnToPlies(`${NAJDORF} 6. Be3 *`)
    const track = identifyOpening(plies, DATA)!
    render(<OpeningPanel track={track} plies={plies} ply={11} onPractice={() => {}} onBranchAtDeviation={() => {}} />)
    expect(screen.queryByRole('button', { name: '이탈 지점에서 분기' })).toBeNull()
  })
})
```

Run: `npx vitest run src/features/viewer/OpeningPanel.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 7: 뷰어 배치(데스크톱 섹션과 모바일 기보 시트)**

`src/features/viewer/ViewerPage.tsx`:
- import 추가: `import { OpeningPanel } from './OpeningPanel'`
- 분기 연결은 Task 6에서 하므로, 이 태스크에서는 버튼 콜백을 임시 함수로 두지 않고 Task 6의 함수명을 미리 쓴다. Task 5에서는 다음 두 함수를 `startFork` 정의 아래에 추가해 둔다(Task 6에서 내용이 바뀐다):
```ts
  const practiceOpening = (_at: OpeningAt) => setForking(true)
  const branchAtDeviation = () => {
    if (openingTrack?.deviation) {
      manualSetPly(openingTrack.deviation.ply - 1)
      setForking(true)
    }
  }
```
  (`OpeningAt`는 `import type { OpeningAt } from '../../openings/types'`로 가져온다.)
- `<Disclosure title="엔진 라인" …>` 바로 위에 추가:
```tsx
            {openingTrack && (
              <Disclosure title="오프닝">
                <OpeningPanel track={openingTrack} plies={plies} ply={ply} onPractice={practiceOpening} onBranchAtDeviation={branchAtDeviation} />
              </Disclosure>
            )}
```
- 모바일 기보 시트(`<Dialog variant="sheet" title="기보" …>`) 안 `<MoveList` 위에 추가:
```tsx
          {openingTrack && (
            <Disclosure title="오프닝">
              <OpeningPanel
                track={openingTrack}
                plies={plies}
                ply={ply}
                onPractice={(at) => {
                  setMovesOpen(false)
                  practiceOpening(at)
                }}
                onBranchAtDeviation={() => {
                  setMovesOpen(false)
                  branchAtDeviation()
                }}
              />
            </Disclosure>
          )}
```
- 퀴즈 중에는 이 패널 영역 전체가 `ActiveQuiz`로 바뀌므로 따로 비활성화하지 않아도 된다(스펙 6절). Step 8의 테스트로 확인한다.

- [ ] **Step 8: 뷰어 테스트 추가**

`src/features/viewer/ViewerPage.test.tsx`에 추가:
```ts
  it('오프닝 섹션을 펼치면 계열 설명과 연습 버튼이 보인다', async () => {
    renderRoute('/game/classic/opera-game')
    await screen.findByRole('heading', { name: /Paul Morphy/ })
    for (let i = 0; i < 4; i++) fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.click(await screen.findByRole('button', { name: '오프닝' }, { timeout: 3000 }))
    expect(screen.getByText(/공간은 좁지만 쉽게 무너지지 않는/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '이 수순으로 연습' })).toBeInTheDocument()
  })
```

Run: `npx vitest run src/features/viewer`
Expected: PASS

- [ ] **Step 9: 타입 확인과 커밋**

Run: `npx tsc --noEmit`
Expected: 오류 없음

```bash
git add src/openings/view.ts src/openings/view.test.ts src/features/viewer/OpeningPanel.tsx src/features/viewer/OpeningPanel.test.tsx src/styles/features/viewer.css.ts src/features/viewer/ViewerPage.tsx src/features/viewer/ViewerPage.test.tsx
git commit -m "feat: 오프닝 섹션(계열 설명, 대표 수순 비교, 분기 버튼)"
```

---

### Task 6: 분기 연결

**Files:**
- Modify: `src/features/play/ForkDialog.tsx`, `src/features/viewer/ViewerPage.tsx`, `src/features/viewer/ViewerPage.test.tsx`

**Interfaces:**
- Consumes: `practiceLine`, `openingLabel`, `OpeningAt`, `OpeningTrack`, `createFork`
- Produces:
  - `ForkDialogProps`에 `title?: string`(기본 "여기서 분기해서 두기"), `note?: string`
  - ViewerPage 내부 `interface ForkTarget { startFen: string; originPly: number; title: string; dialogTitle?: string; note?: string }`

- [ ] **Step 1: 실패 테스트 작성**

`src/features/viewer/ViewerPage.test.tsx`에 추가:
```ts
  it('이 수순으로 연습: 대표 수순 끝 포지션에서 분기한다', async () => {
    const { router, store } = renderRoute('/game/classic/opera-game')
    await screen.findByRole('heading', { name: /Paul Morphy/ })
    for (let i = 0; i < 4; i++) fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.click(await screen.findByRole('button', { name: '오프닝' }, { timeout: 3000 }))
    fireEvent.click(screen.getByRole('button', { name: '이 수순으로 연습' }))
    const dialog = screen.getByRole('dialog', { name: '이 수순으로 연습하기' })
    expect(within(dialog).getByText(/^대표 수순: 1\.e4 e5 2\.Nf3 d6/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: '시작' }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/play\//))
    const [fork] = await store.forks.list()
    expect(fork.title).toMatch(/필리도르 디펜스.* 연습$/)
    expect(fork.startFen).toBe('rnbqkbnr/ppp2ppp/3p4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3')
  })

  it('이탈 지점에서 분기: 이론을 벗어나기 직전 포지션에서 이론 수를 안내한다', async () => {
    const { store } = renderRoute('/game/classic/opera-game')
    await screen.findByRole('heading', { name: /Paul Morphy/ })
    fireEvent.click(await screen.findByRole('button', { name: '오프닝' }, { timeout: 3000 }))
    fireEvent.click(screen.getByRole('button', { name: '이탈 지점에서 분기' }))
    const dialog = screen.getByRole('dialog', { name: '여기서 분기해서 두기' })
    expect(within(dialog).getByText(/^이론 수: /)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: '시작' }))
    await waitFor(async () => expect(await store.forks.list()).toHaveLength(1))
    const [fork] = await store.forks.list()
    expect(fork.title).toMatch(/수째에서 분기$/)
  })
```

참고: 두 번째 테스트는 오페라 게임에 이론 이탈이 있다고 가정한다. 실제 색인에서 이탈이 없으면(오페라 게임 수순이 끝까지 색인에 있으면) 이탈이 있는 다른 명경기 경로로 바꾼다. `npx tsx -e`로 `identifyOpening`을 돌려 `deviation`을 먼저 확인한다.

첫 테스트의 `startFen`은 필리도르 디펜스 색인 수순(`1. e4 e5 2. Nf3 d6`) 끝 포지션이다. 씨앗 `ko.json`에 필리도르 변화가 없으므로 색인 수순을 쓴다. 오페라 게임이 마지막으로 색인에 맞는 수가 4수가 아니면(예: `3. d4 Bg4`까지 이름이 있으면) 4수에서 보는 오프닝은 여전히 4수에 맞은 항목이므로 결과가 같다.

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/features/viewer/ViewerPage.test.tsx`
Expected: FAIL (대화상자 이름 "이 수순으로 연습하기" 없음)

- [ ] **Step 3: ForkDialog에 title·note 추가**

`src/features/play/ForkDialog.tsx`:
```tsx
export interface ForkDialogProps {
  defaultColor: Color
  onConfirm: (options: { playerColor: Color; engineElo: number }) => void
  onCancel: () => void
  pending?: boolean
  error?: boolean
  /** 기본: "여기서 분기해서 두기" */
  title?: string
  /** 대화상자 위쪽 안내 한 줄 */
  note?: string
}

export function ForkDialog({ defaultColor, onConfirm, onCancel, pending = false, error = false, title = '여기서 분기해서 두기', note }: ForkDialogProps) {
```
- `<Dialog title="여기서 분기해서 두기"`를 `<Dialog title={title}`로 바꾼다.
- `<div className={s.dialogBody}>` 바로 안쪽 첫 줄에 `{note && <p>{note}</p>}`를 넣는다.

- [ ] **Step 4: 뷰어의 분기 대상을 일반화**

`src/features/viewer/ViewerPage.tsx`:
- `const [forking, setForking] = useState(false)`를 다음으로 바꾼다:
```ts
  const [forkTarget, setForkTarget] = useState<ForkTarget | null>(null)
  const forking = forkTarget !== null
```
- 파일 아래쪽(컴포넌트 밖)에 타입 추가:
```ts
interface ForkTarget {
  startFen: string
  originPly: number
  /** 분기 레코드 제목 */
  title: string
  dialogTitle?: string
  note?: string
}
```
- `startFork`를 다음으로 바꾼다:
```ts
  const startFork = async ({ playerColor, engineElo }: { playerColor: Color; engineElo: number }) => {
    if (forkBusy.current || !forkTarget) return
    const fork = createFork({ origin: gameRef, originPly: forkTarget.originPly, startFen: forkTarget.startFen, playerColor, engineElo, title: forkTarget.title })
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
  const forkHere = (at: number, note?: string): ForkTarget => ({
    startFen: plies[at].fen,
    originPly: at,
    title: `${record.white.name} vs ${record.black.name} · ${moveNumberOf(plies[0].fen, at).number}수째에서 분기`,
    note,
  })
  const practiceOpening = (at: OpeningAt) => {
    const line = practiceLine(at)
    const sans = line.san.map((san, i) => (i % 2 === 0 ? `${i / 2 + 1}.${san}` : san)).join(' ')
    setForkTarget({
      startFen: line.endFen,
      originPly: at.ply,
      title: `${openingLabel(at).split(' · ').slice(1).join(' · ')} 연습`,
      dialogTitle: '이 수순으로 연습하기',
      note: `대표 수순: ${sans}`,
    })
  }
  const branchAtDeviation = () => {
    const dev = openingTrack?.deviation
    if (!dev) return
    const at = dev.ply - 1
    const { number, white } = moveNumberOf(plies[0].fen, dev.ply)
    const theory = dev.theory.map((u) => `${number}${white ? '.' : '...'}${pvToSan(plies[at].fen, [u], 1)[0]}`).join(' 또는 ')
    manualSetPly(at)
    setForkTarget(forkHere(at, `이론 수: ${theory}`))
  }
```
  (Task 5에서 넣은 임시 `practiceOpening`/`branchAtDeviation`은 지운다. import에 `practiceLine`, `openingLabel`(`../../openings/view`), `pvToSan`(`../../chess/pgn`)을 추가한다. `pvToSan`이 이미 import돼 있으면 그대로 쓴다.)
- 기존 `setForking(true)`(ViewerControls `onFork`)는 `setForkTarget(forkHere(ply))`로, `setForking(false)`는 `setForkTarget(null)`로 바꾼다.
- `<ForkDialog …>`에 prop 추가:
```tsx
          title={forkTarget.dialogTitle}
          note={forkTarget.note}
          defaultColor={turnOf(forkTarget.startFen) === 'w' ? 'white' : 'black'}
```
  (`{forking && (` 조건을 `{forkTarget && (`로 바꾸고, 기존 `defaultColor` 줄은 위 줄로 대체한다.)

참고: `openingLabel(at).split(' · ').slice(1).join(' · ')`는 ECO 코드를 뺀 이름이다(예: "필리도르 디펜스" 또는 "시실리안 디펜스: 나이도르프 변화 · Najdorf Variation").

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/features/viewer src/features/play`
Expected: PASS. 기존 "여기서 분기하면 분기 레코드를 만들고…" 테스트도 통과해야 한다(`originPly: 4`).

- [ ] **Step 6: 타입 확인과 커밋**

Run: `npx tsc --noEmit`
Expected: 오류 없음

```bash
git add src/features/play/ForkDialog.tsx src/features/viewer/ViewerPage.tsx src/features/viewer/ViewerPage.test.tsx
git commit -m "feat: 오프닝 대표 수순과 이론 이탈 지점에서 분기"
```

---

### Task 7: 설명 대상 선정 목록

**Files:**
- Create: `scripts/openings/select.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `buildIndex` 결과(`src/data/openings/index.json`), `identifyOpening`, `pgnToPlies`, `src/data/classics.json`

- [ ] **Step 1: 스크립트 작성**

`scripts/openings/select.ts`:
```ts
import { readFileSync, writeFileSync } from 'node:fs'
import { pgnToPlies } from '../../src/chess/pgn'
import { identifyOpening } from '../../src/openings/identify'
import type { OpeningEntry } from '../../src/openings/types'

const index = JSON.parse(readFileSync('src/data/openings/index.json', 'utf8')) as OpeningEntry[]
const classics = JSON.parse(readFileSync('src/data/classics.json', 'utf8')) as { slug: string; pgn: string }[]
const data = { index, ko: { families: {}, variations: {} } }

// 1) 명경기 30판이 지나간 이름(계열 이름 제외, 콤마 앞까지를 변화 키로 본다)
const fromClassics = new Map<string, string[]>()
for (const c of classics) {
  const track = identifyOpening(pgnToPlies(c.pgn), data)
  for (const at of new Set(track?.byPly.filter(Boolean).map((a) => a!.entry.name))) {
    const key = at.split(',')[0]
    if (!key.includes(':')) continue
    fromClassics.set(key, [...(fromClassics.get(key) ?? []), c.slug])
  }
}

// 2) 계열별 이름 수(많이 갈라진 계열일수록 주요 계열일 가능성이 크다)
const families = new Map<string, Set<string>>()
for (const e of index) {
  const [fam, rest] = e.name.split(':')
  if (!rest) continue
  const key = `${fam}:${rest.split(',')[0]}`
  families.set(fam, (families.get(fam) ?? new Set()).add(key))
}
const ranked = [...families.entries()].sort((a, b) => b[1].size - a[1].size)

const lines = ['# 오프닝 설명 대상 후보', '', '## 명경기가 지나간 변화', '']
for (const [k, slugs] of [...fromClassics.entries()].sort()) lines.push(`- ${k} — ${[...new Set(slugs)].join(', ')}`)
lines.push('', '## 계열(변화 이름 수 많은 순, 상위 60)', '')
for (const [fam, vars] of ranked.slice(0, 60)) lines.push(`- ${fam} (${vars.size}) — ${[...vars].slice(0, 12).map((v) => v.split(':')[1].trim()).join(' / ')}`)
writeFileSync(process.argv[2] ?? 'opening-candidates.md', lines.join('\n') + '\n')
console.log(`명경기 변화 ${fromClassics.size}개, 계열 ${ranked.length}개`)
```

`package.json` scripts에 추가:
```json
"openings:select": "tsx scripts/openings/select.ts",
```

- [ ] **Step 2: 실행**

Run: `npm run openings:select -- <scratchpad>/opening-candidates.md`
Expected: `명경기 변화 N개, 계열 M개`가 출력되고 후보 파일이 생긴다(후보 파일은 커밋하지 않는다).

- [ ] **Step 3: 선정 목록 만들기와 사용자 확인 (멈춤 지점)**

후보 파일을 바탕으로 계열 40개와 변화 150개를 고른다. 기준:
1. 명경기 변화는 모두 포함한다.
2. 계열은 입문자가 실전에서 만나는 순서를 우선한다(예: 이탈리안, 루이 로페스, 시실리안, 프렌치, 카로칸, 퀸스 갬빗, 킹스 인디언, 슬라브, 님조인디언, 잉글리시 …).
3. 계열마다 대표 변화 3~4개를 고르고, 각 이름이 `index.json`에 실제로 있는지 확인한다.

목록(계열 40줄 + 변화 150줄, 원문 이름 그대로)을 사용자에게 보여 주고 **확정을 받은 뒤** Task 8로 넘어간다.

- [ ] **Step 4: 커밋**

```bash
git add scripts/openings/select.ts package.json
git commit -m "chore: 오프닝 설명 대상 후보 목록 스크립트"
```

---

### Task 8: 한국어 설명 작성 (4묶음)

**Files:**
- Modify: `src/data/openings/ko.json`, (마지막 묶음) `src/data/openings/openings.test.ts`

확정한 목록을 계열 10개씩 4묶음으로 나눈다. 묶음마다 아래 단계를 반복한다.

- [ ] **Step 1: 묶음 작성**

`ko.json`에 이 묶음의 계열과 그 변화들을 추가한다. 형식은 Task 2 Step 1과 같다.
- 계열 `idea` 1~2문장, `plans.white`·`plans.black` 각 1문장. 변화 `summary` 1~2문장, `line` 8~16수(한 수 = 백·흑 한 쌍).
- 문장은 60자 이하로 쓰고, 문체 기준(해요체, "엔진"·평가 숫자 금지)을 따른다. 묶음 안에서 같은 문장 틀("~하는 오프닝이에요", "~를 노려요")을 세 번 넘게 쓰지 않는다.
- 수 표기는 SAN, 대안 수는 수 번호를 붙인다(`3...Nf6`).

- [ ] **Step 2: 검증**

Run: `npx vitest run src/data/openings`
Expected: PASS. 실패하면 오류 문장대로 고친다(색인에 없는 이름이면 `grep -P '\t<이름>\t' scripts/openings/source/*.tsv`로 정확한 표기를 찾는다).

- [ ] **Step 3: 체스 사실 검토**

검토 에이전트(general-purpose)에게 이 묶음의 텍스트를 넘겨 다음을 확인하게 한다:
- `line`의 각 포지션을 chess.js로 재생해 "X가 Y를 노려요/막아요/받쳐요" 같은 주장이 맞는지(가로막는 기물 포함)
- 반복 틀, 60자 초과, 출판물 문장과 비슷한 표현

에이전트 보고를 판에서 직접 확인한 뒤 반영한다.

- [ ] **Step 4: 커밋**

```bash
git add src/data/openings/ko.json
git commit -m "feat: 오프닝 설명 N묶음(<계열 원문 이름 목록>)"
```

- [ ] **Step 5: 마지막 묶음 뒤 검증 옵션 제거**

4묶음이 끝나면 `openings.test.ts` 첫 테스트의 주석과 `{ requireVariations: false }` 옵션을 지우고, 계열마다 변화가 있는지 검사한다.
```ts
    expect(validateKoOpenings(ko as KoOpenings, INDEX)).toEqual([])
```
Run: `npx vitest run src/data/openings`
Expected: PASS

```bash
git add src/data/openings/openings.test.ts
git commit -m "test: 모든 오프닝 계열에 변화 설명이 있는지 검사"
```

---

### Task 9: E2E와 전체 확인

**Files:**
- Create: `e2e/opening.spec.ts`

- [ ] **Step 1: E2E 작성**

`e2e/opening.spec.ts`:
```ts
import { expect, test } from '@playwright/test'

test('오페라 게임: 오프닝 이름이 보이고, 대표 수순으로 연습을 시작한다', async ({ page }) => {
  await page.goto('/game/classic/opera-game')
  const card = page.locator('section[aria-label="이번 수 판정"]')
  await expect(card).toBeVisible()
  await page.keyboard.press('Home')
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight') // 1.e4 e5 2.Nf3 d6
  await expect(card).toContainText('필리도르 디펜스', { timeout: 10_000 })
  await expect(card).toContainText('오프닝')

  await page.getByRole('button', { name: '오프닝', exact: true }).click()
  await page.getByRole('button', { name: '이 수순으로 연습' }).click()
  const dialog = page.getByRole('dialog', { name: '이 수순으로 연습하기' })
  await expect(dialog).toContainText('대표 수순: 1.e4 e5 2.Nf3 d6')
  await dialog.getByRole('button', { name: '시작' }).click()
  await expect(page).toHaveURL(/\/play\//)
})

test.describe('모바일', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })

  test('기보 시트의 오프닝 섹션을 펼쳐도 가로 스크롤이 생기지 않는다', async ({ page }) => {
    await page.goto('/game/classic/opera-game')
    const bar = page.getByRole('group', { name: '수 이동' })
    for (let i = 0; i < 4; i++) await bar.getByRole('button', { name: '다음 수' }).click()
    await bar.getByRole('button', { name: /\d+ \/ \d+/ }).click() // 가운데 카운터로 기보 시트 열기
    await page.getByRole('dialog', { name: '기보' }).getByRole('button', { name: '오프닝', exact: true }).click()
    await expect(page.getByRole('button', { name: '이 수순으로 연습' })).toBeVisible()
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
    expect(m.sw).toBeLessThanOrEqual(m.cw)
  })
})
```
참고: 가운데 카운터 버튼의 접근 가능한 이름은 `ViewerControls.tsx`에서 확인하고 다르면 맞춘다(`grep -n "onOpenMoves" -A 8 src/features/viewer/ViewerControls.tsx`).

- [ ] **Step 2: E2E 실행**

Run: `npx playwright test e2e/opening.spec.ts --reporter=line`
Expected: 2 passed

- [ ] **Step 3: 전체 확인**

다음을 하나씩 실행한다(파이프로 잇지 않는다):
```bash
npm test
npx tsc --noEmit
npm run build
npm run e2e
```
Expected: 모두 통과, 빌드 경고 없음

번들 확인:
```bash
ls dist/assets | grep -iE "index-|ko-|openings" 
grep -l "Najdorf" dist/assets/index-*.js || echo "초기 청크에 오프닝 데이터 없음"
```
Expected: 오프닝 색인이 별도 청크에 있고 "초기 청크에 오프닝 데이터 없음"이 출력된다.

- [ ] **Step 4: 커밋**

```bash
git add e2e/opening.spec.ts
git commit -m "test(e2e): 오프닝 이름 표시와 대표 수순 연습 분기"
```
