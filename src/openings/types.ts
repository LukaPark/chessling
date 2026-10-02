export interface OpeningEntry {
  eco: string
  /** "Sicilian Defense: Najdorf Variation" */
  name: string
  /** 대표 수순(시작 포지션부터) */
  uci: string[]
  /** 최종 포지션 FEN의 앞 네 필드 */
  epd: string
}

export interface KoFamily {
  name: string
  idea: string
  plans: { white: string; black: string }
}

export interface KoVariation {
  name: string
  summary: string
  /** 대표 수순 SAN("1. e4 c5 2. Nf3 ...") */
  line: string
}

export interface KoOpenings {
  /** 키: 원문 계열명("Sicilian Defense") */
  families: Record<string, KoFamily>
  /** 키: 원문 전체 이름("Sicilian Defense: Najdorf Variation") */
  variations: Record<string, KoVariation>
}

export interface OpeningData {
  index: OpeningEntry[]
  ko: KoOpenings
}

export interface OpeningAt {
  /** 이 이름이 처음 맞은 수 */
  ply: number
  entry: OpeningEntry
  family: KoFamily | null
  variation: KoVariation | null
  /** variation을 찾은 ko.variations 키 */
  variationKey: string | null
}

export interface OpeningTrack {
  /** 수마다 그 시점의 오프닝(0수는 null) */
  byPly: (OpeningAt | null)[]
  /** ply: 이론에서 벗어난 첫 수, theory: 직전 포지션에서 색인이 이어 가는 수(UCI, 최대 3개) */
  deviation: { ply: number; theory: string[] } | null
}
