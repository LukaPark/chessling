# Chessling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chess.com / Lichess 유저 대국, Lichess 브로드캐스트 대회, 역사적 명국을 보고, 브라우저 내 Stockfish로 실시간 분석·전체 리뷰를 하며, 임의의 수에서 분기해 엔진과 이어 둘 수 있는 정적 웹 앱 "Chessling"을 만든다.

**Architecture:** Vite + React + TypeScript 정적 SPA. React에 의존하지 않는 순수 모듈(`chess/`, `engine/classify`, `sources/` 파서)을 먼저 TDD로 만들고, 그 위에 Web Worker 기반 `UciEngine`과 IndexedDB 저장소를 올린 뒤, 마지막에 화면(`features/`)을 조립한다. 서버·DB 없음. Vercel 정적 배포.

**Tech Stack:** React 19, React Router 7 (`react-router`), TanStack Query 5, chessground 9 (GPL-3), chess.js 1.4, stockfish 19 (lite WASM), Dexie 4, Vitest 5 + Testing Library + MSW 3 + fake-indexeddb, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-30-chessling-design.md`

## Global Constraints

- 라이선스: 저장소 전체 `GPL-3.0-or-later`. `LICENSE` 파일에 GPL-3 전문.
- 엔진: `stockfish@19.0.0`의 **lite 빌드만** 사용. `crossOriginIsolated === true`면 `/engine/stockfish-19-lite.js`, 아니면 `/engine/stockfish-19-lite-single.js`. 풀 NNUE 빌드(≈94MB) 금지.
- 엔진 Elo 범위: `ELO_MIN = 1320`, `ELO_MAX = 3190`, 기본 `DEFAULT_ELO = 1800`.
- 헤더: `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: credentialless` (dev/preview/Vercel 모두).
- 오늘의 명국 기준 시간대: `Asia/Seoul`.
- Lichess 429 → 자동 재시도 없이 **60초** 대기 후 재시도 버튼 활성화. Chess.com 아카이브는 **순차 요청만**.
- 표준 체스만 지원. 변형 체스는 목록에 "지원하지 않음"으로 표시하고 클릭 불가.
- 분기 대국의 폰 승진은 항상 퀸.
- `classics.json`의 PGN에는 주석·해설·변화수·NAG 금지. `summaryKo`는 직접 작성한 한국어.
- CI/단위 테스트에서 실제 외부 API 호출 금지 (MSW 또는 Playwright `page.route`로 모킹).
- 의존 방향: `features → components / sources / engine / storage → chess`. `storage`는 `engine/review`의 **타입만** import 허용.
- UI 문구는 한국어.
- 모든 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` 트레일러.
- Node 20 이상.

---

## File Structure

```
chessling/
├─ LICENSE                         # GPL-3 전문
├─ README.md
├─ package.json / tsconfig.json / vite.config.ts / playwright.config.ts
├─ vercel.json                     # SPA fallback + COOP/COEP
├─ index.html
├─ scripts/
│  ├─ copy-engine.mjs              # node_modules/stockfish/bin → public/engine (postinstall)
│  ├─ engine-smoke.mjs             # 실제 Stockfish 메이트 인 1 스모크
│  └─ add-classic.ts               # PGN → classics.json 항목 추가(주석 제거·검증)
├─ public/engine/                  # (gitignore) 복사된 lite 엔진
├─ e2e/                            # Playwright
│  ├─ helpers.ts / fixtures.ts
│  ├─ review.spec.ts / fork.spec.ts / isolation.spec.ts
└─ src/
   ├─ main.tsx                     # openStore → 라우터 렌더
   ├─ styles.css
   ├─ vite-env.d.ts
   ├─ test/                        # setup.ts, msw.ts, renderRoute.tsx
   ├─ app/                         # App 조립: providers, routes, Layout, queryClient, download
   ├─ chess/                       # 순수 도메인
   │  ├─ types.ts                  # Color, Turn, Result, Speed, Player, GameSummary, GameRecord, Ply
   │  ├─ gameRef.ts                # GameRef ↔ URL, refKey
   │  ├─ pgn.ts                    # PGN → Ply[], 헤더, pvToSan, 주석 제거
   │  ├─ daily.ts                  # 오늘의 명국 인덱스
   │  └─ fork.ts                   # 분기 대국 상태 전이(순수)
   ├─ engine/
   │  ├─ classify.ts               # 승률, 등급, 정확도, 점수 포맷(순수)
   │  ├─ uci.ts                    # UCI 출력 파서(순수)
   │  ├─ UciEngine.ts              # Worker 래퍼 (latest-wins 큐, 크래시 재시도)
   │  ├─ review.ts                 # 전체 대국 리뷰
   │  ├─ engines.ts                # 빌드 선택 + 싱글턴
   │  └─ testing/fakeWorker.ts     # 테스트용 가짜 Stockfish
   ├─ sources/
   │  ├─ http.ts / ndjson.ts
   │  ├─ lichess.ts / chesscom.ts / broadcast.ts / classics.ts
   │  └─ index.ts                  # getGame(ref, queryClient), queryKeys
   ├─ storage/db.ts                # Dexie + 메모리 폴백
   ├─ data/classics.json
   ├─ components/                  # Board, EvalBar, MoveList, EngineLines, EvalGraph, ErrorView, Banner
   └─ features/
      ├─ home/ licenses/ NotFound.tsx
      ├─ viewer/                   # ViewerPage, useGame, useLiveAnalysis, useReview, ReviewPanel, GameHeader
      ├─ player/                   # PlayerPage, filters, GameList, useLichessGames
      ├─ events/                   # EventsPage, EventDetailPage
      ├─ classics/ClassicsPage.tsx
      ├─ play/                     # PlayPage, ForkDialog, EloSlider
      └─ forks/ForksPage.tsx
```

## Milestones

- **A. 기반 (Task 1–15):** 스캐폴드와 순수 로직, 엔진, 소스 어댑터, 저장소. UI 없이 `npm test`로 모두 검증한다.
- **B. 화면 (Task 16–22):** 앱 셸 → 보드 컴포넌트 → 뷰어 → 리뷰 → 유저 대국 목록 → 대회·명국 → 분기 대국. 각 태스크가 끝나면 `npm run dev`로 해당 화면을 직접 써 볼 수 있다.
- **C. 마무리 (Task 23–25):** E2E, 명국 30판 큐레이션, 배포.

---

### Task 1: 프로젝트 스캐폴드

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `vercel.json`, `LICENSE`, `scripts/copy-engine.mjs`, `src/main.tsx`, `src/vite-env.d.ts`, `src/test/setup.ts`

**Interfaces:**
- Produces: `npm run dev|build|test|preview|engine:copy` 스크립트, `public/engine/stockfish-19-lite{,-single}.{js,wasm}`, `public/engine/COPYING.txt`

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "chessling",
  "private": true,
  "version": "0.1.0",
  "license": "GPL-3.0-or-later",
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "engine:copy": "node scripts/copy-engine.mjs",
    "engine:smoke": "node scripts/engine-smoke.mjs",
    "postinstall": "node scripts/copy-engine.mjs"
  }
}
```

- [ ] **Step 2: 엔진 복사 스크립트 작성** (`scripts/copy-engine.mjs`)

```js
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const SRC = 'node_modules/stockfish/bin'
const DEST = 'public/engine'
const FILES = [
  'stockfish-19-lite.js',
  'stockfish-19-lite.wasm',
  'stockfish-19-lite-single.js',
  'stockfish-19-lite-single.wasm',
]

if (!existsSync(SRC)) {
  console.warn('[copy-engine] stockfish가 아직 설치되지 않아 건너뜁니다')
  process.exit(0)
}
mkdirSync(DEST, { recursive: true })
for (const file of FILES) copyFileSync(join(SRC, file), join(DEST, file))
const license = 'node_modules/stockfish/Copying.txt'
if (existsSync(license)) copyFileSync(license, join(DEST, 'COPYING.txt'))
console.log(`[copy-engine] ${FILES.length}개 파일을 ${DEST}에 복사했습니다`)
```

- [ ] **Step 3: 의존성 설치**

```bash
npm i react react-dom react-router @tanstack/react-query chessground chess.js dexie stockfish@19.0.0
npm i -D typescript vite @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom msw fake-indexeddb @playwright/test @types/react @types/react-dom @types/node tsx
```
Expected: 설치가 끝날 때 `[copy-engine] 4개 파일을 public/engine에 복사했습니다` 출력.

- [ ] **Step 4: 설정 파일 작성**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "scripts", "e2e", "vite.config.ts", "playwright.config.ts"]
}
```

`vite.config.ts`:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
}

