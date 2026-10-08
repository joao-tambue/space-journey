import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Sem prefixo VITE_: a chave fica no servidor e nunca é embutida no bundle.
  const env = loadEnv(mode, process.cwd(), '')
  const model = env.GEMINI_MODEL || 'gemini-flash-latest'

  const geminiProxy = {
    '/api/gemini': {
      target: 'https://generativelanguage.googleapis.com',
      changeOrigin: true,
      rewrite: () => `/v1beta/models/${model}:streamGenerateContent?alt=sse`,
      configure: (proxy) => {
        proxy.on('proxyReq', (req) => {
          req.setHeader('x-goog-api-key', env.GEMINI_API_KEY ?? '')
        })
      },
    },
  }

  return {
    plugins: [react()],
    server: { proxy: geminiProxy },
    preview: { proxy: geminiProxy },
  }
})
