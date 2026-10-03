import indexUrl from '../data/openings/index.json?url'
import type { KoOpenings, OpeningData, OpeningEntry } from '../openings/types'

async function fetchIndex(): Promise<OpeningEntry[]> {
  const r = await fetch(indexUrl)
  if (!r.ok) throw new Error(`오프닝 색인을 불러오지 못했어요 (${r.status})`)
  return (await r.json()) as OpeningEntry[]
}

/**
 * 색인(약 3,500개)과 한국어 설명은 첫 화면 번들에 넣지 않고 처음 필요할 때 불러온다.
 * 색인은 JS 청크로 만들면 500kB를 넘으므로 JSON 에셋 그대로 받는다.
 */
export async function loadOpeningData(): Promise<OpeningData> {
  const [index, ko] = await Promise.all([fetchIndex(), import('../data/openings/ko.json')])
  return { index, ko: ko.default as KoOpenings }
}
