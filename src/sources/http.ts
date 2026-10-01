export type HttpErrorKind = 'not_found' | 'rate_limited' | 'server' | 'network'

export class HttpError extends Error {
  constructor(
    readonly kind: HttpErrorKind,
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export async function request(url: string, init: RequestInit = {}): Promise<Response> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch (e) {
    if (init.signal?.aborted) throw e
    throw new HttpError('network', 0, `네트워크 오류: ${url}`)
  }
  if (res.ok) return res
  if (res.status === 404) throw new HttpError('not_found', 404, `찾을 수 없음: ${url}`)
  if (res.status === 429) throw new HttpError('rate_limited', 429, `요청 한도 초과: ${url}`)
  throw new HttpError('server', res.status, `HTTP ${res.status}: ${url}`)
}

export async function getJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = { Accept: 'application/json', ...(init.headers as Record<string, string> | undefined) }
  const res = await request(url, { ...init, headers })
  return (await res.json()) as T
}

export async function getText(url: string, init: RequestInit = {}): Promise<string> {
  return (await request(url, init)).text()
}
