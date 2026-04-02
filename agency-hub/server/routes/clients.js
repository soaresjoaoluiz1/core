import { Router } from 'express'
import db from '../db.js'
import { requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/', requireRole('dono', 'funcionario'), (req, res) => {
  const clients = db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM tasks WHERE client_id = c.id AND is_active = 1) as task_count,
    (SELECT COUNT(*) FROM users WHERE client_id = c.id) as user_count
    FROM clients c WHERE c.is_active = 1 ORDER BY c.name
  `).all()
  res.json({ clients })
})

router.post('/', requireRole('dono'), (req, res) => {
  const { name, contact_name, contact_email, contact_phone, logo_url, drive_folder } = req.body
  if (!name) return res.status(400).json({ error: 'Nome obrigatorio' })
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (db.prepare('SELECT id FROM clients WHERE slug = ?').get(slug)) return res.status(400).json({ error: 'Cliente ja existe' })
  const result = db.prepare('INSERT INTO clients (name, slug, contact_name, contact_email, contact_phone, logo_url, drive_folder) VALUES (?, ?, ?, ?, ?, ?, ?)').run(name, slug, contact_name, contact_email, contact_phone, logo_url, drive_folder || null)
  res.json({ client: db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid) })
})

router.get('/:id', requireRole('dono'), (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id)
  if (!client) return res.status(404).json({ error: 'Cliente nao encontrado' })
  const users = db.prepare('SELECT id, name, email, role, is_active FROM users WHERE client_id = ?').all(client.id)
  const tasksByStage = db.prepare('SELECT stage, COUNT(*) as count FROM tasks WHERE client_id = ? AND is_active = 1 GROUP BY stage').all(client.id)
  const credentials = db.prepare('SELECT * FROM client_credentials WHERE client_id = ? ORDER BY platform').all(client.id)
  res.json({ client, users, tasksByStage, credentials })
})

router.put('/:id', requireRole('dono'), (req, res) => {
  const { name, contact_name, contact_email, contact_phone, logo_url, drive_folder, is_active } = req.body
  const sets = []; const params = []
  if (name !== undefined) { sets.push('name = ?'); params.push(name) }
  if (contact_name !== undefined) { sets.push('contact_name = ?'); params.push(contact_name) }
  if (contact_email !== undefined) { sets.push('contact_email = ?'); params.push(contact_email) }
  if (contact_phone !== undefined) { sets.push('contact_phone = ?'); params.push(contact_phone) }
  if (logo_url !== undefined) { sets.push('logo_url = ?'); params.push(logo_url) }
  if (drive_folder !== undefined) { sets.push('drive_folder = ?'); params.push(drive_folder) }
  if (is_active !== undefined) { sets.push('is_active = ?'); params.push(is_active ? 1 : 0) }
  if (!sets.length) return res.status(400).json({ error: 'Nada pra atualizar' })
  sets.push("updated_at = datetime('now')"); params.push(req.params.id)
  db.prepare(`UPDATE clients SET ${sets.join(', ')} WHERE id = ?`).run(...params)
  res.json({ client: db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id) })
})

// Client credentials (platform access)
router.get('/:id/credentials', requireRole('dono'), (req, res) => {
  const credentials = db.prepare('SELECT * FROM client_credentials WHERE client_id = ? ORDER BY platform').all(req.params.id)
  res.json({ credentials })
})

router.post('/:id/credentials', requireRole('dono'), (req, res) => {
  const { platform, login, password, observation } = req.body
  if (!platform || !login || !password) return res.status(400).json({ error: 'platform, login e password obrigatorios' })
  const result = db.prepare('INSERT INTO client_credentials (client_id, platform, login, password, observation) VALUES (?, ?, ?, ?, ?)').run(req.params.id, platform, login, password, observation || null)
  res.json({ credential: db.prepare('SELECT * FROM client_credentials WHERE id = ?').get(result.lastInsertRowid) })
})

router.put('/:id/credentials/:credId', requireRole('dono'), (req, res) => {
  const { platform, login, password, observation } = req.body
  const sets = []; const params = []
  if (platform !== undefined) { sets.push('platform = ?'); params.push(platform) }
  if (login !== undefined) { sets.push('login = ?'); params.push(login) }
  if (password !== undefined) { sets.push('password = ?'); params.push(password) }
  if (observation !== undefined) { sets.push('observation = ?'); params.push(observation) }
  if (!sets.length) return res.status(400).json({ error: 'Nada pra atualizar' })
  sets.push("updated_at = datetime('now')"); params.push(req.params.credId)
  db.prepare(`UPDATE client_credentials SET ${sets.join(', ')} WHERE id = ?`).run(...params)
  res.json({ credential: db.prepare('SELECT * FROM client_credentials WHERE id = ?').get(req.params.credId) })
})

router.delete('/:id/credentials/:credId', requireRole('dono'), (req, res) => {
  db.prepare('DELETE FROM client_credentials WHERE id = ?').run(req.params.credId)
  res.json({ ok: true })
})

export default router
