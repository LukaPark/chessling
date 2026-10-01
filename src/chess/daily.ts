const SEED = 0xc4e551

export function kstDateString(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function shuffledOrder(n: number, seed = SEED): number[] {
  const order = Array.from({ length: n }, (_, i) => i)
  const rand = mulberry32(seed)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

export function classicOfTheDay<T>(items: readonly T[], now: Date): T {
  if (items.length === 0) throw new Error('명국 컬렉션이 비어 있습니다')
  const [y, m, d] = kstDateString(now).split('-').map(Number)
  const day = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
  const order = shuffledOrder(items.length)
  return items[order[((day % items.length) + items.length) % items.length]]
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
