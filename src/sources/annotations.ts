import type { QuizScene } from '../quiz/types'

export interface AnnotatedPly {
  /** 0 = 시작 포지션(경기 소개), i = i번째 수를 둔 직후 */
  ply: number
  text: string
  /** 핵심 장면 */
  key?: boolean
}

export interface Annotations {
  slug: string
  version: 1
  plies: AnnotatedPly[]
  scenes: QuizScene[]
}

const files = import.meta.glob<Annotations>('../data/annotations/*.json', { import: 'default' })
const PREFIX = '../data/annotations/'

export function annotationSlugs(): string[] {
  return Object.keys(files).map((k) => k.slice(PREFIX.length, -'.json'.length))
}

export async function loadAnnotations(slug: string): Promise<Annotations | null> {
  const load = files[`${PREFIX}${slug}.json`]
  return load ? await load() : null
}
