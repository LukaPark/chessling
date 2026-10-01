# 명경기 해설 도구

1. `npm run annotate:facts -- opera-game`: Stockfish(depth 22, MultiPV 3)로 팩트 시트를 만들어요. 결과는 `scripts/annotate/facts/opera-game.json`(커밋하지 않음)이고, `all`을 주면 30판을 모두 돌려요.
2. `npm run annotate:preview -- opera-game`: 팩트 시트로 만든 수 코멘트를 수마다 한 줄씩 보여 줘요.
3. 해설을 작성한 뒤 `npx vitest run src/data/annotations`를 돌려요.
