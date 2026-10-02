import { keyframes, style } from '@vanilla-extract/css'
import { fontSize, radius, space, vars, weight } from '../tokens.css'

export const card = style({ display: 'grid', gap: space[3], padding: space[4], borderRadius: radius.surface, background: vars.color.surfaceSubtle })
export const prompt = style({ margin: 0, fontSize: fontSize.lead, fontWeight: weight.medium })
export const steps = style({ display: 'flex', gap: space[1], margin: 0 })
export const dot = style({ width: 10, height: 10, borderRadius: radius.pill, background: vars.color.line })
export const dotOn = style({ background: vars.color.accent })
export const message = style({ margin: 0, minHeight: '1.5em' })
export const hint = style({ margin: 0, fontSize: fontSize.control })
/** 카드 배경(surfaceSubtle)과 같은 secondary 버튼이 묻히지 않게 한 단계 밝힌다 */
export const onCard = style({ background: vars.color.surface })
export const actions = style({ display: 'flex', flexWrap: 'wrap', gap: space[2] })
export const feedbackGood = style({ color: vars.color.judgment.best })
export const feedbackBad = style({ color: vars.color.judgment.mistake })
const shake = keyframes({ '0%,100%': { transform: 'none' }, '30%': { transform: 'translateX(-4px)' }, '60%': { transform: 'translateX(4px)' } })
export const shakeOnce = style({ animation: `${shake} 280ms ease-out`, '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } } })
export const sanForm = style({ display: 'flex', gap: space[2], alignItems: 'end' })
export const sanField = style({ flex: 1, minWidth: 0 })
