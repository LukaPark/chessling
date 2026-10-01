import type { PieceSymbol } from 'chess.js'
import type { Fact } from './facts'
import { PIECE_KO, withJosa } from './korean'

export interface PhraseCtx {
  mover: '백' | '흑'
  enemy: '흑' | '백'
}
type Of<K extends Fact['kind']> = Extract<Fact, { kind: K }>
type Phrase<K extends Fact['kind']> = (f: Of<K>, c: PhraseCtx) => string

const P = (t: PieceSymbol) => PIECE_KO[t]
const J = withJosa

/** ['k', 'r'] → '킹과 룩' */
function listKo(pieces: PieceSymbol[]): string {
  const names = pieces.map(P)
  return [...names.slice(0, -1).map((n) => J(n, '과/와')), names.at(-1)].join(' ')
}

export const PHRASES: { [K in Fact['kind']]: Phrase<K>[] } = {
  mate: [
    (_, c) => `체크메이트. ${J(c.mover, '이/가')} 이겼어요.`,
    () => '더 피할 칸이 없어요. 체크메이트예요.',
    (_, c) => `${c.enemy} 킹이 갇혔어요. 경기 끝.`,
  ],
  check: [
    (_, c) => `체크. ${J(c.enemy, '은/는')} 킹부터 챙겨야 해요.`,
    () => '체크를 걸어 상대의 손을 묶어요.',
    (_, c) => `${c.enemy} 킹을 몰아세우는 체크예요.`,
  ],
  capture: [
    (f) => `${f.square}에서 ${J(P(f.captured), '을/를')} 잡았어요.`,
    (f) => `${J(P(f.piece), '으로/로')} ${J(P(f.captured), '을/를')} 땄어요.`,
    (f) => `${f.square}의 ${J(P(f.captured), '을/를')} 가져가요.`,
  ],
  recapture: [
    () => '곧바로 되잡아 균형을 맞춰요.',
    (f) => `${f.square}에서 되잡았어요.`,
    () => '잡힌 만큼 돌려받았어요.',
  ],
  trade: [
    (f) => `${J(P(f.piece), '을/를')} 맞바꾸자는 수예요.`,
    (f) => `같은 값의 ${P(f.piece)} 교환이에요.`,
    () => '기물을 정리하며 단순하게 가요.',
  ],
  promotion: [
    (f) => `폰이 끝까지 가서 ${J(P(f.to), '이/가')} 됐어요.`,
    (f) => `승진! 새 ${J(P(f.to), '이/가')} 판에 들어와요.`,
    () => '폰이 마지막 줄에 닿았어요.',
  ],
  castle: [
    () => '킹을 피신시키고 룩을 연결했어요.',
    (f) => `${f.long ? '퀸 쪽' : '킹 쪽'}으로 캐슬링. 킹이 한결 안전해졌어요.`,
    () => '캐슬링으로 킹 집을 지었어요.',
  ],
  develop: [
    (f) => `${J(P(f.piece), '을/를')} 꺼내 전개를 이어가요.`,
    (f) => `${J(P(f.piece), '이/가')} 싸움터로 나왔어요.`,
    () => '잠자던 기물을 깨웠어요.',
  ],
  centerPawn: [
    (f) => `${J(f.square, '을/를')} 차지해 중앙에 깃발을 꽂아요.`,
    () => '중앙 폰으로 공간을 넓혀요.',
    (f) => `${f.square} 폰이 가운데를 지켜요.`,
  ],
  fork: [
    (f) => `${J(P(f.piece), '이/가')} ${J(listKo(f.targets), '을/를')} 한꺼번에 노려요.`,
    (f) => `포크! ${f.square}의 ${J(P(f.piece), '이/가')} 두 곳을 동시에 겨눠요.`,
    (_, c) => `${J(c.enemy, '은/는')} 둘 중 하나밖에 못 지켜요.`,
  ],
  pin: [
    (f) => `${f.square}의 ${J(P(f.pinned), '을/를')} ${P(f.behind)} 앞에 묶었어요.`,
    (f) => `핀이에요. ${J(P(f.pinned), '이/가')} 움직이면 뒤의 ${J(P(f.behind), '이/가')} 드러나요.`,
    (f) => `${J(P(f.pinned), '은/는')} 이제 꼼짝하기 어려워요.`,
  ],
  hanging: [
    (f) => `${f.square}의 ${J(P(f.piece), '이/가')} 그냥 놓였어요.`,
    (f) => `${J(P(f.piece), '을/를')} 지켜 줄 기물이 없어요.`,
    (f) => `${J(P(f.piece), '이/가')} 공짜로 잡힐 수 있는 자리예요.`,
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
    (f) =>
      f.gain === 'mate'
        ? `${J(f.bestSan, '이/가')} 있었어요. ${f.amount}수 안에 메이트였어요.`
        : f.gain === 'material'
          ? `${J(f.bestSan, '으로/로')} 기물을 딸 수 있었어요.`
          : `${J(f.bestSan, '이/가')} 더 나았어요.`,
    (f) =>
      `${J(f.bestSan, '을/를')} 두었다면 ${f.gain === 'material' ? '공짜로 기물이 생겼어요' : f.gain === 'mate' ? '끝낼 수 있었어요' : '형세가 훨씬 좋았어요'}.`,
    (f) => `아까운 장면이에요. ${f.gain === 'mate' ? `${J(f.bestSan, '이/가')} 결정타였어요` : `${J(f.bestSan, '을/를')} 놓쳤어요`}.`,
  ],
  refutation: [
    (f, c) =>
      f.san
        ? `${J(f.san, '으로/로')} ${J(P(f.target), '이/가')} 떨어져요.`
        : `${J(c.enemy, '이/가')} ${f.square}의 ${J(P(f.target), '을/를')} 노릴 수 있어요.`,
    (f) => `${f.square}의 ${J(P(f.target), '이/가')} 위험해졌어요.`,
    (f, c) => `${c.enemy}에게 ${J(P(f.target), '을/를')} 딸 기회를 줬어요.`,
  ],
  mateThreat: [
    (f) => `${f.forWhite ? '백' : '흑'}에게 ${f.inMoves}수 메이트가 보여요.`,
    (f) => `이제 ${J(f.forWhite ? '백' : '흑', '이/가')} ${f.inMoves}수 안에 끝낼 길이 있어요.`,
    (f) => `${J(f.forWhite ? '백' : '흑', '은/는')} ${f.inMoves}수면 메이트할 수 있어요.`,
  ],
  band: [(f) => BAND_LINE[f.to][0], (f) => BAND_LINE[f.to][1], (f) => BAND_LINE[f.to][2]],
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
  (c) => `${J(c.mover, '이/가')} 차분히 자리를 고르는 수예요.`,
  () => '조용히 다음을 준비해요.',
  () => '자리를 다지는 수예요.',
  (c) => `${J(c.mover, '은/는')} 서두르지 않아요.`,
]
