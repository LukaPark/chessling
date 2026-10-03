import { BANNED } from '../annotations/validate'
import { epdOf, sanLineToUci } from '../../openings/line'
import type { KoOpenings, OpeningEntry } from '../../openings/types'

const MAX_SENTENCE = 60

function sentences(text: string): string[] {
  return text.split(/(?<=[.?!])\s+/).filter((s) => s.trim())
}

function checkText(where: string, text: string, maxSentences: number): string[] {
  const errors: string[] = []
  if (!text.trim()) errors.push(`${where}: 비어 있음`)
  for (const b of BANNED) if (b.test(text)) errors.push(`${where}: 금칙어 ${b}`)
  const ss = sentences(text)
  if (ss.length > maxSentences) errors.push(`${where}: 문장 ${ss.length}개 (${maxSentences}개까지)`)
  if (ss.some((s) => s.length > MAX_SENTENCE)) errors.push(`${where}: ${MAX_SENTENCE}자 넘는 문장`)
  return errors
}

export function validateKoOpenings(ko: KoOpenings, index: OpeningEntry[], opts: { requireVariations?: boolean } = {}): string[] {
  const { requireVariations = true } = opts
  const errors: string[] = []
  const names = new Map<string, OpeningEntry[]>()
  for (const entry of index) {
    if (!names.has(entry.name)) {
      names.set(entry.name, [])
    }
    names.get(entry.name)!.push(entry)
  }
  const familyNames = new Set(index.map((e) => e.name.split(':')[0]))

  for (const [key, f] of Object.entries(ko.families)) {
    const where = `계열 "${key}"`
    if (!familyNames.has(key)) errors.push(`${where}: 색인에 없는 계열`)
    if (!f.name.trim()) errors.push(`${where}: 한국어 이름이 비어 있음`)
    errors.push(...checkText(`${where} idea`, f.idea, 2))
    errors.push(...checkText(`${where} plans.white`, f.plans.white, 1))
    errors.push(...checkText(`${where} plans.black`, f.plans.black, 1))
    if (requireVariations && !Object.keys(ko.variations).some((v) => v.split(':')[0] === key)) errors.push(`${where}: 설명한 변화가 없음`)
  }

  for (const [key, v] of Object.entries(ko.variations)) {
    const where = `변화 "${key}"`
    const entries = names.get(key)
    if (!entries) {
      errors.push(`${where}: 색인에 없는 이름`)
      continue
    }
    if (!ko.families[key.split(':')[0]]) errors.push(`${where}: 계열 설명이 없음`)
    if (!v.name.trim()) errors.push(`${where}: 한국어 이름이 비어 있음`)
    errors.push(...checkText(`${where} summary`, v.summary, 2))
    let fens: string[]
    try {
      fens = sanLineToUci(v.line).fens
    } catch (e) {
      errors.push(`${where}: ${(e as Error).message}`)
      continue
    }
    if (!entries.some((entry) => fens.some((f) => epdOf(f) === entry.epd))) errors.push(`${where}: 대표 수순이 이 변화 포지션을 지나지 않음`)
  }
  return errors
}
