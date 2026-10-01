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

Vercel(Vite 프리셋). `vercel.json`이 SPA fallback과 COOP/COEP 헤더를 설정합니다.
환경 변수 `VITE_SOURCE_URL`에 이 저장소 주소를 넣으면 /licenses 페이지에 표시됩니다.

## 라이선스

GPL-3.0-or-later. Stockfish(GPL-3.0), @lichess-org/chessground(GPL-3.0-or-later)를 포함합니다. 자세한 내용은 `LICENSE`와 앱의 /licenses 페이지를 보세요.
