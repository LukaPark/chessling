# Chessling 리뉴얼 설계 문서

- 작성일: 2026-09-30
- 상태: 설계 확정, 구현 계획 작성 전
- 선행 스펙: `docs/superpowers/specs/2026-09-30-chessling-design.md` (기능·동작은 그대로, 이 문서가 화면·스타일·판정을 덮어쓴다)
- 브랜치: `feat/chessling-v1`에서 이어서 진행

## 1. 목적과 범위

기능은 완성됐지만 UI가 오래돼 보인다(따뜻한 베이지 캔버스, 테두리 박스 반복, 약한 서체 위계, 데스크톱 우선).
사용자가 제공한 디자인 가이드(맥용 한글 입력기 "글가드" 웹사이트 디자인 문서)의 **디자인 시스템·모션 원칙**을
Chessling에 맞게 재해석하고, 그 문서의 연출 발상 일부(큰 히어로 오브젝트, 잉크 정착 효과)를 체스식으로 빌려온다.
동시에 **수 판정을 Chess.com식으로 확장**한다.

두 파트로 나뉜다.
- **Part A — UI 리뉴얼:** 토큰·테마·서체·기본 부품·전 화면 재해석·모션·접근성. **모바일 퍼스트.**
- **Part B — 판정 확장:** 탁월/좋은 수/놓침 등 판정 추가, 리뷰 MultiPV 2, 최선 수 힌트화.

### 범위 밖
- 글가드 전용 요소(한글 키보드 키캡, 조합 메모리 시각화, Karabiner 팝업, 에이전트 설치, 설치 스크롤 무대)
- 보드 테마 선택 UI (쿨톤 단일 테마)
- 자동 시각 회귀 테스트 (수동 스크린샷 확인만)
- SSR 도입 (Vite SPA 유지)
- 이론 수(book move) 판정

## 2. 기술 스택 추가

| 영역 | 선택 |
|---|---|
| 스타일 | Vanilla Extract (`@vanilla-extract/css`, `@vanilla-extract/recipes`, `@vanilla-extract/vite-plugin`) |
| 모션 | Motion for React (`motion`) |
| 아이콘 | `lucide-react`, `strokeWidth={1.5}` 고정. GitHub만 공식 채움 로고 인라인 SVG |
| 서체 | Pretendard Variable 자체 호스팅 (OFL 라이선스 동봉), jsDelivr 공식 배포본을 네트워크 fallback |

기존 `src/styles.css`는 이전 완료 후 삭제한다.

## 3. 토큰과 테마 (Part A)

### 3.1 파일 구조
```
src/styles/
├─ tokens.css.ts    # createGlobalThemeContract + 라이트/다크 값
├─ global.css.ts    # 리셋, 서체(@font-face), 한글 줄바꿈, 포커스, reduced-motion
├─ index.css.ts     # tokens → global → features 순서로 import
└─ features/        # 화면별 스타일
```

### 3.2 색 토큰 (의미 이름 고정, 라이트/다크 같은 계약)

| 토큰 | 라이트 | 다크 | 용도 |
|---|---|---|---|
| canvas | #ffffff | #0f1216 | 페이지 배경 |
| surface | #ffffff | #161a20 | 주요 면 |
| surfaceSubtle | #f3f5f8 | #1d222a | 구분선 대신 쓰는 낮은 대비 면, ghost hover |
| ink | #171d26 | #e8ecf2 | 본문 |
| muted | #596372 | #9aa4b2 | 보조 글자 (대비 ≥ 4.5:1) |
| line | #dce1e7 | #2a313b | 입력 필드 테두리 등 필수 최소 |
| accent / accentHover | #254acb / #19399f | #6f8cff / #8aa2ff | 주요 액션, 링크, 마지막 수 |
| onAccent | #ffffff | #0f1216 | 강조색 위 글자 |
| boardLight / boardDark | #eef1f6 / #8fa0c4 | #3a4254 / #262c38 | 쿨톤 보드 칸 |
| judgment.* | 판정별 색 (§8.1) — 라이트/다크 각각 대비 ≥ 3:1 (아이콘), 텍스트와 함께 표시 | | 판정 |

