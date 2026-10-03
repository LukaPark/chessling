import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { buildIndex } from '../../src/openings/buildIndex'

const rows = ['a', 'b', 'c', 'd', 'e'].flatMap((f) =>
  readFileSync(`scripts/openings/source/${f}.tsv`, 'utf8')
    .split('\n')
    .slice(1)
    .filter(Boolean)
    .map((l) => {
      const [eco, name, pgn] = l.split('\t')
      return { eco, name, pgn }
    }),
)
const { entries, conflicts } = buildIndex(rows)
mkdirSync('src/data/openings', { recursive: true })
writeFileSync('src/data/openings/index.json', JSON.stringify(entries) + '\n')
console.log(`항목 ${entries.length}개 (원본 ${rows.length}행), 충돌 ${conflicts.length}건`)
for (const c of conflicts) console.log(`  ${c}`)
