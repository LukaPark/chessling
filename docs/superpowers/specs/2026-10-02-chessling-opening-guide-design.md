# Chessling 오프닝 안내 설계 문서

- 작성일: 2026-10-02
- 상태: 설계 확정, 구현 계획 작성 전
- 선행 스펙: `2026-10-01-chessling-commentary-quiz-design.md` (해설·퀴즈). 이 문서는 오프닝 판별·설명·분기 연결만 추가한다.
- 브랜치: `feat/opening-guide`

## 1. 목적과 범위

기보를 볼 때 지금 수가 어떤 오프닝·변화에 해당하는지 알려 주고, 그 오프닝을 직접 두며 익힐 수 있게 기존 분기 기능과 잇는다.

- 모든 대국(명경기, Lichess·Chess.com·PGN으로 불러온 내 대국)에서 수마다 오프닝 이름을 보여 준다.
- 주요 계열 약 40개와 자주 나오는 변화 약 150개는 한국어 설명을 직접 쓴다.
- 대표 수순 끝 포지션, 그리고 실제 대국이 이론에서 벗어나기 직전 포지션에서 분기할 수 있게 한다.

### 정한 것

| 항목 | 결정 |
|---|---|
| 데이터 출처 | Lichess `chess-openings` (CC0, TSV a~e, 약 3,500개) |
| 판별 방식 | 포지션(EPD) 색인. 전치를 인식한다 |
| 설명 깊이 | 계열 약 40개 + 자주 나오는 변화 약 150개 |
| 이름 표기 | 한국어 + 원문 병기. 설명이 없는 변화는 "한국어 계열명 · 영어 변화명" |
| 분기 연결 | 대표 수순 끝에서 분기, 이론 이탈 직전에서 분기 둘 다 |
| 외부 API | 쓰지 않는다. 모든 데이터는 번들에 넣고 지연 로드한다 |

### 범위 밖

- 실전 통계(승률·빈도), 오프닝 탐색기(트리 브라우징), 오프닝 레퍼토리 저장
- 보드 화살표 안내(별도 스펙 `2026-10-02-board-guide-design.md`)
- 3,500개 전체의 한국어 번역

## 2. 데이터

### 2.1 Lichess 원본과 빌드 스크립트

- 원본: `scripts/openings/source/{a,b,c,d,e}.tsv` (열: `eco`, `name`, `pgn`). 저장소에 그대로 둔다.
- `scripts/openings/build.ts` (`npm run openings:build`): TSV를 읽어 PGN을 chess.js로 두고, 최종 포지션의 EPD(FEN 앞 네 필드)를 계산해 `src/data/openings/index.json`을 만든다.

```ts
interface OpeningEntry {
  eco: string        // "B90"
  name: string       // "Sicilian Defense: Najdorf Variation"
  uci: string[]      // 대표 수순
  epd: string
}
```

- 같은 EPD가 여러 이름에 걸리면 수순이 더 긴 쪽(더 구체적인 이름)을 남긴다. 빌드 때 충돌 목록을 출력한다.
- 생성된 `index.json`은 커밋한다(빌드 단계에서 네트워크·스크립트를 돌리지 않기 위해).
- 라이선스 화면(`src/features/licenses/LicensesPage.tsx`)에 Lichess chess-openings (CC0) 표기를 추가한다.

### 2.2 한국어 데이터 `src/data/openings/ko.json`

```ts
interface KoOpenings {
  families: Record<string, {   // 키: 원문 계열명 "Sicilian Defense"
    name: string               // "시실리안 디펜스"
    idea: string               // 핵심 아이디어 1~2문장
    plans: { white: string; black: string }  // 대표 계획 각 1문장
  }>
  variations: Record<string, { // 키: 원문 전체 이름 "Sicilian Defense: Najdorf Variation"
    name: string               // "나이도르프 변화"
    summary: string            // 1~2문장
    line: string               // 대표 수순 SAN, 8~16수(반수 기준 아님, 백·흑 한 쌍을 1수로 센다)
  }>
}
```

- 계열 키는 원문 이름의 `:` 앞부분이다. 변화 키는 원문 전체 이름이며, 하위 변화(`Najdorf Variation, English Attack`)는 가장 긴 접두어로 상위 변화 설명을 물려받는다.
- 변화 150개 선정:
  1. 명경기 30판이 지나가는 변화 전부
  2. 계열 40개의 대표 변화 3~4개씩
  - 작성 전에 선정 목록을 사용자에게 보여 주고 확정한다.

### 2.3 검증 (`src/data/openings/validate.ts`, vitest)

- `families`·`variations`의 키가 `index.json` 이름(또는 그 계열 접두어)과 정확히 맞는다.
- `line`이 합법이고, 그 수순 중에 해당 변화의 EPD를 지난다.
- 금칙어와 문장 길이는 명경기 해설 기준(`docs/superpowers/annotation-style.md`)과 같은 규칙으로 검사한다(검사 함수를 재사용한다).
- 계열마다 변화가 1개 이상 있다.

## 3. 판별 (`src/openings/identify.ts`)

```ts
interface OpeningAt {
  ply: number                  // 이 이름이 처음 맞은 수
  entry: OpeningEntry
  family: KoFamily | null
  variation: KoVariation | null   // 가장 긴 접두어로 찾은 설명
}

interface OpeningTrack {
  byPly: (OpeningAt | null)[]  // 수마다 그 시점의 오프닝(0수는 null)
  deviation: { ply: number; theory: string[] } | null
  // ply: 이론에서 벗어난 첫 수. theory: 그 직전 포지션에서 색인이 이어 가는 수(UCI)
}

function identifyOpening(plies: Ply[], data: OpeningData): OpeningTrack | null
```

