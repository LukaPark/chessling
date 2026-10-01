# Chessling 설계 문서

- 작성일: 2026-09-30
- 상태: 설계 확정, 구현 계획 작성 전
- 라이선스: GPL-3.0 (저장소 전체 공개)

## 1. 목적

Chess.com / Lichess 계정의 대국, 최근 톱 대회(올림피아드·월드챔피언십), 역사적 명국을 한 곳에서 보고,
브라우저 내 Stockfish로 분석하며, 임의의 수에서 분기해 엔진과 이어 둘 수 있는 웹 앱.

### 사용자와 운영 조건
- 친구·소수 공유 수준. 로그인·계정·서버 DB 없음.
- Vercel Hobby(무료, 비상업) 정적 배포. 모든 연산은 사용자 브라우저에서 수행.

### 범위 밖 (Non-goals)
- 사용자 계정, 서버 저장, 기기 간 동기화
- LLM 기반 자연어 해설
- 변형 체스(Chess960, 크레이지하우스 등) 뷰어·분석 — 목록에 "지원하지 않음"으로만 표시
- 월드챔피언십 전체 매치 아카이브 (후속 확장 후보)
- 분기 대국 URL 공유, 링크 미리보기(OG 이미지)
- 진행 중 브로드캐스트 자동 갱신 (수동 새로고침만)
- 언더프로모션 선택 UI — 분기 대국에서 폰 승진은 항상 퀸으로 자동 처리

## 2. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 빌드 | Vite + React + TypeScript | 정적 SPA |
| 보드 | `chessground` | GPL-3, 화살표/원 표시 내장 |
| 규칙·PGN | `chess.js` | BSD-2, 표준 체스만 |
| 엔진 | `stockfish` 19 (WASM, Web Worker) | GPL-3. **lite 빌드만 사용**: `stockfish-19-lite.js`(멀티스레드, `crossOriginIsolated`일 때) / `stockfish-19-lite-single.js`(폴백). 풀 NNUE 빌드는 wasm이 약 94MB라 제외 |
| 데이터 조회 | TanStack Query | 캐싱, 재시도 |
| 로컬 저장 | Dexie (IndexedDB) | 분기, 리뷰 캐시 |
| 테스트 | Vitest, MSW, Playwright | |
| 배포 | Vercel | SPA fallback + COOP/COEP 헤더 (`vercel.json`) |

## 3. 화면과 라우팅

| 경로 | 화면 | 핵심 요소 |
|---|---|---|
| `/` | 홈 | 플랫폼 토글 + 유저명 입력, 오늘의 명국 카드, 대회·명국 바로가기 |
| `/player/:platform/:username` | 대국 목록 | 월별 탐색(Chess.com) / 더 보기(Lichess), 필터(시간 제한·색·결과) |
| `/events` | 대회 목록 | Lichess 브로드캐스트, 올림피아드·월챔 강조 |
| `/events/:tourId` | 대회 상세 | 라운드 → 대국 목록 |
| `/classics` | 명국 컬렉션 | 시대순, 짧은 소개 |
| `/game/lichess/:gameId` | 대국 뷰어 | |
| `/game/chesscom/:user/:yyyy/:mm/:uuid` | 대국 뷰어 | Chess.com은 단일 대국 API가 없어 월 아카이브에서 uuid로 탐색 |
| `/game/broadcast/:roundId/:gameId` | 대국 뷰어 | |
| `/game/classic/:slug` | 대국 뷰어 | |
| `/play/:forkId` | 분기 대국 | 보드, Elo 슬라이더, 무르기, 기권, 원래 수순 패널 |
| `/forks` | 내 분기 목록 | 이어 두기, 삭제, PGN 내보내기 |
| `/licenses` | 라이선스 | GPL-3 고지, 소스 저장소 링크, 의존성 고지 |

### 대국 뷰어 레이아웃
- 데스크톱: 좌측 평가 바 + 보드(최선 수 화살표), 우측 엔진 라인 1~3(토글) + 기보(등급 아이콘),
  하단 평가 그래프(클릭 시 해당 수로 이동) + [리뷰 실행] [여기서 분기].
- 모바일: 보드 → 가로 평가 바 → 버튼 → 기보 순 세로 배치.
- 키보드: ←/→ 수 이동, Home/End 처음/끝.

## 4. 모듈 구조

```
src/
├─ chess/        # 순수 도메인 (React 의존 없음)
├─ sources/      # 외부 기보 소스 어댑터
├─ engine/       # Stockfish 워커 래퍼 + 리뷰 계산
├─ storage/      # IndexedDB
├─ features/     # 화면 단위: home, player, events, classics, viewer, play, forks
├─ components/   # Board, EvalBar, EvalGraph, MoveList, EngineLines
└─ data/classics.json
```

의존 방향: `features → components / sources / engine / storage → chess` (역방향 금지).

