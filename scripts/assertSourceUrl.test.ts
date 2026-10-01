import { describe, expect, it } from 'vitest'
import { assertSourceUrl } from './assertSourceUrl'

describe('assertSourceUrl', () => {
  it('Vercel 빌드에서 VITE_SOURCE_URL이 없으면 변수 이름을 담아 던진다', () => {
    expect(() => assertSourceUrl({ VERCEL: '1' })).toThrow(/VITE_SOURCE_URL/)
    expect(() => assertSourceUrl({ VERCEL: '1', VITE_SOURCE_URL: '  ' })).toThrow(/VITE_SOURCE_URL/)
  })
  it('값이 있거나 Vercel이 아니면 통과한다', () => {
    expect(() => assertSourceUrl({ VERCEL: '1', VITE_SOURCE_URL: 'https://github.com/x/y' })).not.toThrow()
    expect(() => assertSourceUrl({})).not.toThrow()
  })
})
