import { describe, expect, it } from 'vitest'
import { createNdjsonParser, readNdjson } from './ndjson'

function collect(chunks: string[]) {
  const items: unknown[] = []
  const p = createNdjsonParser((x) => items.push(x))
  chunks.forEach((c) => p.push(c))
  p.end()
  return items
}

function streamOf(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      chunks.forEach((c) => controller.enqueue(c))
      controller.close()
    },
  })
}

describe('createNdjsonParser', () => {
  it('한 줄이 청크 두 개로 쪼개져도 파싱한다', () => {
    expect(collect(['{"a":1}\n{"a"', ':2}\n'])).toEqual([{ a: 1 }, { a: 2 }])
  })
  it('빈 줄과 CRLF를 무시한다', () => {
    expect(collect(['{"a":1}\r\n\n\n{"a":2}\n'])).toEqual([{ a: 1 }, { a: 2 }])
  })
  it('마지막 줄바꿈이 없어도 end에서 처리한다', () => {
    expect(collect(['{"a":1}\n{"a":2}'])).toEqual([{ a: 1 }, { a: 2 }])
  })
})

describe('readNdjson', () => {
  it('UTF-8 멀티바이트 문자가 청크 경계에서 잘려도 복원한다', async () => {
    const bytes = new TextEncoder().encode('{"name":"체슬링"}\n{"name":"캐슬링"}\n')
    const cut = 11 // '체'의 바이트 중간
    const out: unknown[] = []
    for await (const item of readNdjson(streamOf([bytes.slice(0, cut), bytes.slice(cut)]))) out.push(item)
    expect(out).toEqual([{ name: '체슬링' }, { name: '캐슬링' }])
  })
})