### 4.1 `chess/`
- `GameRef` (판별 유니온):
  ```ts
  type GameRef =
    | { kind: 'lichess'; id: string }
    | { kind: 'chesscom'; user: string; yyyy: string; mm: string; uuid: string }
    | { kind: 'broadcast'; roundId: string; gameId: string }
    | { kind: 'classic'; slug: string }
  ```
  `refToPath` / `pathToRef` 로 URL과 1:1 변환. 리뷰 캐시 키(`refKey`)도 여기서 생성.
- `GameRecord`: `{ ref, white, black, whiteRating?, blackRating?, result, date, event?, timeControl?, variant, pgn }`
- `GameSummary`: 목록용 경량 타입 (`ref`, 대국자, 결과, 날짜, 시간 제한, `variant`).
- `pgn.ts`: PGN → `Ply[] = { san, uci, fen }[]` (인덱스 0 = 시작 포지션).
- `daily.ts`: `classicOfTheDay(date, slugs)` — `Asia/Seoul` 기준 날짜로 고정 시드 셔플 순서의 인덱스 선택.

### 4.2 `sources/`
```ts
interface GameSource<Q> {
  list(query: Q): Promise<GameSummary[]> // 또는 스트리밍 콜백
  get(ref: GameRef): Promise<GameRecord>
}
```
- `chesscom.ts`: `GET /pub/player/{user}/games/archives` → `GET /pub/player/{user}/games/{yyyy}/{mm}`. **순차 요청만.**
- `lichess.ts`: `GET /api/games/user/{user}?max=30&until={ts}` (`Accept: application/x-ndjson`, 스트리밍 파싱), `GET /game/export/{id}`.
- `broadcast.ts`: Lichess 브로드캐스트 대회 목록 / 대회 / 라운드 PGN.
- `classics.ts`: `data/classics.json` 로드.
- `ndjson.ts`: 청크 경계에 안전한 줄 단위 스트림 파서.
- 소스별 응답 포맷은 어댑터 내부에서만 다루고 외부로는 `GameSummary` / `GameRecord`만 노출.

### 4.3 `engine/`
- `UciEngine`: Web Worker 1개를 감싸는 클래스.
  - `analyze(fen, { multiPv, depth? }, onInfo): Promise<FinalEval>` — 새 요청 시 이전 분석 `stop`.
  - `bestMove(fen, { elo, movetime }): Promise<string>`
  - `setOption`, `dispose`, 크래시 시 재생성.
- 인스턴스 2개: `analysisEngine`(풀파워: 실시간 분석 + 리뷰), `playEngine`(`UCI_LimitStrength`, `UCI_Elo` 1320~3190, `movetime` 제한).
- 빌드 선택: `crossOriginIsolated === true`면 `stockfish-19-lite.js`(멀티스레드), 아니면 `stockfish-19-lite-single.js`로 자동 폴백. 두 빌드 모두 약 1.6MB.
- `review.ts`: `reviewGame(plies, { depth, signal, onProgress })` → `Eval[]`.
- `classify.ts` (순수 함수):
  - 모든 평가는 백 기준으로 정규화. `mate N`은 별도 표현.
  - `winPercent(cp)` — Lichess 공개 공식(로지스틱).
  - 수별 등급: 두는 쪽 기준 승률 하락폭으로 최선 / 좋음 / 부정확 / 실수 / 블런더. 경계값은 Lichess 기준을 따르고 상수로 분리.
  - `accuracy(evals, color)` — Lichess 정확도 공식.

### 4.4 `storage/` (Dexie)
- `forks`: `{ id, origin: GameRef, originPly, startFen, moves: string[] (uci), playerColor, engineElo, result: '*'|'1-0'|'0-1'|'1/2-1/2', createdAt, updatedAt }`
  - 원본 PGN은 저장하지 않음. `startFen`만으로 이어 두기가 가능하고 원본은 필요할 때 다시 조회.
- `reviews`: `{ key: refKey, depth, evals, createdAt }`.
- IndexedDB 사용 불가 시 메모리 구현으로 대체하고 배너 표시.

### 4.5 `data/classics.json`
- 30~100판. 항목: `{ slug, title, white, black, year, event?, summaryKo, pgn }`.
- PGN에는 수순과 표준 태그만. **주석·해설(`{...}`, `;`) 금지** — 해설은 저작물이므로 제외. `summaryKo`는 직접 작성.

## 5. 데이터 흐름

### 5.1 유저 대국 조회
- Chess.com: 아카이브 목록 → 최신 월부터 표시, "이전 달"로 이동.
- Lichess: NDJSON 스트리밍으로 받는 대로 목록에 추가, "더 보기"는 마지막 대국 시각을 `until`로.
- 변형 체스는 목록에 표시하되 "지원하지 않음", 클릭 불가.

