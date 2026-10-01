# 명경기 해설 도구

해설을 쓰기 전에 `docs/superpowers/annotation-style.md`(문체 기준)를 읽어요.

1. `npm run annotate:facts -- opera-game`: Stockfish(depth 22, MultiPV 3)로 팩트 시트를 만들어요. 결과는 `scripts/annotate/facts/opera-game.json`(커밋하지 않음)이고, `all`을 주면 30판을 모두 돌려요. 한 포지션에 20초쯤 걸려요.
2. `npm run annotate:view -- opera-game`: 팩트 시트를 수마다 한 줄(판정, 형세 전→후, 직전 포지션 후보 수 3개)로 보여 줘요. 해설은 이 표를 근거로 써요.
3. `npm run annotate:probe -- opera-game 12:f3b3,c4f7 18:c3b5`: 그 포지션에서 각 수를 둔 뒤의 형세와 수순을 보여 줘요. 퀴즈 오답 반박은 이 결과로만 써요.
4. `npm run annotate:preview -- opera-game`: 일반 대국용 자동 코멘트를 수마다 보여 줘요.
5. 해설을 작성한 뒤 `npx vitest run src/data/annotations`를 돌려요.
