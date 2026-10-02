import type { KoOpenings, OpeningData, OpeningEntry } from '../openings/types'

/** 색인(약 3,500개)과 한국어 설명은 첫 화면 번들에 넣지 않고 처음 필요할 때 불러온다 */
export async function loadOpeningData(): Promise<OpeningData> {
  const [index, ko] = await Promise.all([import('../data/openings/index.json'), import('../data/openings/ko.json')])
  return { index: index.default as OpeningEntry[], ko: ko.default as KoOpenings }
}
