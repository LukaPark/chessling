// React를 끌어오지 않는 순수 모듈: .css.ts와 앱 코드가 함께 쓴다.
// index.html <head> 스크립트에도 같은 목록이 있다(첫 페인트 전 적용). 바꾸면 함께 바꾼다.
export const BOARD_THEMES = ['cool', 'brown', 'green', 'blue', 'gray', 'purple'] as const
export const PIECE_SETS = ['cburnett', 'merida', 'chessnut', 'fantasy'] as const
export type BoardTheme = (typeof BOARD_THEMES)[number]
export type PieceSet = (typeof PIECE_SETS)[number]

export interface BoardPalette {
  boardLight: string
  boardDark: string
  /** 마지막 수·선택 칸 강조. 없으면 기본 boardHighlight 토큰 */
  highlight?: string
}

/**
 * 보드 테마별 칸 색. dark는 다크 모드용으로 더 어둡고 채도를 낮췄다.
 * 모든 테마가 라이트·다크 모두 두 칸 대비 1.9 이상, 어두운 칸과 검은 기물(#000) 대비 3.0 이상,
 * 밝은 칸과 흰 기물(#fff) 대비 1.1 이상을 지킨다(boardThemes.test.ts). cool은 기본값이고 tokens.css.ts가 이 값을 쓴다.
 */
export const BOARD_PALETTES: Record<BoardTheme, { light: BoardPalette; dark: BoardPalette }> = {
  cool: {
    light: { boardLight: '#eef1f6', boardDark: '#8fa0c4' },
    dark: { boardLight: '#8e99b3', boardDark: '#58637d' },
  },
  brown: {
    light: { boardLight: '#f0d9b5', boardDark: '#b58863', highlight: 'rgba(155, 199, 0, 0.41)' },
    dark: { boardLight: '#a38d6d', boardDark: '#6f5842', highlight: 'rgba(155, 199, 0, 0.34)' },
  },
  green: {
    light: { boardLight: '#eeeed2', boardDark: '#769656', highlight: 'rgba(255, 255, 51, 0.5)' },
    dark: { boardLight: '#a3a68c', boardDark: '#5a6e47', highlight: 'rgba(230, 230, 60, 0.36)' },
  },
  blue: {
    light: { boardLight: '#dee3e6', boardDark: '#8ca2ad' },
    dark: { boardLight: '#95a1a8', boardDark: '#5d6f79' },
  },
  gray: {
    light: { boardLight: '#e6e6e6', boardDark: '#a6a6a6' },
    dark: { boardLight: '#9a9a9a', boardDark: '#666666' },
  },
  purple: {
    light: { boardLight: '#ece5f3', boardDark: '#a08bbb' },
    dark: { boardLight: '#9d93a8', boardDark: '#665a78' },
  },
}

export const BOARD_LABELS: Record<BoardTheme, string> = {
  cool: '쿨톤',
  brown: '브라운',
  green: '그린',
  blue: '블루',
  gray: '그레이',
  purple: '퍼플',
}

export const PIECE_LABELS: Record<PieceSet, string> = {
  cburnett: '기본',
  merida: '메리다',
  chessnut: '체스넛',
  fantasy: '판타지',
}

/** public/pieces/<세트>/<파일>.svg. cburnett은 chessground CSS에 들어 있어 썸네일(wN·bK)만 둔다. */
export const pieceUrl = (set: PieceSet, file: string) => `/pieces/${set}/${file}.svg`