### 5.2 뷰어 실시간 분석
`URL → GameRef → source.get() → plies[]`. 수 이동 시 150ms 디바운스 후 `analysisEngine.analyze(fen, multiPv=3)`,
`info` 이벤트마다 평가 바·엔진 라인·화살표 갱신. 엔진 라인 토글 off 시 분석 중단.

### 5.3 전체 대국 리뷰
1. `reviews` 캐시 조회 → 있으면 즉시 표시.
2. 없으면 실시간 분석 일시정지 → 모든 포지션을 고정 depth로 순차 분석(진행률 표시, 결과 나오는 대로 그래프 갱신).
3. `classify()`로 등급·정확도 계산 → 캐시 저장 → 실시간 분석 재개.
4. 페이지 이탈 시 `AbortSignal`로 취소, 캐시 저장 안 함.

### 5.4 분기 대국
1. 뷰어 N수째에서 [여기서 분기] → 다이얼로그(내 색: 기본 = 차례인 쪽, Elo 슬라이더).
2. `forks` 레코드 생성 → `/play/:forkId`.
3. 루프: 내 수 → `chess.js` 합법성 검사 → 저장 → 미종료면 `playEngine.bestMove()` → 적용 → 저장.
4. 매 수 자동 저장. 무르기 = 2플라이 되돌림(엔진 차례에 누르면 엔진 계산 취소 후 1플라이).
5. 종료: 체크메이트, 스테일메이트, 3회 반복, 50수, 기물 부족, 기권.
6. 사이드 패널에 원래 대국의 분기 이후 수순 표시(원본 조회 실패 시 패널만 숨김).

### 5.5 오늘의 명국
`Asia/Seoul` 날짜 → 고정 시드 셔플 순서 인덱스. 서버 없이 모든 사용자에게 같은 날 같은 대국.
명국 추가 = `classics.json` 수정 후 push → Vercel 자동 배포. (추가 시 순서가 바뀌는 것은 허용)

## 6. 에러 처리

| 상황 | 처리 |
|---|---|
| 없는 유저 (404) | "유저를 찾을 수 없어요" + 플랫폼 확인 안내 |
| Lichess 429 | 공식 권고대로 60초 대기 후 재시도 버튼 활성화 (자동 백오프 없음) |
| Chess.com 429 | 순차 요청으로 예방, 발생 시 동일하게 대기 안내 |
| 네트워크 실패 (5xx/오프라인) | TanStack Query 2회 재시도, 4xx는 재시도 안 함 |
| `crossOriginIsolated` false | 싱글스레드 lite 빌드 폴백 + "분석이 느릴 수 있어요" 안내 |
| 워커 크래시 | 워커 재생성 후 현재 작업 1회 재시도 |
| IndexedDB 불가 | 메모리 모드 + "저장되지 않아요" 배너 |
| 잘못된 PGN | 해당 대국만 에러 표시, 목록은 유지 |
| 진행 중 브로드캐스트 | 불완전 PGN 그대로 표시 + "진행 중" 배지 + 수동 새로고침 |

## 7. 배포 설정 (`vercel.json`)
- SPA fallback: `/(.*) → /index.html` (정적 자산 제외).
- 헤더: `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: credentialless`
  (`require-corp`는 CORP 없는 외부 이미지를 막으므로 `credentialless` 사용. 미지원 브라우저는 lite 폴백으로 흡수).

## 8. 테스트 전략

| 층 | 도구 | 대상 |
|---|---|---|
| 단위 (TDD) | Vitest | `pgn.ts`(프로모션·캐슬링·결과만·오류), `GameRef↔URL` 왕복, `classify.ts`(승률 기준값·등급 경계·메이트·정확도), `daily.ts`(결정성·KST 자정 경계·셔플 완전성), `ndjson.ts`(청크 분할·빈 줄·마지막 개행 없음) |
| 어댑터 | Vitest + MSW | 녹화 fixture로 정상·404·429·변형 혼합 응답. CI에서 실제 API 호출 금지 |
| 엔진 래퍼 | Vitest + 가짜 Worker | stop/대체, `info` 파싱(cp·mate·multipv), 크래시 재생성 |
| 엔진 스모크 | Node 스크립트(별도) | 실제 Stockfish로 메이트 인 1 정답 확인 |
| 데이터 검증 | Vitest | `classics.json` 전 PGN 파싱, slug 유일, 필수 필드, 주석 부재 |
| E2E | Playwright | ① Lichess 조회(모킹) → 대국 → 리뷰 → 그래프·등급 ② 분기 → 한 수 → 새로고침 후 유지 → `/forks` 노출 ③ 배포 미리보기에서 `crossOriginIsolated === true` |

## 9. 라이선스
- 저장소 전체 GPL-3.0. `LICENSE` 파일 + `/licenses` 페이지에 Stockfish·chessground(GPL-3), chess.js(BSD-2) 등 의존성 고지.
- 역사적 명국은 수순만 사용(사실 정보), 해설은 직접 작성.
