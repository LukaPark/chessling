import { afterEach, describe, expect, it, vi } from 'vitest'
import indexUrl from '../data/openings/index.json?url'
import { loadOpeningData } from './openings'

afterEach(() => vi.unstubAllGlobals())

describe('loadOpeningData', () => {
  it('색인은 에셋 URL에서 fetch로, 한국어 설명은 동적 import로 불러온다', async () => {
    const index = [{ eco: 'B20', name: 'Sicilian Defense', uci: ['e2e4', 'c7c5'], epd: 'x' }]
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(index)))
    vi.stubGlobal('fetch', fetchMock)
    const data = await loadOpeningData()
    expect(fetchMock).toHaveBeenCalledWith(indexUrl)
    expect(data.index).toEqual(index)
    expect(data.ko.families['Sicilian Defense']).toBeDefined()
  })

  it('색인 응답이 실패하면 오류를 던진다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })))
    await expect(loadOpeningData()).rejects.toThrow()
  })
})