### 3.3 서체·크기·간격
- 전역 sans 스택: `"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif`. 제목·본문·버튼·입력 동일.
- 굵기 **400(본문·버튼)·500(제목·강조)** 만 사용.
- 크기: display 48/64/76px (모바일/태블릿/데스크톱), section 30/36px, body 17px, control 15px, meta 13px.
- 한글: `word-break: keep-all`, 제목 `text-wrap: balance`, 본문 `text-wrap: pretty`.
- 간격 스케일 4/8/12/16/24/32/48/64/96/144. 주요 섹션 간격 88px(모바일)/144px(데스크톱).
- 모서리: 액션 12px(모바일)/14px, 면 16px. 페이지 최대 폭 1160px, 좌우 20px(모바일)/24px.
- **테두리 박스 금지.** 영역은 여백과 surfaceSubtle 면으로 구분. 예외: 입력 필드 테두리.
- 문장 속 링크만 밑줄. 그 외 액션은 밑줄 없는 단색 버튼.

### 3.4 다크 모드
- 초기값은 `prefers-color-scheme`. 헤더 토글로 명시 선택하면 localStorage(`chessling-theme`)에 저장, 라우트·새로고침에 유지.
- `index.html` `<head>` 인라인 스크립트가 첫 페인트 전에 `html[data-theme]`를 설정 (깜빡임 방지). localStorage 접근 실패 시 시스템 설정.
- 토글 시 배경·면·선 색 300ms 선형 보간. 아이콘은 opacity/transform 교체. `prefers-reduced-motion`이면 즉시.

## 4. 레이아웃과 기본 부품 (Part A)

### 4.1 헤더·푸터
- 헤더 높이 52px(모바일)/60px, 배경은 뷰포트 전체 폭, 내부 정렬 폭 1208px. 하단 테두리 없음.
- 좌: 워드마크 "Chessling" (500) + 강조색 점. 홈 링크.
- 우: ghost 메뉴 (대회 · 명국 · 내 분기, 높이 32px, 세로 중앙, 현재 페이지 ink / 나머지 muted, hover 시 surfaceSubtle), 테마 토글 IconButton(Sun/Moon), GitHub 로고 링크(`VITE_SOURCE_URL` 있을 때만).
- 320px 폭까지 한 줄 유지 (햄버거 없음).
- 본문 바로가기 링크 → `<main id="main">`.
- 푸터: 좌측 "Chessling · GPL-3.0-or-later" + [라이선스·소스] 링크. 배경·구분선 없음.

### 4.2 기본 부품 (`src/ui/`)
| 부품 | 규칙 |
|---|---|
| Button / LinkButton | variant primary(accent 단색)/secondary(surfaceSubtle 단색)/ghost(투명). 높이 44px(모바일)/48px, sm 40px. 글자 15px·400, 아이콘-글자 간격 8px. hover −2px, tap scale .98. disabled·busy(`aria-busy`, LoaderCircle) 상태. 같은 recipe 공유, `<button>`/`<a>` 역할 분리 |
| IconButton | 44px 정사각형, `aria-label` 필수, 기본 ghost |
| Icon | lucide 래퍼, strokeWidth 1.5, size 16/20/24 |
| Surface | surfaceSubtle 배경, 모서리 16px, 테두리 없음 |
| Section | 제목·부제·본문, 섹션 간격, 스크롤 진입 모션(§7) |
| Segmented | radiogroup, 화살표 키 이동. 선택=surface 면+ink, 비선택=muted |
| Field | 텍스트 입력·select, 높이 48px, line 테두리, focus 3px accent 링 |
| Badge | surfaceSubtle 알약. "진행 중"은 옅은 적색 면 + 점 |
| Disclosure | 접이식 섹션 (button + `aria-expanded`, 높이 320ms/페이드 180ms, 닫힌 내용 inert) |
| Sheet / Dialog | 네이티브 `<dialog>` `showModal()`. 포커스 가두기·Esc·포커스 복귀·흐린 배경. Sheet는 모바일 바텀 시트(아래에서 250ms) |
| Banner · ErrorView | surfaceSubtle 면 + lucide 아이콘(Info/TriangleAlert). ErrorView 60초 잠금 등 기존 동작 유지 |

