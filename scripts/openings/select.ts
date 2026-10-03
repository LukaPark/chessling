import { readFileSync, writeFileSync } from 'node:fs'
import { pgnToPlies } from '../../src/chess/pgn'
import { identifyOpening } from '../../src/openings/identify'
import type { OpeningEntry } from '../../src/openings/types'

const index = JSON.parse(readFileSync('src/data/openings/index.json', 'utf8')) as OpeningEntry[]
const classics = JSON.parse(readFileSync('src/data/classics.json', 'utf8')) as { slug: string; pgn: string }[]
const data = { index, ko: { families: {}, variations: {} } }

// 1) 명경기 30판이 지나간 이름(계열 이름 제외, 콤마 앞까지를 변화 키로 본다)
const fromClassics = new Map<string, string[]>()
for (const c of classics) {
  const track = identifyOpening(pgnToPlies(c.pgn), data)
  for (const at of new Set(track?.byPly.filter(Boolean).map((a) => a!.entry.name))) {
    const key = at.split(',')[0]
    if (!key.includes(':')) continue
    fromClassics.set(key, [...(fromClassics.get(key) ?? []), c.slug])
  }
}

// 2) 계열별 이름 수(많이 갈라진 계열일수록 주요 계열일 가능성이 크다)
const families = new Map<string, Set<string>>()
for (const e of index) {
  const [fam, rest] = e.name.split(':')
  if (!rest) continue
  const key = `${fam}:${rest.split(',')[0]}`
  families.set(fam, (families.get(fam) ?? new Set()).add(key))
}
const ranked = [...families.entries()].sort((a, b) => b[1].size - a[1].size)

const lines = ['# 오프닝 설명 대상 후보', '', '## 명경기가 지나간 변화', '']
for (const [k, slugs] of [...fromClassics.entries()].sort()) lines.push(`- ${k} — ${[...new Set(slugs)].join(', ')}`)
lines.push('', '## 계열(변화 이름 수 많은 순, 상위 60)', '')
for (const [fam, vars] of ranked.slice(0, 60)) lines.push(`- ${fam} (${vars.size}) — ${[...vars].slice(0, 12).map((v) => v.split(':')[1].trim()).join(' / ')}`)
writeFileSync(process.argv[2] ?? 'opening-candidates.md', lines.join('\n') + '\n')
console.log(`명경기 변화 ${fromClassics.size}개, 계열 ${ranked.length}개`)
