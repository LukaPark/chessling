import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const SRC = 'node_modules/stockfish/bin'
const DEST = 'public/engine'
const FILES = [
  'stockfish-19-lite.js',
  'stockfish-19-lite.wasm',
  'stockfish-19-lite-single.js',
  'stockfish-19-lite-single.wasm',
]

if (!existsSync(SRC)) {
  if (process.argv.includes('--strict')) {
    console.error('[copy-engine] stockfish가 설치되지 않았어요. npm install 후 다시 빌드하세요')
    process.exit(1)
  }
  console.warn('[copy-engine] stockfish가 아직 설치되지 않아 건너뜁니다')
  process.exit(0)
}
mkdirSync(DEST, { recursive: true })
for (const file of FILES) copyFileSync(join(SRC, file), join(DEST, file))
const license = 'node_modules/stockfish/Copying.txt'
if (existsSync(license)) copyFileSync(license, join(DEST, 'COPYING.txt'))
console.log(`[copy-engine] ${FILES.length}개 파일을 ${DEST}에 복사했습니다`)