공통: focus-visible 3px accent 링, 터치 대상 ≥ 44px.

## 5. 홈 (Part A)

### 5.1 히어로 (최소 100svh, 100vh fallback, 상단 여백 48/64px, 가운데 정렬, 모바일 퍼스트)
- h1: **"역사적인 대국에 직접 참여하세요."** — 마지막 구절 "직접 참여하세요."에 잉크 효과: 왼쪽부터 120ms 간격으로 청색·청록·보라 그라디언트가 드러나고 각 글자 550ms 안에 ink로 정착. 문장 공간을 미리 확보해 줄바꿈이 흔들리지 않음. 초기 HTML에 텍스트 존재, 효과는 JS 실행 후에만. 모션 감소 시 즉시 완성.
- 부제 (muted, 균형 줄바꿈): "Chess.com·Lichess에서 둔 내 대국도 브라우저 속 Stockfish로 분석하고, 원하는 수에서 엔진과 이어 둘 수 있어요."
- 주 작업: [Segmented Chess.com|Lichess] + [Field 아이디] + [불러오기 primary]. 모바일은 세로 쌓기, 768px 이상 한 줄.
- 보조 CTA: [오늘의 명국 보기] (secondary LinkButton, 뷰어로 이동).
- CTA 아래 44/64px에 **자동 재생 보드** (최대 640px, 폭 92vw, 쿨톤, 보기 전용, 엔진 미사용):
  - 첫 진입 시 오늘의 명국을 한 수당 900ms로 재생. 마지막 수 칸 옅은 accent.
  - 아래 가로 **기보 띠**: 새 수는 청색 그라디언트 → ink 550ms 정착, 현재 수가 보이도록 자동 가로 스크롤.
  - 캡션: "<제목> · <백> vs <흑> · <연도>".
  - 조작: [멈춤/재생] [처음부터] [이 대국 분석하기].
  - 멈춤 조건: 멈춤 버튼, 보드·기보 클릭, 히어로가 화면 밖, 탭 숨김. 재진입 시 자동 재개 없음.
  - 모션 감소: 최종 포지션과 전체 기보를 즉시 표시.

### 5.2 히어로 아래 (카드 없이, 실제 데이터만)
1. 오늘의 명국 이야기 — 모바일 1열 / 768px+ 2열: 제목·대국자·연도·summaryKo | [분석하기] [여기서 이어 두기].
2. 진행 중인 대회 — Lichess top active 최대 3개 + [전체 대회]. 실패 시 섹션 숨김.
3. 명국 컬렉션 맛보기 — 시대가 다른 4판(제목·연도) + [컬렉션 전체].
- 과장 수치·가짜 후기·로고 모음 금지.

## 6. 화면 재해석 (Part A, 모바일 퍼스트)

모든 화면은 375px 한 열을 기본 스타일로 쓰고 `min-width` 미디어 쿼리(768px, 1024px)에서만 확장한다.

