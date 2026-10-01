import { classicOfTheDay } from '../chess/daily'
import { normalizeResult, parseHeaders } from '../chess/pgn'
import type { GameRecord } from '../chess/types'
import data from '../data/classics.json'

export interface Classic {
  slug: string
  title: string
  white: string
  black: string
  year: number
  event?: string
  summaryKo: string
  pgn: string
}

export const classics: Classic[] = [...(data as Classic[])].sort((a, b) => a.year - b.year)

export function getClassic(slug: string): Classic | undefined {
  return classics.find((c) => c.slug === slug)
}

export function classicToRecord(c: Classic): GameRecord {
  return {
    ref: { kind: 'classic', slug: c.slug },
    white: { name: c.white },
    black: { name: c.black },
    result: normalizeResult(parseHeaders(c.pgn).Result),
    date: String(c.year),
    speed: 'classical',
    variant: 'standard',
    event: c.event,
    pgn: c.pgn,
  }
}

export function todaysClassic(now: Date = new Date()): Classic {
  return classicOfTheDay(classics, now)
}
