import { readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { parseHeaders, pgnToPlies, stripAnnotations } from '../src/chess/pgn'
import type { Classic } from '../src/sources/classics'

const DATA = 'src/data/classics.json'
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { slug: { type: 'string' }, title: { type: 'string' }, summary: { type: 'string' }, event: { type: 'string' } },
})

const [file] = positionals
if (!file || !values.slug || !values.title || !values.summary) {
  console.error('사용법: npx tsx scripts/add-classic.ts <file.pgn> --slug <slug> --title <제목> --summary <소개> [--event <대회>]')
  process.exit(1)
}

const pgn = stripAnnotations(readFileSync(file, 'utf8')).trim()
const plies = pgnToPlies(pgn) // 불법 수면 PgnError로 중단
const h = parseHeaders(pgn)
const year = Number(h.Date?.slice(0, 4))
if (!h.White || !h.Black || !Number.isInteger(year)) {
  console.error('White, Black, Date(연도) 헤더가 필요합니다')
  process.exit(1)
}
if (!['1-0', '0-1', '1/2-1/2'].includes(h.Result ?? '')) {
  console.error('Result 헤더가 1-0, 0-1, 1/2-1/2 중 하나여야 합니다')
  process.exit(1)
}

const classics = JSON.parse(readFileSync(DATA, 'utf8')) as Classic[]
if (classics.some((c) => c.slug === values.slug)) {
  console.error(`이미 있는 slug입니다: ${values.slug}`)
  process.exit(1)
}
classics.push({
  slug: values.slug,
  title: values.title,
  white: h.White,
  black: h.Black,
  year,
  event: values.event ?? h.Event,
  summaryKo: values.summary,
  pgn,
})
classics.sort((a, b) => a.year - b.year)
writeFileSync(DATA, JSON.stringify(classics, null, 2) + '\n')
console.log(`[add-classic] ${values.slug} 추가 (${plies.length - 1}플라이) — 총 ${classics.length}판`)