### 6.1 대국 뷰어 — 보드 중심
**모바일 (기본)**
```
‹  <백> vs <흑> · <연도>            ⋯       한 줄 헤더 (뒤로, 메뉴: 보드 뒤집기 등)
██████████████▒▒▒▒▒  +0.26                  가로 평가 바 (전체 폭)
[ 보드 (전체 폭) ]                           주인공
[ 판정 카드 ]                                 이번 수 판정 (§8)
▁▂▃▅▆▇▆▅  평가 그래프                        리뷰 후 표시, 탭하면 이동
▸ 엔진 라인 (접힘)                            펼치면 라인 + 최선 수 화살표
▸ 기보 전체 (접힘)
[ ⏮  ◀  [12/33]  ▶  ⏭  💡힌트  ⑂분기 ]     하단 고정 조작 막대 56px + safe-area
```
- 하단 막대 버튼 48px 이상. 가운데 "n / N"은 기보 전체 바텀 시트를 연다.
- 보드 좌우 스와이프 = 이전/다음 수 (보조 수단).
- 실시간 분석은 계속 동작 (평가 바용). **최선 수 화살표는 기본 끔** — 힌트 또는 엔진 라인 펼침 시에만.
- 리뷰 전 판정 카드 자리: "리뷰를 실행하면 수마다 판정이 붙어요" + [리뷰 실행 primary].
- 리뷰 결과 요약(백/흑 정확도 큰 숫자 + 판정 개수)은 판정 카드 아래 한 줄 요약 + 탭 시 상세.
- 기존 동작 유지: 키보드 ←/→/Home/End, 진행 중 배지 + 새로고침, 싱글스레드·엔진 오류 배너, 변형 차단, 리뷰 다시 실행.

**768px 이상:** 2열 — 좌 보드(최대 640px)와 세로 평가 바, 우 판정 카드·요약·그래프·접힌 섹션. 하단 고정 막대 → 보드 아래 일반 조작 줄.

### 6.2 유저 대국 목록 · 대회 · 명국
- 목록 행: 테두리 없이 행 간 여백 + hover surfaceSubtle. 날짜·속기 muted 13px, 대국자 17px, 결과 오른쪽.
- 필터: Segmented(색·결과) + Field select(시간 제한). 월 이동 ghost 버튼 + "2026년 9월".
- 대회: 강조 항목은 강조색 점 + 500. 빠른 검색은 Segmented. 라운드 선택 Field select.
- 명국 컬렉션: 모바일 1열 / 768px+ 2열. 큰 muted 연도, 500 제목, 소개 3줄 줄임.

### 6.3 분기 대국 · 내 분기
- 분기 대국: 보드 중심 + 하단 고정 막대(무르기 secondary, 기권 secondary, Elo, PGN ghost Download). 상태 "내 차례"(점) / "엔진이 생각 중…"(LoaderCircle). Elo는 막대의 버튼을 누르면 Sheet로 슬라이더. 기보·원래 수순은 Disclosure로 접힘.
- 분기 다이얼로그: 네이티브 dialog로 교체 (Esc·포커스 가두기·복귀).
- 내 분기: 여백·hover 면 행, 오른쪽 ghost IconButton(Play/Download/Trash2).

### 6.4 라이선스 · NotFound
- 라이선스: 본문 폭 640px 읽기 레이아웃. NotFound: 큰 "404" + 홈 버튼.

## 7. 모션 (Part A, Motion for React, easing [.22,1,.36,1])
- 스크롤 진입: 텍스트 18px/600ms, 그래픽 28px + .985배/760ms. 묶음 내 80ms 간격, 최대 지연 160ms. 뷰포트 하단 48px 안쪽 진입 시 요소별 1회. 부모·자식 중첩 금지.
- 초기 HTML·JS 비활성에서 콘텐츠 숨김 금지: 마운트 후 **첫 화면 밖 요소만** 준비 상태로 전환. 키보드 포커스가 들어오면 즉시 표시.
- 버튼 hover −2px, tap .98. 판정 아이콘 스프링(stiffness 650, damping 32), 블런더만 짧은 흔들림(transform).
- 평가 그래프: 리뷰 완료 시 왼쪽부터 1회 드러남(scaleX 마스크), 진행 중에는 분석되는 대로 채움.
- Sheet/Dialog 250ms, 테마 전환 300ms.
- opacity/transform만. 블러·스크롤 가로채기 금지.
- `prefers-reduced-motion`: 이동·크기·흔들림 모두 끔, 색·면 차이로 상태 구분, 로딩 회전 정지, 히어로 즉시 완성.

## 8. 수 판정 확장 (Part B)

### 8.1 판정 (위에서부터 먼저 걸리는 조건 적용, 승률은 두는 쪽 기준 %p)

