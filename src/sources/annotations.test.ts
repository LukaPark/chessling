import { describe, expect, it } from 'vitest'
import { annotationSlugs, loadAnnotations } from './annotations'

describe('loadAnnotations', () => {
  it('없는 경기는 null', async () => {
    expect(await loadAnnotations('no-such-game')).toBeNull()
  })
  it('있는 경기는 slug가 맞는 해설을 돌려준다', async () => {
    for (const slug of annotationSlugs()) {
      const a = await loadAnnotations(slug)
      expect(a?.slug).toBe(slug)
      expect(a?.version).toBe(1)
    }
  })
})
