export function assertSourceUrl(env: { VERCEL?: string; VITE_SOURCE_URL?: string }): void {
  if (env.VERCEL && !env.VITE_SOURCE_URL?.trim()) {
    throw new Error('VITE_SOURCE_URL이 비어 있어요. GPL 소스 제공 링크 없이 Vercel에 배포할 수 없습니다. 환경 변수 VITE_SOURCE_URL을 설정하세요.')
  }
}
