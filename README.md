# Chessling ♜

Chess.com·Lichess 대국, 최근 톱 대회, 역사적 명경기를 브라우저 안의 Stockfish로 분석하고,
원하는 수에서 분기해 엔진과 이어 둘 수 있는 웹 앱입니다. 서버 없이 모든 연산이 브라우저에서 돌아갑니다.

## 개발

    npm install          # postinstall이 lite Stockfish를 public/engine에 복사합니다
    npm run dev          # http://localhost:5173
    npm test             # 단위·컴포넌트 테스트
    npm run e2e          # Playwright (빌드 후 preview 서버에서 실행)
    npm run engine:smoke # 실제 Stockfish로 메이트 인 1 확인

명경기 추가: `npx tsx scripts/add-classic.ts <file.pgn> --slug <slug> --title <제목> --summary <소개>`

## 배포

GPT Sites로 배포합니다. `npm run build` 결과물(`dist/`)을 올리고, 호스팅 설정은 `public/`의 두 파일이 맡습니다.

- `public/_redirects`: 없는 경로를 모두 `index.html`로 돌려줍니다(SPA fallback). 그래서 `/game/...`, `/settings` 같은 주소로 바로 들어가거나 새로고침해도 열립니다.
- `public/_headers`: `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: credentialless`를 붙입니다. 이 헤더가 있으면 Stockfish가 멀티스레드로, 없으면 싱글스레드로 돌아갑니다.

GPL 소스 링크는 기본으로 이 저장소(https://github.com/LukaPark/chessling)를 가리킵니다. 다른 주소를 쓰려면 빌드할 때 `VITE_SOURCE_URL`을 지정하세요(예: `.env.production.local`).

## 라이선스

GPL-3.0-or-later. Stockfish(GPL-3.0), @lichess-org/chessground(GPL-3.0-or-later)를 포함합니다. 자세한 내용은 `LICENSE`와 앱의 /licenses 페이지를 보세요.
