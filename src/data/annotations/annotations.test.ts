import { describe, expect, it } from 'vitest'
import { pgnToPlies } from '../../chess/pgn'
import { annotationSlugs, loadAnnotations, type Annotations } from '../../sources/annotations'
import { getClassic } from '../../sources/classics'
import { validateAnnotations } from './validate'

describe.each(annotationSlugs())('해설 %s', (slug) => {
  it('검증 규칙을 모두 통과한다', async () => {
    const a = (await loadAnnotations(slug))!
    const c = getClassic(slug)
    expect(c, `classics.json에 ${slug}가 없음`).toBeDefined()
    expect(validateAnnotations(a, pgnToPlies(c!.pgn))).toEqual([])
  })
})

describe('validateAnnotations', () => {
  const plies = pgnToPlies('1. e4 e5 2. Nf3 Nc6 *')
  const base = (texts: string[], keys = [1, 2]): Annotations => ({
    slug: 't',
    version: 1,
    scenes: [],
    plies: texts.map((text, ply) => ({ ply, text, key: keys.includes(ply) })),
  })

  it('잘못된 해설을 잡는다', () => {
    const errors = validateAnnotations(
      {
        slug: 't',
        version: 1,
        scenes: [],
        plies: [
          { ply: 0, text: '시작이에요.' },
          { ply: 1, text: '이것은 매우 흥미로운 수입니다.', key: true },
          { ply: 2, text: '곧 Nf3가 나와요. Qh6는 둘 수 없어요.' },
        ],
      },
      plies,
    )
    expect(errors.some((e) => e.includes('3수 해설이 비어'))).toBe(true)
    expect(errors.some((e) => e.includes('핵심 장면 1개'))).toBe(true)
    expect(errors.some((e) => e.includes('금칙어'))).toBe(true)
    expect(errors.some((e) => e.includes('둘 수 없는 수 표기 "Qh6"'))).toBe(true)
    expect(errors.some((e) => e.includes('앞으로 나올 수 언급 "Nf3"'))).toBe(true)
  })

  it('좋은 해설은 통과한다', () => {
    const a = base(['소개예요.', '중앙을 잡아요.', '흑도 맞서요.', '[[2...d6 3. d4]]도 있지만 나이트로 e5를 노려요.', '나이트로 지켜요.'])
    expect(validateAnnotations(a, plies)).toEqual([])
  })

  it('수 번호 없는 칸 이름은 수로 보지 않는다', () => {
    // d4·f7·c6은 지금 둘 수 없는 폰 수와 모양이 같지만, 수 번호가 없으면 칸 이름으로 읽는다
    const a = base(['소개예요.', 'd4와 f7이 약점이에요.', 'e5를 지켜야 해요.', 'c6 칸이 비어 있어요.', '좋아요.'])
    expect(validateAnnotations(a, plies)).toEqual([])
  })

  it('수 번호가 붙은 폰 수는 수로 본다', () => {
    const a = base(['소개예요.', '흑은 곧 1... e5로 맞서요.', '좋아요.', '좋아요.', '좋아요.'])
    expect(validateAnnotations(a, plies).some((e) => e.includes('앞으로 나올 수 언급'))).toBe(true)
  })

  it('가정 수순이 둘 수 없으면 잡는다', () => {
    const a = base(['소개예요.', '[[1... Qh4 2. Qxh4]]', '좋아요.', '좋아요.', '좋아요.'])
    expect(validateAnnotations(a, plies).some((e) => e.includes('가정 수순을 둘 수 없음'))).toBe(true)
  })

  it('장면 정답이 기보와 다르면 잡는다', () => {
    const a = base(['소개예요.', '좋아요.', '좋아요.', '좋아요.', '좋아요.'])
    a.scenes = [{ id: 's1', startPly: 2, side: 'w', prompt: '?', source: 'authored', steps: [{ answerUci: 'd2d4' }] }]
    expect(validateAnnotations(a, plies).some((e) => e.includes('정답이 실제 기보와 다름'))).toBe(true)
    a.scenes = [{ id: 's1', startPly: 2, side: 'b', prompt: '?', source: 'authored', steps: [{ answerUci: 'g1f3' }] }]
    expect(validateAnnotations(a, plies).some((e) => e.includes('둘 쪽이 맞지 않음'))).toBe(true)
  })
})
