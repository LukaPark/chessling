import { globalFontFace, globalStyle, type GlobalStyleRule } from '@vanilla-extract/css'
import { fontSize, fontStack, mq, vars, weight } from './tokens.css'

// 자체 호스팅(pretendard dynamic subset)이 실패할 때만 쓰이는 네트워크 fallback
globalFontFace('Pretendard CDN', {
  src: 'url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/woff2/PretendardVariable.woff2") format("woff2-variations")',
  fontWeight: '45 920',
  fontStyle: 'normal',
  fontDisplay: 'swap',
})

globalStyle('*, *::before, *::after', { boxSizing: 'border-box' })
globalStyle('html', { WebkitTextSizeAdjust: '100%', background: vars.color.canvas })
globalStyle('body', {
  margin: 0,
  minHeight: '100svh',
  background: vars.color.canvas,
  color: vars.color.ink,
  fontFamily: fontStack,
  fontSize: fontSize.body,
  fontWeight: weight.regular,
  lineHeight: 1.6,
  wordBreak: 'keep-all',
  overflowWrap: 'break-word',
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
})
globalStyle('h1, h2, h3, h4', { margin: 0, fontWeight: weight.medium, lineHeight: 1.25, textWrap: 'balance' } as GlobalStyleRule)
globalStyle('p', { margin: 0, textWrap: 'pretty' } as GlobalStyleRule)
globalStyle('ul, ol', { margin: 0, padding: 0 })
globalStyle('strong, b, th', { fontWeight: weight.medium })
globalStyle('a', { color: vars.color.accent, textUnderlineOffset: '3px' })
globalStyle('button, input, select, textarea', { font: 'inherit', color: 'inherit' })
globalStyle(':focus-visible', { outline: `3px solid ${vars.color.accent}`, outlineOffset: '2px' })
globalStyle('::selection', { background: vars.color.highlight })

// 테마 토글 중에만 배경·면·선 색을 보간한다 (글자 색은 즉시 교체)
globalStyle(':root[data-theme-transition] *, :root[data-theme-transition] *::before, :root[data-theme-transition] *::after', {
  transition: 'background-color 300ms linear, border-color 300ms linear, fill 300ms linear, stroke 300ms linear !important',
})

globalStyle('*, *::before, *::after', {
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animationDuration: '0.01ms !important',
      animationIterationCount: '1 !important',
      transitionDuration: '0.01ms !important',
      scrollBehavior: 'auto !important' as 'auto', // VE 타입이 !important를 허용하지 않아 캐스트
    },
  },
})

// 하단 고정 조작 막대가 푸터를 가리지 않도록, 막대가 있는 페이지의 body에 막대 높이만큼 여백을 둔다
globalStyle('body:has([data-control-bar])', {
  paddingBottom: 'calc(88px + env(safe-area-inset-bottom))',
  '@media': { [mq.md]: { paddingBottom: 0 } },
})
