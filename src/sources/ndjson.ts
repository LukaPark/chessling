export function createNdjsonParser<T>(onItem: (item: T) => void) {
  let buffer = ''
  const flush = (line: string) => {
    const t = line.trim()
    if (t) onItem(JSON.parse(t) as T)
  }
  return {
    push(chunk: string) {
      buffer += chunk
      let nl: number
      while ((nl = buffer.indexOf('\n')) >= 0) {
        flush(buffer.slice(0, nl))
        buffer = buffer.slice(nl + 1)
      }
    },
    end() {
      flush(buffer)
      buffer = ''
    },
  }
}

export async function* readNdjson<T>(stream: ReadableStream<Uint8Array>): AsyncGenerator<T> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  const items: T[] = []
  const parser = createNdjsonParser<T>((item) => items.push(item))
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      parser.push(decoder.decode(value, { stream: true }))
      while (items.length) yield items.shift()!
    }
    parser.push(decoder.decode())
    parser.end()
    while (items.length) yield items.shift()!
  } finally {
    reader.releaseLock()
  }
}
