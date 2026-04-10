import { Router } from 'express'
import db from '../db.js'
import { requireRole } from '../middleware/auth.js'
import { broadcastSSE } from '../sse.js'
import { notify } from '../notifications.js'

const router = Router()

// List all templates
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT t.*, s.name as service_name, s.color as service_color
    FROM task_templates t
    LEFT JOIN services s ON t.service_id = s.id
    WHERE t.is_active = 1
    ORDER BY s.name, t.name
  `).all()
  res.json({ templates: rows.map(r => ({ ...r, subtasks: JSON.parse(r.subtasks || '[]') })) })
})

// Create template (dono only)
router.post('/', requireRole('dono'), (req, res) => {
  const { service_id, name, color, subtasks } = req.body
  if (!name) return res.status(400).json({ error: 'Nome obrigatorio' })
  const result = db.prepare(`
    INSERT INTO task_templates (service_id, name, color, subtasks)
    VALUES (?, ?, ?, ?)
  `).run(service_id || null, name, color || '#FFB300', JSON.stringify(subtasks || []))
  const row = db.prepare('SELECT * FROM task_templates WHERE id = ?').get(result.lastInsertRowid)
  res.json({ template: { ...row, subtasks: JSON.parse(row.subtasks || '[]') } })
})

// Update template (dono only)
router.put('/:id', requireRole('dono'), (req, res) => {
  const { service_id, name, color, subtasks, is_active } = req.body
  const sets = []; const params = []
  if (service_id !== undefined) { sets.push('service_id = ?'); params.push(service_id) }
  if (name !== undefined) { sets.push('name = ?'); params.push(name) }
  if (color !== undefined) { sets.push('color = ?'); params.push(color) }
  if (subtasks !== undefined) { sets.push('subtasks = ?'); params.push(JSON.stringify(subtasks)) }
  if (is_active !== undefined) { sets.push('is_active = ?'); params.push(is_active) }
  if (!sets.length) return res.status(400).json({ error: 'Nada pra atualizar' })
  params.push(req.params.id)
  db.prepare(`UPDATE task_templates SET ${sets.join(', ')} WHERE id = ?`).run(...params)
  const row = db.prepare('SELECT * FROM task_templates WHERE id = ?').get(req.params.id)
  res.json({ template: { ...row, subtasks: JSON.parse(row.subtasks || '[]') } })
})

// Delete template (dono only)
router.delete('/:id', requireRole('dono'), (req, res) => {
  db.prepare('DELETE FROM task_templates WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// Generate tasks from template (creates N parent tasks, each with subtasks)
// POST /api/templates/:id/generate
// body: { client_id, count, name_prefix, due_date, priority }
router.post('/:id/generate', requireRole('dono', 'funcionario'), (req, res) => {
  const template = db.prepare('SELECT * FROM task_templates WHERE id = ?').get(req.params.id)
  if (!template) return res.status(404).json({ error: 'Template nao encontrado' })

  const { client_id, count, name_prefix, due_date, priority, category_id } = req.body
  if (!client_id || !count || !name_prefix) return res.status(400).json({ error: 'client_id, count e name_prefix obrigatorios' })

  const subtasks = JSON.parse(template.subtasks || '[]')
  if (!subtasks.length) return res.status(400).json({ error: 'Template sem subtarefas configuradas' })

  const createdParents = []
  const createParent = db.prepare(`
    INSERT INTO tasks (client_id, category_id, title, priority, due_date, template_id, created_by, stage)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'backlog')
  `)
  const createChild = db.prepare(`
    INSERT INTO tasks (client_id, category_id, department_id, title, priority, parent_task_id, template_id, subtask_position, created_by, stage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'backlog')
  `)
  const histStmt = db.prepare('INSERT INTO task_history (task_id, to_stage, user_id) VALUES (?, ?, ?)')

  // Use transaction for atomic creation
  const tx = db.transaction(() => {
    for (let i = 1; i <= count; i++) {
      const title = count > 1 ? `${name_prefix} ${i}/${count}` : name_prefix
      const parentResult = createParent.run(client_id, category_id || null, title, priority || 'normal', due_date || null, template.id, req.user.id)
      const parentId = parentResult.lastInsertRowid
      histStmt.run(parentId, 'backlog', req.user.id)

      // Create subtasks
      subtasks.forEach((sub, idx) => {
        const childResult = createChild.run(
          client_id,
          category_id || null,
          sub.department_id || null,
          `${title} - ${sub.name}`,
          priority || 'normal',
          parentId,
          template.id,
          idx + 1,
          req.user.id
        )
        histStmt.run(childResult.lastInsertRowid, 'backlog', req.user.id)
      })

      createdParents.push(parentId)
    }
  })
  tx()

  // Broadcast and notify
  createdParents.forEach(pid => {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(pid)
    broadcastSSE(task.client_id, 'task:created', task)
  })

  res.json({ ok: true, created: createdParents.length, parent_ids: createdParents })
})

export default router
