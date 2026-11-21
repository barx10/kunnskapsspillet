import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Streng CSP i produksjon: ingen tredjepartsskript, og nettverkskall bare til egne filer
// og KI-leverandørene (for BYOK). Settes bare ved bygg, fordi Vites dev-server bruker inline-skript.
const lagCsp = (buzzer: string) => [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self' https://api.anthropic.com https://generativelanguage.googleapis.com ${buzzer}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

const cspPlugin = (csp: string): Plugin => ({
  name: 'csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />\n    <meta name="referrer" content="no-referrer" />`),
})

export default defineConfig(({ mode }) => {
  const buzzer = loadEnv(mode, process.cwd(), 'VITE_').VITE_BUZZER_URL
  if (!buzzer) throw new Error('VITE_BUZZER_URL mangler i .env')
  return {
    base: '/',
    plugins: [react(), cspPlugin(lagCsp(buzzer))],
  }
})
