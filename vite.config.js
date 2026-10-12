import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

let commit = 'exported-source'
try {
  commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: new URL('.', import.meta.url), stdio: ['ignore', 'pipe', 'ignore'],
  }).toString().trim()
} catch {
  try { commit = JSON.parse(readFileSync(new URL('./build-info.json', import.meta.url), 'utf8')).commit || commit } catch { /* ZIP without metadata remains runnable. */ }
}
export default defineConfig({
  plugins: [react()],
  define: { 'import.meta.env.VITE_APP_COMMIT': JSON.stringify(commit) },
  server: { proxy: { '/api': 'http://127.0.0.1:3001' } },
})
