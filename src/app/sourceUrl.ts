/** GPL 소스 제공 링크. 빌드 때 VITE_SOURCE_URL이 없어도 공개 저장소를 가리킨다. */
export const DEFAULT_SOURCE_URL = 'https://github.com/LukaPark/chessling'

export function sourceUrl(): string {
  return import.meta.env.VITE_SOURCE_URL?.trim() || DEFAULT_SOURCE_URL
}
