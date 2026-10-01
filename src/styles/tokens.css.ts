import { createGlobalTheme, createGlobalThemeContract } from '@vanilla-extract/css'
import { BOARD_PALETTES } from './boardThemes'

const judgmentShape = {
  brilliant: '',
  great: '',
  best: '',
  excellent: '',
  good: '',
  miss: '',
  inaccuracy: '',
  mistake: '',
  blunder: '',
}
const colorShape = {
  canvas: '',
  surface: '',
  surfaceSubtle: '',
  ink: '',
  muted: '',
  line: '',
  accent: '',
  accentHover: '',
  onAccent: '',
  boardLight: '',
  boardDark: '',
  highlight: '',
  boardHighlight: '',
  boardInkOnLight: '',
  live: '',
  liveSurface: '',
  evalWhite: '',
  evalBlack: '',
  judgment: judgmentShape,
}
type Colors = typeof colorShape

export const vars = createGlobalThemeContract({ color: colorShape }, (_value, path) => `cl-${path.join('-')}`)

const light: Colors = {
  canvas: '#ffffff',
  surface: '#ffffff',
  surfaceSubtle: '#f3f5f8',
  ink: '#171d26',
  muted: '#596372',
  line: '#dce1e7',
  accent: '#254acb',
  accentHover: '#19399f',
  onAccent: '#ffffff',
  boardLight: BOARD_PALETTES.cool.light.boardLight,
  boardDark: BOARD_PALETTES.cool.light.boardDark,
  highlight: 'rgba(37, 74, 203, 0.28)',
  boardHighlight: 'rgba(37, 74, 203, 0.28)',
  boardInkOnLight: '#171d26',
  live: '#c9302c',
  liveSurface: '#fde8e7',
  evalWhite: '#f6f7f9',
  evalBlack: '#2a2f38',
  judgment: {
    brilliant: '#0f8f84',
    great: '#2563d8',
    best: '#23874a',
    excellent: '#596372',
    good: '#596372',
    miss: '#b52d80',
    inaccuracy: '#a86f00',
    mistake: '#c9561c',
    blunder: '#c73232',
  },
}
const dark: Colors = {
  canvas: '#0f1216',
  surface: '#161a20',
  surfaceSubtle: '#1d222a',
  ink: '#e8ecf2',
  muted: '#9aa4b2',
  line: '#2a313b',
  accent: '#6f8cff',
  accentHover: '#8aa2ff',
  onAccent: '#0f1216',
  boardLight: BOARD_PALETTES.cool.dark.boardLight,
  boardDark: BOARD_PALETTES.cool.dark.boardDark,
  highlight: 'rgba(111, 140, 255, 0.34)',
  boardHighlight: 'rgba(111, 140, 255, 0.34)',
  boardInkOnLight: '#171d26',
  live: '#ff7b72',
  liveSurface: '#3a1d1d',
  evalWhite: '#e8ecf2',
  evalBlack: '#0b0d10',
  judgment: {
    brilliant: '#3cc9b9',
    great: '#7aa2ff',
    best: '#5cc97c',
    excellent: '#9aa4b2',
    good: '#9aa4b2',
    miss: '#e46bb5',
    inaccuracy: '#e8b53c',
    mistake: '#f08c55',
    blunder: '#f06a6a',
  },
}

createGlobalTheme(':root', vars, { color: light })
createGlobalTheme(':root[data-theme="dark"]', vars, { color: dark })

export const mq = { md: 'screen and (min-width: 768px)', lg: 'screen and (min-width: 1024px)' } as const
export const space = { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '24px', 6: '32px', 7: '48px', 8: '64px', 9: '96px', 10: '144px' } as const
export const radius = { action: '12px', actionMd: '14px', surface: '16px', pill: '999px' } as const
export const fontSize = {
  display: '48px',
  displayMd: '64px',
  displayLg: '76px',
  section: '30px',
  sectionMd: '36px',
  title: '20px',
  lead: '18px',
  body: '17px',
  control: '15px',
  meta: '13px',
} as const
export const weight = { regular: '400', medium: '500' } as const
export const layout = { maxWidth: '1160px', headerMax: '1208px', gutter: '20px', gutterMd: '24px' } as const
export const fontStack =
  '"Pretendard Variable", Pretendard, "Pretendard CDN", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif'