- 시작 포지션이 표준이 아니면 `null`을 돌려준다(FEN으로 시작한 대국, 중간에서 시작한 분기 대국).
- 수마다 포지션 EPD를 색인에서 찾는다. 맞으면 그 항목이 새 "현재 오프닝"이 되고, 맞지 않으면 앞의 값을 그대로 이어 간다.
- 이론 이탈: 마지막으로 색인에 맞은 수 다음 수부터 색인에 다시 맞지 않으면, 그 첫 수를 `deviation.ply`로 둔다. `theory`는 직전 포지션에서 한 수를 더 두어 색인에 맞는 수들이다(많이 나온 순서가 없으므로 수순이 짧은 항목부터 최대 3개). 이어 가는 수가 없으면(이론 끝까지 둔 경우) `deviation`은 `null`이다.
- 데이터는 `import()`로 지연 로드한다. `useOpening(plies)` 훅이 로드 상태를 관리하고, 실패하면 `null`을 돌려주며 `console.warn`만 남긴다.

## 4. 화면 표시

### 4.1 판정 카드 (`JudgmentCard`)

- 맨 위에 한 줄: `B90 · 시실리안 디펜스: 나이도르프 변화 · Najdorf`. 한국어 변화명이 없으면 `B90 · 시실리안 디펜스 · Najdorf Variation, Adams Attack`처럼 쓴다.
- 오프닝 이름이 바뀌는 수에는 "오프닝" 배지를 달고, 해설 문단 위에 변화 `summary`(없으면 계열 `idea`)를 붙인다. 긴 글은 기존 `CommentText`의 [더 보기] 규칙을 따른다.
- `deviation.ply`에서는 "이론 이탈" 배지와 `이론대로라면 7.Be3`(이론 수 SAN, 최대 3개를 "또는"으로 잇는다) 한 줄을 보여 준다.
- 명경기에서 직접 쓴 해설이 있어도 이름 줄과 배지는 보여 준다. 해설 문단은 대신하지 않고, 오프닝 설명은 해설 문단 위에 따로 둔다.

### 4.2 오른쪽 패널 "오프닝" 섹션

- 기존 `Disclosure`로 "엔진 라인" 위에 둔다. 기본은 접힘이다. 오프닝을 판별하지 못하면 섹션을 숨긴다.
- 내용:
  - 계열 이름(한국어 + 원문), `idea`, `plans.white`, `plans.black`
  - 변화 이름과 `summary`
  - 대표 수순(`line`, 없으면 색인의 `uci`): 실제 대국과 같은 수는 진하게, 갈라지는 수부터는 다른 색으로 표시한다.
  - 버튼: "이 수순으로 연습", "이탈 지점에서 분기"(이탈이 없으면 숨김)
- 모바일: 기보 시트 위쪽에 같은 섹션을 접힌 상태로 넣는다.

## 5. 분기 연결

기존 `ForkDialog`(색·엔진 강도 선택)와 `createFork`를 그대로 쓴다. `ForkRecord.startFen`이 기보 밖 포지션도 받으므로 데이터 구조는 바꾸지 않는다.

| 버튼 | startFen | originPly | 제목 | 대화상자 안내 |
|---|---|---|---|---|
| 이 수순으로 연습 | 대표 수순 끝 포지션 | 이 변화에 들어선 수(`OpeningAt.ply`) | `{계열}: {변화} 연습` | 대표 수순 SAN 한 줄 |
| 이탈 지점에서 분기 | `deviation.ply - 1` 포지션 | `deviation.ply - 1` | 기존 형식(`… N수째에서 분기`) | `이론 수: Be3` |

- 분기가 시작되면 기존처럼 `/play/:id`로 이동한다.

## 6. 예외 처리

- 비표준 시작 포지션: 판별하지 않고 이름 줄·배지·섹션을 모두 숨긴다.
- 데이터 로드 실패: 같은 방식으로 숨기고 경고만 남긴다. 다른 기능은 영향을 받지 않는다.
- 첫 수 전(0수): 이름 줄을 보여 주지 않는다.
- 퀴즈 중: 오프닝 섹션 버튼을 비활성화한다(퀴즈 중 이동 잠금과 같은 규칙).

## 7. 설명 작성 흐름

1. 선정 목록(계열 40, 변화 150)을 만들어 사용자 확인을 받는다.
2. 묶음(계열 10개와 그 변화들) 단위로 `ko.json`을 쓴다.
3. 묶음마다 검증 테스트를 돌리고, 검토 에이전트로 문체와 체스 사실(포지션 기준)을 확인한 뒤 커밋한다.
4. 출판된 책·위키 문장을 옮기지 않는다.

## 8. 테스트

- 단위
  - `identifyOpening`: 전치 인식(1.d4 Nf6 2.c4 e6 / 1.c4 e6 2.d4 Nf6), 이론 이탈 수와 이론 수, 0수, 비표준 시작
  - 빌드 결과: EPD 충돌 처리, 모든 항목의 수순이 합법
  - `ko.json` 검증(2.3)
  - `JudgmentCard` 이름 줄·배지, 오프닝 섹션 렌더, 분기 버튼이 올바른 `startFen`·`originPly`·제목으로 대화상자를 여는지
- E2E
  - 오페라 게임 2...d6 뒤 "필리도르 디펜스"가 보인다
  - "이 수순으로 연습" → 분기 대화상자 → `/play/`로 이동한다
  - 375px에서 가로 스크롤이 없다
- 번들: 오프닝 데이터가 초기 청크에 없고 별도 청크로 나뉜다(`npm run build` 결과로 확인)
- 전체: `npm test && npx tsc --noEmit && npm run build && npm run e2e`
