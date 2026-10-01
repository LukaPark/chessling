/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import { assertSourceUrl } from './scripts/assertSourceUrl.ts'

// 라이브러리를 성격별 청크로 나눈다. 앱 코드가 바뀌어도 라이브러리 청크는 캐시에 남는다.
const VENDOR_CHUNKS: Array<[chunk: string, packages: string[]]> = [
  ['react', ['react', 'react-dom', 'react-router', 'scheduler', 'cookie', 'set-cookie-parser']],
  ['motion', ['motion', 'motion-dom', 'motion-utils', 'framer-motion']],
  ['chess', ['chess.js', '@lichess-org/chessground']],
  ['dexie', ['dexie']],
  ['tanstack', ['@tanstack/react-query', '@tanstack/query-core']],
]

function manualChunks(id: string): string | null {
  const m = /[\\/]node_modules[\\/]((?:@[^\\/]+[\\/])?[^\\/]+)/.exec(id)
  if (!m) return null
  const pkg = m[1].replace('\\', '/')
  return VENDOR_CHUNKS.find(([, pkgs]) => pkgs.includes(pkg))?.[0] ?? null
}

const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
}

export default defineConfig(({ command, mode }) => {
  // GPL 소스 제공 링크 없이 Vercel에 배포되지 않도록 빌드를 막는다.
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    assertSourceUrl({ VERCEL: process.env.VERCEL, VITE_SOURCE_URL: process.env.VITE_SOURCE_URL || env.VITE_SOURCE_URL })
  }
  return {
    plugins: [react(), vanillaExtractPlugin()],
    build: { target: 'es2022', rolldownOptions: { output: { manualChunks } } },
    server: { headers: isolationHeaders },
    preview: { headers: isolationHeaders },
    test: {
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
      setupFiles: ['src/test/setup.ts'],
    },
  }
})
