import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '..', 'dist')

const app = express()
app.use(express.json())

app.get('/healthz', (_req, res) => {
  res.status(200).send('ok')
})

app.post('/api/extract', (_req, res) => {
  res.status(501).json({
    error: 'not_configured',
    message: 'No LLM key is configured. Set LLM_API_KEY to enable this endpoint; the app works without it.',
  })
})

app.use(express.static(distDir))
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

const port = process.env.PORT ? Number(process.env.PORT) : 3000
app.listen(port, () => {
  console.log(`Haq Bolo server listening on port ${port}`)
})
