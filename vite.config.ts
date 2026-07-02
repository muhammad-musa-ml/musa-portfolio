import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-only /api/chat so the AI twin works on `npm run dev` exactly like it
// does on Vercel: Groq if GROQ_API_KEY is set, else keyless Pollinations.
function devChatProxy(): Plugin {
  return {
    name: 'dev-chat-proxy',
    configureServer(server) {
      server.middlewares.use('/api/chat', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end()
        }
        let raw = ''
        req.on('data', (c) => (raw += c))
        req.on('end', async () => {
          try {
            const body = JSON.parse(raw)
            const key = process.env.GROQ_API_KEY
            const upstream = await fetch(
              key
                ? 'https://api.groq.com/openai/v1/chat/completions'
                : 'https://text.pollinations.ai/openai',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(key ? { Authorization: `Bearer ${key}` } : {}),
                },
                body: JSON.stringify(
                  key
                    ? {
                        model: 'llama-3.3-70b-versatile',
                        messages: body.messages,
                        stream: false,
                        max_tokens: 800,
                      }
                    : { model: 'openai', messages: body.messages, referrer: 'musa-portfolio' }
                ),
              }
            )
            const text = await upstream.text()
            res.statusCode = upstream.status
            res.setHeader('Content-Type', 'application/json')
            res.end(text)
          } catch (e) {
            res.statusCode = 502
            res.end(JSON.stringify({ error: String(e) }))
          }
        })
      })
    },
  }
}

// base is set at build time for subpath deploys (e.g. GitHub Pages):
//   VITE_BASE=/repo-name/ npm run build
export default defineConfig({
  plugins: [react(), devChatProxy()],
  base: process.env.VITE_BASE || '/',
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
})