| 판정 | 기호 | 조건 |
|---|---|---|
| 탁월 brilliant | !! | 최선 수이거나 최선과 2%p 이내 AND 희생(§8.2) AND 두기 전 승률 < 90 AND 둔 뒤 승률 ≥ 50 |
| 좋은 수 great | ! | 최선 수 AND 2순위 수보다 승률 10%p 이상 높음 (유일한 수) |
| 최선 best | ★ | 엔진 최선 수와 동일 |
| 우수 excellent | — | 손실 < 2 |
| 좋음 good | — | 2 ≤ 손실 < 5 |
| 놓침 miss | ✕ | 직전 상대 수가 실수·블런더였고 이번 수 손실 ≥ 10 |
| 부정확 inaccuracy | ?! | 5 ≤ 손실 < 10 |
| 실수 mistake | ? | 10 ≤ 손실 < 15 |
| 블런더 blunder | ?? | 손실 ≥ 15 |

- 합법 수가 하나뿐인 포지션의 수는 판정 없음(null).
- 판정 색: 탁월 청록, 좋은 수 청색, 최선 초록, 우수·좋음 중립, 놓침 적자색, 부정확 호박, 실수 주황, 블런더 적색. 항상 기호 + 한국어 이름과 함께 표시(색 단독 구분 금지).
- 정확도는 기존 Lichess 공식 유지.

### 8.2 희생 판정
둔 수 이후 포지션의 엔진 최선 수순(PV)을 최대 3플라이 따라가며, 두는 쪽 기물 점수(P1·N3·B3·R5·Q9)가 **두기 전 대비 2점 이상 감소**하면 희생. PV가 불법 수를 만나면 그 지점까지만 계산.

### 8.3 리뷰 변경
- 리뷰는 **MultiPV 2**로 분석. 포지션마다 1·2순위 수(UCI), 점수, PV를 저장.
- 결과 형식에 `version: 2` 추가. 캐시의 version이 다르거나 없으면 무시하고 재분석.
- 리뷰 시간 약 1.5배 증가 허용.

### 8.4 판정 카드와 힌트
- 판정 카드: "<수 번호> <SAN> · <기호> <판정 이름> · 형세 <이전> → <이후>".
- **최선 수는 기본 숨김.** [힌트] 토글(Lightbulb, `aria-pressed`)을 누르면 카드에 "힌트: <SAN>" + 보드 화살표. 다시 누르거나 수 이동 시 숨김.
- 카드는 `aria-live="polite"` (빠른 이동 시 디바운스, 마지막 수만 낭독).

## 9. 접근성
- focus-visible 3px accent 링, 터치 ≥ 44px, 본문 바로가기, 대비 4.5:1(라이트·다크).
- 판정은 색+기호+이름. Sheet/Dialog 네이티브 dialog. 스와이프는 보조 수단(버튼·키보드 대체 존재).

## 10. 테스트
- 기존 테스트 유지. 문구·구조가 바뀐 곳(엔진 라인 체크박스 → Disclosure, 버튼 위치)만 테스트 갱신.
- Part B (TDD, 순수 함수): 탁월(희생·조건), 좋은 수(격차), 놓침, 강제 수, 우선순위, 희생 PV 계산. fixture 예: 오페라 게임 16.Qb8+ 퀸 희생.
- 새 부품: Button/Segmented/Disclosure/Sheet, 테마(시스템 추종·저장·data-theme), 힌트 토글(기본 숨김·이동 시 초기화), 히어로 자동 재생(재생·멈춤·화면 밖 멈춤·모션 감소).
- E2E: 선택자를 data-testid·역할 기반으로 교체, **375px 모바일 시나리오** 추가(하단 막대 이동, 힌트, 판정 카드).
- 시각 확인: 375/768/1280 × 라이트/다크 스크린샷 수동 확인.

## 11. 라이선스
- Pretendard Variable OFL 라이선스 파일 동봉, `/licenses`에 추가. lucide-react(ISC), motion(MIT), Vanilla Extract(MIT) 고지 추가.
