/** 한국 표준시(UTC+9)는 일광절약시간을 사용하지 않는다. */
export function koreanDate(timestamp: number): string {
  return new Date(timestamp + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