export default defineConfig({
  plugins: [react()],
  build: { target: 'es2022' },
  server: { headers: isolationHeaders },
  preview: { headers: isolationHeaders },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
})
```

`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
```

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SOURCE_URL?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

`index.html`:
```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Chessling</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx` (Task 16에서 교체):
```tsx
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')!).render(<h1>Chessling</h1>)
```

`.gitignore`:
```
node_modules
dist
public/engine
test-results
playwright-report
.vercel
```

`vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "credentialless" }
      ]
    },
    {
      "source": "/engine/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```
(Vercel은 실제 파일이 있으면 rewrite보다 파일을 먼저 서빙하므로 `/engine/*`, `/assets/*`는 그대로 나간다.)

- [ ] **Step 5: LICENSE 받기**

```bash
curl -sL https://www.gnu.org/licenses/gpl-3.0.txt -o LICENSE && head -3 LICENSE
```
Expected: `GNU GENERAL PUBLIC LICENSE` / `Version 3, 29 June 2007`

- [ ] **Step 6: 빌드와 헤더 확인**

```bash
npm run build && ls public/engine dist
```
Expected: 빌드 성공. `public/engine`에 js/wasm 4개와 `COPYING.txt`가 있고, `dist/engine`에도 복사돼 있음.

```bash
npx vite preview --port 4173 --strictPort & sleep 3; curl -sI http://localhost:4173/ | grep -i cross-origin; kill %1
```
Expected: `cross-origin-opener-policy: same-origin`, `cross-origin-embedder-policy: credentialless`

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "chore: Vite + React + TS 스캐폴드, lite Stockfish 복사, Vercel 헤더" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 도메인 타입과 GameRef

**Files:**
- Create: `src/chess/types.ts`, `src/chess/gameRef.ts`
- Test: `src/chess/gameRef.test.ts`

**Interfaces:**
- Produces:
  - `type Color = 'white' | 'black'`, `type Turn = 'w' | 'b'`, `type Result = '1-0' | '0-1' | '1/2-1/2' | '*'`
  - `type Speed = 'ultraBullet' | 'bullet' | 'blitz' | 'rapid' | 'classical' | 'daily' | 'correspondence' | 'unknown'`
  - `interface Player { name: string; rating?: number; title?: string }`
  - `interface GameSummary { ref: GameRef; white: Player; black: Player; result: Result; date: string; speed: Speed; timeControl?: string; variant: 'standard' | 'other'; event?: string }`
  - `interface GameRecord extends GameSummary { pgn: string }`
  - `interface Ply { san: string | null; uci: string | null; fen: string }`
  - `type GameRef` (판별 유니온), `refToPath(ref): string`, `pathToRef(path): GameRef | null`, `refKey(ref): string`

- [ ] **Step 1: 실패하는 테스트 작성** (`src/chess/gameRef.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import { pathToRef, refKey, refToPath, type GameRef } from './gameRef'

const cases: GameRef[] = [
  { kind: 'lichess', id: 'abcd1234' },
  { kind: 'chesscom', user: 'hikaru', yyyy: '2026', mm: '09', uuid: 'f78fcfe7-ab95-11f1-8ffd-6cfe54652c60' },
  { kind: 'broadcast', roundId: 'zwtIOEd2', gameId: '3YNrJV1C' },
  { kind: 'classic', slug: 'opera-game' },
]

describe('GameRef', () => {
  it.each(cases)('왕복 변환 %o', (ref) => {
    expect(pathToRef(refToPath(ref))).toEqual(ref)
  })

  it('정해진 경로 형식을 만든다', () => {
    expect(cases.map(refToPath)).toEqual([
      '/game/lichess/abcd1234',
      '/game/chesscom/hikaru/2026/09/f78fcfe7-ab95-11f1-8ffd-6cfe54652c60',
      '/game/broadcast/zwtIOEd2/3YNrJV1C',
      '/game/classic/opera-game',
    ])
  })

  it('잘못된 경로는 null', () => {
    for (const p of [
      '/',
      '/game',
      '/game/lichess',
      '/game/lichess/a/b',
      '/game/chesscom/hikaru/2026/09',
      '/game/chesscom/hikaru/26/09/uuid',
      '/game/unknown/x',
      '/player/lichess/x',
    ]) {
      expect(pathToRef(p)).toBeNull()
    }
  })

  it('끝 슬래시를 허용한다', () => {
    expect(pathToRef('/game/classic/opera-game/')).toEqual({ kind: 'classic', slug: 'opera-game' })
  })

  it('chesscom 유저명의 특수문자를 인코딩한다', () => {
    const ref: GameRef = { kind: 'chesscom', user: 'a b', yyyy: '2026', mm: '01', uuid: 'u' }
    expect(refToPath(ref)).toBe('/game/chesscom/a%20b/2026/01/u')
    expect(pathToRef(refToPath(ref))).toEqual(ref)
  })

  it('refKey는 /game/ 접두사가 없는 안정된 키', () => {
    expect(refKey(cases[0])).toBe('lichess/abcd1234')
    expect(refKey(cases[3])).toBe('classic/opera-game')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/chess/gameRef.test.ts`
Expected: FAIL — `Failed to resolve import "./gameRef"`

- [ ] **Step 3: 구현**

`src/chess/gameRef.ts`:
```ts
export type GameRef =
  | { kind: 'lichess'; id: string }
  | { kind: 'chesscom'; user: string; yyyy: string; mm: string; uuid: string }
  | { kind: 'broadcast'; roundId: string; gameId: string }
  | { kind: 'classic'; slug: string }

const enc = encodeURIComponent

export function refToPath(ref: GameRef): string {
  switch (ref.kind) {
    case 'lichess':
      return `/game/lichess/${enc(ref.id)}`
    case 'chesscom':
      return `/game/chesscom/${enc(ref.user)}/${ref.yyyy}/${ref.mm}/${enc(ref.uuid)}`
    case 'broadcast':
      return `/game/broadcast/${enc(ref.roundId)}/${enc(ref.gameId)}`
    case 'classic':
      return `/game/classic/${enc(ref.slug)}`
  }
}

export function pathToRef(path: string): GameRef | null {
  const parts = path.replace(/^\/+|\/+$/g, '').split('/').map(decodeURIComponent)
  if (parts[0] !== 'game') return null
  const [, kind, ...rest] = parts
  switch (kind) {
    case 'lichess':
      return rest.length === 1 && rest[0] ? { kind, id: rest[0] } : null
    case 'chesscom': {
      if (rest.length !== 4) return null
      const [user, yyyy, mm, uuid] = rest
      if (!user || !/^\d{4}$/.test(yyyy) || !/^\d{2}$/.test(mm) || !uuid) return null
      return { kind, user, yyyy, mm, uuid }
    }
    case 'broadcast':
      return rest.length === 2 && rest[0] && rest[1] ? { kind, roundId: rest[0], gameId: rest[1] } : null
    case 'classic':
      return rest.length === 1 && rest[0] ? { kind, slug: rest[0] } : null
    default:
      return null
  }
}

export function refKey(ref: GameRef): string {
  return refToPath(ref).slice('/game/'.length)
}
```

`src/chess/types.ts`:
```ts
import type { GameRef } from './gameRef'

export type Color = 'white' | 'black'
export type Turn = 'w' | 'b'
export type Result = '1-0' | '0-1' | '1/2-1/2' | '*'
export type Speed =
  | 'ultraBullet'
  | 'bullet'
  | 'blitz'
  | 'rapid'
  | 'classical'
  | 'daily'
  | 'correspondence'
  | 'unknown'

export interface Player {
  name: string
  rating?: number
  title?: string
}

export interface GameSummary {
  ref: GameRef
  white: Player
  black: Player
  result: Result
  /** YYYY-MM-DD (명국은 연도만 알 수 있으면 YYYY) */
  date: string
  speed: Speed
  timeControl?: string
  variant: 'standard' | 'other'
  event?: string
}

export interface GameRecord extends GameSummary {
  pgn: string
}

/** 인덱스 0은 시작 포지션(san/uci = null), i번째는 i번째 수를 둔 뒤의 포지션 */
export interface Ply {
  san: string | null
  uci: string | null
  fen: string
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/chess/gameRef.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/chess
git commit -m "feat(chess): 도메인 타입과 GameRef URL 변환" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: PGN 유틸리티

**Files:**
- Create: `src/chess/pgn.ts`
- Test: `src/chess/pgn.test.ts`

**Interfaces:**
- Consumes: `Ply`, `Result`, `Turn` (Task 2)
- Produces:
  - `class PgnError extends Error`
  - `pgnToPlies(pgn: string): Ply[]` (잘못된 PGN이면 `PgnError`)
  - `parseHeaders(pgn: string): Record<string, string>`
  - `normalizeResult(value: string | undefined): Result`
  - `turnOf(fen: string): Turn`
  - `isCheck(fen: string): boolean`
  - `uciToMove(uci: string): { from: string; to: string; promotion?: string }`
  - `pvToSan(fen: string, pv: string[], max?: number): string[]`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { describe, expect, it } from 'vitest'
import { isCheck, normalizeResult, parseHeaders, pgnToPlies, PgnError, pvToSan, turnOf, uciToMove } from './pgn'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const OPERA =
  '[Event "Paris"]\n[White "Paul Morphy"]\n[Black "Duke Karl / Count Isouard"]\n[Result "1-0"]\n\n' +
  '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 ' +
  '10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0'

describe('pgnToPlies', () => {
  it('시작 포지션 + 수마다 한 포지션', () => {
    const plies = pgnToPlies(OPERA)
    expect(plies).toHaveLength(34)
    expect(plies[0]).toEqual({ san: null, uci: null, fen: START })
    expect(plies[1]).toMatchObject({ san: 'e4', uci: 'e2e4' })
    expect(plies[33]).toMatchObject({ san: 'Rd8#', uci: 'd1d8' })
  })

  it('SetUp/FEN과 프로모션', () => {
    const plies = pgnToPlies('[SetUp "1"]\n[FEN "4k3/P7/8/8/8/8/8/4K3 w - - 0 1"]\n\n1. a8=Q+ *')
    expect(plies[0].fen).toBe('4k3/P7/8/8/8/8/8/4K3 w - - 0 1')
    expect(plies[1]).toMatchObject({ san: 'a8=Q+', uci: 'a7a8q' })
  })

  it('캐슬링은 킹 이동 UCI', () => {
    const plies = pgnToPlies('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O *')
    expect(plies.at(-1)?.uci).toBe('e1g1')
  })

  it('결과만 있는 PGN', () => {
    expect(pgnToPlies('[Result "1-0"]\n\n1-0')).toHaveLength(1)
  })

  it('평가·시계 주석이 있어도 읽는다', () => {
    expect(pgnToPlies('1. e4 { [%eval 0.18] [%clk 1:30:47] } 1... c5 { [%eval 0.32] } *')).toHaveLength(3)
  })

  it('불법 수는 PgnError', () => {
    expect(() => pgnToPlies('1. e4 e5 2. Ke3 *')).toThrow(PgnError)
  })
})

describe('parseHeaders / normalizeResult', () => {
  it('헤더를 읽고 이스케이프를 푼다', () => {
    expect(parseHeaders('[Event "A \\"B\\""]\n[Result "0-1"]\n\n1. e4 *')).toEqual({ Event: 'A "B"', Result: '0-1' })
  })
  it('알 수 없는 결과는 *', () => {
    expect(normalizeResult('1-0')).toBe('1-0')
    expect(normalizeResult('1/2-1/2')).toBe('1/2-1/2')
    expect(normalizeResult('?')).toBe('*')
    expect(normalizeResult(undefined)).toBe('*')
  })
})

describe('FEN/UCI 보조 함수', () => {
  it('turnOf', () => {
    expect(turnOf(START)).toBe('w')
    expect(turnOf('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')).toBe('b')
  })
  it('isCheck', () => {
    expect(isCheck(START)).toBe(false)
    expect(isCheck('4k3/8/8/8/8/8/8/R3K3 b - - 0 1')).toBe(false)
    expect(isCheck('R3k3/8/8/8/8/8/8/4K3 b - - 0 1')).toBe(true)
  })
  it('uciToMove', () => {
    expect(uciToMove('e2e4')).toEqual({ from: 'e2', to: 'e4', promotion: undefined })
    expect(uciToMove('a7a8q')).toEqual({ from: 'a7', to: 'a8', promotion: 'q' })
  })
  it('pvToSan은 불법 수에서 멈춘다', () => {
    expect(pvToSan(START, ['e2e4', 'e7e5', 'g1f3'])).toEqual(['e4', 'e5', 'Nf3'])
    expect(pvToSan(START, ['e2e4', 'e2e4', 'g1f3'])).toEqual(['e4'])
    expect(pvToSan(START, ['e2e4', 'e7e5', 'g1f3'], 2)).toEqual(['e4', 'e5'])
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/chess/pgn.test.ts`
Expected: FAIL — `Failed to resolve import "./pgn"`

- [ ] **Step 3: 구현** (`src/chess/pgn.ts`)

```ts
import { Chess } from 'chess.js'
import type { Ply, Result, Turn } from './types'

export class PgnError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PgnError'
  }
}

export function pgnToPlies(pgn: string): Ply[] {
  const chess = new Chess()
  try {
    chess.loadPgn(pgn)
  } catch (e) {
    throw new PgnError(e instanceof Error ? e.message : String(e))
  }
  const history = chess.history({ verbose: true })
  const startFen = history.length > 0 ? history[0].before : chess.fen()
  return [
    { san: null, uci: null, fen: startFen },
    ...history.map((m) => ({ san: m.san, uci: m.lan, fen: m.after })),
  ]
}

const HEADER_LINE = /^\s*\[(\w+)\s+"((?:[^"\\]|\\.)*)"\s*\]\s*$/gm

export function parseHeaders(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const m of pgn.matchAll(HEADER_LINE)) headers[m[1]] = m[2].replace(/\\(.)/g, '$1')
  return headers
}

export function normalizeResult(value: string | undefined): Result {
  return value === '1-0' || value === '0-1' || value === '1/2-1/2' ? value : '*'
}

export function turnOf(fen: string): Turn {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w'
}

export function isCheck(fen: string): boolean {
  return new Chess(fen).inCheck()
}

export function uciToMove(uci: string): { from: string; to: string; promotion?: string } {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined }
}

export function pvToSan(fen: string, pv: string[], max = 8): string[] {
  const chess = new Chess(fen)
  const out: string[] = []
  for (const uci of pv.slice(0, max)) {
    try {
      out.push(chess.move(uciToMove(uci)).san)
    } catch {
      break
    }
  }
  return out
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/chess/pgn.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/chess/pgn.ts src/chess/pgn.test.ts
git commit -m "feat(chess): PGN 파싱과 FEN/UCI 보조 함수" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 오늘의 명국 선택

**Files:**
- Create: `src/chess/daily.ts`
- Test: `src/chess/daily.test.ts`

**Interfaces:**
- Produces: `kstDateString(now: Date): string` (YYYY-MM-DD), `shuffledOrder(n: number, seed?: number): number[]`, `classicOfTheDay<T>(items: readonly T[], now: Date): T`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { describe, expect, it } from 'vitest'
import { classicOfTheDay, kstDateString, shuffledOrder } from './daily'

const items = Array.from({ length: 7 }, (_, i) => `g${i}`)
const range = (n: number) => Array.from({ length: n }, (_, i) => i)

describe('kstDateString', () => {
  it('Asia/Seoul 자정을 경계로 날짜가 바뀐다', () => {
    expect(kstDateString(new Date('2026-09-30T14:59:59Z'))).toBe('2026-09-30')
    expect(kstDateString(new Date('2026-09-30T15:00:00Z'))).toBe('2026-10-01')
  })
})

describe('shuffledOrder', () => {
  it('순열이다', () => {
    expect([...shuffledOrder(100)].sort((a, b) => a - b)).toEqual(range(100))
  })
  it('결정적이다', () => {
    expect(shuffledOrder(50)).toEqual(shuffledOrder(50))
  })
  it('시드가 다르면 순서가 다르다', () => {
    expect(shuffledOrder(50, 1)).not.toEqual(shuffledOrder(50, 2))
  })
})

describe('classicOfTheDay', () => {
  it('같은 KST 날짜면 같은 대국', () => {
    const a = classicOfTheDay(items, new Date('2026-09-30T15:00:00Z'))
    const b = classicOfTheDay(items, new Date('2026-10-01T14:59:00Z'))
    expect(a).toBe(b)
  })
  it('n일 연속이면 모든 대국을 한 번씩 보여준다', () => {
    const seen = new Set(
      range(items.length).map((d) => classicOfTheDay(items, new Date(Date.UTC(2026, 0, 1 + d, 3)))),
    )
    expect(seen.size).toBe(items.length)
  })
  it('빈 컬렉션은 에러', () => {
    expect(() => classicOfTheDay([], new Date())).toThrow()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/chess/daily.test.ts`
Expected: FAIL — import 오류

- [ ] **Step 3: 구현**

```ts
const SEED = 0xc4e551

export function kstDateString(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function shuffledOrder(n: number, seed = SEED): number[] {
  const order = Array.from({ length: n }, (_, i) => i)
  const rand = mulberry32(seed)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

export function classicOfTheDay<T>(items: readonly T[], now: Date): T {
  if (items.length === 0) throw new Error('명국 컬렉션이 비어 있습니다')
  const [y, m, d] = kstDateString(now).split('-').map(Number)
  const day = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
  const order = shuffledOrder(items.length)
  return items[order[((day % items.length) + items.length) % items.length]]
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/chess/daily.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/chess/daily.ts src/chess/daily.test.ts
git commit -m "feat(chess): KST 기준 오늘의 명국 선택" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 승률·등급·정확도 계산

**Files:**
- Create: `src/engine/classify.ts`
- Test: `src/engine/classify.test.ts`

**Interfaces:**
- Consumes: `Turn` (Task 2)
- Produces:
  - `type Score = { cp: number } | { mate: number }` — 별도 표기가 없으면 **백 기준**
  - `type MoveLabel = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'`
  - `MATED_CP = 10000`, `LABEL_THRESHOLDS = { inaccuracy: 5, mistake: 10, blunder: 15 }`
  - `toWhitePov(score: Score, turn: Turn): Score` — UCI(두는 쪽 기준) → 백 기준. `mate 0`(이미 메이트된 포지션)은 `{ cp: ±MATED_CP }`
  - `winPercent(score: Score): number` (0~100, 백 기준)
  - `classifyMove(before: Score, after: Score, mover: Turn, playedUci: string, bestUci: string | null): MoveLabel`
  - `moveAccuracy(winBefore: number, winAfter: number): number` (두는 쪽 기준 승률)
  - `gameAccuracy(scores: Score[], startTurn: Turn): { white: number | null; black: number | null }`
  - `formatScore(score: Score): string`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { describe, expect, it } from 'vitest'
import { classifyMove, formatScore, gameAccuracy, MATED_CP, moveAccuracy, toWhitePov, winPercent } from './classify'

describe('winPercent (Lichess 공식)', () => {
  it('기준값', () => {
    expect(winPercent({ cp: 0 })).toBe(50)
    expect(winPercent({ cp: 1000 })).toBeCloseTo(97.54, 1)
    expect(winPercent({ cp: -100 })).toBeCloseTo(40.9, 1)
  })
  it('±1000cp에서 잘린다', () => {
    expect(winPercent({ cp: 2000 })).toBe(winPercent({ cp: 1000 }))
  })
  it('대칭', () => {
    expect(winPercent({ cp: -300 })).toBeCloseTo(100 - winPercent({ cp: 300 }), 10)
  })
  it('메이트', () => {
    expect(winPercent({ mate: 3 })).toBe(100)
    expect(winPercent({ mate: -2 })).toBe(0)
  })
})

describe('toWhitePov', () => {
  it('흑 차례면 부호를 뒤집는다', () => {
    expect(toWhitePov({ cp: 30 }, 'b')).toEqual({ cp: -30 })
    expect(toWhitePov({ cp: 0 }, 'b')).toEqual({ cp: 0 })
    expect(toWhitePov({ mate: 2 }, 'b')).toEqual({ mate: -2 })
    expect(toWhitePov({ cp: 30 }, 'w')).toEqual({ cp: 30 })
  })
  it('mate 0은 두는 쪽이 진 포지션', () => {
    expect(toWhitePov({ mate: 0 }, 'w')).toEqual({ cp: -MATED_CP })
    expect(toWhitePov({ mate: 0 }, 'b')).toEqual({ cp: MATED_CP })
  })
})

describe('classifyMove', () => {
  const zero = { cp: 0 }
  it('엔진 최선 수와 같으면 best', () => {
    expect(classifyMove(zero, { cp: -500 }, 'w', 'e2e4', 'e2e4')).toBe('best')
  })
  it('백의 승률 하락폭으로 분류', () => {
    expect(classifyMove(zero, { cp: -30 }, 'w', 'a2a3', 'e2e4')).toBe('good') // -2.8
    expect(classifyMove(zero, { cp: -100 }, 'w', 'a2a3', 'e2e4')).toBe('inaccuracy') // -9.1
    expect(classifyMove(zero, { cp: -130 }, 'w', 'a2a3', 'e2e4')).toBe('mistake') // -11.7
    expect(classifyMove(zero, { cp: -200 }, 'w', 'a2a3', 'e2e4')).toBe('blunder') // -17.6
  })
  it('흑은 반대 방향', () => {
    expect(classifyMove(zero, { cp: 200 }, 'b', 'a7a6', 'e7e5')).toBe('blunder')
    expect(classifyMove(zero, { cp: -200 }, 'b', 'a7a6', 'e7e5')).toBe('good')
  })
})

describe('moveAccuracy', () => {
  it('나빠지지 않으면 100', () => {
    expect(moveAccuracy(50, 50)).toBe(100)
    expect(moveAccuracy(60, 70)).toBe(100)
  })
  it('Lichess 공식', () => {
    expect(moveAccuracy(50, 40)).toBeCloseTo(64.58, 1)
  })
})

describe('gameAccuracy', () => {
  it('평가가 변하지 않으면 양쪽 100', () => {
    expect(gameAccuracy(Array(11).fill({ cp: 0 }), 'w')).toEqual({ white: 100, black: 100 })
  })
  it('백만 블런더하면 백이 더 낮다', () => {
    const scores = [0, 0, 0, -500, -500, -500, -500, -500, -500].map((cp) => ({ cp }))
    const acc = gameAccuracy(scores, 'w')
    expect(acc.black).toBe(100)
    expect(acc.white!).toBeLessThan(100)
  })
  it('흑부터 시작하고 한 수뿐이면 백은 null', () => {
    expect(gameAccuracy([{ cp: 0 }, { cp: 0 }], 'b')).toEqual({ white: null, black: 100 })
  })
  it('수가 없으면 null', () => {
    expect(gameAccuracy([{ cp: 0 }], 'w')).toEqual({ white: null, black: null })
  })
})

describe('formatScore', () => {
  it('표기', () => {
    expect(formatScore({ cp: 123 })).toBe('+1.23')
    expect(formatScore({ cp: -50 })).toBe('-0.50')
    expect(formatScore({ cp: 0 })).toBe('0.00')
    expect(formatScore({ mate: 3 })).toBe('M3')
    expect(formatScore({ mate: -2 })).toBe('-M2')
    expect(formatScore({ cp: MATED_CP })).toBe('#')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/engine/classify.test.ts`
Expected: FAIL — import 오류

- [ ] **Step 3: 구현**

```ts
import type { Turn } from '../chess/types'

export type Score = { cp: number } | { mate: number }
export type MoveLabel = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

export const MATED_CP = 10000
/** 두는 쪽 승률(%) 하락폭 기준. Lichess의 winning chances 0.1/0.2/0.3과 같다 */
export const LABEL_THRESHOLDS = { inaccuracy: 5, mistake: 10, blunder: 15 } as const

export function toWhitePov(score: Score, turn: Turn): Score {
  if ('mate' in score) {
    if (score.mate === 0) return { cp: turn === 'w' ? -MATED_CP : MATED_CP }
    return { mate: turn === 'w' ? score.mate : 0 - score.mate }
  }
  return { cp: turn === 'w' ? score.cp : 0 - score.cp }
}

export function winPercent(score: Score): number {
  if ('mate' in score) return score.mate > 0 ? 100 : 0
  const cp = Math.max(-1000, Math.min(1000, score.cp))
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)
}

export function classifyMove(
  before: Score,
  after: Score,
  mover: Turn,
  playedUci: string,
  bestUci: string | null,
): MoveLabel {
  if (bestUci && playedUci === bestUci) return 'best'
  const loss =
    mover === 'w' ? winPercent(before) - winPercent(after) : winPercent(after) - winPercent(before)
  if (loss >= LABEL_THRESHOLDS.blunder) return 'blunder'
  if (loss >= LABEL_THRESHOLDS.mistake) return 'mistake'
  if (loss >= LABEL_THRESHOLDS.inaccuracy) return 'inaccuracy'
  return 'good'
}

export function moveAccuracy(winBefore: number, winAfter: number): number {
  if (winAfter >= winBefore) return 100
  const raw = 103.1668100711649 * Math.exp(-0.04354415386753951 * (winBefore - winAfter)) - 3.166924740191411
  return clamp(raw + 1, 0, 100)
}

/** Lichess 방식: 변동성 가중 평균과 조화 평균의 평균 */
export function gameAccuracy(scores: Score[], startTurn: Turn): { white: number | null; black: number | null } {
  const wins = scores.map(winPercent)
  if (wins.length < 2) return { white: null, black: null }
  const windowSize = clamp(Math.floor(wins.length / 10), 2, 8)
  const windows: number[][] = []
  for (let i = 0; i < windowSize - 2; i++) windows.push(wins.slice(0, windowSize))
  for (let i = 0; i + windowSize <= wins.length; i++) windows.push(wins.slice(i, i + windowSize))
  const weights = windows.map((w) => clamp(stdDev(w), 0.5, 12))

  const acc: Record<'white' | 'black', Array<[number, number]>> = { white: [], black: [] }
  for (let i = 0; i < wins.length - 1; i++) {
    const mover = (i % 2 === 0) === (startTurn === 'w') ? 'white' : 'black'
    const before = mover === 'white' ? wins[i] : 100 - wins[i]
    const after = mover === 'white' ? wins[i + 1] : 100 - wins[i + 1]
    acc[mover].push([moveAccuracy(before, after), weights[i]])
  }
  return { white: summarize(acc.white), black: summarize(acc.black) }
}

export function formatScore(score: Score): string {
  if ('mate' in score) return score.mate > 0 ? `M${score.mate}` : `-M${-score.mate}`
  if (Math.abs(score.cp) >= MATED_CP) return '#'
  const v = (score.cp / 100).toFixed(2)
  return score.cp > 0 ? `+${v}` : v
}

function summarize(xs: Array<[number, number]>): number | null {
  if (xs.length === 0) return null
  const totalWeight = xs.reduce((s, [, w]) => s + w, 0)
  const weighted = xs.reduce((s, [a, w]) => s + a * w, 0) / totalWeight
  // 정확도 0이 섞이면 조화 평균이 0으로 붕괴하므로 1로 하한을 둔다
  const harmonic = xs.length / xs.reduce((s, [a]) => s + 1 / Math.max(a, 1), 0)
  return (weighted + harmonic) / 2
}

function stdDev(xs: number[]): number {
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length
  return Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length)
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/engine/classify.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/engine/classify.ts src/engine/classify.test.ts
git commit -m "feat(engine): Lichess 방식 승률·등급·정확도 계산" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: UCI 파서와 UciEngine

**Files:**
- Create: `src/engine/uci.ts`, `src/engine/UciEngine.ts`, `src/engine/testing/fakeWorker.ts`
- Test: `src/engine/uci.test.ts`, `src/engine/UciEngine.test.ts`

**Interfaces:**
- Consumes: `Score`, `toWhitePov` (Task 5), `turnOf` (Task 3)
- Produces:
  - `parseInfo(line: string): { depth: number; multipv: number; score: Score; pv: string[] } | null` (두는 쪽 기준 점수, bound 줄은 무시)
  - `parseBestMove(line: string): string | null | undefined` (bestmove 줄이 아니면 `undefined`, `(none)`이면 `null`)
  - `interface WorkerLike { postMessage(message: string): void; onmessage: ((ev: { data: unknown }) => void) | null; onerror: ((ev: unknown) => void) | null; terminate(): void }`
  - `type WorkerFactory = () => WorkerLike`
  - `interface EngineLine { depth: number; multipv: number; score: Score /* 백 기준 */; pv: string[] }`
  - `interface SearchResult { lines: EngineLine[]; bestMove: string | null; cancelled: boolean }`
  - `interface AnalyzeOptions { depth?: number; movetime?: number; multiPv?: number; signal?: AbortSignal }`
  - `class EngineCrashedError extends Error`
  - `class UciEngine { constructor(factory: WorkerFactory, baseOptions?: Record<string, string | number>); analyze(fen, opts?, onInfo?): Promise<SearchResult>; bestMove(fen, { movetime, elo?, signal? }): Promise<string | null>; setOptions(o): Promise<void>; stop(): void; dispose(): void }`
  - 동작 규칙: **latest-wins**. 새 `analyze`는 대기 중인 요청을 모두 `cancelled`로 끝내고 실행 중인 탐색에 `stop`을 보낸다. 크래시가 나면 워커를 새로 만들어 현재 작업을 1회 재시도한다.
  - `class FakeWorker implements WorkerLike` (테스트 전용): `new FakeWorker({ info?, bestMove?, holdGoCount?, crashOnGo? })`, `.sent: string[]`, `.terminated`

- [ ] **Step 1: 파서 테스트 작성** (`src/engine/uci.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import { parseBestMove, parseInfo } from './uci'

describe('parseInfo', () => {
  it('cp 점수와 pv', () => {
    expect(parseInfo('info depth 12 seldepth 15 multipv 2 score cp -34 nodes 1000 nps 5000 pv e7e5 g1f3')).toEqual({
      depth: 12,
      multipv: 2,
      score: { cp: -34 },
      pv: ['e7e5', 'g1f3'],
    })
  })
  it('mate 점수, multipv 생략 시 1', () => {
    expect(parseInfo('info depth 8 seldepth 2 score mate 1 nodes 136 pv a1a8')).toEqual({
      depth: 8,
      multipv: 1,
      score: { mate: 1 },
      pv: ['a1a8'],
    })
  })
  it('bound, pv 없음, info string은 무시', () => {
    expect(parseInfo('info depth 5 multipv 1 score cp 10 lowerbound pv e2e4')).toBeNull()
    expect(parseInfo('info depth 5 multipv 1 score cp 10 upperbound pv e2e4')).toBeNull()
    expect(parseInfo('info depth 0 score mate 0')).toBeNull()
    expect(parseInfo('info string NNUE evaluation using nn.bin')).toBeNull()
    expect(parseInfo('readyok')).toBeNull()
  })
})

describe('parseBestMove', () => {
  it('bestmove 줄', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e5')).toBe('e2e4')
    expect(parseBestMove('bestmove (none)')).toBeNull()
    expect(parseBestMove('info depth 1')).toBeUndefined()
  })
})
```

- [ ] **Step 2: 실패 확인 후 파서 구현**

Run: `npx vitest run src/engine/uci.test.ts` → FAIL (import 오류)

`src/engine/uci.ts`:
```ts
import type { Score } from './classify'

export interface RawInfo {
  depth: number
  multipv: number
  /** 두는 쪽 기준 */
  score: Score
  pv: string[]
}

export function parseInfo(line: string): RawInfo | null {
  if (!line.startsWith('info ') || / (lower|upper)bound( |$)/.test(line)) return null
  const t = line.split(/\s+/)
  let depth: number | undefined
  let multipv = 1
  let score: Score | undefined
  let pv: string[] = []
  for (let i = 1; i < t.length; i++) {
    switch (t[i]) {
      case 'depth':
        depth = Number(t[++i])
        break
      case 'multipv':
        multipv = Number(t[++i])
        break
      case 'score': {
        const kind = t[++i]
        const value = Number(t[++i])
        score = kind === 'mate' ? { mate: value } : { cp: value }
        break
      }
      case 'pv':
        pv = t.slice(i + 1)
        i = t.length
        break
    }
  }
  if (depth === undefined || !score || pv.length === 0) return null
  return { depth, multipv, score, pv }
}

export function parseBestMove(line: string): string | null | undefined {
  if (!line.startsWith('bestmove')) return undefined
  const move = line.split(/\s+/)[1]
  return !move || move === '(none)' ? null : move
}
```

Run: `npx vitest run src/engine/uci.test.ts` → PASS

- [ ] **Step 3: 가짜 워커 작성** (`src/engine/testing/fakeWorker.ts`)

```ts
import type { WorkerLike } from '../UciEngine'

export interface FakeEngineScript {
  /** `go`마다 내보낼 info 줄 */
  info?: (fen: string, go: string) => string[]
  /** 기본값 e2e4 */
  bestMove?: (fen: string, go: string) => string
  /** 처음 N번의 `go`는 `stop`이 올 때까지 결과를 내지 않는다 */
  holdGoCount?: number
  /** 이 워커의 N번째 `go`(1부터)에서 onerror를 발생시킨다 */
  crashOnGo?: number
}

export class FakeWorker implements WorkerLike {
  onmessage: ((ev: { data: unknown }) => void) | null = null
  onerror: ((ev: unknown) => void) | null = null
  sent: string[] = []
  terminated = false
  private fen = ''
  private goCount = 0
  private held: (() => void) | null = null

  constructor(private readonly script: FakeEngineScript = {}) {}

  postMessage(cmd: string): void {
    this.sent.push(cmd)
    queueMicrotask(() => this.handle(cmd))
  }

  terminate(): void {
    this.terminated = true
  }

  private emit(line: string) {
    this.onmessage?.({ data: line })
  }

  private handle(cmd: string) {
    if (this.terminated) return
    if (cmd === 'uci') {
      this.emit('id name FakeFish')
      this.emit('uciok')
    } else if (cmd === 'isready') {
      this.emit('readyok')
    } else if (cmd.startsWith('position fen ')) {
      this.fen = cmd.slice('position fen '.length)
    } else if (cmd.startsWith('go')) {
      this.goCount++
      if (this.script.crashOnGo === this.goCount) {
        this.onerror?.(new Error('fake crash'))
        return
      }
      const fen = this.fen
      const finish = () => {
        for (const line of this.script.info?.(fen, cmd) ?? []) this.emit(line)
        this.emit(`bestmove ${this.script.bestMove?.(fen, cmd) ?? 'e2e4'}`)
      }
      if (this.goCount <= (this.script.holdGoCount ?? 0)) this.held = finish
      else finish()
    } else if (cmd === 'stop') {
      const held = this.held
      this.held = null
      held?.()
    }
  }
}
```

- [ ] **Step 4: 엔진 테스트 작성** (`src/engine/UciEngine.test.ts`)

```ts
import { describe, expect, it, vi } from 'vitest'
import { EngineCrashedError, UciEngine } from './UciEngine'
import { FakeWorker, type FakeEngineScript } from './testing/fakeWorker'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

function setup(scriptFor: (index: number) => FakeEngineScript = () => ({}), options = {}) {
  const workers: FakeWorker[] = []
  const engine = new UciEngine(() => {
    const w = new FakeWorker(scriptFor(workers.length))
    workers.push(w)
    return w
  }, options)
  return { engine, workers }
}

describe('UciEngine', () => {
  it('핸드셰이크 후 백 기준 점수로 돌려준다', async () => {
    const { engine, workers } = setup(() => ({
      info: () => ['info depth 12 seldepth 15 multipv 1 score cp 50 nodes 100 pv e7e5 g1f3'],
      bestMove: () => 'e7e5',
    }))
    const r = await engine.analyze(AFTER_E4, { depth: 12 })
    expect(r).toEqual({
      cancelled: false,
      bestMove: 'e7e5',
      lines: [{ depth: 12, multipv: 1, score: { cp: -50 }, pv: ['e7e5', 'g1f3'] }],
    })
    expect(workers[0].sent).toEqual(['uci', 'isready', `position fen ${AFTER_E4}`, 'go depth 12'])
  })

  it('기본 옵션은 uci와 isready 사이에 보낸다', async () => {
    const { engine, workers } = setup(() => ({}), { Threads: 2, Hash: 64 })
    await engine.analyze(START, { depth: 1 })
    expect(workers[0].sent.slice(0, 4)).toEqual([
      'uci',
      'setoption name Threads value 2',
      'setoption name Hash value 64',
      'isready',
    ])
  })

  it('MultiPV 줄을 onInfo로 전달한다', async () => {
    const { engine, workers } = setup(() => ({
      info: () => ['info depth 5 multipv 1 score cp 30 pv e2e4', 'info depth 5 multipv 2 score cp 20 pv d2d4'],
    }))
    const onInfo = vi.fn()
    const r = await engine.analyze(START, { depth: 5, multiPv: 2 }, onInfo)
    expect(workers[0].sent).toContain('setoption name MultiPV value 2')
    expect(r.lines.map((l) => l.pv[0])).toEqual(['e2e4', 'd2d4'])
    expect(onInfo).toHaveBeenLastCalledWith(r.lines)
  })

  it('bound 줄은 무시한다', async () => {
    const { engine } = setup(() => ({ info: () => ['info depth 5 multipv 1 score cp 10 lowerbound pv e2e4'] }))
    expect((await engine.analyze(START, { depth: 5 })).lines).toEqual([])
  })

  it('마지막 요청만 실행한다 (latest-wins)', async () => {
    const { engine, workers } = setup(() => ({ holdGoCount: 1 }))
    const p1 = engine.analyze(START, { depth: 20 })
    await vi.waitFor(() => expect(workers[0]?.sent).toContain('go depth 20'))
    const p2 = engine.analyze(AFTER_E4, { depth: 20 })
    const p3 = engine.analyze(AFTER_E4, { depth: 10 })
    await expect(p1).resolves.toMatchObject({ cancelled: true, bestMove: null })
    await expect(p2).resolves.toMatchObject({ cancelled: true })
    await expect(p3).resolves.toMatchObject({ cancelled: false, bestMove: 'e2e4' })
    expect(workers[0].sent.filter((c) => c.startsWith('go'))).toEqual(['go depth 20', 'go depth 10'])
  })

  it('실행 중에 abort하면 cancelled', async () => {
    const { engine, workers } = setup(() => ({ holdGoCount: 1 }))
    const ac = new AbortController()
    const p = engine.analyze(START, { depth: 20, signal: ac.signal })
    await vi.waitFor(() => expect(workers[0]?.sent).toContain('go depth 20'))
    ac.abort()
    await expect(p).resolves.toMatchObject({ cancelled: true })
  })

  it('이미 abort된 요청은 워커를 띄우지 않는다', async () => {
    const { engine, workers } = setup()
    const ac = new AbortController()
    ac.abort()
    await expect(engine.analyze(START, { signal: ac.signal })).resolves.toMatchObject({ cancelled: true })
    expect(workers).toHaveLength(0)
  })

  it('크래시하면 워커를 다시 만들고 1회 재시도한다', async () => {
    const { engine, workers } = setup((i) => (i === 0 ? { crashOnGo: 1 } : { bestMove: () => 'd2d4' }))
    const r = await engine.analyze(START, { depth: 5 })
    expect(r.bestMove).toBe('d2d4')
    expect(workers).toHaveLength(2)
    expect(workers[0].terminated).toBe(true)
  })

  it('두 번 크래시하면 EngineCrashedError', async () => {
    const { engine } = setup(() => ({ crashOnGo: 1 }))
    await expect(engine.analyze(START, { depth: 5 })).rejects.toBeInstanceOf(EngineCrashedError)
  })

  it('bestMove는 세기를 제한하고 movetime으로 탐색한다', async () => {
    const { engine, workers } = setup()
    await expect(engine.bestMove(START, { movetime: 300, elo: 1500 })).resolves.toBe('e2e4')
    expect(workers[0].sent).toEqual(
      expect.arrayContaining([
        'setoption name UCI_LimitStrength value true',
        'setoption name UCI_Elo value 1500',
        'go movetime 300',
      ]),
    )
  })

  it('같은 Elo면 옵션을 다시 보내지 않는다', async () => {
    const { engine, workers } = setup()
    await engine.bestMove(START, { movetime: 100, elo: 1500 })
    await engine.bestMove(START, { movetime: 100, elo: 1500 })
    expect(workers[0].sent.filter((c) => c.includes('UCI_Elo'))).toHaveLength(1)
  })
})
```

- [ ] **Step 5: 실패 확인**

Run: `npx vitest run src/engine/UciEngine.test.ts`
Expected: FAIL — `Failed to resolve import "./UciEngine"`

- [ ] **Step 6: UciEngine 구현** (`src/engine/UciEngine.ts`)

```ts
import { turnOf } from '../chess/pgn'
import { toWhitePov, type Score } from './classify'
import { parseBestMove, parseInfo } from './uci'

export interface WorkerLike {
  postMessage(message: string): void
  onmessage: ((ev: { data: unknown }) => void) | null
  onerror: ((ev: unknown) => void) | null
  terminate(): void
}
export type WorkerFactory = () => WorkerLike

export interface EngineLine {
  depth: number
  multipv: number
  /** 백 기준 */
  score: Score
  pv: string[]
}
export interface SearchResult {
  lines: EngineLine[]
  bestMove: string | null
  cancelled: boolean
}
export interface AnalyzeOptions {
  depth?: number
  movetime?: number
  multiPv?: number
  signal?: AbortSignal
}

export class EngineCrashedError extends Error {
  constructor() {
    super('Stockfish 워커가 중단됐습니다')
    this.name = 'EngineCrashedError'
  }
}

interface Job {
  fen: string
  go: string
  multiPv: number
  onInfo?: (lines: EngineLine[]) => void
  resolve: (r: SearchResult) => void
  reject: (e: unknown) => void
  lines: EngineLine[]
  cancelled: boolean
  retried: boolean
  attempt: number
}
interface Waiter {
  match: (line: string) => boolean
  resolve: () => void
  reject: (e: unknown) => void
}

const DEFAULT_DEPTH = 18

export class UciEngine {
  private worker: WorkerLike | null = null
  private ready: Promise<void> | null = null
  private waiters: Waiter[] = []
  private queue: Job[] = []
  private current: Job | null = null
  private multiPv = 1
  private limitElo: number | undefined
  private attempts = 0

  constructor(
    private readonly factory: WorkerFactory,
    private readonly baseOptions: Record<string, string | number> = {},
  ) {}

  analyze(fen: string, opts: AnalyzeOptions = {}, onInfo?: (lines: EngineLine[]) => void): Promise<SearchResult> {
    const go = opts.movetime !== undefined ? `go movetime ${opts.movetime}` : `go depth ${opts.depth ?? DEFAULT_DEPTH}`
    return new Promise<SearchResult>((resolve, reject) => {
      const job: Job = {
        fen,
        go,
        multiPv: opts.multiPv ?? 1,
        onInfo,
        resolve,
        reject,
        lines: [],
        cancelled: false,
        retried: false,
        attempt: 0,
      }
      this.supersedeAll()
      if (opts.signal?.aborted) {
        job.cancelled = true
        resolve(cancelledResult())
        return
      }
      opts.signal?.addEventListener('abort', () => this.cancel(job), { once: true })
      this.queue.push(job)
      void this.pump()
    })
  }

  async bestMove(fen: string, opts: { movetime: number; elo?: number; signal?: AbortSignal }): Promise<string | null> {
    if (opts.elo !== undefined && opts.elo !== this.limitElo) {
      await this.setOptions({ UCI_LimitStrength: 'true', UCI_Elo: Math.round(opts.elo) })
      this.limitElo = opts.elo
    }
    const r = await this.analyze(fen, { movetime: opts.movetime, signal: opts.signal })
    return r.cancelled ? null : r.bestMove
  }

  /** 탐색 중이 아닐 때 호출한다 */
  async setOptions(options: Record<string, string | number>): Promise<void> {
    await this.ensureReady()
    for (const [name, value] of Object.entries(options)) this.send(`setoption name ${name} value ${value}`)
    this.send('isready')
    await this.waitFor((l) => l === 'readyok')
  }

  stop(): void {
    this.supersedeAll()
  }

  dispose(): void {
    this.supersedeAll()
    this.worker?.terminate()
    this.worker = null
    this.ready = null
    for (const w of this.waiters.splice(0)) w.reject(new Error('engine disposed'))
  }

  private supersedeAll() {
    for (const q of this.queue.splice(0)) {
      q.cancelled = true
      q.resolve(cancelledResult())
    }
    if (this.current && !this.current.cancelled) {
      this.current.cancelled = true
      this.send('stop')
    }
  }

  private cancel(job: Job) {
    const i = this.queue.indexOf(job)
    if (i >= 0) {
      this.queue.splice(i, 1)
      job.cancelled = true
      job.resolve(cancelledResult())
    } else if (this.current === job && !job.cancelled) {
      job.cancelled = true
      this.send('stop')
    }
  }

  private async pump(): Promise<void> {
    if (this.current || this.queue.length === 0) return
    const job = this.queue.shift()!
    this.current = job
    const attempt = ++this.attempts
    job.attempt = attempt
    try {
      await this.ensureReady()
      if (this.current !== job || job.attempt !== attempt) return
      if (job.cancelled) {
        this.finish(job, null)
        return
      }
      if (job.multiPv !== this.multiPv) {
        this.send(`setoption name MultiPV value ${job.multiPv}`)
        this.multiPv = job.multiPv
      }
      this.send(`position fen ${job.fen}`)
      this.send(job.go)
    } catch (e) {
      if (this.current === job && job.attempt === attempt) {
        this.current = null
        job.reject(e)
        void this.pump()
      }
    }
  }

  private ensureReady(): Promise<void> {
    if (!this.ready) {
      const worker = this.factory()
      worker.onmessage = (ev) => {
        if (typeof ev.data === 'string') this.onLine(ev.data.trim())
      }
      worker.onerror = () => this.onCrash(worker)
      this.worker = worker
      this.multiPv = 1
      this.limitElo = undefined
      this.ready = (async () => {
        this.send('uci')
        await this.waitFor((l) => l === 'uciok')
        for (const [name, value] of Object.entries(this.baseOptions)) this.send(`setoption name ${name} value ${value}`)
        this.send('isready')
        await this.waitFor((l) => l === 'readyok')
      })()
    }
    return this.ready
  }

  private onLine(line: string) {
    const wi = this.waiters.findIndex((w) => w.match(line))
    if (wi >= 0) {
      const [w] = this.waiters.splice(wi, 1)
      w.resolve()
      return
    }
    const job = this.current
    if (!job) return
    const info = parseInfo(line)
    if (info) {
      if (job.cancelled) return
      job.lines[info.multipv - 1] = { ...info, score: toWhitePov(info.score, turnOf(job.fen)) }
      job.onInfo?.(job.lines.filter(Boolean))
      return
    }
    const best = parseBestMove(line)
    if (best !== undefined) this.finish(job, best)
  }

  private finish(job: Job, best: string | null) {
    if (this.current === job) this.current = null
    job.resolve({ lines: job.lines.filter(Boolean), bestMove: job.cancelled ? null : best, cancelled: job.cancelled })
    void this.pump()
  }

  private onCrash(worker: WorkerLike) {
    if (worker !== this.worker) return
    worker.terminate()
    this.worker = null
    this.ready = null
    for (const w of this.waiters.splice(0)) w.reject(new EngineCrashedError())
    const job = this.current
    this.current = null
    if (job) {
      if (job.cancelled) job.resolve(cancelledResult())
      else if (!job.retried) {
        job.retried = true
        job.lines = []
        this.queue.unshift(job)
      } else job.reject(new EngineCrashedError())
    }
    void this.pump()
  }

  private send(cmd: string) {
    this.worker?.postMessage(cmd)
  }

  private waitFor(match: (line: string) => boolean): Promise<void> {
    return new Promise((resolve, reject) => this.waiters.push({ match, resolve, reject }))
  }
}

function cancelledResult(): SearchResult {
  return { lines: [], bestMove: null, cancelled: true }
}
```

- [ ] **Step 7: 통과 확인**

Run: `npx vitest run src/engine`
Expected: PASS (uci 5 + UciEngine 11)

- [ ] **Step 8: 커밋**

```bash
git add src/engine
git commit -m "feat(engine): UCI 파서와 latest-wins UciEngine, 크래시 재시도" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 전체 대국 리뷰

**Files:**
- Create: `src/engine/review.ts`
- Test: `src/engine/review.test.ts`

**Interfaces:**
- Consumes: `UciEngine.analyze` (Task 6), `classifyMove`, `gameAccuracy`, `MATED_CP`, `Score`, `MoveLabel` (Task 5), `Ply`, `Color`, `turnOf` (Task 2·3)
- Produces:
  - `REVIEW_DEPTH = 14`
  - `interface ReviewedPosition { score: Score; best: string | null }`
  - `interface GameReview { depth: number; positions: ReviewedPosition[]; labels: (MoveLabel | null)[]; accuracy: { white: number | null; black: number | null } }`
  - `terminalScore(fen: string): Score | null` — 체크메이트면 `±MATED_CP`, 스테일메이트·기물 부족이면 `{ cp: 0 }`, 아니면 `null`
  - `buildReview(plies: Ply[], positions: ReviewedPosition[], depth: number): GameReview`
  - `reviewGame(engine: Pick<UciEngine, 'analyze'>, plies: Ply[], opts?: { depth?; signal?; onProgress?(done, total, positions) }): Promise<GameReview>` — 중단되면 `DOMException('AbortError')`
  - `countLabels(review: GameReview, startTurn: Turn): Record<Color, Record<'inaccuracy' | 'mistake' | 'blunder', number>>`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { describe, expect, it, vi } from 'vitest'
import { pgnToPlies } from '../chess/pgn'
import { MATED_CP, type Score } from './classify'
import { countLabels, reviewGame, terminalScore } from './review'
import type { SearchResult } from './UciEngine'

const SCHOLAR = pgnToPlies('1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0')
// 포지션 0~6의 엔진 평가(백 기준)와 최선 수. 포지션 7은 메이트라 엔진을 부르지 않는다.
const SCORES: Score[] = [{ cp: 30 }, { cp: 30 }, { cp: 30 }, { cp: 20 }, { cp: 40 }, { cp: 40 }, { mate: 1 }]
const BEST = ['e2e4', 'e7e5', 'g1f3', 'g7g6', 'd2d3', 'g7g6', 'h5f7']

function fakeEngine(onCall?: (n: number) => void) {
  let n = 0
  return {
    analyze: vi.fn(async (): Promise<SearchResult> => {
      const i = n++
      onCall?.(n)
      return { cancelled: false, bestMove: BEST[i], lines: [{ depth: 14, multipv: 1, score: SCORES[i], pv: [BEST[i]] }] }
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

describe('reviewGame', () => {
  it('포지션을 순서대로 분석하고 등급·정확도를 계산한다', async () => {
    const engine = fakeEngine()
    const onProgress = vi.fn()
    const review = await reviewGame(engine, SCHOLAR, { onProgress })
    expect(engine.analyze).toHaveBeenCalledTimes(7)
    expect(engine.analyze).toHaveBeenCalledWith(SCHOLAR[0].fen, expect.objectContaining({ depth: 14, multiPv: 1 }))
    expect(onProgress).toHaveBeenCalledTimes(8)
    expect(onProgress).toHaveBeenLastCalledWith(8, 8, expect.any(Array))
    expect(review.positions[7]).toEqual({ score: { cp: MATED_CP }, best: null })
    expect(review.labels[0]).toBeNull()
    expect(review.labels[1]).toBe('best') // e4
    expect(review.labels[6]).toBe('blunder') // 3...Nf6??
    expect(review.labels[7]).toBe('best') // Qxf7#
    expect(review.accuracy.black!).toBeLessThan(review.accuracy.white!)
    expect(countLabels(review, 'w').black.blunder).toBe(1)
  })

  it('중간에 abort하면 AbortError', async () => {
    const ac = new AbortController()
    const engine = fakeEngine((n) => n === 3 && ac.abort())
    await expect(reviewGame(engine, SCHOLAR, { signal: ac.signal })).rejects.toMatchObject({ name: 'AbortError' })
    expect(engine.analyze).toHaveBeenCalledTimes(3)
  })

  it('엔진이 cancelled를 돌려주면 AbortError', async () => {
    const engine = { analyze: vi.fn(async (): Promise<SearchResult> => ({ cancelled: true, bestMove: null, lines: [] })) }
    await expect(reviewGame(engine, SCHOLAR)).rejects.toMatchObject({ name: 'AbortError' })
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/engine/review.test.ts` → FAIL (import 오류)

- [ ] **Step 3: 구현**

```ts
import { Chess } from 'chess.js'
import { turnOf } from '../chess/pgn'
import type { Color, Ply, Turn } from '../chess/types'
import { classifyMove, gameAccuracy, MATED_CP, type MoveLabel, type Score } from './classify'
import type { UciEngine } from './UciEngine'

export const REVIEW_DEPTH = 14

export interface ReviewedPosition {
  score: Score
  best: string | null
}
export interface GameReview {
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
  const labels = plies.map((ply, i) =>
    i === 0 || !ply.uci
      ? null
      : classifyMove(positions[i - 1].score, positions[i].score, turnOf(plies[i - 1].fen), ply.uci, positions[i - 1].best),
  )
  return { depth, positions, labels, accuracy: gameAccuracy(positions.map((p) => p.score), turnOf(plies[0].fen)) }
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
      positions.push({ score: terminal, best: null })
    } else {
      const r = await engine.analyze(ply.fen, { depth, multiPv: 1, signal: opts.signal })
      if (r.cancelled) throw abortError()
      positions.push({ score: r.lines[0]?.score ?? { cp: 0 }, best: r.bestMove })
    }
    opts.onProgress?.(positions.length, plies.length, positions)
  }
  return buildReview(plies, positions, depth)
}

type Counted = 'inaccuracy' | 'mistake' | 'blunder'

export function countLabels(review: GameReview, startTurn: Turn): Record<Color, Record<Counted, number>> {
  const counts: Record<Color, Record<Counted, number>> = {
    white: { inaccuracy: 0, mistake: 0, blunder: 0 },
    black: { inaccuracy: 0, mistake: 0, blunder: 0 },
  }
  review.labels.forEach((label, i) => {
    if (i === 0 || (label !== 'inaccuracy' && label !== 'mistake' && label !== 'blunder')) return
    const mover: Color = ((i - 1) % 2 === 0) === (startTurn === 'w') ? 'white' : 'black'
    counts[mover][label]++
  })
  return counts
}

function abortError(): DOMException {
  return new DOMException('리뷰가 중단됐습니다', 'AbortError')
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/engine/review.test.ts` → PASS

- [ ] **Step 5: 커밋**

```bash
git add src/engine/review.ts src/engine/review.test.ts
git commit -m "feat(engine): 전체 대국 리뷰와 등급 집계" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 엔진 빌드 선택과 실제 Stockfish 스모크

**Files:**
- Create: `src/engine/engines.ts`, `scripts/engine-smoke.mjs`
- Test: `src/engine/engines.test.ts`

**Interfaces:**
- Consumes: `UciEngine`, `WorkerLike` (Task 6)
- Produces: `ENGINE_FILES`, `isMultiThreaded(): boolean`, `engineUrl(multi?: boolean): string`, `getAnalysisEngine(): UciEngine`, `getPlayEngine(): UciEngine`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { engineUrl, isMultiThreaded } from './engines'

afterEach(() => vi.unstubAllGlobals())

describe('engines', () => {
  it('격리 여부로 빌드를 고른다', () => {
    expect(engineUrl(true)).toBe('/engine/stockfish-19-lite.js')
    expect(engineUrl(false)).toBe('/engine/stockfish-19-lite-single.js')
  })
  it('crossOriginIsolated가 true일 때만 멀티스레드', () => {
    vi.stubGlobal('crossOriginIsolated', false)
    expect(isMultiThreaded()).toBe(false)
    vi.stubGlobal('crossOriginIsolated', true)
    expect(isMultiThreaded()).toBe(true)
  })
})
```

- [ ] **Step 2: 실패 확인 후 구현**

Run: `npx vitest run src/engine/engines.test.ts` → FAIL

`src/engine/engines.ts`:
```ts
import { UciEngine, type WorkerLike } from './UciEngine'

export const ENGINE_FILES = {
  multi: '/engine/stockfish-19-lite.js',
  single: '/engine/stockfish-19-lite-single.js',
} as const

export function isMultiThreaded(): boolean {
  return globalThis.crossOriginIsolated === true && typeof SharedArrayBuffer !== 'undefined'
}

export function engineUrl(multi = isMultiThreaded()): string {
  return multi ? ENGINE_FILES.multi : ENGINE_FILES.single
}

function spawn(): WorkerLike {
  return new Worker(engineUrl()) as unknown as WorkerLike
}

function analysisThreads(): number {
  if (!isMultiThreaded()) return 1
  const cores = navigator.hardwareConcurrency ?? 2
  return Math.max(1, Math.min(4, cores - 1))
}

let analysis: UciEngine | null = null
let play: UciEngine | null = null

/** 풀파워: 실시간 분석 + 대국 리뷰 */
export function getAnalysisEngine(): UciEngine {
  return (analysis ??= new UciEngine(spawn, { Threads: analysisThreads(), Hash: 64 }))
}

/** Elo 제한: 분기 대국 상대 */
export function getPlayEngine(): UciEngine {
  return (play ??= new UciEngine(spawn, { Threads: 1, Hash: 16 }))
}
```

Run: `npx vitest run src/engine/engines.test.ts` → PASS

- [ ] **Step 3: 실제 엔진 스모크 스크립트** (`scripts/engine-smoke.mjs`)

```js
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const initEngine = require('stockfish')
const FEN = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1' // Ra8#

const timer = setTimeout(() => {
  console.error('[smoke] 시간 초과')
  process.exit(1)
}, 20_000)

const engine = await initEngine('lite-single')
engine.listener = (line) => {
  if (!line.startsWith('bestmove')) return
  clearTimeout(timer)
  const move = line.split(' ')[1]
  if (move === 'a1a8') {
    console.log('[smoke] OK', line)
    process.exit(0)
  }
  console.error('[smoke] 예상과 다른 수', line)
  process.exit(1)
}
engine.sendCommand('uci')
engine.sendCommand(`position fen ${FEN}`)
engine.sendCommand('go depth 8')
```

Run: `npm run engine:smoke`
Expected: `[smoke] OK bestmove a1a8`

- [ ] **Step 4: 커밋**

```bash
git add src/engine/engines.ts src/engine/engines.test.ts scripts/engine-smoke.mjs
git commit -m "feat(engine): lite 빌드 선택, 엔진 싱글턴, 실제 엔진 스모크" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: NDJSON 스트림 파서

**Files:**
- Create: `src/sources/ndjson.ts`
- Test: `src/sources/ndjson.test.ts`

**Interfaces:**
- Produces: `createNdjsonParser<T>(onItem: (item: T) => void): { push(chunk: string): void; end(): void }`, `readNdjson<T>(stream: ReadableStream<Uint8Array>): AsyncGenerator<T>`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { describe, expect, it } from 'vitest'
import { createNdjsonParser, readNdjson } from './ndjson'

function collect(chunks: string[]) {
  const items: unknown[] = []
  const p = createNdjsonParser((x) => items.push(x))
  chunks.forEach((c) => p.push(c))
  p.end()
  return items
}

function streamOf(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      chunks.forEach((c) => controller.enqueue(c))
      controller.close()
    },
  })
}

describe('createNdjsonParser', () => {
  it('한 줄이 청크 두 개로 쪼개져도 파싱한다', () => {
    expect(collect(['{"a":1}\n{"a"', ':2}\n'])).toEqual([{ a: 1 }, { a: 2 }])
  })
  it('빈 줄과 CRLF를 무시한다', () => {
    expect(collect(['{"a":1}\r\n\n\n{"a":2}\n'])).toEqual([{ a: 1 }, { a: 2 }])
  })
  it('마지막 줄바꿈이 없어도 end에서 처리한다', () => {
    expect(collect(['{"a":1}\n{"a":2}'])).toEqual([{ a: 1 }, { a: 2 }])
  })
})

describe('readNdjson', () => {
  it('UTF-8 멀티바이트 문자가 청크 경계에서 잘려도 복원한다', async () => {
    const bytes = new TextEncoder().encode('{"name":"체슬링"}\n{"name":"캐슬링"}\n')
    const cut = 11 // '체'의 바이트 중간
    const out: unknown[] = []
    for await (const item of readNdjson(streamOf([bytes.slice(0, cut), bytes.slice(cut)]))) out.push(item)
    expect(out).toEqual([{ name: '체슬링' }, { name: '캐슬링' }])
  })
})
```

- [ ] **Step 2: 실패 확인 후 구현**

Run: `npx vitest run src/sources/ndjson.test.ts` → FAIL

```ts
export function createNdjsonParser<T>(onItem: (item: T) => void) {
  let buffer = ''
  const flush = (line: string) => {
    const t = line.trim()
    if (t) onItem(JSON.parse(t) as T)
  }
  return {
    push(chunk: string) {
      buffer += chunk
      let nl: number
      while ((nl = buffer.indexOf('\n')) >= 0) {
        flush(buffer.slice(0, nl))
        buffer = buffer.slice(nl + 1)
      }
    },
    end() {
      flush(buffer)
      buffer = ''
    },
  }
}

export async function* readNdjson<T>(stream: ReadableStream<Uint8Array>): AsyncGenerator<T> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  const items: T[] = []
  const parser = createNdjsonParser<T>((item) => items.push(item))
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      parser.push(decoder.decode(value, { stream: true }))
      while (items.length) yield items.shift()!
    }
    parser.push(decoder.decode())
    parser.end()
    while (items.length) yield items.shift()!
  } finally {
    reader.releaseLock()
  }
}
```

Run: `npx vitest run src/sources/ndjson.test.ts` → PASS

- [ ] **Step 3: 커밋**

```bash
git add src/sources/ndjson.ts src/sources/ndjson.test.ts
git commit -m "feat(sources): 청크 경계에 안전한 NDJSON 파서" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: HTTP 에러 모델과 Lichess 어댑터

**Files:**
- Create: `src/sources/http.ts`, `src/sources/lichess.ts`, `src/test/msw.ts`
- Test: `src/sources/lichess.test.ts`

**Interfaces:**
- Consumes: `readNdjson` (Task 9), `GameSummary`, `GameRecord`, `Player`, `Result`, `Speed` (Task 2)
- Produces:
  - `type HttpErrorKind = 'not_found' | 'rate_limited' | 'server' | 'network'`
  - `class HttpError extends Error { kind: HttpErrorKind; status: number }`
  - `request(url: string, init?: RequestInit): Promise<Response>`, `getJson<T>(url, init?)`, `getText(url, init?)`
  - `LICHESS = 'https://lichess.org'`
  - `lichessToSummary(g: LichessGameJson): GameSummary`
  - `listLichessGames(username, { max?, until?, signal?, onGame? }): Promise<{ games: GameSummary[]; nextUntil: number | null }>`
  - `getLichessGame(id: string, signal?): Promise<GameRecord>`
  - `useMswServer(): SetupServerApi` (테스트 헬퍼. `beforeAll/afterEach/afterAll` 등록)

- [ ] **Step 1: MSW 헬퍼 작성** (`src/test/msw.ts`)

```ts
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'

export function useMswServer() {
  const server = setupServer()
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())
  return server
}
```

- [ ] **Step 2: 실패하는 테스트 작성** (`src/sources/lichess.test.ts`)

응답 형태는 2026-09-30에 실제 Lichess API로 확인한 구조를 따른다.

```ts
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { useMswServer } from '../test/msw'
import { HttpError } from './http'
import { getLichessGame, listLichessGames, type LichessGameJson } from './lichess'

const server = useMswServer()

const G1: LichessGameJson = {
  id: 'aaaa1111',
  variant: 'standard',
  speed: 'blitz',
  createdAt: Date.UTC(2026, 8, 29, 12),
  status: 'mate',
  players: { white: { user: { name: 'tester', title: 'FM' }, rating: 2300 }, black: { user: { name: 'rival' }, rating: 2250 } },
  winner: 'white',
  clock: { initial: 180, increment: 2 },
}
const G2: LichessGameJson = {
  id: 'bbbb2222',
  variant: 'chess960',
  speed: 'rapid',
  createdAt: Date.UTC(2026, 8, 28, 12),
  status: 'draw',
  players: { white: { user: { name: 'rival' }, rating: 2240 }, black: { user: { name: 'tester' }, rating: 2310 } },
}
const G3: LichessGameJson = {
  id: 'cccc3333',
  variant: 'standard',
  speed: 'correspondence',
  createdAt: Date.UTC(2026, 8, 27, 12),
  status: 'resign',
  players: { white: { user: { name: 'tester' }, rating: 2300 }, black: { aiLevel: 8 } },
  winner: 'black',
}
const ndjson = (games: LichessGameJson[]) => games.map((g) => JSON.stringify(g)).join('\n') + '\n'

describe('listLichessGames', () => {
  it('NDJSON을 GameSummary로 바꾼다', async () => {
    let accept: string | null = null
    server.use(
      http.get('https://lichess.org/api/games/user/tester', ({ request }) => {
        accept = request.headers.get('accept')
        return new HttpResponse(ndjson([G1, G2, G3]), { headers: { 'Content-Type': 'application/x-ndjson' } })
      }),
    )
    const onGame = vi.fn()
    const page = await listLichessGames('tester', { onGame })
    expect(accept).toBe('application/x-ndjson')
    expect(onGame).toHaveBeenCalledTimes(3)
    expect(page.nextUntil).toBeNull()
    expect(page.games[0]).toEqual({
      ref: { kind: 'lichess', id: 'aaaa1111' },
      white: { name: 'tester', rating: 2300, title: 'FM' },
      black: { name: 'rival', rating: 2250 },
      result: '1-0',
      date: '2026-09-29',
      speed: 'blitz',
      timeControl: '3+2',
      variant: 'standard',
    })
    expect(page.games[1]).toMatchObject({ result: '1/2-1/2', variant: 'other', speed: 'rapid' })
    expect(page.games[2]).toMatchObject({ result: '0-1', black: { name: 'Stockfish level 8' }, speed: 'correspondence' })
  })

  it('max만큼 받으면 다음 페이지 until을 준다', async () => {
    let query = null as URLSearchParams | null
    server.use(
      http.get('https://lichess.org/api/games/user/tester', ({ request }) => {
        query = new URL(request.url).searchParams
        return new HttpResponse(ndjson([G1, G2]))
      }),
    )
    const page = await listLichessGames('tester', { max: 2, until: 999 })
    expect(query!.get('max')).toBe('2')
    expect(query!.get('until')).toBe('999')
    expect(page.nextUntil).toBe(G2.createdAt - 1)
  })

  it('404 / 429 / 네트워크 오류를 HttpError로 구분한다', async () => {
    server.use(http.get('https://lichess.org/api/games/user/nobody', () => new HttpResponse(null, { status: 404 })))
    await expect(listLichessGames('nobody')).rejects.toMatchObject({ kind: 'not_found', status: 404 })

    server.use(http.get('https://lichess.org/api/games/user/busy', () => new HttpResponse(null, { status: 429 })))
    await expect(listLichessGames('busy')).rejects.toMatchObject({ kind: 'rate_limited' })

    server.use(http.get('https://lichess.org/api/games/user/down', () => HttpResponse.error()))
    const err = await listLichessGames('down').catch((e) => e)
    expect(err).toBeInstanceOf(HttpError)
    expect(err.kind).toBe('network')
  })
})

describe('getLichessGame', () => {
  it('PGN을 포함한 GameRecord', async () => {
    server.use(
      http.get('https://lichess.org/game/export/aaaa1111', ({ request }) => {
        expect(new URL(request.url).searchParams.get('pgnInJson')).toBe('true')
        return HttpResponse.json({ ...G1, pgn: '[Event "x"]\n\n1. e4 *' })
      }),
    )
    const g = await getLichessGame('aaaa1111')
    expect(g.pgn).toContain('1. e4')
    expect(g.ref).toEqual({ kind: 'lichess', id: 'aaaa1111' })
  })
})
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run src/sources/lichess.test.ts` → FAIL (import 오류)

- [ ] **Step 4: 구현**

`src/sources/http.ts`:
```ts
export type HttpErrorKind = 'not_found' | 'rate_limited' | 'server' | 'network'

export class HttpError extends Error {
  constructor(
    readonly kind: HttpErrorKind,
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export async function request(url: string, init: RequestInit = {}): Promise<Response> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch (e) {
    if (init.signal?.aborted) throw e
    throw new HttpError('network', 0, `네트워크 오류: ${url}`)
  }
  if (res.ok) return res
  if (res.status === 404) throw new HttpError('not_found', 404, `찾을 수 없음: ${url}`)
  if (res.status === 429) throw new HttpError('rate_limited', 429, `요청 한도 초과: ${url}`)
  throw new HttpError('server', res.status, `HTTP ${res.status}: ${url}`)
}

export async function getJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = { Accept: 'application/json', ...(init.headers as Record<string, string> | undefined) }
  const res = await request(url, { ...init, headers })
  return (await res.json()) as T
}

export async function getText(url: string, init: RequestInit = {}): Promise<string> {
  return (await request(url, init)).text()
}
```

`src/sources/lichess.ts`:
```ts
import type { GameRecord, GameSummary, Player, Result, Speed } from '../chess/types'
import { getJson, request } from './http'
import { readNdjson } from './ndjson'

export const LICHESS = 'https://lichess.org'

export interface LichessPlayerJson {
  user?: { name: string; title?: string }
  rating?: number
  aiLevel?: number
}
export interface LichessGameJson {
  id: string
  variant: string
  speed: string
  createdAt: number
  status: string
  players: { white: LichessPlayerJson; black: LichessPlayerJson }
  winner?: 'white' | 'black'
  clock?: { initial: number; increment: number }
  pgn?: string
}

const UNFINISHED = new Set(['created', 'started', 'aborted', 'noStart'])
const SPEEDS: Speed[] = ['ultraBullet', 'bullet', 'blitz', 'rapid', 'classical', 'correspondence']

export function lichessToSummary(g: LichessGameJson): GameSummary {
  return {
    ref: { kind: 'lichess', id: g.id },
    white: toPlayer(g.players.white),
    black: toPlayer(g.players.black),
    result: toResult(g),
    date: new Date(g.createdAt).toISOString().slice(0, 10),
    speed: SPEEDS.includes(g.speed as Speed) ? (g.speed as Speed) : 'unknown',
    timeControl: g.clock ? `${g.clock.initial / 60}+${g.clock.increment}` : undefined,
    variant: g.variant === 'standard' || g.variant === 'fromPosition' ? 'standard' : 'other',
  }
}

export interface LichessListOptions {
  max?: number
  until?: number
  signal?: AbortSignal
  onGame?: (game: GameSummary) => void
}

export async function listLichessGames(
  username: string,
  opts: LichessListOptions = {},
): Promise<{ games: GameSummary[]; nextUntil: number | null }> {
  const max = opts.max ?? 30
  const url = new URL(`${LICHESS}/api/games/user/${encodeURIComponent(username)}`)
  url.searchParams.set('max', String(max))
  if (opts.until !== undefined) url.searchParams.set('until', String(opts.until))
  const res = await request(url.toString(), { headers: { Accept: 'application/x-ndjson' }, signal: opts.signal })
  const games: GameSummary[] = []
  let lastCreatedAt: number | null = null
  for await (const raw of readNdjson<LichessGameJson>(res.body!)) {
    const game = lichessToSummary(raw)
    games.push(game)
    lastCreatedAt = raw.createdAt
    opts.onGame?.(game)
  }
  return { games, nextUntil: games.length === max && lastCreatedAt !== null ? lastCreatedAt - 1 : null }
}

export async function getLichessGame(id: string, signal?: AbortSignal): Promise<GameRecord> {
  const g = await getJson<LichessGameJson>(
    `${LICHESS}/game/export/${encodeURIComponent(id)}?pgnInJson=true&clocks=false&evals=false`,
    { signal },
  )
  return { ...lichessToSummary(g), pgn: g.pgn ?? '' }
}

function toPlayer(p: LichessPlayerJson): Player {
  if (p.user) return { name: p.user.name, rating: p.rating, title: p.user.title }
  if (p.aiLevel) return { name: `Stockfish level ${p.aiLevel}` }
  return { name: 'Anonymous' }
}

function toResult(g: LichessGameJson): Result {
  if (g.winner === 'white') return '1-0'
  if (g.winner === 'black') return '0-1'
  return UNFINISHED.has(g.status) ? '*' : '1/2-1/2'
}
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/sources/lichess.test.ts` → PASS

- [ ] **Step 6: 커밋**

```bash
git add src/sources/http.ts src/sources/lichess.ts src/sources/lichess.test.ts src/test/msw.ts
git commit -m "feat(sources): HttpError 모델과 Lichess 스트리밍 어댑터" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Chess.com 어댑터

**Files:**
- Create: `src/sources/chesscom.ts`
- Test: `src/sources/chesscom.test.ts`

**Interfaces:**
- Consumes: `getJson`, `HttpError` (Task 10), `GameRecord`, `Result`, `Speed` (Task 2)
- Produces:
  - `CHESSCOM = 'https://api.chess.com/pub'`
  - `interface ArchiveMonth { yyyy: string; mm: string }`
  - `listArchives(user: string, signal?): Promise<ArchiveMonth[]>` (오래된 달 → 최근 달)
  - `fetchChesscomMonth(user: string, yyyy: string, mm: string, signal?): Promise<GameRecord[]>` (최신 대국 먼저, `ref.user`는 소문자)
  - `findInMonth(records: GameRecord[], uuid: string): GameRecord` (없으면 `HttpError('not_found')`)

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { useMswServer } from '../test/msw'
import { fetchChesscomMonth, findInMonth, listArchives, type ChesscomGameJson } from './chesscom'
import { HttpError } from './http'

const server = useMswServer()

function game(over: Partial<ChesscomGameJson>): ChesscomGameJson {
  return {
    url: 'https://www.chess.com/game/live/1',
    pgn: '[Event "Live Chess"]\n\n1. e4 e5 *',
    time_control: '180+2',
    end_time: Date.UTC(2026, 8, 8, 10) / 1000,
    uuid: 'uuid-1',
    time_class: 'blitz',
    rules: 'chess',
    white: { username: 'Hikaru', rating: 3370, result: 'win' },
    black: { username: 'rival', rating: 2700, result: 'resigned' },
    ...over,
  }
}

describe('listArchives', () => {
  it('아카이브 URL을 연·월로 바꾼다', async () => {
    server.use(
      http.get('https://api.chess.com/pub/player/hikaru/games/archives', () =>
        HttpResponse.json({
          archives: [
            'https://api.chess.com/pub/player/hikaru/games/2026/08',
            'https://api.chess.com/pub/player/hikaru/games/2026/09',
          ],
        }),
      ),
    )
    expect(await listArchives('Hikaru')).toEqual([
      { yyyy: '2026', mm: '08' },
      { yyyy: '2026', mm: '09' },
    ])
  })
})

describe('fetchChesscomMonth', () => {
  it('최신 대국부터, 결과·변형·시간 제한을 매핑한다', async () => {
    server.use(
      http.get('https://api.chess.com/pub/player/hikaru/games/2026/09', () =>
        HttpResponse.json({
          games: [
            game({ uuid: 'old' }),
            game({
              uuid: 'new',
              rules: 'chess960',
              time_class: 'rapid',
              white: { username: 'rival', rating: 2700, result: 'agreed' },
              black: { username: 'Hikaru', rating: 3370, result: 'agreed' },
            }),
          ],
        }),
      ),
    )
    const games = await fetchChesscomMonth('Hikaru', '2026', '09')
    expect(games.map((g) => g.ref)).toEqual([
      { kind: 'chesscom', user: 'hikaru', yyyy: '2026', mm: '09', uuid: 'new' },
      { kind: 'chesscom', user: 'hikaru', yyyy: '2026', mm: '09', uuid: 'old' },
    ])
    expect(games[0]).toMatchObject({ result: '1/2-1/2', variant: 'other', speed: 'rapid' })
    expect(games[1]).toMatchObject({
      result: '1-0',
      variant: 'standard',
      speed: 'blitz',
      timeControl: '180+2',
      date: '2026-09-08',
      white: { name: 'Hikaru', rating: 3370 },
    })
    expect(games[1].pgn).toContain('1. e4')
  })

  it('흑 승리와 미종료', async () => {
    server.use(
      http.get('https://api.chess.com/pub/player/hikaru/games/2026/07', () =>
        HttpResponse.json({
          games: [
            game({ uuid: 'b', white: { username: 'a', rating: 1, result: 'checkmated' }, black: { username: 'b', rating: 1, result: 'win' } }),
            game({ uuid: 'c', white: { username: 'a', rating: 1, result: 'abandoned' }, black: { username: 'b', rating: 1, result: 'abandoned' } }),
          ],
        }),
      ),
    )
    const [c, b] = await fetchChesscomMonth('hikaru', '2026', '07')
    expect(b.result).toBe('0-1')
    expect(c.result).toBe('*')
  })

  it('없는 유저는 not_found', async () => {
    server.use(http.get('https://api.chess.com/pub/player/nobody/games/2026/09', () => new HttpResponse(null, { status: 404 })))
    await expect(fetchChesscomMonth('nobody', '2026', '09')).rejects.toMatchObject({ kind: 'not_found' })
  })
})

describe('findInMonth', () => {
  it('uuid로 찾고 없으면 not_found', async () => {
    server.use(
      http.get('https://api.chess.com/pub/player/hikaru/games/2026/09', () => HttpResponse.json({ games: [game({ uuid: 'x' })] })),
    )
    const games = await fetchChesscomMonth('hikaru', '2026', '09')
    expect(findInMonth(games, 'x').ref).toMatchObject({ uuid: 'x' })
    expect(() => findInMonth(games, 'y')).toThrow(HttpError)
  })
})
```

- [ ] **Step 2: 실패 확인 후 구현**

Run: `npx vitest run src/sources/chesscom.test.ts` → FAIL

```ts
import type { GameRecord, Result, Speed } from '../chess/types'
import { getJson, HttpError } from './http'

export const CHESSCOM = 'https://api.chess.com/pub'

interface ChesscomPlayerJson {
  username: string
  rating: number
  result: string
}
export interface ChesscomGameJson {
  url: string
  pgn?: string
  time_control: string
  end_time: number
  uuid: string
  time_class: string
  rules: string
  white: ChesscomPlayerJson
  black: ChesscomPlayerJson
}
export interface ArchiveMonth {
  yyyy: string
  mm: string
}

const DRAWS = new Set(['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'])

// Chess.com은 병렬 요청에 429를 준다. 이 모듈의 함수는 항상 한 번에 하나씩 호출한다.
export async function listArchives(user: string, signal?: AbortSignal): Promise<ArchiveMonth[]> {
  const { archives } = await getJson<{ archives: string[] }>(
    `${CHESSCOM}/player/${encodeURIComponent(user.toLowerCase())}/games/archives`,
    { signal },
  )
  return archives
    .map((url) => url.match(/\/(\d{4})\/(\d{2})$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ yyyy: m[1], mm: m[2] }))
}

export async function fetchChesscomMonth(user: string, yyyy: string, mm: string, signal?: AbortSignal): Promise<GameRecord[]> {
  const u = user.toLowerCase()
  const { games } = await getJson<{ games: ChesscomGameJson[] }>(
    `${CHESSCOM}/player/${encodeURIComponent(u)}/games/${yyyy}/${mm}`,
    { signal },
  )
  return games.map((g) => chesscomToRecord(u, yyyy, mm, g)).reverse()
}

export function findInMonth(records: GameRecord[], uuid: string): GameRecord {
  const found = records.find((r) => r.ref.kind === 'chesscom' && r.ref.uuid === uuid)
  if (!found) throw new HttpError('not_found', 404, `대국 ${uuid}를 찾을 수 없습니다`)
  return found
}

function chesscomToRecord(user: string, yyyy: string, mm: string, g: ChesscomGameJson): GameRecord {
  return {
    ref: { kind: 'chesscom', user, yyyy, mm, uuid: g.uuid },
    white: { name: g.white.username, rating: g.white.rating },
    black: { name: g.black.username, rating: g.black.rating },
    result: toResult(g),
    date: new Date(g.end_time * 1000).toISOString().slice(0, 10),
    speed: toSpeed(g.time_class),
    timeControl: g.time_control,
    variant: g.rules === 'chess' ? 'standard' : 'other',
    pgn: g.pgn ?? '',
  }
}

function toResult(g: ChesscomGameJson): Result {
  if (g.white.result === 'win') return '1-0'
  if (g.black.result === 'win') return '0-1'
  if (DRAWS.has(g.white.result)) return '1/2-1/2'
  return '*'
}

function toSpeed(timeClass: string): Speed {
  return timeClass === 'bullet' || timeClass === 'blitz' || timeClass === 'rapid' || timeClass === 'daily'
    ? timeClass
    : 'unknown'
}
```

Run: `npx vitest run src/sources/chesscom.test.ts` → PASS

- [ ] **Step 3: 커밋**

```bash
git add src/sources/chesscom.ts src/sources/chesscom.test.ts
git commit -m "feat(sources): Chess.com 월별 아카이브 어댑터" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Lichess 브로드캐스트 어댑터

**Files:**
- Create: `src/sources/broadcast.ts`
- Test: `src/sources/broadcast.test.ts`

**Interfaces:**
- Consumes: `getJson`, `getText` (Task 10), `LICHESS` (Task 10), `parseHeaders`, `normalizeResult` (Task 3), `GameRecord`, `Player` (Task 2)
- Produces:
  - `interface BroadcastTour { id: string; name: string; slug: string; dates?: number[]; tier?: number; image?: string }`
  - `interface BroadcastRound { id: string; name: string; startsAt?: number; finished?: boolean; ongoing?: boolean }`
  - `interface BroadcastTourDetail { tour: BroadcastTour; rounds: BroadcastRound[]; defaultRoundId?: string }`
  - `listTopBroadcasts(signal?): Promise<{ active: BroadcastTour[]; past: BroadcastTour[] }>`
  - `searchBroadcasts(q: string, signal?): Promise<BroadcastTour[]>`
  - `getBroadcastTour(id: string, signal?): Promise<BroadcastTourDetail>`
  - `getRoundGames(roundId: string, signal?): Promise<GameRecord[]>` (`gameId`는 `GameURL` 헤더의 마지막 경로)
  - `splitPgn(text: string): string[]`
  - `isHighlighted(tour: BroadcastTour): boolean` (올림피아드·월드챔피언십·캔디데이츠)

- [ ] **Step 1: 실패하는 테스트 작성**

실제 응답 구조(2026-09-30 확인): `/api/broadcast/top` → `{ active: [{tour, round}], upcoming, past: { currentPageResults: [{tour, round}] } }`, `/api/broadcast/{id}` → `{ tour, rounds, defaultRoundId }`, 라운드 PGN은 게임 사이에 빈 줄 두 개, `[GameURL ".../{roundId}/{gameId}"]` 헤더.

```ts
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { useMswServer } from '../test/msw'
import { getBroadcastTour, getRoundGames, isHighlighted, listTopBroadcasts, searchBroadcasts, splitPgn } from './broadcast'

const server = useMswServer()

const OLYMPIAD = { id: 'oQuU2arG', name: '46th FIDE Chess Olympiad Samarkand 2026 | Women', slug: 'olympiad-women', dates: [1789553700000] }
const OTHER = { id: 'zzz', name: 'Local Open 2026', slug: 'local-open' }

const ROUND_PGN = `[Event "Olymp 2026 Women"]
[Date "2026.09.09"]
[White "Joku, Liberty"]
[Black "Rodriguez Guevara, Celia M."]
[Result "1/2-1/2"]
[WhiteElo "0"]
[BlackElo "1811"]
[BlackTitle "WCM"]
[Variant "Standard"]
[GameURL "https://lichess.org/broadcast/olympiad-women/round-11/zwtIOEd2/3YNrJV1C"]

1. e4 { [%eval 0.18] [%clk 1:30:47] } 1... c5 { [%eval 0.32] } 1/2-1/2


[Event "Olymp 2026 Women"]
[Date "2026.09.27"]
[White "A, B"]
[Black "C, D"]
[Result "*"]
[WhiteElo "2400"]
[GameURL "https://lichess.org/broadcast/olympiad-women/round-11/zwtIOEd2/XyZ12345"]

1. d4 d5 *
`

describe('splitPgn', () => {
  it('게임 단위로 나누되 헤더와 수순 사이의 빈 줄에서는 나누지 않는다', () => {
    const parts = splitPgn(ROUND_PGN)
    expect(parts).toHaveLength(2)
    expect(parts[0]).toContain('1. e4')
    expect(parts[1].startsWith('[Event')).toBe(true)
  })
})

describe('broadcast API', () => {
  it('top: active와 past의 tour만 꺼낸다', async () => {
    server.use(
      http.get('https://lichess.org/api/broadcast/top', () =>
        HttpResponse.json({ active: [{ tour: OLYMPIAD, round: {} }], upcoming: [], past: { currentPageResults: [{ tour: OTHER, round: {} }] } }),
      ),
    )
    expect(await listTopBroadcasts()).toEqual({ active: [OLYMPIAD], past: [OTHER] })
  })

  it('search', async () => {
    server.use(
      http.get('https://lichess.org/api/broadcast/search', ({ request }) => {
        expect(new URL(request.url).searchParams.get('q')).toBe('World Championship')
        return HttpResponse.json({ currentPageResults: [{ tour: OLYMPIAD }] })
      }),
    )
    expect(await searchBroadcasts('World Championship')).toEqual([OLYMPIAD])
  })

  it('tour 상세', async () => {
    const detail = { tour: OLYMPIAD, rounds: [{ id: 'r1', name: 'Round 1', finished: true }], defaultRoundId: 'r1' }
    server.use(http.get('https://lichess.org/api/broadcast/oQuU2arG', () => HttpResponse.json(detail)))
    expect(await getBroadcastTour('oQuU2arG')).toEqual(detail)
  })

  it('라운드 PGN을 GameRecord로 바꾼다', async () => {
    server.use(http.get('https://lichess.org/api/broadcast/round/zwtIOEd2.pgn', () => HttpResponse.text(ROUND_PGN)))
    const [g1, g2] = await getRoundGames('zwtIOEd2')
    expect(g1.ref).toEqual({ kind: 'broadcast', roundId: 'zwtIOEd2', gameId: '3YNrJV1C' })
    expect(g1).toMatchObject({
      white: { name: 'Joku, Liberty' },
      black: { name: 'Rodriguez Guevara, Celia M.', rating: 1811, title: 'WCM' },
      result: '1/2-1/2',
      date: '2026-09-09',
      variant: 'standard',
      event: 'Olymp 2026 Women',
    })
    expect(g1.white.rating).toBeUndefined()
    expect(g2).toMatchObject({ result: '*', ref: { gameId: 'XyZ12345' } })
  })
})

describe('isHighlighted', () => {
  it('올림피아드·월챔·캔디데이츠', () => {
    expect(isHighlighted(OLYMPIAD)).toBe(true)
    expect(isHighlighted({ ...OTHER, name: 'FIDE World Championship 2026' })).toBe(true)
    expect(isHighlighted({ ...OTHER, name: 'FIDE Candidates Tournament' })).toBe(true)
    expect(isHighlighted(OTHER)).toBe(false)
  })
})
```

- [ ] **Step 2: 실패 확인 후 구현**

Run: `npx vitest run src/sources/broadcast.test.ts` → FAIL

```ts
import { normalizeResult, parseHeaders } from '../chess/pgn'
import type { GameRecord, Player } from '../chess/types'
import { getJson, getText } from './http'
import { LICHESS } from './lichess'

export interface BroadcastTour {
  id: string
  name: string
  slug: string
  dates?: number[]
  tier?: number
  image?: string
}
export interface BroadcastRound {
  id: string
  name: string
  startsAt?: number
  finished?: boolean
  ongoing?: boolean
}
export interface BroadcastTourDetail {
  tour: BroadcastTour
  rounds: BroadcastRound[]
  defaultRoundId?: string
}
interface Entry {
  tour: BroadcastTour
}

export async function listTopBroadcasts(signal?: AbortSignal): Promise<{ active: BroadcastTour[]; past: BroadcastTour[] }> {
  const d = await getJson<{ active: Entry[]; past: { currentPageResults: Entry[] } }>(`${LICHESS}/api/broadcast/top`, { signal })
  return { active: d.active.map((e) => e.tour), past: d.past.currentPageResults.map((e) => e.tour) }
}

export async function searchBroadcasts(q: string, signal?: AbortSignal): Promise<BroadcastTour[]> {
  const d = await getJson<{ currentPageResults: Entry[] }>(
    `${LICHESS}/api/broadcast/search?q=${encodeURIComponent(q)}`,
    { signal },
  )
  return d.currentPageResults.map((e) => e.tour)
}

export function getBroadcastTour(id: string, signal?: AbortSignal): Promise<BroadcastTourDetail> {
  return getJson<BroadcastTourDetail>(`${LICHESS}/api/broadcast/${encodeURIComponent(id)}`, { signal })
}

export async function getRoundGames(roundId: string, signal?: AbortSignal): Promise<GameRecord[]> {
  const text = await getText(`${LICHESS}/api/broadcast/round/${encodeURIComponent(roundId)}.pgn`, { signal })
  return splitPgn(text).map((pgn, i) => broadcastPgnToRecord(roundId, pgn, i))
}

export function splitPgn(text: string): string[] {
  return text
    .split(/\r?\n\s*\r?\n(?=\[)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

const HIGHLIGHT = /olympiad|world championship|candidates/i

export function isHighlighted(tour: BroadcastTour): boolean {
  return HIGHLIGHT.test(tour.name)
}

function broadcastPgnToRecord(roundId: string, pgn: string, index: number): GameRecord {
  const h = parseHeaders(pgn)
  const gameId = h.GameURL?.split('/').pop() || `g${index}`
  return {
    ref: { kind: 'broadcast', roundId, gameId },
    white: toPlayer(h.White, h.WhiteElo, h.WhiteTitle),
    black: toPlayer(h.Black, h.BlackElo, h.BlackTitle),
    result: normalizeResult(h.Result),
    date: (h.Date ?? '').replace(/\./g, '-'),
    speed: 'unknown',
    timeControl: h.TimeControl,
    variant: (h.Variant ?? 'Standard').toLowerCase() === 'standard' ? 'standard' : 'other',
    event: h.Event,
    pgn,
  }
}

function toPlayer(name = '?', elo?: string, title?: string): Player {
  const rating = Number(elo)
  return { name, rating: rating > 0 ? rating : undefined, title: title || undefined }
}
```

Run: `npx vitest run src/sources/broadcast.test.ts` → PASS

- [ ] **Step 3: 커밋**

```bash
git add src/sources/broadcast.ts src/sources/broadcast.test.ts
git commit -m "feat(sources): Lichess 브로드캐스트 대회·라운드 어댑터" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: 명국 컬렉션 시드와 getGame 디스패처

**Files:**
- Create: `src/data/classics.json`, `src/sources/classics.ts`, `src/sources/index.ts`
- Test: `src/sources/classics.test.ts`, `src/sources/index.test.ts`

**Interfaces:**
- Consumes: `classicOfTheDay` (Task 4), `pgnToPlies`, `parseHeaders`, `normalizeResult` (Task 3), 모든 어댑터 (Task 10–12), `refKey` (Task 2)
- Produces:
  - `interface Classic { slug: string; title: string; white: string; black: string; year: number; event?: string; summaryKo: string; pgn: string }`
  - `classics: Classic[]` (연도순), `getClassic(slug): Classic | undefined`, `classicToRecord(c: Classic): GameRecord`, `todaysClassic(now?: Date): Classic`
  - `queryKeys` (`game`, `lichessGame`, `chesscomArchives`, `chesscomMonth`, `broadcastTop`, `broadcastSearch`, `broadcastTour`, `broadcastRound`)
  - `getGame(ref: GameRef, qc: QueryClient): Promise<GameRecord>`

- [ ] **Step 1: 시드 데이터 작성** (`src/data/classics.json`)

세 PGN 모두 chess.js로 합법 수순인지, 마지막 수가 체크메이트인지 확인한 것이다. Task 24에서 30판으로 늘린다.

```json
[
  {
    "slug": "immortal-game",
    "title": "불멸의 대국",
    "white": "Adolf Anderssen",
    "black": "Lionel Kieseritzky",
    "year": 1851,
    "event": "London (casual)",
    "summaryKo": "런던 대회 기간에 둔 친선 대국입니다. 앤더슨은 비숍과 룩 두 개, 마지막에는 퀸까지 내주고 남은 소수 기물만으로 메이트를 완성했습니다. 낭만주의 체스를 대표하는 대국으로 꼽힙니다.",
    "pgn": "[Event \"London casual game\"]\n[Site \"London\"]\n[Date \"1851.06.21\"]\n[White \"Adolf Anderssen\"]\n[Black \"Lionel Kieseritzky\"]\n[Result \"1-0\"]\n\n1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7# 1-0"
  },
  {
    "slug": "evergreen-game",
    "title": "상록수 대국",
    "white": "Adolf Anderssen",
    "black": "Jean Dufresne",
    "year": 1852,
    "event": "Berlin",
    "summaryKo": "에반스 갬빗으로 시작해 앤더슨이 킹을 노리는 공격을 쉬지 않고 이어 간 대국입니다. 퀸을 희생한 뒤 비숍 두 개로 마무리하는 장면이 특히 유명합니다. 슈타이니츠가 '앤더슨의 월계관에 늘 푸른 잎'이라고 평한 데서 이름이 붙었습니다.",
    "pgn": "[Event \"Berlin\"]\n[Site \"Berlin\"]\n[Date \"1852.??.??\"]\n[White \"Adolf Anderssen\"]\n[Black \"Jean Dufresne\"]\n[Result \"1-0\"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O d3 8. Qb3 Qf6 9. e5 Qg6 10. Re1 Nge7 11. Ba3 b5 12. Qxb5 Rb8 13. Qa4 Bb6 14. Nbd2 Bb7 15. Ne4 Qf5 16. Bxd3 Qh5 17. Nf6+ gxf6 18. exf6 Rg8 19. Rad1 Qxf3 20. Rxe7+ Nxe7 21. Qxd7+ Kxd7 22. Bf5+ Ke8 23. Bd7+ Kf8 24. Bxe7# 1-0"
  },
  {
    "slug": "opera-game",
    "title": "오페라 게임",
    "white": "Paul Morphy",
    "black": "Duke Karl / Count Isouard",
    "year": 1858,
    "event": "Paris Opera",
    "summaryKo": "파리 오페라 극장 귀빈석에서 공연 도중 둔 대국입니다. 모피는 빠른 전개와 오픈 파일 장악, 적절한 기물 희생으로 17수 만에 메이트를 만들었습니다. 오프닝 원칙을 설명할 때 지금도 가장 먼저 소개되는 교본 같은 대국입니다.",
    "pgn": "[Event \"Paris\"]\n[Site \"Paris Opera\"]\n[Date \"1858.??.??\"]\n[White \"Paul Morphy\"]\n[Black \"Duke Karl / Count Isouard\"]\n[Result \"1-0\"]\n\n1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0"
  }
]
```

- [ ] **Step 2: 실패하는 데이터 검증 테스트 작성** (`src/sources/classics.test.ts`)

```ts
import { describe, expect, it } from 'vitest'
import { parseHeaders, pgnToPlies } from '../chess/pgn'
import { classics, classicToRecord, getClassic, todaysClassic } from './classics'

/** Task 24에서 30으로 올린다 */
const MIN_CLASSICS = 3

describe('classics.json 데이터 검증', () => {
  it(`최소 ${MIN_CLASSICS}판`, () => {
    expect(classics.length).toBeGreaterThanOrEqual(MIN_CLASSICS)
  })
  it('slug는 유일한 kebab-case', () => {
    const slugs = classics.map((c) => c.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })
  it.each(classics.map((c) => [c.slug, c] as const))('%s: 필수 필드·합법 수순·주석 없음', (_, c) => {
    expect(c.title.trim()).not.toBe('')
    expect(c.white.trim()).not.toBe('')
    expect(c.black.trim()).not.toBe('')
    expect(c.year).toBeGreaterThanOrEqual(1600)
    expect(c.year).toBeLessThanOrEqual(2100)
    expect(c.summaryKo.length).toBeGreaterThanOrEqual(40)
    expect(['1-0', '0-1', '1/2-1/2']).toContain(parseHeaders(c.pgn).Result)
    const movetext = c.pgn.replace(/^\[.*\]$/gm, '')
    expect(movetext).not.toMatch(/[{};()$]/)
    expect(pgnToPlies(c.pgn).length).toBeGreaterThan(1)
  })
})

describe('classics API', () => {
  it('연도순 정렬', () => {
    const years = classics.map((c) => c.year)
    expect(years).toEqual([...years].sort((a, b) => a - b))
  })
  it('getClassic / classicToRecord', () => {
    const c = getClassic('opera-game')!
    expect(classicToRecord(c)).toMatchObject({
      ref: { kind: 'classic', slug: 'opera-game' },
      white: { name: 'Paul Morphy' },
      result: '1-0',
      date: '1858',
      variant: 'standard',
      speed: 'classical',
    })
    expect(getClassic('nope')).toBeUndefined()
  })
  it('todaysClassic은 컬렉션 안의 대국', () => {
    expect(classics).toContain(todaysClassic(new Date('2026-09-30T00:00:00Z')))
  })
})
```

- [ ] **Step 3: getGame 테스트 작성** (`src/sources/index.test.ts`)

```ts
import { QueryClient } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { useMswServer } from '../test/msw'
import { getGame } from './index'

const server = useMswServer()
const qc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

function cc(uuid: string) {
  return {
    url: '',
    pgn: '1. e4 *',
    time_control: '60',
    end_time: 1788880073,
    uuid,
    time_class: 'bullet',
    rules: 'chess',
    white: { username: 'a', rating: 1, result: 'win' },
    black: { username: 'b', rating: 1, result: 'resigned' },
  }
}

describe('getGame', () => {
  it('classic', async () => {
    const g = await getGame({ kind: 'classic', slug: 'opera-game' }, qc())
    expect(g.white.name).toBe('Paul Morphy')
  })

  it('없는 classic은 not_found', async () => {
    await expect(getGame({ kind: 'classic', slug: 'nope' }, qc())).rejects.toMatchObject({ kind: 'not_found' })
  })

  it('같은 달의 Chess.com 대국은 아카이브를 한 번만 받는다', async () => {
    let calls = 0
    server.use(
      http.get('https://api.chess.com/pub/player/hikaru/games/2026/09', () => {
        calls++
        return HttpResponse.json({ games: [cc('u1'), cc('u2')] })
      }),
    )
    const client = qc()
    const a = await getGame({ kind: 'chesscom', user: 'hikaru', yyyy: '2026', mm: '09', uuid: 'u1' }, client)
    const b = await getGame({ kind: 'chesscom', user: 'hikaru', yyyy: '2026', mm: '09', uuid: 'u2' }, client)
    expect([a.ref, b.ref].map((r) => r.kind === 'chesscom' && r.uuid)).toEqual(['u1', 'u2'])
    expect(calls).toBe(1)
  })

  it('broadcast 라운드에서 gameId로 찾는다', async () => {
    server.use(
      http.get('https://lichess.org/api/broadcast/round/r1.pgn', () =>
        HttpResponse.text('[White "A"]\n[Black "B"]\n[Result "*"]\n[GameURL "https://lichess.org/broadcast/x/y/r1/g9"]\n\n1. e4 *\n'),
      ),
    )
    const g = await getGame({ kind: 'broadcast', roundId: 'r1', gameId: 'g9' }, qc())
    expect(g.white.name).toBe('A')
    await expect(getGame({ kind: 'broadcast', roundId: 'r1', gameId: 'zz' }, qc())).rejects.toMatchObject({ kind: 'not_found' })
  })

  it('lichess', async () => {
    server.use(
      http.get('https://lichess.org/game/export/abc', () =>
        HttpResponse.json({
          id: 'abc',
          variant: 'standard',
          speed: 'blitz',
          createdAt: 0,
          status: 'mate',
          winner: 'white',
          players: { white: { user: { name: 'w' } }, black: { user: { name: 'b' } } },
          pgn: '1. e4 *',
        }),
      ),
    )
    expect((await getGame({ kind: 'lichess', id: 'abc' }, qc())).pgn).toBe('1. e4 *')
  })
})
```

- [ ] **Step 4: 실패 확인**

Run: `npx vitest run src/sources/classics.test.ts src/sources/index.test.ts` → FAIL (import 오류)

- [ ] **Step 5: 구현**

`src/sources/classics.ts`:
```ts
import { classicOfTheDay } from '../chess/daily'
import { normalizeResult, parseHeaders } from '../chess/pgn'
import type { GameRecord } from '../chess/types'
import data from '../data/classics.json'

export interface Classic {
  slug: string
  title: string
  white: string
  black: string
  year: number
  event?: string
  summaryKo: string
  pgn: string
}

export const classics: Classic[] = [...(data as Classic[])].sort((a, b) => a.year - b.year)

export function getClassic(slug: string): Classic | undefined {
  return classics.find((c) => c.slug === slug)
}

export function classicToRecord(c: Classic): GameRecord {
  return {
    ref: { kind: 'classic', slug: c.slug },
    white: { name: c.white },
    black: { name: c.black },
    result: normalizeResult(parseHeaders(c.pgn).Result),
    date: String(c.year),
    speed: 'classical',
    variant: 'standard',
    event: c.event,
    pgn: c.pgn,
  }
}

export function todaysClassic(now: Date = new Date()): Classic {
  return classicOfTheDay(classics, now)
}
```

`src/sources/index.ts`:
```ts
import type { QueryClient } from '@tanstack/react-query'
import { refKey, type GameRef } from '../chess/gameRef'
import type { GameRecord } from '../chess/types'
import { getRoundGames } from './broadcast'
import { fetchChesscomMonth, findInMonth } from './chesscom'
import { classicToRecord, getClassic } from './classics'
import { HttpError } from './http'
import { getLichessGame } from './lichess'

export const queryKeys = {
  game: (ref: GameRef) => ['game', refKey(ref)] as const,
  lichessGame: (id: string) => ['lichess', 'game', id] as const,
  chesscomArchives: (user: string) => ['chesscom', 'archives', user.toLowerCase()] as const,
  chesscomMonth: (user: string, yyyy: string, mm: string) => ['chesscom', 'month', user.toLowerCase(), yyyy, mm] as const,
  broadcastTop: () => ['broadcast', 'top'] as const,
  broadcastSearch: (q: string) => ['broadcast', 'search', q] as const,
  broadcastTour: (id: string) => ['broadcast', 'tour', id] as const,
  broadcastRound: (id: string) => ['broadcast', 'round', id] as const,
}

export async function getGame(ref: GameRef, qc: QueryClient): Promise<GameRecord> {
  switch (ref.kind) {
    case 'lichess':
      return qc.fetchQuery({
        queryKey: queryKeys.lichessGame(ref.id),
        queryFn: ({ signal }) => getLichessGame(ref.id, signal),
        staleTime: Infinity,
      })
    case 'chesscom': {
      const month = await qc.fetchQuery({
        queryKey: queryKeys.chesscomMonth(ref.user, ref.yyyy, ref.mm),
        queryFn: ({ signal }) => fetchChesscomMonth(ref.user, ref.yyyy, ref.mm, signal),
        staleTime: 60_000,
      })
      return findInMonth(month, ref.uuid)
    }
    case 'broadcast': {
      const games = await qc.fetchQuery({
        queryKey: queryKeys.broadcastRound(ref.roundId),
        queryFn: ({ signal }) => getRoundGames(ref.roundId, signal),
        staleTime: 30_000,
      })
      const found = games.find((g) => g.ref.kind === 'broadcast' && g.ref.gameId === ref.gameId)
      if (!found) throw new HttpError('not_found', 404, `대국 ${ref.gameId}를 찾을 수 없습니다`)
      return found
    }
    case 'classic': {
      const c = getClassic(ref.slug)
      if (!c) throw new HttpError('not_found', 404, `명국 ${ref.slug}를 찾을 수 없습니다`)
      return classicToRecord(c)
    }
  }
}
```

- [ ] **Step 6: 통과 확인**

Run: `npx vitest run src/sources` → PASS

- [ ] **Step 7: 커밋**

```bash
git add src/data src/sources/classics.ts src/sources/classics.test.ts src/sources/index.ts src/sources/index.test.ts
git commit -m "feat(sources): 명국 시드 3판, 데이터 검증, getGame 디스패처" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: 분기 대국 상태 전이 (순수 로직)

**Files:**
- Create: `src/chess/fork.ts`
- Test: `src/chess/fork.test.ts`

**Interfaces:**
- Consumes: `GameRef`, `Color`, `Result`, `Ply` (Task 2), `turnOf`, `uciToMove` (Task 3)
- Produces:
  - `ELO_MIN = 1320`, `ELO_MAX = 3190`, `DEFAULT_ELO = 1800`
  - `type EndReason = 'checkmate' | 'stalemate' | 'threefold' | 'fifty' | 'insufficient' | 'resign'`
  - `interface ForkRecord { id: string; title: string; origin: GameRef; originPly: number; startFen: string; moves: string[]; playerColor: Color; engineElo: number; result: Result; endReason?: EndReason; createdAt: number; updatedAt: number }`
  - `interface ForkStatus { over: boolean; result: Result; reason?: EndReason; fen: string; turn: Color; check: boolean; lastMove: string | null }`
  - `class IllegalMoveError extends Error`
  - `createFork(input: { origin; originPly; startFen; playerColor; engineElo; title }, now?: number, id?: string): ForkRecord`
  - `forkStatus(fork): ForkStatus`, `applyMove(fork, uci, now?): ForkRecord`, `takeback(fork, now?): ForkRecord`, `resign(fork, now?): ForkRecord`
  - `toUci(fen, from, to): string` (폰 승진은 `q` 자동), `legalDests(fen): Map<string, string[]>`
  - `movetimeFor(elo: number): number` (300~1500ms)
  - `forkPlies(fork): Ply[]`, `forkToPgn(fork): string`, `engineName(elo): string`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { describe, expect, it } from 'vitest'
import {
  applyMove,
  createFork,
  ELO_MAX,
  ELO_MIN,
  forkPlies,
  forkStatus,
  forkToPgn,
  IllegalMoveError,
  legalDests,
  movetimeFor,
  resign,
  takeback,
  toUci,
  type ForkRecord,
} from './fork'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const MATE_IN_1 = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'

function fork(over: Partial<ForkRecord> = {}): ForkRecord {
  return {
    ...createFork(
      { origin: { kind: 'classic', slug: 'opera-game' }, originPly: 0, startFen: START, playerColor: 'white', engineElo: 1500, title: 't' },
      1000,
      'id-1',
    ),
    ...over,
  }
}

describe('createFork', () => {
  it('초기 상태', () => {
    expect(fork()).toEqual({
      id: 'id-1',
      title: 't',
      origin: { kind: 'classic', slug: 'opera-game' },
      originPly: 0,
      startFen: START,
      moves: [],
      playerColor: 'white',
      engineElo: 1500,
      result: '*',
      createdAt: 1000,
      updatedAt: 1000,
    })
  })
})

describe('applyMove / forkStatus', () => {
  it('수를 더하고 차례가 바뀐다', () => {
    const f = applyMove(fork(), 'e2e4', 2000)
    expect(f.moves).toEqual(['e2e4'])
    expect(f.updatedAt).toBe(2000)
    expect(forkStatus(f)).toMatchObject({ over: false, turn: 'black', lastMove: 'e2e4', check: false })
  })
  it('불법 수는 IllegalMoveError', () => {
    expect(() => applyMove(fork(), 'e2e5')).toThrow(IllegalMoveError)
  })
  it('체크메이트면 결과를 기록한다', () => {
    const f = applyMove(fork({ startFen: MATE_IN_1 }), 'a1a8')
    expect(f).toMatchObject({ result: '1-0', endReason: 'checkmate' })
    expect(forkStatus(f)).toMatchObject({ over: true, result: '1-0', reason: 'checkmate', check: true })
  })
  it('3회 반복', () => {
    let f = fork()
    for (const m of ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8']) f = applyMove(f, m)
    expect(f).toMatchObject({ result: '1/2-1/2', endReason: 'threefold' })
  })
})

describe('takeback', () => {
  it('내 차례면 엔진 수와 내 수를 되돌린다', () => {
    const f = takeback(fork({ moves: ['e2e4', 'e7e5'] }))
    expect(f.moves).toEqual([])
  })
  it('엔진 차례(내가 방금 둠)면 내 수 하나만', () => {
    expect(takeback(fork({ moves: ['e2e4', 'e7e5', 'g1f3'] })).moves).toEqual(['e2e4', 'e7e5'])
  })
  it('내가 흑이고 엔진이 먼저 둔 경우', () => {
    const f = fork({ playerColor: 'black', moves: ['e2e4', 'e7e5', 'g1f3'] })
    expect(takeback(f).moves).toEqual(['e2e4'])
  })
  it('내 수가 없으면 그대로', () => {
    const f = fork({ playerColor: 'black', moves: ['e2e4'] })
    expect(takeback(f)).toBe(f)
  })
  it('종료 상태를 해제한다', () => {
    const f = takeback(applyMove(fork({ startFen: MATE_IN_1 }), 'a1a8'))
    expect(f).toMatchObject({ moves: [], result: '*', endReason: undefined })
  })
})

describe('resign', () => {
  it('내가 백이면 0-1', () => {
    expect(resign(fork())).toMatchObject({ result: '0-1', endReason: 'resign' })
    expect(forkStatus(resign(fork()))).toMatchObject({ over: true, reason: 'resign' })
  })
})

describe('보조 함수', () => {
  it('toUci는 폰 승진을 퀸으로', () => {
    expect(toUci('4k3/P7/8/8/8/8/8/4K3 w - - 0 1', 'a7', 'a8')).toBe('a7a8q')
    expect(toUci(START, 'e2', 'e4')).toBe('e2e4')
  })
  it('legalDests', () => {
    const dests = legalDests(START)
    expect(dests.get('e2')?.sort()).toEqual(['e3', 'e4'])
    expect(dests.get('g1')?.sort()).toEqual(['f3', 'h3'])
  })
  it('movetimeFor 범위', () => {
    expect(movetimeFor(ELO_MIN)).toBe(300)
    expect(movetimeFor(ELO_MAX)).toBe(1500)
  })
  it('forkPlies', () => {
    const plies = forkPlies(fork({ moves: ['e2e4', 'e7e5'] }))
    expect(plies.map((p) => p.san)).toEqual([null, 'e4', 'e5'])
  })
  it('forkToPgn은 시작 FEN과 결과를 담는다', () => {
    const pgn = forkToPgn(applyMove(fork({ startFen: MATE_IN_1 }), 'a1a8'))
    expect(pgn).toContain(`[FEN "${MATE_IN_1}"]`)
    expect(pgn).toContain('[Result "1-0"]')
    expect(pgn).toContain('[White "You"]')
    expect(pgn).toContain('[Black "Stockfish (Elo 1500)"]')
    expect(pgn).toContain('1. Ra8#')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/chess/fork.test.ts` → FAIL

- [ ] **Step 3: 구현**

```ts
import { Chess } from 'chess.js'
import type { GameRef } from './gameRef'
import { turnOf, uciToMove } from './pgn'
import type { Color, Ply, Result } from './types'

export const ELO_MIN = 1320
export const ELO_MAX = 3190
export const DEFAULT_ELO = 1800

export type EndReason = 'checkmate' | 'stalemate' | 'threefold' | 'fifty' | 'insufficient' | 'resign'

export interface ForkRecord {
  id: string
  title: string
  origin: GameRef
  originPly: number
  startFen: string
  /** UCI */
  moves: string[]
  playerColor: Color
  engineElo: number
  result: Result
  endReason?: EndReason
  createdAt: number
  updatedAt: number
}

export interface ForkStatus {
  over: boolean
  result: Result
  reason?: EndReason
  fen: string
  turn: Color
  check: boolean
  lastMove: string | null
}

export class IllegalMoveError extends Error {
  constructor(uci: string) {
    super(`불법 수: ${uci}`)
    this.name = 'IllegalMoveError'
  }
}

export function createFork(
  input: Pick<ForkRecord, 'origin' | 'originPly' | 'startFen' | 'playerColor' | 'engineElo' | 'title'>,
  now = Date.now(),
  id: string = crypto.randomUUID(),
): ForkRecord {
  return { id, ...input, moves: [], result: '*', createdAt: now, updatedAt: now }
}

function replay(startFen: string, moves: string[]): Chess {
  const chess = new Chess(startFen)
  for (const m of moves) chess.move(uciToMove(m))
  return chess
}

export function forkStatus(fork: ForkRecord): ForkStatus {
  const c = replay(fork.startFen, fork.moves)
  const turn: Color = c.turn() === 'w' ? 'white' : 'black'
  const base = { fen: c.fen(), turn, check: c.inCheck(), lastMove: fork.moves.at(-1) ?? null }
  if (fork.endReason === 'resign') return { ...base, over: true, result: fork.result, reason: 'resign' }
  if (c.isCheckmate()) return { ...base, over: true, result: turn === 'white' ? '0-1' : '1-0', reason: 'checkmate' }
  if (c.isStalemate()) return { ...base, over: true, result: '1/2-1/2', reason: 'stalemate' }
  if (c.isInsufficientMaterial()) return { ...base, over: true, result: '1/2-1/2', reason: 'insufficient' }
  if (c.isThreefoldRepetition()) return { ...base, over: true, result: '1/2-1/2', reason: 'threefold' }
  if (c.isDrawByFiftyMoves()) return { ...base, over: true, result: '1/2-1/2', reason: 'fifty' }
  return { ...base, over: false, result: '*' }
}

export function applyMove(fork: ForkRecord, uci: string, now = Date.now()): ForkRecord {
  const c = replay(fork.startFen, fork.moves)
  try {
    c.move(uciToMove(uci))
  } catch {
    throw new IllegalMoveError(uci)
  }
  const next: ForkRecord = { ...fork, moves: [...fork.moves, uci], updatedAt: now }
  const s = forkStatus(next)
  return s.over ? { ...next, result: s.result, endReason: s.reason } : next
}

export function takeback(fork: ForkRecord, now = Date.now()): ForkRecord {
  const startTurn: Color = turnOf(fork.startFen) === 'w' ? 'white' : 'black'
  const moverOf = (index: number): Color => (index % 2 === 0 ? startTurn : opposite(startTurn))
  const moves = [...fork.moves]
  let removedPlayerMove = false
  while (moves.length > 0) {
    const mover = moverOf(moves.length - 1)
    moves.pop()
    if (mover === fork.playerColor) removedPlayerMove = true
    if (removedPlayerMove && moverOf(moves.length) === fork.playerColor) break
  }
  if (!removedPlayerMove) return fork
  return { ...fork, moves, result: '*', endReason: undefined, updatedAt: now }
}

export function resign(fork: ForkRecord, now = Date.now()): ForkRecord {
  return { ...fork, result: fork.playerColor === 'white' ? '0-1' : '1-0', endReason: 'resign', updatedAt: now }
}

export function toUci(fen: string, from: string, to: string): string {
  const piece = new Chess(fen).get(from as Parameters<Chess['get']>[0])
  const promotes = piece?.type === 'p' && (to[1] === '8' || to[1] === '1')
  return `${from}${to}${promotes ? 'q' : ''}`
}

export function legalDests(fen: string): Map<string, string[]> {
  const dests = new Map<string, string[]>()
  for (const m of new Chess(fen).moves({ verbose: true })) {
    const list = dests.get(m.from) ?? []
    if (!list.includes(m.to)) list.push(m.to)
    dests.set(m.from, list)
  }
  return dests
}

export function movetimeFor(elo: number): number {
  const t = (Math.min(ELO_MAX, Math.max(ELO_MIN, elo)) - ELO_MIN) / (ELO_MAX - ELO_MIN)
  return Math.round(300 + t * 1200)
}

export function forkPlies(fork: ForkRecord): Ply[] {
  const chess = new Chess(fork.startFen)
  const plies: Ply[] = [{ san: null, uci: null, fen: fork.startFen }]
  for (const uci of fork.moves) {
    const m = chess.move(uciToMove(uci))
    plies.push({ san: m.san, uci, fen: m.after })
  }
  return plies
}

export function engineName(elo: number): string {
  return `Stockfish (Elo ${elo})`
}

export function forkToPgn(fork: ForkRecord): string {
  const c = replay(fork.startFen, fork.moves)
  const engine = engineName(fork.engineElo)
  c.setHeader('Event', 'Chessling fork')
  c.setHeader('Site', 'Chessling')
  c.setHeader('Date', new Date(fork.createdAt).toISOString().slice(0, 10).replace(/-/g, '.'))
  c.setHeader('White', fork.playerColor === 'white' ? 'You' : engine)
  c.setHeader('Black', fork.playerColor === 'black' ? 'You' : engine)
  c.setHeader('Result', fork.result)
  return c.pgn()
}

function opposite(c: Color): Color {
  return c === 'white' ? 'black' : 'white'
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/chess/fork.test.ts` → PASS

- [ ] **Step 5: 커밋**

```bash
git add src/chess/fork.ts src/chess/fork.test.ts
git commit -m "feat(chess): 분기 대국 상태 전이 (수·무르기·기권·종료 판정·PGN)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: IndexedDB 저장소와 메모리 폴백

**Files:**
- Create: `src/storage/db.ts`
- Test: `src/storage/db.test.ts`

**Interfaces:**
- Consumes: `ForkRecord` (Task 14), `GameReview` 타입 (Task 7)
- Produces:
  - `interface ReviewRecord { key: string; depth: number; review: GameReview; createdAt: number }`
  - `interface Store { readonly persistent: boolean; forks: { get(id); put(fork); list() /* updatedAt 내림차순 */; delete(id) }; reviews: { get(key); put(record) } }`
  - `openDexieStore(name?: string): Promise<Store>`, `createMemoryStore(): Store`, `openStore(name?, open?): Promise<Store>` (실패 시 메모리 폴백)

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { createFork } from '../chess/fork'
import { createMemoryStore, openDexieStore, openStore, type Store } from './db'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const fork = (id: string, updatedAt: number) => ({
  ...createFork(
    { origin: { kind: 'classic' as const, slug: 'opera-game' }, originPly: 3, startFen: START, playerColor: 'white' as const, engineElo: 1800, title: id },
    updatedAt,
    id,
  ),
})

describe.each<[string, () => Promise<Store>]>([
  ['dexie', () => openDexieStore(`test-${crypto.randomUUID()}`)],
  ['memory', async () => createMemoryStore()],
])('%s store', (name, make) => {
  it('persistent 플래그', async () => {
    expect((await make()).persistent).toBe(name === 'dexie')
  })

  it('fork put/get/list/delete', async () => {
    const store = await make()
    await store.forks.put(fork('a', 1))
    await store.forks.put(fork('b', 3))
    await store.forks.put(fork('c', 2))
    expect((await store.forks.get('a'))?.originPly).toBe(3)
    expect((await store.forks.list()).map((f) => f.id)).toEqual(['b', 'c', 'a'])
    await store.forks.delete('b')
    expect(await store.forks.get('b')).toBeUndefined()
  })

  it('저장한 뒤 원본을 바꿔도 저장본은 그대로', async () => {
    const store = await make()
    const f = fork('a', 1)
    await store.forks.put(f)
    f.moves.push('e2e4')
    expect((await store.forks.get('a'))?.moves).toEqual([])
  })

  it('review put/get', async () => {
    const store = await make()
    const review = { depth: 14, positions: [{ score: { cp: 0 }, best: null }], labels: [null], accuracy: { white: null, black: null } }
    await store.reviews.put({ key: 'classic/opera-game', depth: 14, review, createdAt: 1 })
    expect((await store.reviews.get('classic/opera-game'))?.review).toEqual(review)
    expect(await store.reviews.get('nope')).toBeUndefined()
  })
})

describe('openStore', () => {
  it('IndexedDB를 열 수 없으면 메모리 저장소로 대체한다', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = await openStore('x', () => Promise.reject(new Error('blocked')))
    expect(store.persistent).toBe(false)
  })
})
```

- [ ] **Step 2: 실패 확인 후 구현**

Run: `npx vitest run src/storage/db.test.ts` → FAIL

```ts
import Dexie, { type EntityTable } from 'dexie'
import type { ForkRecord } from '../chess/fork'
import type { GameReview } from '../engine/review'

export interface ReviewRecord {
  key: string
  depth: number
  review: GameReview
  createdAt: number
}

export interface Store {
  readonly persistent: boolean
  forks: {
    get(id: string): Promise<ForkRecord | undefined>
    put(fork: ForkRecord): Promise<void>
    /** updatedAt 내림차순 */
    list(): Promise<ForkRecord[]>
    delete(id: string): Promise<void>
  }
  reviews: {
    get(key: string): Promise<ReviewRecord | undefined>
    put(record: ReviewRecord): Promise<void>
  }
}

class ChesslingDb extends Dexie {
  forks!: EntityTable<ForkRecord, 'id'>
  reviews!: EntityTable<ReviewRecord, 'key'>

  constructor(name: string) {
    super(name)
    this.version(1).stores({ forks: 'id, updatedAt', reviews: 'key' })
  }
}

export async function openDexieStore(name = 'chessling'): Promise<Store> {
  const db = new ChesslingDb(name)
  await db.open()
  return {
    persistent: true,
    forks: {
      get: (id) => db.forks.get(id),
      put: async (fork) => {
        await db.forks.put(fork)
      },
      list: () => db.forks.orderBy('updatedAt').reverse().toArray(),
      delete: (id) => db.forks.delete(id),
    },
    reviews: {
      get: (key) => db.reviews.get(key),
      put: async (record) => {
        await db.reviews.put(record)
      },
    },
  }
}

export function createMemoryStore(): Store {
  const forks = new Map<string, ForkRecord>()
  const reviews = new Map<string, ReviewRecord>()
  return {
    persistent: false,
    forks: {
      get: async (id) => clone(forks.get(id)),
      put: async (fork) => {
        forks.set(fork.id, structuredClone(fork))
      },
      list: async () => [...forks.values()].sort((a, b) => b.updatedAt - a.updatedAt).map((f) => structuredClone(f)),
      delete: async (id) => {
        forks.delete(id)
      },
    },
    reviews: {
      get: async (key) => clone(reviews.get(key)),
      put: async (record) => {
        reviews.set(record.key, structuredClone(record))
      },
    },
  }
}

export async function openStore(
  name = 'chessling',
  open: (name: string) => Promise<Store> = openDexieStore,
): Promise<Store> {
  try {
    return await open(name)
  } catch (e) {
    console.warn('[storage] IndexedDB를 쓸 수 없어 메모리 저장소를 사용합니다', e)
    return createMemoryStore()
  }
}

function clone<T>(value: T | undefined): T | undefined {
  return value === undefined ? undefined : structuredClone(value)
}
```

Run: `npx vitest run src/storage/db.test.ts` → PASS

- [ ] **Step 3: 마일스톤 A 전체 확인**

Run: `npm test && npx tsc --noEmit`
Expected: 전체 PASS, 타입 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/storage
git commit -m "feat(storage): Dexie 저장소와 메모리 폴백" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: 앱 셸 — Provider, 라우터, 레이아웃, 홈, 에러 화면

**Files:**
- Create: `src/app/queryClient.ts`, `src/app/StoreContext.tsx`, `src/app/EngineContext.tsx`, `src/app/AppProviders.tsx`, `src/app/Layout.tsx`, `src/app/routes.tsx`, `src/app/download.ts`, `src/components/Banner.tsx`, `src/components/ErrorView.tsx`, `src/features/home/HomePage.tsx`, `src/features/licenses/LicensesPage.tsx`, `src/features/NotFound.tsx`, `src/test/renderRoute.tsx`, `src/styles.css`
- Modify: `src/main.tsx` (전체 교체)
- Test: `src/app/queryClient.test.ts`, `src/components/ErrorView.test.tsx`, `src/features/home/HomePage.test.tsx`, `src/app/routes.test.tsx`

**Interfaces:**
- Consumes: `HttpError` (Task 10), `PgnError` (Task 3), `Store`, `openStore`, `createMemoryStore` (Task 15), `UciEngine`, `getAnalysisEngine`, `getPlayEngine` (Task 6·8), `FakeWorker` (Task 6), `todaysClassic` (Task 13), `refToPath` (Task 2)
- Produces:
  - `createQueryClient(): QueryClient`, `shouldRetry(failureCount, error): boolean`
  - `StoreProvider`, `useStore(): Store`
  - `interface Engines { analysis: UciEngine; play: UciEngine }`, `EngineProvider`, `useEngines(): Engines`
  - `AppProviders({ store, engines, queryClient, children })`
  - `routes: RouteObject[]` — 이후 태스크는 `children` 배열에서 `{ path: '*' }` **앞에** 경로를 추가한다
  - `downloadText(filename, text, type?)`
  - `Banner({ tone?: 'info' | 'warn', children })`, `ErrorView({ error, onRetry? })`
  - `NotFound`
  - 테스트 헬퍼 `renderRoute(path, { store?, engines?: Partial<Engines>, queryClient? })` → `{ router, store, engines, queryClient, ...RenderResult }`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/queryClient.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { PgnError } from '../chess/pgn'
import { HttpError } from '../sources/http'
import { shouldRetry } from './queryClient'

describe('shouldRetry', () => {
  it('server/network만 2회까지 재시도', () => {
    expect(shouldRetry(0, new HttpError('server', 500, ''))).toBe(true)
    expect(shouldRetry(1, new HttpError('network', 0, ''))).toBe(true)
    expect(shouldRetry(2, new HttpError('server', 500, ''))).toBe(false)
  })
  it('4xx·PGN 오류는 재시도하지 않는다', () => {
    expect(shouldRetry(0, new HttpError('not_found', 404, ''))).toBe(false)
    expect(shouldRetry(0, new HttpError('rate_limited', 429, ''))).toBe(false)
    expect(shouldRetry(0, new PgnError('x'))).toBe(false)
  })
})
```

`src/components/ErrorView.test.tsx`:
```tsx
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PgnError } from '../chess/pgn'
import { HttpError } from '../sources/http'
import { ErrorView } from './ErrorView'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('ErrorView', () => {
  it('not_found', () => {
    render(<ErrorView error={new HttpError('not_found', 404, 'x')} />)
    expect(screen.getByText(/찾을 수 없어요/)).toBeInTheDocument()
  })

  it('rate_limited는 60초 동안 재시도 버튼을 막는다', () => {
    vi.useFakeTimers()
    const onRetry = vi.fn()
    render(<ErrorView error={new HttpError('rate_limited', 429, 'x')} onRetry={onRetry} />)
    const button = screen.getByRole('button', { name: '다시 시도' })
    expect(button).toBeDisabled()
    expect(screen.getByText(/60초 후/)).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(59_000)
    })
    expect(button).toBeDisabled()
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(button).toBeEnabled()
    fireEvent.click(button)
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('PGN 오류', () => {
    render(<ErrorView error={new PgnError('bad')} />)
    expect(screen.getByText(/기보를 읽을 수 없어요/)).toBeInTheDocument()
  })
})
```

`src/features/home/HomePage.test.tsx`:
```tsx
// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { todaysClassic } from '../../sources/classics'
import { renderRoute } from '../../test/renderRoute'

afterEach(cleanup)

describe('HomePage', () => {
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

  it('오늘의 명국 카드', () => {
    renderRoute('/')
    const today = todaysClassic()
    expect(screen.getByRole('link', { name: today.title })).toHaveAttribute('href', `/game/classic/${today.slug}`)
  })

  it('메모리 저장소면 저장되지 않는다는 배너', () => {
    renderRoute('/')
    expect(screen.getByText(/저장되지 않아요/)).toBeInTheDocument()
  })
})
```

`src/app/routes.test.tsx`:
```tsx
// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'

afterEach(cleanup)

it('없는 경로는 NotFound', () => {
  renderRoute('/nope')
  expect(screen.getByRole('heading', { name: '페이지를 찾을 수 없어요' })).toBeInTheDocument()
})

it('라이선스 페이지', () => {
  renderRoute('/licenses')
  expect(screen.getByRole('heading', { name: '라이선스' })).toBeInTheDocument()
  expect(screen.getByText(/GPL-3.0-or-later/)).toBeInTheDocument()
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/app src/components src/features`
Expected: FAIL — import 오류

- [ ] **Step 3: 구현 — 인프라**

`src/app/queryClient.ts`:
```ts
import { QueryClient } from '@tanstack/react-query'
import { HttpError } from '../sources/http'

export function shouldRetry(failureCount: number, error: unknown): boolean {
  return error instanceof HttpError && (error.kind === 'server' || error.kind === 'network') && failureCount < 2
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: shouldRetry, refetchOnWindowFocus: false, staleTime: 60_000 } },
  })
}
```

`src/app/StoreContext.tsx`:
```tsx
import { createContext, useContext, type ReactNode } from 'react'
import type { Store } from '../storage/db'

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ store, children }: { store: Store; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('StoreProvider가 없습니다')
  return store
}
```

`src/app/EngineContext.tsx`:
```tsx
import { createContext, useContext, type ReactNode } from 'react'
import type { UciEngine } from '../engine/UciEngine'

export interface Engines {
  analysis: UciEngine
  play: UciEngine
}

const EngineContext = createContext<Engines | null>(null)

export function EngineProvider({ engines, children }: { engines: Engines; children: ReactNode }) {
  return <EngineContext.Provider value={engines}>{children}</EngineContext.Provider>
}

export function useEngines(): Engines {
  const engines = useContext(EngineContext)
  if (!engines) throw new Error('EngineProvider가 없습니다')
  return engines
}
```

`src/app/AppProviders.tsx`:
```tsx
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Store } from '../storage/db'
import { EngineProvider, type Engines } from './EngineContext'
import { StoreProvider } from './StoreContext'

export function AppProviders(props: { store: Store; engines: Engines; queryClient: QueryClient; children: ReactNode }) {
  return (
    <QueryClientProvider client={props.queryClient}>
      <StoreProvider store={props.store}>
        <EngineProvider engines={props.engines}>{props.children}</EngineProvider>
      </StoreProvider>
    </QueryClientProvider>
  )
}
```

`src/app/download.ts`:
```ts
export function downloadText(filename: string, text: string, type = 'application/x-chess-pgn'): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
```

`src/test/renderRoute.tsx`:
```tsx
import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppProviders } from '../app/AppProviders'
import type { Engines } from '../app/EngineContext'
import { routes } from '../app/routes'
import { FakeWorker } from '../engine/testing/fakeWorker'
import { UciEngine } from '../engine/UciEngine'
import { createMemoryStore, type Store } from '../storage/db'

export function renderRoute(
  path: string,
  opts: { store?: Store; engines?: Partial<Engines>; queryClient?: QueryClient } = {},
) {
  const store = opts.store ?? createMemoryStore()
  const engines: Engines = {
    analysis: opts.engines?.analysis ?? new UciEngine(() => new FakeWorker()),
    play: opts.engines?.play ?? new UciEngine(() => new FakeWorker()),
  }
  const queryClient = opts.queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const utils = render(
    <AppProviders store={store} engines={engines} queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { ...utils, router, store, engines, queryClient }
}
```

- [ ] **Step 4: 구현 — 공용 컴포넌트**

`src/components/Banner.tsx`:
```tsx
import type { ReactNode } from 'react'

export function Banner({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) {
  return (
    <div role="status" className={`banner banner-${tone}`}>
      {children}
    </div>
  )
}
```

`src/components/ErrorView.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { PgnError } from '../chess/pgn'
import { HttpError } from '../sources/http'

const RATE_LIMIT_WAIT_MS = 60_000

export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const kind = error instanceof HttpError ? error.kind : null
  const [deadline] = useState(() => (kind === 'rate_limited' ? Date.now() + RATE_LIMIT_WAIT_MS : 0))
  const [now, setNow] = useState(() => Date.now())
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000))
  const waiting = remaining > 0

  useEffect(() => {
    if (!waiting) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [waiting])

  return (
    <div className="error-view" role="alert">
      <p>{message(error, remaining)}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} disabled={waiting}>
          다시 시도
        </button>
      )}
    </div>
  )
}

function message(error: unknown, remaining: number): string {
  if (error instanceof PgnError) return '기보를 읽을 수 없어요.'
  if (error instanceof HttpError) {
    switch (error.kind) {
      case 'not_found':
        return '찾을 수 없어요. 아이디나 플랫폼을 확인해 주세요.'
      case 'rate_limited':
        return remaining > 0
          ? `요청이 너무 많아요. ${remaining}초 후에 다시 시도할 수 있어요.`
          : '이제 다시 시도할 수 있어요.'
      case 'network':
        return '네트워크에 연결할 수 없어요.'
      case 'server':
        return '서버에 문제가 있어요. 잠시 후 다시 시도해 주세요.'
    }
  }
  return error instanceof Error ? error.message : '알 수 없는 오류가 났어요.'
}
```

- [ ] **Step 5: 구현 — 화면과 라우터**

`src/features/NotFound.tsx`:
```tsx
import { Link } from 'react-router'

export function NotFound() {
  return (
    <div className="card">
      <h1>페이지를 찾을 수 없어요</h1>
      <Link to="/">홈으로</Link>
    </div>
  )
}
```

`src/features/home/HomePage.tsx`:
```tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { refToPath } from '../../chess/gameRef'
import { todaysClassic } from '../../sources/classics'

type Platform = 'chesscom' | 'lichess'

export function HomePage() {
  const navigate = useNavigate()
  const [platform, setPlatform] = useState<Platform>('chesscom')
  const [username, setUsername] = useState('')
  const today = todaysClassic()

  return (
    <div className="home">
      <section className="card">
        <h1>기보 불러오기</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const u = username.trim()
            if (u) navigate(`/player/${platform}/${encodeURIComponent(u)}`)
          }}
        >
          <fieldset className="segmented">
            <legend className="sr-only">플랫폼</legend>
            <label>
              <input type="radio" name="platform" checked={platform === 'chesscom'} onChange={() => setPlatform('chesscom')} />
              Chess.com
            </label>
            <label>
              <input type="radio" name="platform" checked={platform === 'lichess'} onChange={() => setPlatform('lichess')} />
              Lichess
            </label>
          </fieldset>
          <input aria-label="아이디" placeholder="아이디" value={username} onChange={(e) => setUsername(e.target.value)} />
          <button type="submit">불러오기</button>
        </form>
      </section>

      <section className="card">
        <h2>오늘의 명국</h2>
        <Link to={refToPath({ kind: 'classic', slug: today.slug })}>
          <strong>{today.title}</strong>
        </Link>
        <p className="meta">
          {today.white} vs {today.black} · {today.year}
        </p>
        <p>{today.summaryKo}</p>
      </section>

      <section className="card links">
        <Link to="/events">최근 대회 보기 →</Link>
        <Link to="/classics">명국 컬렉션 →</Link>
      </section>
    </div>
  )
}
```

`src/features/licenses/LicensesPage.tsx`:
```tsx
const SOURCE_URL = import.meta.env.VITE_SOURCE_URL

const DEPENDENCIES = [
  { name: 'Stockfish.js (Stockfish 19)', license: 'GPL-3.0', url: 'https://github.com/nmrugg/stockfish.js', copying: true },
  { name: 'chessground', license: 'GPL-3.0-or-later', url: 'https://github.com/lichess-org/chessground' },
  { name: 'chess.js', license: 'BSD-2-Clause', url: 'https://github.com/jhlywa/chess.js' },
  { name: 'React', license: 'MIT', url: 'https://react.dev' },
  { name: 'React Router', license: 'MIT', url: 'https://reactrouter.com' },
  { name: 'TanStack Query', license: 'MIT', url: 'https://tanstack.com/query' },
  { name: 'Dexie.js', license: 'Apache-2.0', url: 'https://dexie.org' },
]

export function LicensesPage() {
  return (
    <div className="card">
      <h1>라이선스</h1>
      <p>
        Chessling은 <a href="https://www.gnu.org/licenses/gpl-3.0.html">GPL-3.0-or-later</a> 라이선스로 배포되는 자유
        소프트웨어입니다.
      </p>
      <p>
        {SOURCE_URL ? (
          <>
            소스 코드: <a href={SOURCE_URL}>{SOURCE_URL}</a>
          </>
        ) : (
          '소스 코드 저장소 주소가 아직 설정되지 않았어요.'
        )}
      </p>
      <h2>사용한 오픈소스</h2>
      <ul>
        {DEPENDENCIES.map((d) => (
          <li key={d.name}>
            <a href={d.url}>{d.name}</a> — {d.license}
            {d.copying && (
              <>
                {' '}· <a href="/engine/COPYING.txt">라이선스 전문</a>
              </>
            )}
          </li>
        ))}
      </ul>
      <p>대국 데이터는 Chess.com 공개 API와 Lichess API에서 가져옵니다. 명국 소개 글은 Chessling이 직접 작성했습니다.</p>
    </div>
  )
}
```

`src/app/Layout.tsx`:
```tsx
import { Link, NavLink, Outlet } from 'react-router'
import { Banner } from '../components/Banner'
import { useStore } from './StoreContext'

export function Layout() {
  const store = useStore()
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          ♜ Chessling
        </Link>
        <nav>
          <NavLink to="/events">대회</NavLink>
          <NavLink to="/classics">명국</NavLink>
          <NavLink to="/forks">내 분기</NavLink>
        </nav>
      </header>
      {!store.persistent && (
        <Banner tone="warn">이 브라우저에서는 저장소를 쓸 수 없어서 분기 대국과 리뷰가 저장되지 않아요.</Banner>
      )}
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <Link to="/licenses">라이선스 · 소스 코드</Link>
      </footer>
    </div>
  )
}
```

`src/app/routes.tsx`:
```tsx
import type { RouteObject } from 'react-router'
import { HomePage } from '../features/home/HomePage'
import { LicensesPage } from '../features/licenses/LicensesPage'
import { NotFound } from '../features/NotFound'
import { Layout } from './Layout'

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'licenses', element: <LicensesPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]
```

`src/main.tsx` (전체 교체):
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppProviders } from './app/AppProviders'
import { createQueryClient } from './app/queryClient'
import { routes } from './app/routes'
import { getAnalysisEngine, getPlayEngine } from './engine/engines'
import { openStore } from './storage/db'
import './styles.css'

const store = await openStore()
const router = createBrowserRouter(routes)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders store={store} engines={{ analysis: getAnalysisEngine(), play: getPlayEngine() }} queryClient={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
```

`src/styles.css`:
```css
:root {
  --bg: #f6f4ef;
  --surface: #ffffff;
  --text: #1f1d1a;
  --muted: #6b665e;
  --border: #e2ddd3;
  --accent: #7a5c2e;
  --accent-soft: #efe4d0;
  --warn-bg: #fff4d6;
  --warn-text: #7a5a00;
  --best: #2f7fb8;
  --inaccuracy: #c99a0e;
  --mistake: #e0782c;
  --blunder: #c8322b;
  --radius: 10px;
  font-family: system-ui, -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
  color: var(--text);
  background: var(--bg);
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #171614;
    --surface: #211f1c;
    --text: #ece8e1;
    --muted: #a39d93;
    --border: #35322d;
    --accent: #d6b27a;
    --accent-soft: #3a3124;
    --warn-bg: #3a3014;
    --warn-text: #f1d27a;
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); }
a { color: var(--accent); }
button, input, select {
  font: inherit;
  padding: 0.45rem 0.8rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}
button { cursor: pointer; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.app { max-width: 1120px; margin: 0 auto; padding: 0 16px; }
.app-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 0; }
.app-header nav { display: flex; gap: 1rem; }
.app-header nav a.active { font-weight: 700; }
.brand { font-weight: 700; font-size: 1.2rem; text-decoration: none; color: var(--text); }
.app-main { padding-bottom: 3rem; }
.app-footer { border-top: 1px solid var(--border); padding: 1rem 0 2rem; color: var(--muted); font-size: 0.9rem; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.25rem; margin-bottom: 1rem; }
.meta { color: var(--muted); }
.home form { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
.segmented { display: flex; gap: 0.25rem; border: 0; padding: 0; margin: 0; }
.segmented label { position: relative; padding: 0.4rem 0.7rem; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; }
.segmented label:has(input:checked) { background: var(--accent-soft); border-color: var(--accent); }
.segmented input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.links { display: flex; gap: 1.5rem; }
.banner { padding: 0.6rem 0.9rem; border-radius: 8px; margin-bottom: 1rem; background: var(--accent-soft); }
.banner-warn { background: var(--warn-bg); color: var(--warn-text); }
.error-view { padding: 1rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
.badge { font-size: 0.75rem; padding: 0.1rem 0.45rem; border-radius: 999px; background: var(--accent-soft); color: var(--muted); margin-left: 0.4rem; }
.badge.live { background: #fde2e1; color: #b3261e; }
```

- [ ] **Step 6: 통과 확인**

Run: `npm test && npx tsc --noEmit`
Expected: 전체 PASS

- [ ] **Step 7: 수동 확인**

Run: `npm run dev` → `http://localhost:5173` 접속
Expected: 홈 화면에 불러오기 폼과 오늘의 명국 카드가 보이고, 헤더 링크를 누르면 NotFound가 뜬다(아직 화면이 없음). 콘솔 에러 없음.

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "feat(app): Provider·라우터·레이아웃, 홈·라이선스·에러 화면" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: 보드와 분석 표시 컴포넌트

**Files:**
- Create: `src/components/Board.tsx`, `src/components/boardShapes.ts`, `src/components/EvalBar.tsx`, `src/components/MoveList.tsx`, `src/components/EngineLines.tsx`, `src/components/playerLabel.ts`, `src/test/boardMock.ts`
- Modify: `src/styles.css` (끝에 추가)
- Test: `src/components/EvalBar.test.tsx`, `src/components/MoveList.test.tsx`, `src/components/EngineLines.test.tsx`

**Interfaces:**
- Consumes: `Score`, `winPercent`, `formatScore`, `MoveLabel` (Task 5), `EngineLine` (Task 6), `Ply`, `Color`, `Player` (Task 2), `turnOf`, `pvToSan` (Task 3)
- Produces:
  - `interface BoardProps { fen: string; orientation: Color; lastMoveUci?: string | null; check?: boolean; shapes?: DrawShape[]; movable?: { color: Color; dests: Map<Key, Key[]>; onMove: (from: Key, to: Key) => void } | null }`, `Board(props)`
  - `bestMoveArrow(uci: string): DrawShape`
  - `EvalBar({ score: Score | null; orientation: Color })`
  - `MoveList({ plies: Ply[]; current: number; onSelect: (i: number) => void; labels?: (MoveLabel | null)[] })`, `LABEL_GLYPH`
  - `EngineLines({ fen: string; lines: EngineLine[] })`
  - `playerLabel(p: Player): string`
  - 테스트용 `src/test/boardMock.ts`: `boardProps.current`에 마지막 props를 담고 `<div data-testid="board" data-fen>`를 그린다. `vi.mock('<상대경로>/components/Board', () => import('<상대경로>/test/boardMock'))`로 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/EvalBar.test.tsx`:
```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { EvalBar } from './EvalBar'

afterEach(cleanup)

it('동점이면 50%와 0.00', () => {
  render(<EvalBar score={{ cp: 0 }} orientation="white" />)
  expect(screen.getByRole('meter', { name: '평가' })).toHaveAttribute('aria-valuenow', '50')
  expect(screen.getByText('0.00')).toBeInTheDocument()
})

it('메이트는 100%와 M2', () => {
  render(<EvalBar score={{ mate: 2 }} orientation="black" />)
  expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '100')
  expect(screen.getByText('M2')).toBeInTheDocument()
})

it('점수가 없으면 …', () => {
  render(<EvalBar score={null} orientation="white" />)
  expect(screen.getByText('…')).toBeInTheDocument()
})
```

`src/components/MoveList.test.tsx`:
```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { pgnToPlies } from '../chess/pgn'
import { MoveList } from './MoveList'

afterEach(cleanup)
const plies = pgnToPlies('1. e4 e5 2. Nf3 *')

it('수 번호와 수를 그리고 클릭하면 해당 인덱스를 알린다', () => {
  const onSelect = vi.fn()
  render(<MoveList plies={plies} current={3} onSelect={onSelect} />)
  expect(screen.getByText('1.')).toBeInTheDocument()
  expect(screen.getByText('2.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Nf3' })).toHaveAttribute('aria-current', 'step')
  fireEvent.click(screen.getByRole('button', { name: 'e5' }))
  expect(onSelect).toHaveBeenCalledWith(2)
})

it('등급 기호와 클래스', () => {
  render(<MoveList plies={plies} current={0} onSelect={() => {}} labels={[null, 'best', 'good', 'blunder']} />)
  expect(screen.getByRole('button', { name: 'Nf3??' })).toHaveClass('label-blunder')
  expect(screen.getByRole('button', { name: 'e4★' })).toHaveClass('label-best')
  expect(screen.getByRole('button', { name: 'e5' })).toHaveClass('label-good')
})

it('흑 차례로 시작하면 N... 표기', () => {
  const blackFirst = pgnToPlies('[SetUp "1"]\n[FEN "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 5"]\n\n5... e5 6. Nf3 *')
  render(<MoveList plies={blackFirst} current={0} onSelect={() => {}} />)
  expect(screen.getByText('5...')).toBeInTheDocument()
  expect(screen.getByText('6.')).toBeInTheDocument()
})
```

`src/components/EngineLines.test.tsx`:
```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { EngineLines } from './EngineLines'

afterEach(cleanup)
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

it('점수와 SAN 수순', () => {
  render(
    <EngineLines
      fen={START}
      lines={[
        { depth: 18, multipv: 1, score: { cp: 30 }, pv: ['e2e4', 'e7e5'] },
        { depth: 18, multipv: 2, score: { cp: 20 }, pv: ['d2d4'] },
      ]}
    />,
  )
  expect(screen.getByText('+0.30')).toBeInTheDocument()
  expect(screen.getByText('e4 e5')).toBeInTheDocument()
  expect(screen.getByText('d4')).toBeInTheDocument()
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components` → FAIL (새 테스트 3개 import 오류)

- [ ] **Step 3: 구현**

`src/components/boardShapes.ts`:
```ts
import type { DrawShape } from 'chessground/draw'
import type { Key } from 'chessground/types'

export function bestMoveArrow(uci: string): DrawShape {
  return { orig: uci.slice(0, 2) as Key, dest: uci.slice(2, 4) as Key, brush: 'paleBlue' }
}
```

`src/components/Board.tsx`:
```tsx
import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import 'chessground/assets/chessground.cburnett.css'
import type { DrawShape } from 'chessground/draw'
import type { Key } from 'chessground/types'
import { useEffect, useRef } from 'react'
import { turnOf } from '../chess/pgn'
import type { Color } from '../chess/types'

export interface BoardProps {
  fen: string
  orientation: Color
  lastMoveUci?: string | null
  check?: boolean
  shapes?: DrawShape[]
  movable?: { color: Color; dests: Map<Key, Key[]>; onMove: (from: Key, to: Key) => void } | null
}

export function Board({ fen, orientation, lastMoveUci, check, shapes, movable }: BoardProps) {
  const host = useRef<HTMLDivElement>(null)
  const api = useRef<Api | null>(null)
  const onMoveRef = useRef(movable?.onMove)
  onMoveRef.current = movable?.onMove

  useEffect(() => {
    if (!host.current) return
    api.current = Chessground(host.current, {
      animation: { duration: 150 },
      movable: { free: false, showDests: true, events: { after: (orig, dest) => onMoveRef.current?.(orig, dest) } },
    })
    return () => {
      api.current?.destroy()
      api.current = null
    }
  }, [])

  useEffect(() => {
    api.current?.set({
      fen,
      orientation,
      check: !!check,
      turnColor: turnOf(fen) === 'w' ? 'white' : 'black',
      lastMove: lastMoveUci ? [lastMoveUci.slice(0, 2) as Key, lastMoveUci.slice(2, 4) as Key] : undefined,
      movable: movable ? { color: movable.color, dests: movable.dests } : { color: undefined, dests: new Map() },
    })
  }, [fen, orientation, check, lastMoveUci, movable?.color, movable?.dests])

  useEffect(() => {
    api.current?.setAutoShapes(shapes ?? [])
  }, [shapes])

  return (
    <div className="board">
      <div ref={host} className="board-host" />
    </div>
  )
}
```

`src/components/EvalBar.tsx`:
```tsx
import type { CSSProperties } from 'react'
import type { Color } from '../chess/types'
import { formatScore, winPercent, type Score } from '../engine/classify'

export function EvalBar({ score, orientation }: { score: Score | null; orientation: Color }) {
  const white = score ? winPercent(score) : 50
  return (
    <div
      className="evalbar"
      data-orientation={orientation}
      role="meter"
      aria-label="평가"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(white)}
      style={{ '--white': `${white}%` } as CSSProperties}
    >
      <div className="evalbar-white" />
      <span className="evalbar-label">{score ? formatScore(score) : '…'}</span>
    </div>
  )
}
```

`src/components/MoveList.tsx`:
```tsx
import { turnOf } from '../chess/pgn'
import type { Ply } from '../chess/types'
import type { MoveLabel } from '../engine/classify'

export const LABEL_GLYPH: Record<MoveLabel, string> = {
  best: '★',
  good: '',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
}

export interface MoveListProps {
  plies: Ply[]
  current: number
  onSelect: (index: number) => void
  labels?: (MoveLabel | null)[]
}

export function MoveList({ plies, current, onSelect, labels }: MoveListProps) {
  const blackFirst = turnOf(plies[0].fen) === 'b'
  const firstMoveNo = Number(plies[0].fen.split(' ')[5]) || 1
  return (
    <ol className="movelist">
      {plies.slice(1).map((ply, idx) => {
        const i = idx + 1
        const whiteMove = (idx % 2 === 0) !== blackFirst
        const moveNo = firstMoveNo + Math.floor((idx + (blackFirst ? 1 : 0)) / 2)
        const prefix = whiteMove ? `${moveNo}.` : idx === 0 ? `${moveNo}...` : ''
        const label = labels?.[i] ?? null
        return (
          <li key={i}>
            {prefix && <span className="move-no">{prefix}</span>}
            <button
              type="button"
              className={label ? `label-${label}` : undefined}
              aria-current={i === current ? 'step' : undefined}
              onClick={() => onSelect(i)}
            >
              {ply.san}
              {label && LABEL_GLYPH[label] && <span className="glyph">{LABEL_GLYPH[label]}</span>}
            </button>
          </li>
        )
      })}
    </ol>
  )
}
```

`src/components/EngineLines.tsx`:
```tsx
import { pvToSan } from '../chess/pgn'
import { formatScore } from '../engine/classify'
import type { EngineLine } from '../engine/UciEngine'

export function EngineLines({ fen, lines }: { fen: string; lines: EngineLine[] }) {
  return (
    <ul className="engine-lines" aria-label="엔진 라인">
      {lines.map((l) => (
        <li key={l.multipv}>
          <strong>{formatScore(l.score)}</strong> <span>{pvToSan(fen, l.pv, 8).join(' ')}</span>
        </li>
      ))}
    </ul>
  )
}
```

`src/components/playerLabel.ts`:
```ts
import type { Player } from '../chess/types'

export function playerLabel(p: Player): string {
  return `${p.title ? `${p.title} ` : ''}${p.name}${p.rating ? ` (${p.rating})` : ''}`
}
```

`src/test/boardMock.ts`:
```ts
import { createElement } from 'react'
import type { BoardProps } from '../components/Board'

export const boardProps: { current: BoardProps | null } = { current: null }

export function Board(props: BoardProps) {
  boardProps.current = props
  return createElement('div', { 'data-testid': 'board', 'data-fen': props.fen })
}
```

`src/styles.css` 끝에 추가:
```css
.viewer-main { display: grid; grid-template-columns: 28px minmax(0, 560px) minmax(240px, 1fr); gap: 12px; align-items: stretch; }
.board { width: 100%; aspect-ratio: 1; }
.board-host { width: 100%; height: 100%; }
.evalbar { position: relative; border-radius: 6px; overflow: hidden; background: #3a3834; display: flex; flex-direction: column-reverse; }
.evalbar[data-orientation='black'] { flex-direction: column; }
.evalbar-white { height: var(--white); background: #f2efe9; transition: height 0.3s, width 0.3s; }
.evalbar-label { position: absolute; left: 0; right: 0; top: 50%; text-align: center; font-size: 0.7rem; font-weight: 700; color: #fff; mix-blend-mode: difference; }
.viewer-side { display: flex; flex-direction: column; gap: 0.75rem; max-height: 560px; overflow: auto; align-self: start; }
.engine-lines { list-style: none; margin: 0; padding: 0; font-family: ui-monospace, monospace; font-size: 0.85rem; }
.engine-lines li { padding: 0.2rem 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.movelist { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.15rem 0.35rem; }
.movelist li { display: flex; align-items: center; gap: 0.2rem; }
.movelist .move-no { color: var(--muted); font-size: 0.85rem; }
.movelist button { padding: 0.15rem 0.35rem; border: 0; background: transparent; }
.movelist button[aria-current='step'] { background: var(--accent-soft); font-weight: 700; }
.movelist .glyph { margin-left: 0.1rem; font-weight: 700; }
.label-best .glyph { color: var(--best); }
.label-inaccuracy .glyph { color: var(--inaccuracy); }
.label-mistake .glyph { color: var(--mistake); }
.label-blunder .glyph { color: var(--blunder); }
@media (max-width: 760px) {
  .viewer-main { grid-template-columns: 1fr; }
  .evalbar { height: 18px; flex-direction: row !important; }
  .evalbar-white { height: 100%; width: var(--white); }
  .viewer-side { max-height: none; }
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/components && npx tsc --noEmit` → PASS

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat(components): chessground 보드, 평가 바, 기보, 엔진 라인" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: 대국 뷰어와 실시간 분석

**Files:**
- Create: `src/features/viewer/useGame.ts`, `src/features/viewer/useLiveAnalysis.ts`, `src/features/viewer/GameHeader.tsx`, `src/features/viewer/ViewerPage.tsx`
- Modify: `src/app/routes.tsx`, `src/styles.css`
- Test: `src/features/viewer/useLiveAnalysis.test.tsx`, `src/features/viewer/ViewerPage.test.tsx`

**Interfaces:**
- Consumes: `getGame`, `queryKeys` (Task 13), `pgnToPlies`, `isCheck` (Task 3), `pathToRef`, `refKey` (Task 2), `terminalScore` (Task 7), `isMultiThreaded` (Task 8), `useEngines` (Task 16), 컴포넌트 (Task 17)
- Produces:
  - `interface LoadedGame { record: GameRecord; plies: Ply[] }`, `useGame(ref: GameRef | null)` → TanStack `UseQueryResult<LoadedGame>`
  - `useLiveAnalysis(fen: string | null, enabled: boolean): { lines: EngineLine[]; error: unknown }` (150ms 디바운스, depth 18, MultiPV 3)
  - `GameHeader({ record, onRefresh? })`
  - `ViewerPage` (`/game/*`)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/features/viewer/useLiveAnalysis.test.tsx`:
```tsx
// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EngineProvider, type Engines } from '../../app/EngineContext'
import { useLiveAnalysis } from './useLiveAnalysis'

const F1 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const F2 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
const F3 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'

afterEach(() => vi.useRealTimers())

function setup(enabled = true) {
  const analyze = vi.fn(async () => ({
    lines: [{ depth: 18, multipv: 1, score: { cp: 12 }, pv: ['g1f3'] }],
    bestMove: 'g1f3',
    cancelled: false,
  }))
  const engines = { analysis: { analyze, stop: vi.fn() }, play: {} } as unknown as Engines
  const wrapper = ({ children }: { children: ReactNode }) => <EngineProvider engines={engines}>{children}</EngineProvider>
  const hook = renderHook(({ fen }) => useLiveAnalysis(fen, enabled), { wrapper, initialProps: { fen: F1 } })
  return { analyze, hook }
}

describe('useLiveAnalysis', () => {
  it('150ms 안에 연달아 바뀌면 마지막 포지션만 분석한다', async () => {
    vi.useFakeTimers()
    const { analyze, hook } = setup()
    hook.rerender({ fen: F2 })
    hook.rerender({ fen: F3 })
    await act(async () => {
      vi.advanceTimersByTime(150)
    })
    expect(analyze).toHaveBeenCalledTimes(1)
    expect(analyze).toHaveBeenCalledWith(F3, { depth: 18, multiPv: 3 }, expect.any(Function))
    expect(hook.result.current.lines[0].pv).toEqual(['g1f3'])
  })

  it('disabled면 분석하지 않는다', async () => {
    vi.useFakeTimers()
    const { analyze } = setup(false)
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    expect(analyze).not.toHaveBeenCalled()
  })
})
```

`src/features/viewer/ViewerPage.test.tsx`:
```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FakeWorker } from '../../engine/testing/fakeWorker'
import { UciEngine } from '../../engine/UciEngine'
import { renderRoute } from '../../test/renderRoute'

vi.mock('../../components/Board', () => import('../../test/boardMock'))

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

afterEach(cleanup)

function analysisEngine() {
  return new UciEngine(
    () => new FakeWorker({ info: () => ['info depth 18 multipv 1 score cp 25 pv e2e4 e7e5'], bestMove: () => 'e2e4' }),
  )
}

describe('ViewerPage', () => {
  it('명국을 불러와 키보드로 수를 넘기고 엔진 평가를 보여준다', async () => {
    renderRoute('/game/classic/opera-game', { engines: { analysis: analysisEngine() } })
    expect(await screen.findByRole('heading', { name: /Paul Morphy/ })).toBeInTheDocument()
    expect(screen.getByTestId('board')).toHaveAttribute('data-fen', START)
    expect((await screen.findAllByText('+0.25')).length).toBeGreaterThan(0)

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByTestId('board')).toHaveAttribute('data-fen', AFTER_E4)

    fireEvent.keyDown(window, { key: 'End' })
    expect(screen.getByRole('button', { name: 'Rd8#' })).toHaveAttribute('aria-current', 'step')

    fireEvent.keyDown(window, { key: 'Home' })
    expect(screen.getByTestId('board')).toHaveAttribute('data-fen', START)
  })

  it('기보의 수를 클릭하면 이동한다', async () => {
    renderRoute('/game/classic/opera-game')
    fireEvent.click(await screen.findByRole('button', { name: 'e4' }))
    expect(screen.getByTestId('board')).toHaveAttribute('data-fen', AFTER_E4)
  })

  it('없는 명국은 찾을 수 없다는 에러', async () => {
    renderRoute('/game/classic/nope')
    expect(await screen.findByText(/찾을 수 없어요/)).toBeInTheDocument()
  })

  it('형식이 틀린 경로는 NotFound', () => {
    renderRoute('/game/lichess')
    expect(screen.getByRole('heading', { name: '페이지를 찾을 수 없어요' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/features/viewer` → FAIL

- [ ] **Step 3: 구현**

`src/features/viewer/useGame.ts`:
```ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { GameRef } from '../../chess/gameRef'
import { pgnToPlies } from '../../chess/pgn'
import type { GameRecord, Ply } from '../../chess/types'
import { getGame, queryKeys } from '../../sources'

export interface LoadedGame {
  record: GameRecord
  plies: Ply[]
}

export function useGame(ref: GameRef | null) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: ref ? queryKeys.game(ref) : ['game', 'none'],
    enabled: ref !== null,
    staleTime: Infinity,
    queryFn: async (): Promise<LoadedGame> => {
      const record = await getGame(ref!, qc)
      return { record, plies: pgnToPlies(record.pgn) }
    },
  })
}
```

`src/features/viewer/useLiveAnalysis.ts`:
```ts
import { useEffect, useState } from 'react'
import { useEngines } from '../../app/EngineContext'
import { terminalScore } from '../../engine/review'
import type { EngineLine } from '../../engine/UciEngine'

const LIVE_DEPTH = 18
const DEBOUNCE_MS = 150

export function useLiveAnalysis(fen: string | null, enabled: boolean): { lines: EngineLine[]; error: unknown } {
  const { analysis } = useEngines()
  const [lines, setLines] = useState<EngineLine[]>([])
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    setLines([])
    if (!fen || !enabled || terminalScore(fen)) return
    let active = true
    const timer = setTimeout(() => {
      analysis
        .analyze(fen, { depth: LIVE_DEPTH, multiPv: 3 }, (ls) => {
          if (active) setLines(ls)
        })
        .then((r) => {
          if (active && !r.cancelled) setLines(r.lines)
        })
        .catch((e) => {
          if (active) setError(e)
        })
    }, DEBOUNCE_MS)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [fen, enabled, analysis])

  // 페이지를 떠나면 진행 중인 탐색을 멈춘다. (리뷰 시작은 latest-wins가 알아서 이전 탐색을 끊으므로 여기서 멈추지 않는다)
  useEffect(() => () => analysis.stop(), [analysis])

  return { lines, error }
}
```

`src/features/viewer/GameHeader.tsx`:
```tsx
import type { GameRecord } from '../../chess/types'
import { playerLabel } from '../../components/playerLabel'

export function GameHeader({ record, onRefresh }: { record: GameRecord; onRefresh?: () => void }) {
  const live = record.ref.kind === 'broadcast' && record.result === '*'
  return (
    <header className="game-header">
      <h1>
        {playerLabel(record.white)} <span className="vs">vs</span> {playerLabel(record.black)}
      </h1>
      <p className="meta">
        {[record.event, record.date, record.timeControl].filter(Boolean).join(' · ')} · <strong>{record.result}</strong>
        {live && (
          <>
            <span className="badge live">진행 중</span>{' '}
            <button type="button" onClick={onRefresh}>
              새로고침
            </button>
          </>
        )}
      </p>
    </header>
  )
}
```

`src/features/viewer/ViewerPage.tsx`:
```tsx
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { useLocation } from 'react-router'
import { pathToRef, refKey, type GameRef } from '../../chess/gameRef'
import { isCheck } from '../../chess/pgn'
import type { Color, GameRecord, Ply } from '../../chess/types'
import { Banner } from '../../components/Banner'
import { Board } from '../../components/Board'
import { bestMoveArrow } from '../../components/boardShapes'
import { EngineLines } from '../../components/EngineLines'
import { ErrorView } from '../../components/ErrorView'
import { EvalBar } from '../../components/EvalBar'
import { MoveList } from '../../components/MoveList'
import { isMultiThreaded } from '../../engine/engines'
import { terminalScore } from '../../engine/review'
import { queryKeys } from '../../sources'
import { NotFound } from '../NotFound'
import { GameHeader } from './GameHeader'
import { useGame } from './useGame'
import { useLiveAnalysis } from './useLiveAnalysis'

export function ViewerPage() {
  const { pathname } = useLocation()
  const ref = useMemo(() => pathToRef(pathname), [pathname])
  if (!ref) return <NotFound />
  return <GameViewer key={refKey(ref)} gameRef={ref} />
}

function GameViewer({ gameRef }: { gameRef: GameRef }) {
  const qc = useQueryClient()
  const game = useGame(gameRef)
  if (game.isPending) return <p>불러오는 중…</p>
  if (game.isError) return <ErrorView error={game.error} onRetry={() => void game.refetch()} />
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

function LoadedViewer({ record, plies, onRefresh }: LoadedViewerProps) {
  const [ply, setPly] = useState(0)
  const [orientation, setOrientation] = useState<Color>('white')
  const [showLines, setShowLines] = useState(true)
  const last = plies.length - 1
  const fen = plies[ply].fen
  const live = useLiveAnalysis(fen, showLines)
  useKeyboardNav(last, setPly)

  const terminal = useMemo(() => terminalScore(fen), [fen])
  const score = terminal ?? live.lines[0]?.score ?? null
  const bestUci = showLines ? live.lines[0]?.pv[0] : undefined
  const shapes = useMemo(() => (bestUci ? [bestMoveArrow(bestUci)] : []), [bestUci])

  return (
    <div className="viewer">
      <GameHeader record={record} onRefresh={onRefresh} />
      {!isMultiThreaded() && <Banner>이 브라우저에서는 엔진이 싱글스레드로 동작해서 분석이 느릴 수 있어요.</Banner>}
      {live.error !== null && <Banner tone="warn">엔진을 실행할 수 없어요. 새로고침해 주세요.</Banner>}
      <div className="viewer-main">
        <EvalBar score={score} orientation={orientation} />
        <Board fen={fen} orientation={orientation} lastMoveUci={plies[ply].uci} check={isCheck(fen)} shapes={shapes} />
        <aside className="viewer-side">
          <label className="toggle">
            <input type="checkbox" checked={showLines} onChange={(e) => setShowLines(e.target.checked)} /> 엔진 라인
          </label>
          {showLines && <EngineLines fen={fen} lines={live.lines} />}
          <MoveList plies={plies} current={ply} onSelect={setPly} />
        </aside>
      </div>
      <div className="viewer-controls">
        <button type="button" aria-label="처음" onClick={() => setPly(0)}>⏮</button>
        <button type="button" aria-label="이전 수" onClick={() => setPly((p) => Math.max(0, p - 1))}>◀</button>
        <button type="button" aria-label="다음 수" onClick={() => setPly((p) => Math.min(last, p + 1))}>▶</button>
        <button type="button" aria-label="마지막" onClick={() => setPly(last)}>⏭</button>
        <button type="button" onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}>보드 뒤집기</button>
      </div>
    </div>
  )
}

function useKeyboardNav(last: number, setPly: Dispatch<SetStateAction<number>>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowLeft') setPly((p) => Math.max(0, p - 1))
      else if (e.key === 'ArrowRight') setPly((p) => Math.min(last, p + 1))
      else if (e.key === 'Home') setPly(0)
      else if (e.key === 'End') setPly(last)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last, setPly])
}
```

`src/app/routes.tsx` — import를 추가하고 `{ path: '*' }` 앞에 경로를 넣는다:
```tsx
import { ViewerPage } from '../features/viewer/ViewerPage'
```
```tsx
      { path: 'game/*', element: <ViewerPage /> },
```

`src/styles.css` 끝에 추가:
```css
.game-header h1 { font-size: 1.3rem; margin: 0 0 0.25rem; }
.game-header .vs { color: var(--muted); font-weight: 400; }
.viewer-controls { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.75rem; align-items: center; }
.toggle { display: flex; gap: 0.4rem; align-items: center; }
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/features/viewer && npx tsc --noEmit` → PASS

- [ ] **Step 5: 수동 확인**

Run: `npm run dev` → `http://localhost:5173/game/classic/opera-game`
Expected: 보드가 뜨고 ←/→로 수가 넘어가며 평가 바·엔진 라인·파란 화살표가 갱신된다. 개발자 도구 콘솔에서 `crossOriginIsolated`가 `true`이고, Network 탭에 `stockfish-19-lite.js`가 로드된다.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat(viewer): 대국 뷰어, 키보드 이동, 실시간 엔진 분석" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: 전체 대국 리뷰 UI

**Files:**
- Create: `src/features/viewer/useReview.ts`, `src/features/viewer/ReviewPanel.tsx`, `src/components/EvalGraph.tsx`
- Modify: `src/features/viewer/ViewerPage.tsx` (`LoadedViewer` 함수 전체 교체 + import 추가), `src/styles.css`
- Test: `src/features/viewer/useReview.test.tsx`, `src/components/EvalGraph.test.tsx`

**Interfaces:**
- Consumes: `reviewGame`, `countLabels`, `REVIEW_DEPTH`, `GameReview`, `ReviewedPosition` (Task 7), `useStore` (Task 16), `refKey` (Task 2), `winPercent`, `Score` (Task 5)
- Produces:
  - `type ReviewState = { status: 'idle' } | { status: 'running'; done: number; total: number; partial: ReviewedPosition[] } | { status: 'done'; review: GameReview } | { status: 'error'; error: unknown }`
  - `useReview(ref: GameRef | null, plies: Ply[] | null): { state: ReviewState; start: () => Promise<void> }` — 캐시가 있으면 열자마자 `done`
  - `ReviewPanel({ state, onStart, startTurn })`
  - `EvalGraph({ scores: (Score | null)[]; current: number; onSelect: (i: number) => void })`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/EvalGraph.test.tsx`:
```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { EvalGraph } from './EvalGraph'

afterEach(cleanup)

it('포지션마다 클릭 영역이 있고 클릭하면 이동한다', () => {
  const onSelect = vi.fn()
  render(<EvalGraph scores={[{ cp: 0 }, { cp: 50 }, null]} current={1} onSelect={onSelect} />)
  expect(screen.getByRole('group', { name: '평가 그래프' })).toBeInTheDocument()
  fireEvent.click(screen.getByLabelText('2번째 포지션으로 이동'))
  expect(onSelect).toHaveBeenCalledWith(2)
})

it('포지션이 하나뿐이면 그리지 않는다', () => {
  const { container } = render(<EvalGraph scores={[{ cp: 0 }]} current={0} onSelect={() => {}} />)
  expect(container).toBeEmptyDOMElement()
})
```

`src/features/viewer/useReview.test.tsx`:
```tsx
// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { EngineProvider } from '../../app/EngineContext'
import { StoreProvider } from '../../app/StoreContext'
import type { GameRef } from '../../chess/gameRef'
import { pgnToPlies } from '../../chess/pgn'
import { FakeWorker, type FakeEngineScript } from '../../engine/testing/fakeWorker'
import { UciEngine } from '../../engine/UciEngine'
import { getClassic } from '../../sources/classics'
import { createMemoryStore, type Store } from '../../storage/db'
import { useReview } from './useReview'

const REF: GameRef = { kind: 'classic', slug: 'opera-game' }
const PLIES = pgnToPlies(getClassic('opera-game')!.pgn)

function setup(store: Store, script: FakeEngineScript = { info: () => ['info depth 14 multipv 1 score cp 20 pv e2e4'] }) {
  const factory = vi.fn(() => new FakeWorker(script))
  const analysis = new UciEngine(factory)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <StoreProvider store={store}>
      <EngineProvider engines={{ analysis, play: analysis }}>{children}</EngineProvider>
    </StoreProvider>
  )
  const hook = renderHook(() => useReview(REF, PLIES), { wrapper })
  return { hook, factory }
}

describe('useReview', () => {
  it('캐시가 있으면 엔진 없이 바로 done', async () => {
    const store = createMemoryStore()
    const review = { depth: 14, positions: [], labels: [], accuracy: { white: 90, black: 80 } }
    await store.reviews.put({ key: 'classic/opera-game', depth: 14, review, createdAt: 1 })
    const { hook, factory } = setup(store)
    await waitFor(() => expect(hook.result.current.state).toEqual({ status: 'done', review }))
    expect(factory).not.toHaveBeenCalled()
  })

  it('start하면 진행률을 거쳐 done이 되고 캐시에 저장한다', async () => {
    const store = createMemoryStore()
    const { hook } = setup(store)
    await act(async () => {
      await hook.result.current.start()
    })
    const state = hook.result.current.state
    expect(state.status).toBe('done')
    if (state.status === 'done') expect(state.review.positions).toHaveLength(PLIES.length)
    expect(await store.reviews.get('classic/opera-game')).toBeDefined()
  })

  it('진행 중에 언마운트하면 저장하지 않는다', async () => {
    const store = createMemoryStore()
    const { hook } = setup(store, { holdGoCount: 1 })
    act(() => {
      void hook.result.current.start()
    })
    await waitFor(() => expect(hook.result.current.state.status).toBe('running'))
    hook.unmount()
    await new Promise((r) => setTimeout(r, 20))
    expect(await store.reviews.get('classic/opera-game')).toBeUndefined()
  })
})
```

`src/features/viewer/ViewerPage.test.tsx`의 `describe` 안에 추가:
```tsx
  it('리뷰를 실행하면 정확도와 평가 그래프가 보인다', async () => {
    renderRoute('/game/classic/opera-game', { engines: { analysis: analysisEngine() } })
    fireEvent.click(await screen.findByRole('button', { name: '리뷰 실행' }))
    expect(await screen.findByText(/백 정확도/)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '평가 그래프' })).toBeInTheDocument()
  })
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/components/EvalGraph.test.tsx src/features/viewer` → FAIL

- [ ] **Step 3: 구현**

`src/components/EvalGraph.tsx`:
```tsx
import { winPercent, type Score } from '../engine/classify'

const W = 600
const H = 100

export function EvalGraph({ scores, current, onSelect }: { scores: (Score | null)[]; current: number; onSelect: (i: number) => void }) {
  const n = scores.length
  if (n < 2) return null
  const step = W / (n - 1)
  const points = scores.map((s, i) => `${i * step},${H - (s ? winPercent(s) : 50)}`).join(' ')
  return (
    <svg className="evalgraph" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="group" aria-label="평가 그래프">
      <polygon points={`0,${H} ${points} ${W},${H}`} className="evalgraph-area" />
      <line x1={0} x2={W} y1={H / 2} y2={H / 2} className="evalgraph-mid" />
      <line x1={current * step} x2={current * step} y1={0} y2={H} className="evalgraph-cursor" />
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
  )
}
```

`src/features/viewer/useReview.ts`:
```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { useEngines } from '../../app/EngineContext'
import { useStore } from '../../app/StoreContext'
import { refKey, type GameRef } from '../../chess/gameRef'
import type { Ply } from '../../chess/types'
import { REVIEW_DEPTH, reviewGame, type GameReview, type ReviewedPosition } from '../../engine/review'

export type ReviewState =
  | { status: 'idle' }
  | { status: 'running'; done: number; total: number; partial: ReviewedPosition[] }
  | { status: 'done'; review: GameReview }
  | { status: 'error'; error: unknown }

export function useReview(ref: GameRef | null, plies: Ply[] | null) {
  const store = useStore()
  const { analysis } = useEngines()
  const [state, setState] = useState<ReviewState>({ status: 'idle' })
  const abortRef = useRef<AbortController | null>(null)
  const key = ref ? refKey(ref) : null

  useEffect(() => {
    setState({ status: 'idle' })
    if (!key) return
    let alive = true
    void store.reviews.get(key).then((cached) => {
      if (alive && cached) setState({ status: 'done', review: cached.review })
    })
    return () => {
      alive = false
      abortRef.current?.abort()
    }
  }, [key, store])

  const start = useCallback(async () => {
    if (!key || !plies) return
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setState({ status: 'running', done: 0, total: plies.length, partial: [] })
    try {
      const review = await reviewGame(analysis, plies, {
        depth: REVIEW_DEPTH,
        signal: ac.signal,
        onProgress: (done, total, positions) => {
          if (!ac.signal.aborted) setState({ status: 'running', done, total, partial: [...positions] })
        },
      })
      if (ac.signal.aborted) return
      await store.reviews.put({ key, depth: review.depth, review, createdAt: Date.now() })
      setState({ status: 'done', review })
    } catch (error) {
      if (!ac.signal.aborted) setState({ status: 'error', error })
    }
  }, [key, plies, analysis, store])

  return { state, start }
}
```

`src/features/viewer/ReviewPanel.tsx`:
```tsx
import type { Turn } from '../../chess/types'
import { ErrorView } from '../../components/ErrorView'
import { countLabels } from '../../engine/review'
import type { ReviewState } from './useReview'

const fmt = (v: number | null) => (v === null ? '-' : `${v.toFixed(1)}%`)

export function ReviewPanel({ state, onStart, startTurn }: { state: ReviewState; onStart: () => void; startTurn: Turn }) {
  switch (state.status) {
    case 'idle':
      return (
        <button type="button" onClick={onStart}>
          리뷰 실행
        </button>
      )
    case 'running':
      return (
        <div className="review-progress">
          <progress max={state.total} value={state.done} /> 분석 중 {state.done}/{state.total}
        </div>
      )
    case 'error':
      return <ErrorView error={state.error} onRetry={onStart} />
    case 'done': {
      const counts = countLabels(state.review, startTurn)
      return (
        <div className="review-summary">
          <span>
            백 정확도 <strong>{fmt(state.review.accuracy.white)}</strong> · 블런더 {counts.white.blunder} · 실수 {counts.white.mistake} · 부정확{' '}
            {counts.white.inaccuracy}
          </span>
          <span>
            흑 정확도 <strong>{fmt(state.review.accuracy.black)}</strong> · 블런더 {counts.black.blunder} · 실수 {counts.black.mistake} · 부정확{' '}
            {counts.black.inaccuracy}
          </span>
        </div>
      )
    }
  }
}
```

`src/features/viewer/ViewerPage.tsx` — import 추가:
```tsx
import { useEngines } from '../../app/EngineContext'
import { turnOf } from '../../chess/pgn'
import { EvalGraph } from '../../components/EvalGraph'
import { ReviewPanel } from './ReviewPanel'
import { useReview } from './useReview'
```
(기존 `import { isCheck } from '../../chess/pgn'`은 `import { isCheck, turnOf } from '../../chess/pgn'`으로 합친다.)

`LoadedViewer` 함수를 다음으로 **전체 교체**:
```tsx
function LoadedViewer({ gameRef, record, plies, onRefresh }: LoadedViewerProps) {
  const [ply, setPly] = useState(0)
  const [orientation, setOrientation] = useState<Color>('white')
  const [showLines, setShowLines] = useState(true)
  const last = plies.length - 1
  const fen = plies[ply].fen
  const { state: review, start: startReview } = useReview(gameRef, plies)
  const reviewing = review.status === 'running'
  const { analysis } = useEngines()
  const live = useLiveAnalysis(fen, showLines && !reviewing)
  useKeyboardNav(last, setPly)

  const positions = review.status === 'done' ? review.review.positions : review.status === 'running' ? review.partial : []
  const labels = review.status === 'done' ? review.review.labels : undefined
  const graphScores = useMemo(() => plies.map((_, i) => positions[i]?.score ?? null), [plies, positions])
  const terminal = useMemo(() => terminalScore(fen), [fen])
  const score = positions[ply]?.score ?? terminal ?? live.lines[0]?.score ?? null
  const bestUci = showLines ? live.lines[0]?.pv[0] : undefined
  const shapes = useMemo(() => (bestUci ? [bestMoveArrow(bestUci)] : []), [bestUci])

  return (
    <div className="viewer">
      <GameHeader record={record} onRefresh={onRefresh} />
      {!isMultiThreaded() && <Banner>이 브라우저에서는 엔진이 싱글스레드로 동작해서 분석이 느릴 수 있어요.</Banner>}
      {live.error !== null && <Banner tone="warn">엔진을 실행할 수 없어요. 새로고침해 주세요.</Banner>}
      <div className="viewer-main">
        <EvalBar score={score} orientation={orientation} />
        <Board fen={fen} orientation={orientation} lastMoveUci={plies[ply].uci} check={isCheck(fen)} shapes={shapes} />
        <aside className="viewer-side">
          <label className="toggle">
            <input
              type="checkbox"
              checked={showLines}
              onChange={(e) => {
                setShowLines(e.target.checked)
                if (!e.target.checked && !reviewing) analysis.stop()
              }}
            /> 엔진 라인
          </label>
          {showLines && !reviewing && <EngineLines fen={fen} lines={live.lines} />}
          <MoveList plies={plies} current={ply} onSelect={setPly} labels={labels} />
        </aside>
      </div>
      {positions.length > 0 && <EvalGraph scores={graphScores} current={ply} onSelect={setPly} />}
      <div className="viewer-controls">
        <button type="button" aria-label="처음" onClick={() => setPly(0)}>⏮</button>
        <button type="button" aria-label="이전 수" onClick={() => setPly((p) => Math.max(0, p - 1))}>◀</button>
        <button type="button" aria-label="다음 수" onClick={() => setPly((p) => Math.min(last, p + 1))}>▶</button>
        <button type="button" aria-label="마지막" onClick={() => setPly(last)}>⏭</button>
        <button type="button" onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}>보드 뒤집기</button>
        <ReviewPanel state={review} onStart={() => void startReview()} startTurn={turnOf(plies[0].fen)} />
      </div>
    </div>
  )
}
```

`src/styles.css` 끝에 추가:
```css
.evalgraph { width: 100%; height: 90px; margin-top: 0.75rem; background: #3a3834; border-radius: 6px; cursor: pointer; }
.evalgraph-area { fill: #f2efe9; }
.evalgraph-mid { stroke: var(--muted); stroke-width: 0.5; stroke-dasharray: 4 4; }
.evalgraph-cursor { stroke: var(--accent); stroke-width: 2; }
.review-progress { display: flex; gap: 0.5rem; align-items: center; }
.review-summary { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.9rem; }
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src && npx tsc --noEmit` → PASS

- [ ] **Step 5: 수동 확인**

`/game/classic/opera-game`에서 [리뷰 실행] → 진행률 막대가 차오르며 그래프가 그려지고, 끝나면 정확도와 등급 기호가 붙는다. 새로고침하면 리뷰가 즉시(캐시) 표시된다.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat(viewer): 전체 대국 리뷰, 평가 그래프, 리뷰 캐시" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: 유저 대국 목록 (Chess.com / Lichess)

**Files:**
- Create: `src/features/player/filters.ts`, `src/features/player/GameList.tsx`, `src/features/player/useLichessGames.ts`, `src/features/player/PlayerPage.tsx`
- Modify: `src/app/routes.tsx`, `src/styles.css`
- Test: `src/features/player/filters.test.ts`, `src/features/player/PlayerPage.test.tsx`

**Interfaces:**
- Consumes: `listArchives`, `fetchChesscomMonth` (Task 11), `listLichessGames` (Task 10), `queryKeys` (Task 13), `refToPath`, `refKey` (Task 2), `playerLabel` (Task 17), `ErrorView` (Task 16)
- Produces:
  - `interface GameFilter { speed: Speed | 'all'; color: Color | 'all'; result: 'all' | 'win' | 'loss' | 'draw' }`, `DEFAULT_FILTER`
  - `userColor(g, username): Color | null`, `outcomeFor(g, color): 'win' | 'loss' | 'draw' | null`, `filterGames(games, username, filter): GameSummary[]`
  - `GameList({ games: GameSummary[] })`, `SPEED_LABEL`
  - `useLichessGames(username)` → `{ games, loading, error, hasMore, loadMore, retry }`
  - `PlayerPage` (`/player/:platform/:username`)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/features/player/filters.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import type { GameSummary } from '../../chess/types'
import { DEFAULT_FILTER, filterGames, outcomeFor, userColor } from './filters'

function g(id: string, white: string, black: string, result: GameSummary['result'], speed: GameSummary['speed'] = 'blitz'): GameSummary {
  return { ref: { kind: 'lichess', id }, white: { name: white }, black: { name: black }, result, date: '2026-09-01', speed, variant: 'standard' }
}

const games = [
  g('1', 'Tester', 'a', '1-0'),
  g('2', 'b', 'tester', '1-0', 'rapid'),
  g('3', 'tester', 'c', '1/2-1/2'),
  g('4', 'd', 'Tester', '0-1', 'bullet'),
  g('5', 'tester', 'e', '*'),
]
const ids = (xs: GameSummary[]) => xs.map((x) => (x.ref.kind === 'lichess' ? x.ref.id : ''))

describe('filters', () => {
  it('userColor는 대소문자를 무시한다', () => {
    expect(userColor(games[0], 'tester')).toBe('white')
    expect(userColor(games[1], 'TESTER')).toBe('black')
    expect(userColor(games[0], 'nobody')).toBeNull()
  })
  it('outcomeFor', () => {
    expect(outcomeFor(games[0], 'white')).toBe('win')
    expect(outcomeFor(games[1], 'black')).toBe('loss')
    expect(outcomeFor(games[2], 'white')).toBe('draw')
    expect(outcomeFor(games[4], 'white')).toBeNull()
  })
  it('기본 필터는 전부', () => {
    expect(filterGames(games, 'tester', DEFAULT_FILTER)).toHaveLength(5)
  })
  it('결과·색·시간 제한 필터', () => {
    expect(ids(filterGames(games, 'tester', { ...DEFAULT_FILTER, result: 'win' }))).toEqual(['1', '4'])
    expect(ids(filterGames(games, 'tester', { ...DEFAULT_FILTER, result: 'loss' }))).toEqual(['2'])
    expect(ids(filterGames(games, 'tester', { ...DEFAULT_FILTER, color: 'black' }))).toEqual(['2', '4'])
    expect(ids(filterGames(games, 'tester', { ...DEFAULT_FILTER, speed: 'bullet' }))).toEqual(['4'])
  })
})
```

`src/features/player/PlayerPage.test.tsx`:
```tsx
// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { useMswServer } from '../../test/msw'
import { renderRoute } from '../../test/renderRoute'

const server = useMswServer()
afterEach(cleanup)

function cc(uuid: string, rules = 'chess') {
  return {
    url: '',
    pgn: '1. e4 *',
    time_control: '180',
    end_time: 1788880073,
    uuid,
    time_class: 'blitz',
    rules,
    white: { username: 'Hikaru', rating: 3370, result: 'win' },
    black: { username: `rival-${uuid}`, rating: 2700, result: 'resigned' },
  }
}

describe('PlayerPage', () => {
  it('Chess.com: 최신 달을 먼저 보여주고 이전 달로 이동한다', async () => {
    server.use(
      http.get('https://api.chess.com/pub/player/hikaru/games/archives', () =>
        HttpResponse.json({
          archives: ['https://api.chess.com/pub/player/hikaru/games/2026/08', 'https://api.chess.com/pub/player/hikaru/games/2026/09'],
        }),
      ),
      http.get('https://api.chess.com/pub/player/hikaru/games/2026/09', () => HttpResponse.json({ games: [cc('a'), cc('b', 'chess960')] })),
      http.get('https://api.chess.com/pub/player/hikaru/games/2026/08', () => HttpResponse.json({ games: [cc('c')] })),
    )
    const user = userEvent.setup()
    renderRoute('/player/chesscom/Hikaru')
    expect(await screen.findByText('2026.09')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /rival-a/ })).toHaveAttribute('href', '/game/chesscom/hikaru/2026/09/a')
    expect(screen.getByText('지원하지 않음')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /rival-b/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: '← 이전 달' }))
    expect(await screen.findByRole('link', { name: /rival-c/ })).toBeInTheDocument()
  })

  it('Lichess: 스트리밍으로 받은 대국 목록', async () => {
    const game = {
      id: 'aaaa1111',
      variant: 'standard',
      speed: 'blitz',
      createdAt: Date.UTC(2026, 8, 29),
      status: 'mate',
      winner: 'white',
      players: { white: { user: { name: 'tester' }, rating: 2000 }, black: { user: { name: 'rival' }, rating: 1990 } },
    }
    server.use(http.get('https://lichess.org/api/games/user/tester', () => new HttpResponse(JSON.stringify(game) + '\n')))
    renderRoute('/player/lichess/tester')
    expect(await screen.findByRole('link', { name: /tester.*vs.*rival/ })).toHaveAttribute('href', '/game/lichess/aaaa1111')
    expect(screen.queryByRole('button', { name: '더 보기' })).toBeNull()
  })

  it('없는 유저는 에러 화면', async () => {
    server.use(http.get('https://lichess.org/api/games/user/nobody', () => new HttpResponse(null, { status: 404 })))
    renderRoute('/player/lichess/nobody')
    expect(await screen.findByText(/찾을 수 없어요/)).toBeInTheDocument()
  })

  it('알 수 없는 플랫폼은 NotFound', () => {
    renderRoute('/player/foo/bar')
    expect(screen.getByRole('heading', { name: '페이지를 찾을 수 없어요' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/features/player` → FAIL

- [ ] **Step 3: 구현**

`src/features/player/filters.ts`:
```ts
import type { Color, GameSummary, Speed } from '../../chess/types'

export interface GameFilter {
  speed: Speed | 'all'
  color: Color | 'all'
  result: 'all' | 'win' | 'loss' | 'draw'
}

export const DEFAULT_FILTER: GameFilter = { speed: 'all', color: 'all', result: 'all' }

export function userColor(g: GameSummary, username: string): Color | null {
  const u = username.toLowerCase()
  if (g.white.name.toLowerCase() === u) return 'white'
  if (g.black.name.toLowerCase() === u) return 'black'
  return null
}

export function outcomeFor(g: GameSummary, color: Color): 'win' | 'loss' | 'draw' | null {
  if (g.result === '1/2-1/2') return 'draw'
  if (g.result === '*') return null
  return (color === 'white') === (g.result === '1-0') ? 'win' : 'loss'
}

export function filterGames(games: GameSummary[], username: string, f: GameFilter): GameSummary[] {
  return games.filter((g) => {
    if (f.speed !== 'all' && g.speed !== f.speed) return false
    const color = userColor(g, username)
    if (f.color !== 'all' && color !== f.color) return false
    if (f.result !== 'all' && (!color || outcomeFor(g, color) !== f.result)) return false
    return true
  })
}
```

`src/features/player/GameList.tsx`:
```tsx
import { Link } from 'react-router'
import { refKey, refToPath } from '../../chess/gameRef'
import type { GameSummary, Speed } from '../../chess/types'
import { playerLabel } from '../../components/playerLabel'

export const SPEED_LABEL: Record<Speed, string> = {
  ultraBullet: '울트라불릿',
  bullet: '불릿',
  blitz: '블리츠',
  rapid: '래피드',
  classical: '클래식',
  daily: '데일리',
  correspondence: '통신',
  unknown: '-',
}

export function GameList({ games }: { games: GameSummary[] }) {
  if (games.length === 0) return <p className="meta">조건에 맞는 대국이 없어요.</p>
  return (
    <ul className="game-list">
      {games.map((g) => (
        <li key={refKey(g.ref)}>
          {g.variant === 'standard' ? (
            <Link to={refToPath(g.ref)} className="game-row">
              <Row g={g} />
            </Link>
          ) : (
            <div className="game-row disabled" aria-disabled="true">
              <Row g={g} />
              <span className="badge">지원하지 않음</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

function Row({ g }: { g: GameSummary }) {
  return (
    <>
      <span className="date">{g.date}</span>
      <span className="speed">{SPEED_LABEL[g.speed]}</span>
      <span className="players">
        {playerLabel(g.white)} vs {playerLabel(g.black)}
      </span>
      <span className="result">{g.result === '*' ? <span className="badge live">진행 중</span> : g.result}</span>
    </>
  )
}
```

`src/features/player/useLichessGames.ts`:
```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameSummary } from '../../chess/types'
import { listLichessGames } from '../../sources/lichess'

export function useLichessGames(username: string) {
  const [games, setGames] = useState<GameSummary[]>([])
  const [nextUntil, setNextUntil] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const lastUntil = useRef<number | undefined>(undefined)

  const load = useCallback(
    async (until: number | undefined, signal?: AbortSignal) => {
      lastUntil.current = until
      setLoading(true)
      setError(null)
      try {
        const page = await listLichessGames(username, {
          until,
          signal,
          onGame: (g) => {
            if (!signal?.aborted) setGames((gs) => [...gs, g])
          },
        })
        if (!signal?.aborted) setNextUntil(page.nextUntil)
      } catch (e) {
        if (!signal?.aborted) setError(e)
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [username],
  )

  useEffect(() => {
    setGames([])
    setNextUntil(null)
    const ac = new AbortController()
    void load(undefined, ac.signal)
    return () => ac.abort()
  }, [load])

  return {
    games,
    loading,
    error,
    hasMore: nextUntil !== null,
    loadMore: () => nextUntil !== null && void load(nextUntil),
    retry: () => void load(lastUntil.current),
  }
}
```

`src/features/player/PlayerPage.tsx`:
```tsx
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router'
import type { GameSummary, Speed } from '../../chess/types'
import { ErrorView } from '../../components/ErrorView'
import { queryKeys } from '../../sources'
import { fetchChesscomMonth, listArchives } from '../../sources/chesscom'
import { NotFound } from '../NotFound'
import { DEFAULT_FILTER, filterGames, type GameFilter } from './filters'
import { GameList, SPEED_LABEL } from './GameList'
import { useLichessGames } from './useLichessGames'

export function PlayerPage() {
  const { platform, username = '' } = useParams()
  if (platform !== 'chesscom' && platform !== 'lichess') return <NotFound />
  return (
    <div className="player">
      <h1>
        {username} <small className="meta">{platform === 'chesscom' ? 'Chess.com' : 'Lichess'}</small>
      </h1>
      {platform === 'chesscom' ? <ChesscomGames key={username} username={username} /> : <LichessGames key={username} username={username} />}
    </div>
  )
}

function ChesscomGames({ username }: { username: string }) {
  const archives = useQuery({
    queryKey: queryKeys.chesscomArchives(username),
    queryFn: ({ signal }) => listArchives(username, signal),
  })
  const [index, setIndex] = useState<number | null>(null)
  const months = archives.data ?? []
  const current = index ?? months.length - 1
  const month = months[current]
  const games = useQuery({
    queryKey: month ? queryKeys.chesscomMonth(username, month.yyyy, month.mm) : ['chesscom', 'month', 'none'],
    enabled: month !== undefined,
    queryFn: ({ signal }) => fetchChesscomMonth(username, month!.yyyy, month!.mm, signal),
  })

  if (archives.isError) return <ErrorView error={archives.error} onRetry={() => void archives.refetch()} />
  if (archives.isPending) return <p>불러오는 중…</p>
  if (!month) return <p className="meta">대국이 없어요.</p>
  return (
    <>
      <div className="month-nav">
        <button type="button" disabled={current <= 0} onClick={() => setIndex(current - 1)}>
          ← 이전 달
        </button>
        <span>
          {month.yyyy}.{month.mm}
        </span>
        <button type="button" disabled={current >= months.length - 1} onClick={() => setIndex(current + 1)}>
          다음 달 →
        </button>
      </div>
      {games.isError ? (
        <ErrorView error={games.error} onRetry={() => void games.refetch()} />
      ) : games.isPending ? (
        <p>불러오는 중…</p>
      ) : (
        <FilteredGames games={games.data} username={username} />
      )}
    </>
  )
}

function LichessGames({ username }: { username: string }) {
  const { games, loading, error, hasMore, loadMore, retry } = useLichessGames(username)
  return (
    <>
      <FilteredGames games={games} username={username} />
      {loading && <p>불러오는 중…</p>}
      {error !== null && <ErrorView error={error} onRetry={retry} />}
      {hasMore && !loading && (
        <button type="button" onClick={loadMore}>
          더 보기
        </button>
      )}
    </>
  )
}

function FilteredGames({ games, username }: { games: GameSummary[]; username: string }) {
  const [filter, setFilter] = useState<GameFilter>(DEFAULT_FILTER)
  const speeds = [...new Set(games.map((g) => g.speed))]
  return (
    <>
      <div className="filters">
        <select aria-label="시간 제한" value={filter.speed} onChange={(e) => setFilter({ ...filter, speed: e.target.value as Speed | 'all' })}>
          <option value="all">전체 시간</option>
          {speeds.map((s) => (
            <option key={s} value={s}>
              {SPEED_LABEL[s]}
            </option>
          ))}
        </select>
        <select aria-label="색" value={filter.color} onChange={(e) => setFilter({ ...filter, color: e.target.value as GameFilter['color'] })}>
          <option value="all">전체 색</option>
          <option value="white">백</option>
          <option value="black">흑</option>
        </select>
        <select aria-label="결과" value={filter.result} onChange={(e) => setFilter({ ...filter, result: e.target.value as GameFilter['result'] })}>
          <option value="all">전체 결과</option>
          <option value="win">승</option>
          <option value="loss">패</option>
          <option value="draw">무</option>
        </select>
      </div>
      <GameList games={filterGames(games, username, filter)} />
    </>
  )
}
```

`src/app/routes.tsx` — import와 경로 추가 (`{ path: '*' }` 앞):
```tsx
import { PlayerPage } from '../features/player/PlayerPage'
```
```tsx
      { path: 'player/:platform/:username', element: <PlayerPage /> },
```

`src/styles.css` 끝에 추가:
```css
.month-nav, .filters { display: flex; gap: 0.5rem; align-items: center; margin: 0.75rem 0; flex-wrap: wrap; }
.game-list { list-style: none; margin: 0; padding: 0; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
.game-list li + li { border-top: 1px solid var(--border); }
.game-row { display: grid; grid-template-columns: 6.5rem 5rem 1fr auto; gap: 0.75rem; padding: 0.6rem 0.9rem; color: var(--text); text-decoration: none; align-items: center; }
a.game-row:hover { background: var(--accent-soft); }
.game-row.disabled { opacity: 0.55; grid-template-columns: 6.5rem 5rem 1fr auto auto; }
@media (max-width: 760px) { .game-row, .game-row.disabled { grid-template-columns: 1fr auto; } .game-row .date, .game-row .speed { display: none; } }
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/features/player && npx tsc --noEmit` → PASS

- [ ] **Step 5: 수동 확인**

`npm run dev` → 홈에서 Chess.com `hikaru`, Lichess `DrNykterstein`을 조회한다. 대국 목록이 뜨고, 대국을 누르면 뷰어로 이동하며 분석이 돈다. Chess960 대국은 "지원하지 않음"으로 표시된다.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat(player): Chess.com·Lichess 유저 대국 목록과 필터" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 21: 대회 탐색과 명국 컬렉션 화면

**Files:**
- Create: `src/features/events/EventsPage.tsx`, `src/features/events/EventDetailPage.tsx`, `src/features/classics/ClassicsPage.tsx`
- Modify: `src/app/routes.tsx`, `src/styles.css`
- Test: `src/features/events/EventDetailPage.test.tsx`, `src/features/events/EventsPage.test.tsx`, `src/features/classics/ClassicsPage.test.tsx`

**Interfaces:**
- Consumes: `listTopBroadcasts`, `searchBroadcasts`, `getBroadcastTour`, `getRoundGames`, `isHighlighted`, `BroadcastTour` (Task 12), `classics` (Task 13), `queryKeys` (Task 13), `GameList` (Task 20)
- Produces: `EventsPage` (`/events`), `EventDetailPage` (`/events/:tourId`), `ClassicsPage` (`/classics`)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/features/events/EventDetailPage.test.tsx`:
```tsx
// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, expect, it } from 'vitest'
import { useMswServer } from '../../test/msw'
import { renderRoute } from '../../test/renderRoute'

const server = useMswServer()
afterEach(cleanup)

const pgn = (white: string, black: string, result: string, roundId: string, gameId: string) =>
  `[White "${white}"]\n[Black "${black}"]\n[Result "${result}"]\n[GameURL "https://lichess.org/broadcast/wch/r/${roundId}/${gameId}"]\n\n1. d4 d5 ${result}\n`

it('기본 라운드의 대국을 보여주고 라운드를 바꿀 수 있다', async () => {
  server.use(
    http.get('https://lichess.org/api/broadcast/T1', () =>
      HttpResponse.json({
        tour: { id: 'T1', name: 'FIDE World Championship 2026', slug: 'wch' },
        rounds: [
          { id: 'r1', name: 'Game 1', finished: true },
          { id: 'r2', name: 'Game 2', ongoing: true },
        ],
        defaultRoundId: 'r2',
      }),
    ),
    http.get('https://lichess.org/api/broadcast/round/r2.pgn', () => HttpResponse.text(pgn('Gukesh', 'Ding', '*', 'r2', 'g2'))),
    http.get('https://lichess.org/api/broadcast/round/r1.pgn', () => HttpResponse.text(pgn('Ding', 'Gukesh', '1-0', 'r1', 'g1'))),
  )
  const user = userEvent.setup()
  renderRoute('/events/T1')
  expect(await screen.findByRole('heading', { name: 'FIDE World Championship 2026' })).toBeInTheDocument()
  expect(await screen.findByRole('link', { name: /Gukesh vs Ding/ })).toHaveAttribute('href', '/game/broadcast/r2/g2')
  expect(screen.getByText('진행 중', { selector: '.badge' })).toBeInTheDocument()
  await user.selectOptions(screen.getByLabelText('라운드'), 'r1')
  expect(await screen.findByRole('link', { name: /Ding vs Gukesh/ })).toHaveAttribute('href', '/game/broadcast/r1/g1')
})
```

`src/features/events/EventsPage.test.tsx`:
```tsx
// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, expect, it } from 'vitest'
import { useMswServer } from '../../test/msw'
import { renderRoute } from '../../test/renderRoute'

const server = useMswServer()
afterEach(cleanup)

it('추천 목록과 빠른 검색', async () => {
  server.use(
    http.get('https://lichess.org/api/broadcast/top', () =>
      HttpResponse.json({
        active: [{ tour: { id: 'A', name: '46th FIDE Chess Olympiad', slug: 'o' } }],
        upcoming: [],
        past: { currentPageResults: [{ tour: { id: 'P', name: 'Local Open', slug: 'l' } }] },
      }),
    ),
    http.get('https://lichess.org/api/broadcast/search', () =>
      HttpResponse.json({ currentPageResults: [{ tour: { id: 'W', name: 'FIDE World Championship 2024', slug: 'w' } }] }),
    ),
  )
  const user = userEvent.setup()
  renderRoute('/events')
  const olympiad = await screen.findByRole('link', { name: '46th FIDE Chess Olympiad' })
  expect(olympiad).toHaveAttribute('href', '/events/A')
  expect(olympiad.closest('li')).toHaveClass('highlight')
  expect(screen.getByRole('link', { name: 'Local Open' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '월드챔피언십' }))
  expect(await screen.findByRole('link', { name: 'FIDE World Championship 2024' })).toHaveAttribute('href', '/events/W')
})
```

`src/features/classics/ClassicsPage.test.tsx`:
```tsx
// @vitest-environment jsdom
import { cleanup, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { classics } from '../../sources/classics'
import { renderRoute } from '../../test/renderRoute'

afterEach(cleanup)

it('연도순으로 명국을 나열한다', () => {
  renderRoute('/classics')
  const list = screen.getByRole('list', { name: '명국 목록' })
  const links = within(list).getAllByRole('link')
  expect(links.map((a) => a.textContent)).toEqual(classics.map((c) => c.title))
  expect(links[0]).toHaveAttribute('href', `/game/classic/${classics[0].slug}`)
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/features/events src/features/classics` → FAIL

- [ ] **Step 3: 구현**

`src/features/events/EventsPage.tsx`:
```tsx
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { ErrorView } from '../../components/ErrorView'
import { queryKeys } from '../../sources'
import { isHighlighted, listTopBroadcasts, searchBroadcasts, type BroadcastTour } from '../../sources/broadcast'

const QUICK = [
  { label: '올림피아드', q: 'Olympiad' },
  { label: '월드챔피언십', q: 'World Championship' },
  { label: '캔디데이츠', q: 'Candidates' },
]

export function EventsPage() {
  const [q, setQ] = useState<string | null>(null)
  const top = useQuery({ queryKey: queryKeys.broadcastTop(), queryFn: ({ signal }) => listTopBroadcasts(signal), enabled: q === null })
  const search = useQuery({
    queryKey: queryKeys.broadcastSearch(q ?? ''),
    queryFn: ({ signal }) => searchBroadcasts(q!, signal),
    enabled: q !== null,
  })

  return (
    <div className="events">
      <h1>대회</h1>
      <div className="chips">
        <button type="button" aria-pressed={q === null} onClick={() => setQ(null)}>
          추천
        </button>
        {QUICK.map((x) => (
          <button key={x.q} type="button" aria-pressed={q === x.q} onClick={() => setQ(x.q)}>
            {x.label}
          </button>
        ))}
      </div>
      {q === null ? (
        top.isError ? (
          <ErrorView error={top.error} onRetry={() => void top.refetch()} />
        ) : top.isPending ? (
          <p>불러오는 중…</p>
        ) : (
          <>
            <h2>진행 중</h2>
            <TourList tours={top.data.active} />
            <h2>최근</h2>
            <TourList tours={top.data.past} />
          </>
        )
      ) : search.isError ? (
        <ErrorView error={search.error} onRetry={() => void search.refetch()} />
      ) : search.isPending ? (
        <p>불러오는 중…</p>
      ) : (
        <TourList tours={search.data} />
      )}
    </div>
  )
}

function TourList({ tours }: { tours: BroadcastTour[] }) {
  if (tours.length === 0) return <p className="meta">대회가 없어요.</p>
  return (
    <ul className="tour-list">
      {tours.map((t) => (
        <li key={t.id} className={isHighlighted(t) ? 'highlight' : undefined}>
          <Link to={`/events/${t.id}`}>{t.name}</Link>
          {t.dates?.[0] !== undefined && <small className="meta"> {new Date(t.dates[0]).toISOString().slice(0, 10)}</small>}
        </li>
      ))}
    </ul>
  )
}
```

`src/features/events/EventDetailPage.tsx`:
```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router'
import { ErrorView } from '../../components/ErrorView'
import { queryKeys } from '../../sources'
import { getBroadcastTour, getRoundGames } from '../../sources/broadcast'
import { GameList } from '../player/GameList'

export function EventDetailPage() {
  const { tourId = '' } = useParams()
  const qc = useQueryClient()
  const tour = useQuery({ queryKey: queryKeys.broadcastTour(tourId), queryFn: ({ signal }) => getBroadcastTour(tourId, signal) })
  const [roundId, setRoundId] = useState<string | null>(null)
  const detail = tour.data
  const selected = roundId ?? detail?.defaultRoundId ?? detail?.rounds.at(-1)?.id ?? null
  const games = useQuery({
    queryKey: queryKeys.broadcastRound(selected ?? 'none'),
    queryFn: ({ signal }) => getRoundGames(selected!, signal),
    enabled: selected !== null,
    staleTime: 30_000,
  })

  if (tour.isError) return <ErrorView error={tour.error} onRetry={() => void tour.refetch()} />
  if (!detail) return <p>불러오는 중…</p>
  return (
    <div className="event-detail">
      <h1>{detail.tour.name}</h1>
      <div className="filters">
        <select aria-label="라운드" value={selected ?? ''} onChange={(e) => setRoundId(e.target.value)}>
          {detail.rounds.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
              {r.ongoing ? ' (진행 중)' : ''}
            </option>
          ))}
        </select>
        {selected && (
          <button type="button" onClick={() => void qc.invalidateQueries({ queryKey: queryKeys.broadcastRound(selected) })}>
            새로고침
          </button>
        )}
      </div>
      {games.isError ? (
        <ErrorView error={games.error} onRetry={() => void games.refetch()} />
      ) : games.isPending ? (
        <p>불러오는 중…</p>
      ) : (
        <GameList games={games.data} />
      )}
    </div>
  )
}
```

`src/features/classics/ClassicsPage.tsx`:
```tsx
import { Link } from 'react-router'
import { refToPath } from '../../chess/gameRef'
import { classics } from '../../sources/classics'

export function ClassicsPage() {
  return (
    <div className="classics">
      <h1>명국 컬렉션</h1>
      <ul className="classic-list" aria-label="명국 목록">
        {classics.map((c) => (
          <li key={c.slug} className="card">
            <h2>
              <Link to={refToPath({ kind: 'classic', slug: c.slug })}>{c.title}</Link>
            </h2>
            <p className="meta">
              {c.white} vs {c.black} · {c.event ? `${c.event}, ` : ''}
              {c.year}
            </p>
            <p>{c.summaryKo}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

`src/app/routes.tsx` — import와 경로 추가 (`{ path: '*' }` 앞):
```tsx
import { ClassicsPage } from '../features/classics/ClassicsPage'
import { EventDetailPage } from '../features/events/EventDetailPage'
import { EventsPage } from '../features/events/EventsPage'
```
```tsx
      { path: 'events', element: <EventsPage /> },
      { path: 'events/:tourId', element: <EventDetailPage /> },
      { path: 'classics', element: <ClassicsPage /> },
```

`src/styles.css` 끝에 추가:
```css
.chips { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 1rem; }
.chips button[aria-pressed='true'] { background: var(--accent-soft); border-color: var(--accent); }
.tour-list { list-style: none; padding: 0; margin: 0 0 1.5rem; }
.tour-list li { padding: 0.5rem 0; border-bottom: 1px solid var(--border); }
.tour-list li.highlight a { font-weight: 700; }
.tour-list li.highlight::before { content: '★ '; color: var(--accent); }
.classic-list { list-style: none; padding: 0; margin: 0; }
.classic-list h2 { font-size: 1.1rem; margin: 0 0 0.25rem; }
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/features && npx tsc --noEmit` → PASS

- [ ] **Step 5: 수동 확인**

`/events` → 추천 목록에서 올림피아드가 ★로 강조된다. [월드챔피언십] → 검색 결과 → 대회 → 라운드 → 대국 → 뷰어. `/classics` → 3판이 연도순으로 보인다.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat(events,classics): 브로드캐스트 대회 탐색과 명국 컬렉션 화면" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 22: 분기 대국 — 다이얼로그, 대국 화면, 내 분기 목록

**Files:**
- Create: `src/features/play/EloSlider.tsx`, `src/features/play/ForkDialog.tsx`, `src/features/play/PlayPage.tsx`, `src/features/forks/ForksPage.tsx`
- Modify: `src/features/viewer/ViewerPage.tsx`, `src/app/routes.tsx`, `src/styles.css`
- Test: `src/features/play/PlayPage.test.tsx`, `src/features/forks/ForksPage.test.tsx`, `src/features/viewer/ViewerPage.test.tsx` (케이스 추가)

**Interfaces:**
- Consumes: `createFork`, `applyMove`, `takeback`, `resign`, `forkStatus`, `forkPlies`, `forkToPgn`, `legalDests`, `toUci`, `movetimeFor`, `DEFAULT_ELO`, `ELO_MIN`, `ELO_MAX`, `ForkRecord`, `EndReason` (Task 14), `useStore`, `useEngines`, `downloadText` (Task 16), `useGame` (Task 18), `Board`, `MoveList` (Task 17)
- Produces:
  - `EloSlider({ value, onChange })`
  - `ForkDialog({ defaultColor, onConfirm({ playerColor, engineElo }), onCancel })`
  - `PlayPage` (`/play/:forkId`), `ForksPage` (`/forks`)
  - React Query 키: `['fork', id]`, `['forks']`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/features/play/PlayPage.test.tsx`:
```tsx
// @vitest-environment jsdom
import { act, cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFork } from '../../chess/fork'
import { pgnToPlies } from '../../chess/pgn'
import { FakeWorker } from '../../engine/testing/fakeWorker'
import { UciEngine } from '../../engine/UciEngine'
import { getClassic } from '../../sources/classics'
import { createMemoryStore } from '../../storage/db'
import { boardProps } from '../../test/boardMock'
import { renderRoute } from '../../test/renderRoute'

vi.mock('../../components/Board', () => import('../../test/boardMock'))
afterEach(cleanup)

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

async function setupFork(startFen = START, originPly = 0) {
  const store = createMemoryStore()
  await store.forks.put(
    createFork(
      { origin: { kind: 'classic', slug: 'opera-game' }, originPly, startFen, playerColor: 'white', engineElo: 1500, title: '테스트 분기' },
      1,
      'f1',
    ),
  )
  return store
}

describe('PlayPage', () => {
  it('내 수에 엔진이 답하고, 무르기로 두 수를 되돌린다', async () => {
    const store = await setupFork()
    const play = new UciEngine(() => new FakeWorker({ bestMove: () => 'e7e5' }))
    renderRoute('/play/f1', { store, engines: { play } })
    expect(await screen.findByText('내 차례')).toBeInTheDocument()

    act(() => boardProps.current!.movable!.onMove('e2', 'e4'))
    await waitFor(async () => expect((await store.forks.get('f1'))?.moves).toEqual(['e2e4', 'e7e5']))
    expect(await screen.findByText('내 차례')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '무르기' }))
    await waitFor(async () => expect((await store.forks.get('f1'))?.moves).toEqual([]))
  })

  it('불법 수는 무시한다', async () => {
    const store = await setupFork()
    renderRoute('/play/f1', { store })
    await screen.findByText('내 차례')
    act(() => boardProps.current!.movable!.onMove('e2', 'e5'))
    expect((await store.forks.get('f1'))?.moves).toEqual([])
  })

  it('원래 대국의 이후 수순을 보여준다', async () => {
    const plies = pgnToPlies(getClassic('opera-game')!.pgn)
    const store = await setupFork(plies[4].fen, 4)
    renderRoute('/play/f1', { store })
    expect(await screen.findByText(/^d4 Bg4 dxe5/)).toBeInTheDocument()
  })

  it('없는 분기는 NotFound', async () => {
    renderRoute('/play/nope')
    expect(await screen.findByRole('heading', { name: '페이지를 찾을 수 없어요' })).toBeInTheDocument()
  })
})
```

`src/features/forks/ForksPage.test.tsx`:
```tsx
// @vitest-environment jsdom
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { createFork } from '../../chess/fork'
import { createMemoryStore } from '../../storage/db'
import { renderRoute } from '../../test/renderRoute'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const make = (id: string, title: string, updatedAt: number) =>
  createFork({ origin: { kind: 'classic', slug: 'opera-game' }, originPly: 2, startFen: START, playerColor: 'white', engineElo: 1800, title }, updatedAt, id)

it('최근 순으로 보여주고 삭제할 수 있다', async () => {
  const store = createMemoryStore()
  await store.forks.put(make('a', '첫 분기', 1))
  await store.forks.put(make('b', '둘째 분기', 2))
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  renderRoute('/forks', { store })
  const items = await screen.findAllByRole('heading', { level: 2 })
  expect(items.map((h) => h.textContent)).toEqual(['둘째 분기', '첫 분기'])
  expect(screen.getAllByRole('link', { name: '이어 두기' })[0]).toHaveAttribute('href', '/play/b')
  await userEvent.click(screen.getAllByRole('button', { name: '삭제' })[0])
  await waitFor(() => expect(screen.queryByText('둘째 분기')).toBeNull())
  expect(await store.forks.get('b')).toBeUndefined()
})

it('비어 있으면 안내 문구', async () => {
  renderRoute('/forks')
  expect(await screen.findByText(/아직 분기한 대국이 없어요/)).toBeInTheDocument()
})
```

`src/features/viewer/ViewerPage.test.tsx`의 `describe` 안에 추가:
```tsx
  it('여기서 분기하면 분기 레코드를 만들고 대국 화면으로 이동한다', async () => {
    const { router, store } = renderRoute('/game/classic/opera-game')
    await screen.findByRole('heading', { name: /Paul Morphy/ })
    for (let i = 0; i < 4; i++) fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.click(screen.getByRole('button', { name: '여기서 분기' }))
    const dialog = screen.getByRole('dialog', { name: '여기서 분기해서 두기' })
    fireEvent.click(within(dialog).getByRole('button', { name: '시작' }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/play\//))
    const [fork] = await store.forks.list()
    expect(fork).toMatchObject({ originPly: 4, playerColor: 'white', engineElo: 1800, origin: { kind: 'classic', slug: 'opera-game' } })
  })
```
그리고 파일 상단 import를 `import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'`로 바꾼다.

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/features` → FAIL

- [ ] **Step 3: 구현 — 다이얼로그와 슬라이더**

`src/features/play/EloSlider.tsx`:
```tsx
import { ELO_MAX, ELO_MIN } from '../../chess/fork'

export function EloSlider({ value, onChange }: { value: number; onChange: (elo: number) => void }) {
  return (
    <label className="elo">
      엔진 Elo <strong>{value}</strong>
      <input
        type="range"
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

`src/features/play/ForkDialog.tsx`:
```tsx
import { useState } from 'react'
import { DEFAULT_ELO } from '../../chess/fork'
import type { Color } from '../../chess/types'
import { EloSlider } from './EloSlider'

export interface ForkDialogProps {
  defaultColor: Color
  onConfirm: (options: { playerColor: Color; engineElo: number }) => void
  onCancel: () => void
}

export function ForkDialog({ defaultColor, onConfirm, onCancel }: ForkDialogProps) {
  const [color, setColor] = useState<Color>(defaultColor)
  const [elo, setElo] = useState(DEFAULT_ELO)
  return (
    <div className="dialog-backdrop">
      <div role="dialog" aria-modal="true" aria-labelledby="fork-title" className="dialog card">
        <h2 id="fork-title">여기서 분기해서 두기</h2>
        <fieldset className="segmented">
          <legend>내 색</legend>
          <label>
            <input type="radio" name="fork-color" checked={color === 'white'} onChange={() => setColor('white')} /> 백
          </label>
          <label>
            <input type="radio" name="fork-color" checked={color === 'black'} onChange={() => setColor('black')} /> 흑
          </label>
        </fieldset>
        <EloSlider value={elo} onChange={setElo} />
        <div className="dialog-actions">
          <button type="button" onClick={onCancel}>
            취소
          </button>
          <button type="button" onClick={() => onConfirm({ playerColor: color, engineElo: elo })}>
            시작
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 구현 — 대국 화면**

`src/features/play/PlayPage.tsx`:
```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Key } from 'chessground/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useEngines } from '../../app/EngineContext'
import { useStore } from '../../app/StoreContext'
import { downloadText } from '../../app/download'
import {
  applyMove,
  forkPlies,
  forkStatus,
  forkToPgn,
  legalDests,
  movetimeFor,
  resign,
  takeback,
  toUci,
  type EndReason,
  type ForkRecord,
} from '../../chess/fork'
import { refToPath } from '../../chess/gameRef'
import type { Ply } from '../../chess/types'
import { Banner } from '../../components/Banner'
import { Board } from '../../components/Board'
import { MoveList } from '../../components/MoveList'
import { NotFound } from '../NotFound'
import { useGame } from '../viewer/useGame'
import { EloSlider } from './EloSlider'

const REASON_TEXT: Record<EndReason, string> = {
  checkmate: '체크메이트',
  stalemate: '스테일메이트',
  threefold: '3회 반복',
  fifty: '50수 규칙',
  insufficient: '기물 부족',
  resign: '기권',
}

export function PlayPage() {
  const { forkId = '' } = useParams()
  const store = useStore()
  const q = useQuery({ queryKey: ['fork', forkId], queryFn: async () => (await store.forks.get(forkId)) ?? null, staleTime: Infinity })
  if (q.isPending) return <p>불러오는 중…</p>
  if (!q.data) return <NotFound />
  return <ForkGame key={forkId} initial={q.data} />
}

function ForkGame({ initial }: { initial: ForkRecord }) {
  const store = useStore()
  const { play } = useEngines()
  const qc = useQueryClient()
  const [fork, setFork] = useState(initial)
  const [engineError, setEngineError] = useState<unknown>(null)
  const forkRef = useRef(fork)
  forkRef.current = fork
  const status = useMemo(() => forkStatus(fork), [fork])
  const engineTurn = !status.over && status.turn !== fork.playerColor

  const save = useCallback(
    (next: ForkRecord) => {
      forkRef.current = next
      setFork(next)
      qc.setQueryData(['fork', next.id], next)
      void store.forks.put(next).then(() => qc.invalidateQueries({ queryKey: ['forks'] }))
    },
    [store, qc],
  )

  useEffect(() => {
    if (!engineTurn) return
    const ac = new AbortController()
    play
      .bestMove(status.fen, { movetime: movetimeFor(fork.engineElo), elo: fork.engineElo, signal: ac.signal })
      .then((uci) => {
        if (!ac.signal.aborted && uci) save(applyMove(forkRef.current, uci))
      })
      .catch((e) => {
        if (!ac.signal.aborted) setEngineError(e)
      })
    return () => ac.abort()
  }, [engineTurn, status.fen, fork.engineElo, play, save])

  const onMove = (from: Key, to: Key) => {
    try {
      save(applyMove(forkRef.current, toUci(status.fen, from, to)))
    } catch {
      setFork({ ...forkRef.current }) // 보드를 원래 포지션으로 되돌린다
    }
  }
  const dests = useMemo(
    () => (status.over || engineTurn ? new Map() : legalDests(status.fen)) as Map<Key, Key[]>,
    [status.fen, status.over, engineTurn],
  )
  const plies = useMemo(() => forkPlies(fork), [fork])
  const canTakeback = takeback(fork) !== fork
  const original = useGame(fork.origin)

  return (
    <div className="play">
      <header className="game-header">
        <h1>{fork.title}</h1>
        <p className="meta">
          <Link to={refToPath(fork.origin)}>원래 대국으로</Link>
        </p>
      </header>
      {engineError !== null && <Banner tone="warn">엔진을 실행할 수 없어요. 새로고침해 주세요.</Banner>}
      <div className="play-main">
        <Board
          fen={status.fen}
          orientation={fork.playerColor}
          lastMoveUci={status.lastMove}
          check={status.check}
          movable={{ color: fork.playerColor, dests, onMove }}
        />
        <aside className="viewer-side">
          <p className="play-status">
            {status.over ? `${status.result} · ${REASON_TEXT[status.reason!]}` : engineTurn ? '엔진이 생각 중…' : '내 차례'}
          </p>
          <EloSlider value={fork.engineElo} onChange={(elo) => save({ ...forkRef.current, engineElo: elo, updatedAt: Date.now() })} />
          <div className="play-actions">
            <button
              type="button"
              disabled={!canTakeback}
              onClick={() => {
                play.stop()
                save(takeback(forkRef.current))
              }}
            >
              무르기
            </button>
            <button
              type="button"
              disabled={status.over}
              onClick={() => {
                if (window.confirm('기권할까요?')) save(resign(forkRef.current))
              }}
            >
              기권
            </button>
            <button type="button" onClick={() => downloadText(`chessling-${fork.id.slice(0, 8)}.pgn`, forkToPgn(fork))}>
              PGN 내보내기
            </button>
          </div>
          <div className="play-moves">
            <MoveList plies={plies} current={plies.length - 1} onSelect={() => {}} />
          </div>
          {original.data && <OriginalLine plies={original.data.plies} fromPly={fork.originPly} />}
        </aside>
      </div>
    </div>
  )
}

function OriginalLine({ plies, fromPly }: { plies: Ply[]; fromPly: number }) {
  const next = plies.slice(fromPly + 1, fromPly + 13)
  if (next.length === 0) return null
  return (
    <section className="original-line">
      <h3>원래 대국의 수순</h3>
      <p>{next.map((p) => p.san).join(' ')}</p>
    </section>
  )
}
```

- [ ] **Step 5: 구현 — 내 분기 목록**

`src/features/forks/ForksPage.tsx`:
```tsx
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useStore } from '../../app/StoreContext'
import { downloadText } from '../../app/download'
import { forkToPgn } from '../../chess/fork'

export function ForksPage() {
  const store = useStore()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['forks'], queryFn: () => store.forks.list() })

  const remove = async (id: string) => {
    if (!window.confirm('이 분기를 삭제할까요?')) return
    await store.forks.delete(id)
    await qc.invalidateQueries({ queryKey: ['forks'] })
  }

  if (q.isPending) return <p>불러오는 중…</p>
  const forks = q.data ?? []
  return (
    <div className="forks">
      <h1>내 분기</h1>
      {forks.length === 0 ? (
        <p className="meta">아직 분기한 대국이 없어요. 대국 뷰어에서 "여기서 분기"를 눌러 보세요.</p>
      ) : (
        <ul className="classic-list">
          {forks.map((f) => (
            <li key={f.id} className="card">
              <h2>{f.title}</h2>
              <p className="meta">
                {f.moves.length}수 진행 · {f.result === '*' ? '진행 중' : f.result} · Elo {f.engineElo} ·{' '}
                {new Date(f.updatedAt).toLocaleString('ko-KR')}
              </p>
              <div className="play-actions">
                <Link to={`/play/${f.id}`}>이어 두기</Link>
                <button type="button" onClick={() => downloadText(`chessling-${f.id.slice(0, 8)}.pgn`, forkToPgn(f))}>
                  PGN
                </button>
                <button type="button" onClick={() => void remove(f.id)}>
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 6: 구현 — 뷰어에 분기 버튼 연결**

`src/features/viewer/ViewerPage.tsx` import 추가:
```tsx
import { useNavigate } from 'react-router'
import { useStore } from '../../app/StoreContext'
import { createFork } from '../../chess/fork'
import { ForkDialog } from '../play/ForkDialog'
```
(`import { useLocation } from 'react-router'`은 `import { useLocation, useNavigate } from 'react-router'`로 합친다.)

`LoadedViewer` 안에서 `const [showLines, setShowLines] = useState(true)` 바로 아래에 추가:
```tsx
  const [forking, setForking] = useState(false)
  const store = useStore()
  const navigate = useNavigate()
  const startFork = async ({ playerColor, engineElo }: { playerColor: Color; engineElo: number }) => {
    const fork = createFork({
      origin: gameRef,
      originPly: ply,
      startFen: plies[ply].fen,
      playerColor,
      engineElo,
      title: `${record.white.name} vs ${record.black.name} · ${Math.ceil(ply / 2)}수째에서 분기`,
    })
    await store.forks.put(fork)
    navigate(`/play/${fork.id}`)
  }
```

`<ReviewPanel ... />` 줄 바로 아래(같은 `viewer-controls` div 안)에 추가:
```tsx
        <button type="button" disabled={terminal !== null} onClick={() => setForking(true)}>
          여기서 분기
        </button>
```

`viewer-controls` div의 닫는 태그 `</div>` 바로 아래, 최상위 `viewer` div가 닫히기 전에 추가:
```tsx
      {forking && (
        <ForkDialog
          defaultColor={turnOf(fen) === 'w' ? 'white' : 'black'}
          onCancel={() => setForking(false)}
          onConfirm={(o) => void startFork(o)}
        />
      )}
```

`src/app/routes.tsx` — import와 경로 추가 (`{ path: '*' }` 앞):
```tsx
import { ForksPage } from '../features/forks/ForksPage'
import { PlayPage } from '../features/play/PlayPage'
```
```tsx
      { path: 'play/:forkId', element: <PlayPage /> },
      { path: 'forks', element: <ForksPage /> },
```

`src/styles.css` 끝에 추가:
```css
.play-main { display: grid; grid-template-columns: minmax(0, 560px) minmax(240px, 1fr); gap: 12px; align-items: start; }
.play-status { font-weight: 700; margin: 0; }
.play-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; }
.elo { display: flex; flex-direction: column; gap: 0.3rem; }
.original-line h3 { font-size: 0.95rem; margin: 0 0 0.25rem; }
.original-line p { font-family: ui-monospace, monospace; font-size: 0.85rem; margin: 0; }
.dialog-backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / 0.45); display: grid; place-items: center; padding: 16px; z-index: 10; }
.dialog { width: min(420px, 100%); display: flex; flex-direction: column; gap: 1rem; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
@media (max-width: 760px) { .play-main { grid-template-columns: 1fr; } }
```

- [ ] **Step 7: 통과 확인**

Run: `npm test && npx tsc --noEmit` → 전체 PASS

- [ ] **Step 8: 수동 확인**

`/game/classic/opera-game`에서 몇 수 넘긴 뒤 [여기서 분기] → 백·Elo 1500 → 시작. 한 수 두면 엔진이 1초 안팎으로 답한다. 무르기·기권·PGN 내보내기가 동작하고, 탭을 닫았다 열어도 `/forks`에서 이어 둘 수 있다.

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "feat(play): 분기 다이얼로그, 엔진 대국 화면, 내 분기 목록" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 23: E2E 테스트 (Playwright)

**Files:**
- Create: `playwright.config.ts`, `e2e/fixtures.ts`, `e2e/helpers.ts`, `e2e/review.spec.ts`, `e2e/fork.spec.ts`, `e2e/isolation.spec.ts`

**Interfaces:**
- Consumes: 완성된 앱 전체. 브라우저에서는 실제 lite Stockfish가 돈다. 외부 API는 `page.route`로 모킹한다.
- Produces: `npm run e2e`. `E2E_BASE_URL`을 주면 배포 URL을 대상으로 실행한다(Task 25).

- [ ] **Step 1: Playwright 브라우저 설치**

```bash
npx playwright install chromium
```

- [ ] **Step 2: 설정과 보조 파일 작성**

`playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test'

const external = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  use: { baseURL: external ?? 'http://localhost:4173', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: external
    ? undefined
    : {
        command: 'npm run build && npx vite preview --port 4173 --strictPort',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
})
```

`e2e/fixtures.ts`:
```ts
export const SCHOLAR_PGN = '[Event "Rated blitz game"]\n[White "tester"]\n[Black "rival"]\n[Result "1-0"]\n\n1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0'

export const LICHESS_GAME = {
  id: 'e2egame1',
  variant: 'standard',
  speed: 'blitz',
  createdAt: Date.UTC(2026, 8, 29, 12),
  status: 'mate',
  winner: 'white',
  players: { white: { user: { name: 'tester' }, rating: 1500 }, black: { user: { name: 'rival' }, rating: 1490 } },
  clock: { initial: 180, increment: 0 },
}

export const CORS = { 'Access-Control-Allow-Origin': '*' }
```

`e2e/helpers.ts`:
```ts
import type { Page } from '@playwright/test'

/** chessground 보드는 칸마다 DOM이 없으므로 좌표로 클릭한다 */
export async function clickSquare(page: Page, square: string, orientation: 'white' | 'black' = 'white') {
  const box = await page.locator('cg-board').boundingBox()
  if (!box) throw new Error('보드를 찾을 수 없습니다')
  const file = square.charCodeAt(0) - 97
  const rank = Number(square[1]) - 1
  const col = orientation === 'white' ? file : 7 - file
  const row = orientation === 'white' ? 7 - rank : rank
  const size = box.width / 8
  await page.mouse.click(box.x + (col + 0.5) * size, box.y + (row + 0.5) * size)
}
```

- [ ] **Step 3: 시나리오 작성**

`e2e/review.spec.ts`:
```ts
import { expect, test } from '@playwright/test'
import { CORS, LICHESS_GAME, SCHOLAR_PGN } from './fixtures'

test('Lichess 대국을 불러와 전체 리뷰한다', async ({ page }) => {
  await page.route('https://lichess.org/api/games/user/**', (route) =>
    route.fulfill({ status: 200, headers: CORS, contentType: 'application/x-ndjson', body: JSON.stringify(LICHESS_GAME) + '\n' }),
  )
  await page.route('https://lichess.org/game/export/**', (route) =>
    route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ ...LICHESS_GAME, pgn: SCHOLAR_PGN }) }),
  )

  await page.goto('/')
  await page.locator('label', { hasText: 'Lichess' }).click()
  await page.getByLabel('아이디').fill('tester')
  await page.getByRole('button', { name: '불러오기' }).click()
  await page.getByRole('link', { name: /tester.*vs.*rival/ }).click()
  await expect(page.getByRole('button', { name: 'Qxf7#' })).toBeVisible()

  await page.getByRole('button', { name: '리뷰 실행' }).click()
  await expect(page.getByText(/백 정확도/)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('group', { name: '평가 그래프' })).toBeVisible()
  await expect(page.locator('.movelist button', { hasText: 'Nf6' })).toHaveClass(/label-blunder/)
})
```

`e2e/fork.spec.ts`:
```ts
import { expect, test } from '@playwright/test'
import { clickSquare } from './helpers'

test('명국에서 분기해 한 수 두고, 새로고침해도 이어진다', async ({ page }) => {
  await page.goto('/game/classic/opera-game')
  await expect(page.getByRole('heading', { name: /Paul Morphy/ })).toBeVisible()
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight') // 1. e4 e5 2. Nf3 d6 → 백 차례

  await page.getByRole('button', { name: '여기서 분기' }).click()
  await page.getByRole('dialog').getByRole('button', { name: '시작' }).click()
  await expect(page).toHaveURL(/\/play\//)

  await clickSquare(page, 'd2')
  await clickSquare(page, 'd4')
  await expect(page.locator('.play-moves button')).toHaveCount(2, { timeout: 30_000 }) // 내 수 + 엔진 응수
  await expect(page.getByText('내 차례')).toBeVisible()

  await page.reload()
  await expect(page.locator('.play-moves button')).toHaveCount(2)
  await expect(page.locator('.play-moves')).toContainText('d4')

  await page.goto('/forks')
  await expect(page.getByRole('heading', { name: /Paul Morphy/ })).toBeVisible()
})
```

`e2e/isolation.spec.ts`:
```ts
import { expect, test } from '@playwright/test'

test('교차 출처 격리가 켜져 멀티스레드 엔진이 뜬다', async ({ page }) => {
  await page.goto('/game/classic/opera-game')
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true)
  await expect(page.locator('.engine-lines li').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('싱글스레드로 동작')).toHaveCount(0)
})
```

- [ ] **Step 4: 실행**

Run: `npm run e2e`
Expected: 3 passed. 실패하면 `npx playwright show-trace test-results/**/trace.zip`으로 원인을 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add playwright.config.ts e2e
git commit -m "test(e2e): 리뷰·분기·교차 출처 격리 시나리오" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 24: 명국 30판 큐레이션

**Files:**
- Modify: `src/chess/pgn.ts` (`stripAnnotations` 추가), `src/chess/pgn.test.ts`, `src/data/classics.json`, `src/sources/classics.test.ts` (`MIN_CLASSICS = 30`)
- Create: `scripts/add-classic.ts`

**Interfaces:**
- Consumes: `pgnToPlies`, `parseHeaders` (Task 3), `Classic` 타입 (Task 13)
- Produces: `stripAnnotations(pgn: string): string` — 주석 `{}`·`;`, 변화수 `()`, NAG `$n`, `!`/`?` 기호를 지우고 태그는 `Event Site Date Round White Black Result ECO SetUp FEN`만 남긴다. `npx tsx scripts/add-classic.ts <file.pgn> --slug --title --summary [--event]`

- [ ] **Step 1: 실패하는 테스트 추가** (`src/chess/pgn.test.ts` 끝)

```ts
import { stripAnnotations } from './pgn'

describe('stripAnnotations', () => {
  it('주석·변화수·NAG·기호를 지우고 필요한 태그만 남긴다', () => {
    const raw =
      '[Event "E"]\n[Annotator "Someone"]\n[White "A"]\n[Result "1-0"]\n\n' +
      '1. e4 {좋은 수} e5 (1... c5 2. Nf3 (2. c3)) 2. Nf3!? $1 Nc6 ; 줄 주석\n3. Bb5?? 1-0'
    const out = stripAnnotations(raw)
    expect(out).toBe('[Event "E"]\n[White "A"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 1-0\n')
    expect(pgnToPlies(out)).toHaveLength(6)
  })
})
```
(import는 파일 상단 기존 `./pgn` import 목록에 합친다.)

Run: `npx vitest run src/chess/pgn.test.ts` → FAIL

- [ ] **Step 2: 구현** (`src/chess/pgn.ts` 끝에 추가)

```ts
const KEEP_TAGS = new Set(['Event', 'Site', 'Date', 'Round', 'White', 'Black', 'Result', 'ECO', 'SetUp', 'FEN'])
const TAG_LINE = /^\s*\[(\w+)\s+".*"\s*\]\s*$/

export function stripAnnotations(pgn: string): string {
  const lines = pgn.split(/\r?\n/)
  const headers = lines
    .filter((l) => TAG_LINE.test(l))
    .map((l) => l.trim())
    .filter((l) => KEEP_TAGS.has(l.match(TAG_LINE)![1]))
  let body = lines.filter((l) => !TAG_LINE.test(l)).join('\n')
  body = body.replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ')
  let prev: string
  do {
    prev = body
    body = body.replace(/\([^()]*\)/g, ' ')
  } while (body !== prev)
  body = body.replace(/\$\d+/g, ' ').replace(/[!?]+/g, '').replace(/\s+/g, ' ').trim()
  return `${headers.join('\n')}\n\n${body}\n`
}
```

Run: `npx vitest run src/chess/pgn.test.ts` → PASS

- [ ] **Step 3: 추가 스크립트 작성** (`scripts/add-classic.ts`)

```ts
import { readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { parseHeaders, pgnToPlies, stripAnnotations } from '../src/chess/pgn'
import type { Classic } from '../src/sources/classics'

const DATA = 'src/data/classics.json'
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { slug: { type: 'string' }, title: { type: 'string' }, summary: { type: 'string' }, event: { type: 'string' } },
})

const [file] = positionals
if (!file || !values.slug || !values.title || !values.summary) {
  console.error('사용법: npx tsx scripts/add-classic.ts <file.pgn> --slug <slug> --title <제목> --summary <소개> [--event <대회>]')
  process.exit(1)
}

const pgn = stripAnnotations(readFileSync(file, 'utf8')).trim()
const plies = pgnToPlies(pgn) // 불법 수면 PgnError로 중단
const h = parseHeaders(pgn)
const year = Number(h.Date?.slice(0, 4))
if (!h.White || !h.Black || !Number.isInteger(year)) {
  console.error('White, Black, Date(연도) 헤더가 필요합니다')
  process.exit(1)
}
if (!['1-0', '0-1', '1/2-1/2'].includes(h.Result ?? '')) {
  console.error('Result 헤더가 1-0, 0-1, 1/2-1/2 중 하나여야 합니다')
  process.exit(1)
}

const classics = JSON.parse(readFileSync(DATA, 'utf8')) as Classic[]
if (classics.some((c) => c.slug === values.slug)) {
  console.error(`이미 있는 slug입니다: ${values.slug}`)
  process.exit(1)
}
classics.push({
  slug: values.slug,
  title: values.title,
  white: h.White,
  black: h.Black,
  year,
  event: values.event ?? h.Event,
  summaryKo: values.summary,
  pgn,
})
classics.sort((a, b) => a.year - b.year)
writeFileSync(DATA, JSON.stringify(classics, null, 2) + '\n')
console.log(`[add-classic] ${values.slug} 추가 (${plies.length - 1}플라이) — 총 ${classics.length}판`)
```

- [ ] **Step 4: 명국 27판 추가**

각 대국마다 PGN을 공개 출처(해당 대국의 위키백과 문서에 실린 기보, PGN Mentor 같은 공개 PGN 모음)에서 받아 스크래치 파일로 저장하고 스크립트로 추가한다. **해설은 가져오지 않는다.** 스크립트가 주석을 지워 주지만, `summaryKo`는 출처 문장을 번역하지 말고 3~4문장으로 직접 쓴다(누가, 언제, 무엇이 유명한지).

```bash
npx tsx scripts/add-classic.ts "$TMPDIR/game.pgn" --slug rotlewi-rubinstein-1907 --title "루빈시테인의 불멸의 대국" --summary "…"
```

추가할 목록 (slug / 대국):

| slug | 대국 |
|---|---|
| `mcdonnell-labourdonnais-1834` | McDonnell – La Bourdonnais, London 1834 (50차 매치 제62국) |
| `paulsen-morphy-1857` | Paulsen – Morphy, New York 1857 |
| `zukertort-blackburne-1883` | Zukertort – Blackburne, London 1883 |
| `lasker-bauer-1889` | Lasker – Bauer, Amsterdam 1889 |
| `steinitz-von-bardeleben-1895` | Steinitz – von Bardeleben, Hastings 1895 |
| `pillsbury-tarrasch-1895` | Pillsbury – Tarrasch, Hastings 1895 |
| `rotlewi-rubinstein-1907` | Rotlewi – Rubinstein, Łódź 1907 |
| `reti-tartakower-1910` | Réti – Tartakower, Vienna 1910 |
| `levitsky-marshall-1912` | Levitsky – Marshall, Breslau 1912 |
| `ed-lasker-thomas-1912` | Ed. Lasker – Thomas, London 1912 |
| `lasker-capablanca-1914` | Lasker – Capablanca, St. Petersburg 1914 |
| `capablanca-marshall-1918` | Capablanca – Marshall, New York 1918 |
| `bogoljubov-alekhine-1922` | Bogoljubov – Alekhine, Hastings 1922 |
| `saemisch-nimzowitsch-1923` | Sämisch – Nimzowitsch, Copenhagen 1923 |
| `reti-bogoljubov-1924` | Réti – Bogoljubov, New York 1924 |
| `capablanca-tartakower-1924` | Capablanca – Tartakower, New York 1924 |
| `botvinnik-capablanca-1938` | Botvinnik – Capablanca, AVRO 1938 |
| `byrne-fischer-1956` | D. Byrne – Fischer, New York 1956 (세기의 대국) |
| `polugaevsky-nezhmetdinov-1958` | Polugaevsky – Nezhmetdinov, Sochi 1958 |
| `spassky-bronstein-1960` | Spassky – Bronstein, Leningrad 1960 |
| `petrosian-pachman-1961` | Petrosian – Pachman, Bled 1961 |
| `botvinnik-portisch-1968` | Botvinnik – Portisch, Monte Carlo 1968 |
| `fischer-spassky-1972-g6` | Fischer – Spassky, 세계선수권 1972 제6국 |
| `karpov-kasparov-1985-g16` | Karpov – Kasparov, 세계선수권 1985 제16국 |
| `short-timman-1991` | Short – Timman, Tilburg 1991 |
| `deep-blue-kasparov-1997-g6` | Deep Blue – Kasparov, New York 1997 제6국 |
| `kasparov-topalov-1999` | Kasparov – Topalov, Wijk aan Zee 1999 |

- [ ] **Step 5: 최소 판수 올리고 검증**

`src/sources/classics.test.ts`에서 `const MIN_CLASSICS = 3`을 `const MIN_CLASSICS = 30`으로 바꾼다.

Run: `npx vitest run src/sources/classics.test.ts src/chess`
Expected: PASS (30판 전부 합법 수순, 주석 없음, 필수 필드 충족)

- [ ] **Step 6: 커밋**

```bash
git add src/chess/pgn.ts src/chess/pgn.test.ts scripts/add-classic.ts src/data/classics.json src/sources/classics.test.ts
git commit -m "feat(data): 명국 30판 큐레이션과 PGN 정리 스크립트" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 25: README와 Vercel 배포

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: 전체 앱, `VITE_SOURCE_URL` 환경 변수 (Task 16 `LicensesPage`)
- Produces: 공개 GitHub 저장소, Vercel 배포 URL

> 이 태스크의 GitHub 저장소 생성, push, Vercel 연결은 **외부에 공개하는 작업**이다. 실행 전에 사용자에게 저장소 이름과 공개 여부를 확인받는다. Vercel 로그인은 사용자가 직접 한다.

- [ ] **Step 1: README 작성**

```markdown
# Chessling ♜

Chess.com·Lichess 대국, 최근 톱 대회, 역사적 명국을 브라우저 안의 Stockfish로 분석하고,
원하는 수에서 분기해 엔진과 이어 둘 수 있는 웹 앱입니다. 서버 없이 모든 연산이 브라우저에서 돌아갑니다.

## 개발

    npm install          # postinstall이 lite Stockfish를 public/engine에 복사합니다
    npm run dev          # http://localhost:5173
    npm test             # 단위·컴포넌트 테스트
    npm run e2e          # Playwright (빌드 후 preview 서버에서 실행)
    npm run engine:smoke # 실제 Stockfish로 메이트 인 1 확인

명국 추가: `npx tsx scripts/add-classic.ts <file.pgn> --slug <slug> --title <제목> --summary <소개>`

## 배포

Vercel(Vite 프리셋). `vercel.json`이 SPA fallback과 COOP/COEP 헤더를 설정합니다.
환경 변수 `VITE_SOURCE_URL`에 이 저장소 주소를 넣으면 /licenses 페이지에 표시됩니다.

## 라이선스

GPL-3.0-or-later. Stockfish(GPL-3.0), chessground(GPL-3.0-or-later)를 포함합니다. 자세한 내용은 `LICENSE`와 앱의 /licenses 페이지를 보세요.
```

- [ ] **Step 2: 전체 검증**

Run: `npm test && npm run build && npm run e2e`
Expected: 모두 PASS

- [ ] **Step 3: 커밋**

```bash
git add README.md
git commit -m "docs: README" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: GitHub 저장소 생성과 push (사용자 확인 후)**

```bash
gh repo create chessling --public --source . --push
```

- [ ] **Step 5: Vercel 연결 (사용자 작업)**

사용자가 Vercel 대시보드에서 저장소를 Import한다(Framework: Vite, Build: `npm run build`, Output: `dist`). Environment Variables에 `VITE_SOURCE_URL=https://github.com/<owner>/chessling`을 넣고 배포한다.

- [ ] **Step 6: 배포 검증**

```bash
curl -sI https://<배포-도메인>/ | grep -i cross-origin
curl -sI https://<배포-도메인>/game/classic/opera-game | head -1
curl -sI https://<배포-도메인>/engine/stockfish-19-lite.wasm | grep -i -E 'content-type|cache-control'
E2E_BASE_URL=https://<배포-도메인> npx playwright test e2e/isolation.spec.ts
```
Expected: COOP/COEP 헤더가 있고, 딥 링크가 `200`, wasm이 `application/wasm`에 immutable 캐시, isolation 테스트 PASS.

---

## 스펙 대비 추적표

| 스펙 항목 | 태스크 |
|---|---|
| §2 스택·lite 엔진 | 1, 8 |
| §3 화면·라우팅·키보드·모바일 | 16–22 (라우트), 18 (키보드), 17·18·20·22 (모바일 CSS) |
| §4.1 GameRef·GameRecord·PGN·daily | 2, 3, 4 |
| §4.2 소스 어댑터·NDJSON·TanStack 캐싱 | 9–13 |
| §4.3 UciEngine·인스턴스 2개·빌드 폴백·리뷰·분류 | 5–8 |
| §4.4 forks·reviews·메모리 폴백 | 14, 15 |
| §4.5 classics.json 규칙 | 13, 24 |
| §5.1 유저 대국 조회·변형 표시 | 20 |
| §5.2 실시간 분석·토글 중단 | 18, 19 |
| §5.3 리뷰·캐시·일시정지·취소 | 7, 19 |
| §5.4 분기 대국·자동 저장·무르기·종료·원래 수순 | 14, 22 |
| §5.5 오늘의 명국 | 4, 13, 16 |
| §6 에러 처리 | 10 (HttpError), 16 (ErrorView·60초·재시도 정책·저장소 배너), 6 (크래시), 18 (싱글스레드 배너), 21 (진행 중 새로고침) |
| §7 배포 설정 | 1, 25 |
| §8 테스트 전략 | 각 태스크 단위 테스트, 8 (스모크), 13·24 (데이터 검증), 23 (E2E) |
| §9 라이선스 | 1, 16, 25 |
