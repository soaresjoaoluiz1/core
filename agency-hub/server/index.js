import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../../.env') })

import db from './db.js'
import authRoutes from './routes/auth.js'
import clientRoutes from './routes/clients.js'
import departmentRoutes from './routes/departments.js'
import userRoutes from './routes/users.js'
import categoryRoutes from './routes/categories.js'
import taskRoutes from './routes/tasks.js'
import approvalRoutes from './routes/approvals.js'
import dashboardRoutes from './routes/dashboard.js'
import notificationRoutes from './routes/notifications.js'
import { authenticate } from './middleware/auth.js'
import { addSSEClient, removeSSEClient, addSSEUserClient, removeSSEUserClient } from './sse.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '5mb' }))

const PORT = 3003

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/clients', authenticate, clientRoutes)
app.use('/api/departments', authenticate, departmentRoutes)
app.use('/api/users', authenticate, userRoutes)
app.use('/api/categories', authenticate, categoryRoutes)
app.use('/api/tasks', authenticate, taskRoutes)
app.use('/api/approvals', authenticate, approvalRoutes)
app.use('/api/dashboard', authenticate, dashboardRoutes)
app.use('/api/notifications', authenticate, notificationRoutes)

// SSE
app.get('/api/events', async (req, res) => {
  const token = req.query.token
  if (!token) return res.status(401).end()
  let user
  try {
    const jwtMod = await import('jsonwebtoken')
    user = jwtMod.default.verify(token, process.env.JWT_SECRET || 'dros-hub-secret-2026')
  } catch { return res.status(401).end() }
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' })
  res.write('data: {"type":"connected"}\n\n')
  const key = user.client_id || 'admin'
  addSSEClient(key, res)
  addSSEUserClient(user.id, res)
  req.on('close', () => { removeSSEClient(key, res); removeSSEUserClient(user.id, res) })
})

// Pipeline stages CRUD
app.get('/api/stages', authenticate, (req, res) => {
  res.json({ stages: db.prepare('SELECT * FROM pipeline_stages ORDER BY position').all() })
})

app.post('/api/stages', authenticate, (req, res) => {
  if (req.user.role !== 'dono') return res.status(403).json({ error: 'Forbidden' })
  const { name, slug, color, position, is_terminal } = req.body
  if (!name || !slug) return res.status(400).json({ error: 'name and slug required' })
  const result = db.prepare('INSERT INTO pipeline_stages (name, slug, position, color, is_terminal) VALUES (?, ?, ?, ?, ?)').run(name, slug, position || 0, color || '#FFB300', is_terminal || 0)
  res.json({ stage: db.prepare('SELECT * FROM pipeline_stages WHERE id = ?').get(result.lastInsertRowid) })
})

app.put('/api/stages/:id', authenticate, (req, res) => {
  if (req.user.role !== 'dono') return res.status(403).json({ error: 'Forbidden' })
  const { name, color, position, is_terminal } = req.body
  const sets = []; const params = []
  if (name !== undefined) { sets.push('name = ?'); params.push(name) }
  if (color !== undefined) { sets.push('color = ?'); params.push(color) }
  if (position !== undefined) { sets.push('position = ?'); params.push(position) }
  if (is_terminal !== undefined) { sets.push('is_terminal = ?'); params.push(is_terminal) }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' })
  params.push(req.params.id)
  db.prepare(`UPDATE pipeline_stages SET ${sets.join(', ')} WHERE id = ?`).run(...params)
  res.json({ stage: db.prepare('SELECT * FROM pipeline_stages WHERE id = ?').get(req.params.id) })
})

// Serve frontend (production)
const distPath = resolve(__dirname, '../dist')
app.use(express.static(distPath))
app.get('/{*path}', (req, res) => {
  res.sendFile(resolve(distPath, 'index.html'))
})

app.listen(PORT, () => console.log(`[Dros Hub API] Running on http://localhost:${PORT}`))
