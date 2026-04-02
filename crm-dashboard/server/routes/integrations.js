import { Router } from 'express'
import db from '../db.js'
import { requireRole } from '../middleware/auth.js'

const router = Router()

// List WhatsApp instances
router.get('/whatsapp', requireRole('super_admin', 'gerente'), (req, res) => {
  if (!req.accountId) return res.status(400).json({ error: 'account_id required' })
  const instances = db.prepare('SELECT * FROM whatsapp_instances WHERE account_id = ?').all(req.accountId)
  res.json({ instances })
})

// Create/update WhatsApp instance
router.post('/whatsapp', requireRole('super_admin', 'gerente'), async (req, res) => {
  if (!req.accountId) return res.status(400).json({ error: 'account_id required' })
  const { instance_name, api_url, api_key } = req.body
  if (!instance_name || !api_url || !api_key) return res.status(400).json({ error: 'instance_name, api_url e api_key obrigatorios' })

  const existing = db.prepare('SELECT id FROM whatsapp_instances WHERE account_id = ? AND instance_name = ?').get(req.accountId, instance_name)
  if (existing) {
    db.prepare("UPDATE whatsapp_instances SET api_url = ?, api_key = ?, updated_at = datetime('now') WHERE id = ?").run(api_url, api_key, existing.id)
    const instance = db.prepare('SELECT * FROM whatsapp_instances WHERE id = ?').get(existing.id)
    return res.json({ instance })
  }

  const result = db.prepare('INSERT INTO whatsapp_instances (account_id, instance_name, api_url, api_key) VALUES (?, ?, ?, ?)').run(req.accountId, instance_name, api_url, api_key)
  const instance = db.prepare('SELECT * FROM whatsapp_instances WHERE id = ?').get(result.lastInsertRowid)

  // Set up webhook on Evolution API
  try {
    const account = db.prepare('SELECT slug FROM accounts WHERE id = ?').get(req.accountId)
    const webhookUrl = `${req.protocol}://${req.get('host')}/api/webhooks/evolution/${account.slug}`
    await fetch(`${api_url}/webhook/set/${instance_name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': api_key },
      body: JSON.stringify({ url: webhookUrl, webhook_by_events: false, events: ['MESSAGES_UPSERT'] }),
    })
  } catch (err) {
    console.error('[Evolution Webhook Setup]', err.message)
  }

  res.json({ instance })
})

// Test connection
router.post('/whatsapp/:id/test', requireRole('super_admin', 'gerente'), async (req, res) => {
  const instance = db.prepare('SELECT * FROM whatsapp_instances WHERE id = ?').get(req.params.id)
  if (!instance) return res.status(404).json({ error: 'Instancia nao encontrada' })

  try {
    const r = await fetch(`${instance.api_url}/instance/connectionState/${instance.instance_name}`, {
      headers: { 'apikey': instance.api_key },
    })
    const data = await r.json()
    const status = data.instance?.state === 'open' ? 'connected' : 'disconnected'
    db.prepare("UPDATE whatsapp_instances SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, instance.id)
    res.json({ success: status === 'connected', status, data })
  } catch (err) {
    db.prepare("UPDATE whatsapp_instances SET status = 'disconnected' WHERE id = ?").run(instance.id)
    res.json({ success: false, error: err.message })
  }
})

// Delete instance
router.delete('/whatsapp/:id', requireRole('super_admin', 'gerente'), (req, res) => {
  db.prepare('DELETE FROM whatsapp_instances WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
