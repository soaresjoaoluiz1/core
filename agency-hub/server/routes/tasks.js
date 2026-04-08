import { Router } from 'express'
import db from '../db.js'
import { requireRole } from '../middleware/auth.js'
import { broadcastSSE } from '../sse.js'
import { notify, notifyMany, getDonoUsers, getClientUsers } from '../notifications.js'

const router = Router()

// Helper: get assignee IDs and names for a task
function getAssignees(taskId) {
  return db.prepare('SELECT ta.user_id, u.name FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = ?').all(taskId)
}
function setAssignees(taskId, userIds) {
  db.prepare('DELETE FROM task_assignees WHERE task_id = ?').run(taskId)
  if (userIds?.length) {
    const stmt = db.prepare('INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)')
    userIds.forEach(uid => stmt.run(taskId, uid))
  }
}

// Stage transition rules per role
const TRANSITIONS = {
  dono: null, // can do anything
  funcionario: null, // funcionarios can move to any stage
  cliente: { aguardando_cliente: ['aprovado_cliente', 'revisao_interna'] },
}

function canTransition(role, fromStage, toStage) {
  if (TRANSITIONS[role] === null) return true // null = can do anything
  const allowed = TRANSITIONS[role]?.[fromStage]
  return allowed ? allowed.includes(toStage) : false
}

// List tasks with filters
router.get('/', (req, res) => {
  const { client_id, department_id, stage, assigned_to, category_id, priority, search, date_from, date_to, page = '1', limit = '30' } = req.query
  const where = ['t.is_active = 1']
  const params = []

  // Role-based scoping
  if (req.user.role === 'cliente') {
    where.push('t.client_id = ?'); params.push(req.user.client_id)
  } else if (req.user.role === 'funcionario') {
    // See tasks assigned to them OR in their departments
    where.push('(t.id IN (SELECT task_id FROM task_assignees WHERE user_id = ?) OR t.department_id IN (SELECT department_id FROM user_departments WHERE user_id = ?))')
    params.push(req.user.id, req.user.id)
  }

  if (client_id) { where.push('t.client_id = ?'); params.push(client_id) }
  if (department_id) { where.push('t.department_id = ?'); params.push(department_id) }
  if (stage) { where.push('t.stage = ?'); params.push(stage) }
  if (assigned_to) { where.push('t.id IN (SELECT task_id FROM task_assignees WHERE user_id = ?)'); params.push(assigned_to) }
  if (category_id) { where.push('t.category_id = ?'); params.push(category_id) }
  if (priority) { where.push('t.priority = ?'); params.push(priority) }
  if (search) { where.push("(t.title LIKE ? OR t.description LIKE ?)"); params.push(`%${search}%`, `%${search}%`) }
  if (date_from) { where.push('t.created_at >= ?'); params.push(date_from) }
  if (date_to) { where.push('t.created_at <= ?'); params.push(date_to + ' 23:59:59') }

  const total = db.prepare(`SELECT COUNT(*) as c FROM tasks t WHERE ${where.join(' AND ')}`).get(...params).c
  const offset = (parseInt(page) - 1) * parseInt(limit)

  const tasks = db.prepare(`
    SELECT t.*, c.name as client_name, d.name as department_name, d.color as department_color,
      cat.name as category_name, cat.color as category_color,
      (SELECT GROUP_CONCAT(u2.name, ', ') FROM task_assignees ta2 JOIN users u2 ON ta2.user_id = u2.id WHERE ta2.task_id = t.id) as assigned_name,
      creator.name as created_by_name,
      (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) as comment_count,
      ps.name as stage_name, ps.color as stage_color
    FROM tasks t
    LEFT JOIN clients c ON t.client_id = c.id
    LEFT JOIN departments d ON t.department_id = d.id
    LEFT JOIN task_categories cat ON t.category_id = cat.id
    LEFT JOIN users creator ON t.created_by = creator.id
    LEFT JOIN pipeline_stages ps ON t.stage = ps.slug
    WHERE ${where.join(' AND ')}
    ORDER BY t.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset)

  res.json({ tasks, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) })
})

// Pipeline view (grouped by stage)
router.get('/pipeline', (req, res) => {
  const { client_id, department_id, assigned_to } = req.query
  const where = ['t.is_active = 1']
  const params = []

  if (req.user.role === 'cliente') { where.push('t.client_id = ?'); params.push(req.user.client_id) }
  else if (req.user.role === 'funcionario') { where.push('(t.id IN (SELECT task_id FROM task_assignees WHERE user_id = ?) OR t.department_id IN (SELECT department_id FROM user_departments WHERE user_id = ?))'); params.push(req.user.id, req.user.id) }
  if (client_id) { where.push('t.client_id = ?'); params.push(client_id) }
  if (department_id) { where.push('t.department_id = ?'); params.push(department_id) }
  if (assigned_to) { where.push('t.id IN (SELECT task_id FROM task_assignees WHERE user_id = ?)'); params.push(assigned_to) }

  const stages = db.prepare('SELECT * FROM pipeline_stages ORDER BY position').all()
  const tasks = db.prepare(`
    SELECT t.*, c.name as client_name, d.name as department_name, d.color as department_color,
      (SELECT GROUP_CONCAT(u2.name, ', ') FROM task_assignees ta2 JOIN users u2 ON ta2.user_id = u2.id WHERE ta2.task_id = t.id) as assigned_name,
      ps.name as stage_name, ps.color as stage_color
    FROM tasks t
    LEFT JOIN clients c ON t.client_id = c.id LEFT JOIN departments d ON t.department_id = d.id
    LEFT JOIN pipeline_stages ps ON t.stage = ps.slug
    WHERE ${where.join(' AND ')}
    ORDER BY t.updated_at DESC
  `).all(...params)

  res.json({ stages, tasks })
})

// Create task
router.post('/', requireRole('dono', 'funcionario'), (req, res) => {
  const { client_id, title, description, category_id, department_id, assigned_to, due_date, priority, drive_link } = req.body
  if (!client_id || !title) return res.status(400).json({ error: 'client_id e title obrigatorios' })

  // assigned_to can be a single ID or array of IDs
  const assigneeIds = Array.isArray(assigned_to) ? assigned_to.filter(Boolean).map(Number) : (assigned_to ? [Number(assigned_to)] : [])
  const primaryAssignee = assigneeIds[0] || null

  const result = db.prepare(`
    INSERT INTO tasks (client_id, category_id, department_id, title, description, due_date, priority, assigned_to, drive_link, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(client_id, category_id || null, department_id || null, title, description || null, due_date || null, priority || 'normal', primaryAssignee, drive_link || null, req.user.id)

  setAssignees(result.lastInsertRowid, assigneeIds)
  db.prepare('INSERT INTO task_history (task_id, to_stage, user_id) VALUES (?, ?, ?)').run(result.lastInsertRowid, 'backlog', req.user.id)

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid)
  broadcastSSE(task.client_id, 'task:created', task)
  // Notify all assignees
  assigneeIds.filter(uid => uid !== req.user.id).forEach(uid => {
    notify(uid, 'task_assigned', 'Nova tarefa atribuida', `"${task.title}" foi atribuida a voce`, task.id, req.user.id)
  })
  res.json({ task })
})

// Get task detail
router.get('/:id', (req, res) => {
  const task = db.prepare(`
    SELECT t.*, c.name as client_name, d.name as department_name, d.color as department_color,
      cat.name as category_name, cat.color as category_color,
      (SELECT GROUP_CONCAT(u2.name, ', ') FROM task_assignees ta2 JOIN users u2 ON ta2.user_id = u2.id WHERE ta2.task_id = t.id) as assigned_name,
      creator.name as created_by_name, ps.name as stage_name, ps.color as stage_color
    FROM tasks t LEFT JOIN clients c ON t.client_id = c.id LEFT JOIN departments d ON t.department_id = d.id
    LEFT JOIN task_categories cat ON t.category_id = cat.id
    LEFT JOIN users creator ON t.created_by = creator.id LEFT JOIN pipeline_stages ps ON t.stage = ps.slug
    WHERE t.id = ?
  `).get(req.params.id)
  if (!task) return res.status(404).json({ error: 'Tarefa nao encontrada' })
  task.assignees = getAssignees(task.id)
  if (req.user.role === 'cliente' && task.client_id !== req.user.client_id) return res.status(403).json({ error: 'Forbidden' })

  // Comments (filter internal for clients)
  const commentWhere = req.user.role === 'cliente' ? 'AND tc.is_internal = 0' : ''
  const comments = db.prepare(`SELECT tc.*, u.name as user_name, u.role as user_role FROM task_comments tc LEFT JOIN users u ON tc.user_id = u.id WHERE tc.task_id = ? ${commentWhere} ORDER BY tc.created_at`).all(task.id)
  const history = db.prepare(`SELECT th.*, u.name as user_name, ps_from.name as from_stage_name, ps_to.name as to_stage_name
    FROM task_history th LEFT JOIN users u ON th.user_id = u.id
    LEFT JOIN pipeline_stages ps_from ON th.from_stage = ps_from.slug LEFT JOIN pipeline_stages ps_to ON th.to_stage = ps_to.slug
    WHERE th.task_id = ? ORDER BY th.created_at DESC`).all(task.id)
  const attachments = db.prepare('SELECT ta.*, u.name as uploaded_by_name FROM task_attachments ta LEFT JOIN users u ON ta.uploaded_by = u.id WHERE ta.task_id = ? ORDER BY ta.created_at DESC').all(task.id)

  const timeEntries = db.prepare('SELECT te.*, u.name as user_name FROM time_entries te LEFT JOIN users u ON te.user_id = u.id WHERE te.task_id = ? ORDER BY te.created_at DESC').all(task.id)
  const totalTimeSeconds = timeEntries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0)
  const activeTimer = db.prepare('SELECT * FROM time_entries WHERE task_id = ? AND ended_at IS NULL').get(task.id)
  res.json({ task, comments, history, attachments, timeEntries, totalTimeSeconds, activeTimer })
})

// Update task
router.put('/:id', requireRole('dono', 'funcionario'), (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
  if (!task) return res.status(404).json({ error: 'Tarefa nao encontrada' })
  // Funcionario can edit if they are one of the assignees
  if (req.user.role === 'funcionario') {
    const isAssignee = db.prepare('SELECT 1 FROM task_assignees WHERE task_id = ? AND user_id = ?').get(task.id, req.user.id)
    if (!isAssignee && task.assigned_to !== req.user.id) return res.status(403).json({ error: 'Sem permissao' })
  }

  const { title, description, due_date, priority, department_id, assigned_to, drive_link, drive_link_raw, category_id, approval_link, approval_text, publish_date, publish_objective } = req.body
  const sets = []; const params = []
  if (title !== undefined) { sets.push('title = ?'); params.push(title) }
  if (description !== undefined) { sets.push('description = ?'); params.push(description) }
  if (due_date !== undefined) { sets.push('due_date = ?'); params.push(due_date) }
  if (priority !== undefined) { sets.push('priority = ?'); params.push(priority) }
  if (department_id !== undefined) { sets.push('department_id = ?'); params.push(department_id) }
  if (drive_link !== undefined) { sets.push('drive_link = ?'); params.push(drive_link) }
  if (drive_link_raw !== undefined) { sets.push('drive_link_raw = ?'); params.push(drive_link_raw) }
  if (category_id !== undefined) { sets.push('category_id = ?'); params.push(category_id) }
  if (approval_link !== undefined) { sets.push('approval_link = ?'); params.push(approval_link) }
  if (approval_text !== undefined) { sets.push('approval_text = ?'); params.push(approval_text) }
  if (publish_date !== undefined) { sets.push('publish_date = ?'); params.push(publish_date) }
  if (publish_objective !== undefined) { sets.push('publish_objective = ?'); params.push(publish_objective) }

  // Handle multi-assignee
  if (assigned_to !== undefined) {
    const newIds = Array.isArray(assigned_to) ? assigned_to.filter(Boolean).map(Number) : (assigned_to ? [Number(assigned_to)] : [])
    const oldAssignees = getAssignees(task.id)
    const oldIds = oldAssignees.map(a => a.user_id)
    setAssignees(task.id, newIds)
    sets.push('assigned_to = ?'); params.push(newIds[0] || null)
    // Log history
    const oldNames = oldAssignees.map(a => a.name).join(', ') || 'Ninguem'
    const newNames = newIds.length ? db.prepare(`SELECT GROUP_CONCAT(name, ', ') as n FROM users WHERE id IN (${newIds.map(() => '?').join(',')})`).get(...newIds)?.n || 'Ninguem' : 'Ninguem'
    if (oldNames !== newNames) {
      db.prepare('INSERT INTO task_history (task_id, from_stage, to_stage, user_id, comment) VALUES (?, ?, ?, ?, ?)').run(task.id, task.stage, task.stage, req.user.id, `Responsavel: ${oldNames} → ${newNames}`)
    }
    // Notify removed assignees
    oldIds.filter(uid => !newIds.includes(uid) && uid !== req.user.id).forEach(uid => notify(uid, 'task_reassigned', 'Tarefa reatribuida', `"${task.title}" foi reatribuida`, task.id, req.user.id))
    // Notify new assignees
    newIds.filter(uid => !oldIds.includes(uid) && uid !== req.user.id).forEach(uid => notify(uid, 'task_assigned', 'Nova tarefa atribuida', `"${task.title}" foi atribuida a voce`, task.id, req.user.id))
  }

  if (!sets.length) return res.status(400).json({ error: 'Nada pra atualizar' })
  sets.push("updated_at = datetime('now', '-3 hours')"); params.push(req.params.id)
  db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...params)
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
  broadcastSSE(updated.client_id, 'task:updated', updated)
  res.json({ task: updated })
})

// Move task stage
router.put('/:id/stage', (req, res) => {
  const { stage, comment } = req.body
  if (!stage) return res.status(400).json({ error: 'stage required' })
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
  if (!task) return res.status(404).json({ error: 'Tarefa nao encontrada' })
  if (req.user.role === 'cliente' && task.client_id !== req.user.client_id) return res.status(403).json({ error: 'Forbidden' })

  if (!canTransition(req.user.role, task.stage, stage)) {
    return res.status(403).json({ error: `Transicao ${task.stage} → ${stage} nao permitida para ${req.user.role}` })
  }

  // Require approval_link for approval stages
  if ((stage === 'aprovacao_interna' || stage === 'aguardando_cliente') && !task.approval_link) {
    return res.status(400).json({ error: 'Preencha o conteudo de aprovacao (link + texto) antes de enviar pra aprovacao' })
  }

  db.prepare("UPDATE tasks SET stage = ?, updated_at = datetime('now', '-3 hours') WHERE id = ?").run(stage, task.id)
  db.prepare('INSERT INTO task_history (task_id, from_stage, to_stage, user_id, comment) VALUES (?, ?, ?, ?, ?)').run(task.id, task.stage, stage, req.user.id, comment || null)

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id)
  broadcastSSE(updated.client_id, 'task:stage_changed', updated)
  // Stage-specific notifications
  if (stage === 'revisao_interna' || stage === 'aprovacao_interna') {
    notifyMany(getDonoUsers().map(d => d.id), 'task_submitted_review', stage === 'revisao_interna' ? 'Tarefa em revisao' : 'Aguardando aprovacao', `"${updated.title}"`, updated.id, req.user.id)
  }
  if (stage === 'aguardando_cliente') {
    notifyMany(getClientUsers(updated.client_id).map(u => u.id), 'task_ready_for_approval', 'Tarefa pronta pra aprovar', `"${updated.title}" aguarda sua aprovacao`, updated.id, req.user.id)
  }
  if (stage === 'concluido') {
    getAssignees(updated.id).filter(a => a.user_id !== req.user.id).forEach(a => notify(a.user_id, 'task_completed', 'Tarefa concluida', `"${updated.title}"`, updated.id, req.user.id))
    notifyMany(getClientUsers(updated.client_id).map(u => u.id), 'task_completed', 'Tarefa concluida', `"${updated.title}"`, updated.id, req.user.id)
  }
  res.json({ task: updated })
})

// Add comment
router.post('/:id/comments', (req, res) => {
  const { content, is_internal } = req.body
  if (!content) return res.status(400).json({ error: 'content required' })
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
  if (!task) return res.status(404).json({ error: 'Tarefa nao encontrada' })
  // Clients can't post internal comments
  const internal = req.user.role === 'cliente' ? 0 : (is_internal ? 1 : 0)
  const result = db.prepare('INSERT INTO task_comments (task_id, user_id, content, is_internal) VALUES (?, ?, ?, ?)').run(task.id, req.user.id, content, internal)
  const comment = db.prepare('SELECT tc.*, u.name as user_name, u.role as user_role FROM task_comments tc LEFT JOIN users u ON tc.user_id = u.id WHERE tc.id = ?').get(result.lastInsertRowid)
  broadcastSSE(task.client_id, 'task:comment', { taskId: task.id, comment })
  // Notify all assignees
  const assignees = getAssignees(task.id)
  assignees.filter(a => a.user_id !== req.user.id).forEach(a => notify(a.user_id, 'comment_added', 'Novo comentario', `Em "${task.title}"`, task.id, req.user.id))
  // Notify creator
  if (task.created_by && task.created_by !== req.user.id && !assignees.find(a => a.user_id === task.created_by)) notify(task.created_by, 'comment_added', 'Novo comentario', `Em "${task.title}"`, task.id, req.user.id)
  // Non-internal → notify client users
  if (!internal) notifyMany(getClientUsers(task.client_id).map(u => u.id).filter(uid => uid !== req.user.id), 'comment_added', 'Novo comentario', `Em "${task.title}"`, task.id, req.user.id)
  res.json({ comment })
})

// Add attachment
router.post('/:id/attachments', requireRole('dono', 'funcionario'), (req, res) => {
  const { url, filename, type } = req.body
  if (!url || !filename) return res.status(400).json({ error: 'url e filename obrigatorios' })
  const result = db.prepare('INSERT INTO task_attachments (task_id, url, filename, type, uploaded_by) VALUES (?, ?, ?, ?, ?)').run(req.params.id, url, filename, type || 'file', req.user.id)
  res.json({ attachment: db.prepare('SELECT * FROM task_attachments WHERE id = ?').get(result.lastInsertRowid) })
})

// Pipeline stages list
router.get('/stages/list', (req, res) => {
  res.json({ stages: db.prepare('SELECT * FROM pipeline_stages ORDER BY position').all() })
})

// Time entries
router.get('/:id/time', (req, res) => {
  const entries = db.prepare('SELECT te.*, u.name as user_name FROM time_entries te LEFT JOIN users u ON te.user_id = u.id WHERE te.task_id = ? ORDER BY te.created_at DESC').all(req.params.id)
  const totalSeconds = entries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0)
  res.json({ entries, totalSeconds })
})

router.post('/:id/time/start', (req, res) => {
  // Check if there's an active timer
  const active = db.prepare('SELECT id FROM time_entries WHERE task_id = ? AND user_id = ? AND ended_at IS NULL').get(req.params.id, req.user.id)
  if (active) return res.status(400).json({ error: 'Timer ja ativo' })
  const result = db.prepare("INSERT INTO time_entries (task_id, user_id, started_at) VALUES (?, ?, datetime('now', '-3 hours'))").run(req.params.id, req.user.id)
  res.json({ entry: db.prepare('SELECT * FROM time_entries WHERE id = ?').get(result.lastInsertRowid) })
})

router.post('/:id/time/stop', (req, res) => {
  const active = db.prepare('SELECT * FROM time_entries WHERE task_id = ? AND user_id = ? AND ended_at IS NULL').get(req.params.id, req.user.id)
  if (!active) return res.status(400).json({ error: 'Nenhum timer ativo' })
  const duration = Math.floor((Date.now() - new Date(active.started_at + '-03:00').getTime()) / 1000)
  db.prepare("UPDATE time_entries SET ended_at = datetime('now', '-3 hours'), duration_seconds = ?, description = ? WHERE id = ?").run(Math.max(0, duration), req.body.description || null, active.id)
  res.json({ entry: db.prepare('SELECT * FROM time_entries WHERE id = ?').get(active.id) })
})

// Bulk operations
router.post('/bulk/stage', requireRole('dono'), (req, res) => {
  const { task_ids, stage } = req.body
  if (!task_ids?.length || !stage) return res.status(400).json({ error: 'task_ids and stage required' })
  const stmtUpdate = db.prepare("UPDATE tasks SET stage = ?, updated_at = datetime('now', '-3 hours') WHERE id = ?")
  const stmtHistory = db.prepare('INSERT INTO task_history (task_id, from_stage, to_stage, user_id) VALUES (?, (SELECT stage FROM tasks WHERE id = ?), ?, ?)')
  const transaction = db.transaction(() => { for (const id of task_ids) { stmtHistory.run(id, id, stage, req.user.id); stmtUpdate.run(stage, id) } })
  transaction()
  res.json({ ok: true, count: task_ids.length })
})

router.post('/bulk/assign', requireRole('dono'), (req, res) => {
  const { task_ids, assigned_to } = req.body
  if (!task_ids?.length) return res.status(400).json({ error: 'task_ids required' })
  const stmt = db.prepare("UPDATE tasks SET assigned_to = ?, updated_at = datetime('now', '-3 hours') WHERE id = ?")
  const transaction = db.transaction(() => { for (const id of task_ids) stmt.run(assigned_to || null, id) })
  transaction()
  res.json({ ok: true, count: task_ids.length })
})

// CSV export
router.get('/export', requireRole('dono'), (req, res) => {
  const { client_id, stage, department_id, date_from, date_to } = req.query
  const where = ['t.is_active = 1']; const params = []
  if (client_id) { where.push('t.client_id = ?'); params.push(client_id) }
  if (stage) { where.push('t.stage = ?'); params.push(stage) }
  if (department_id) { where.push('t.department_id = ?'); params.push(department_id) }
  if (date_from) { where.push('t.created_at >= ?'); params.push(date_from) }
  if (date_to) { where.push('t.created_at <= ?'); params.push(date_to + ' 23:59:59') }

  const tasks = db.prepare(`
    SELECT t.title, c.name as cliente, ps.name as etapa, d.name as departamento, u.name as responsavel,
      cat.name as categoria, t.priority as prioridade, t.due_date as prazo, t.created_at as criado, t.updated_at as atualizado
    FROM tasks t LEFT JOIN clients c ON t.client_id = c.id LEFT JOIN pipeline_stages ps ON t.stage = ps.slug
    LEFT JOIN departments d ON t.department_id = d.id LEFT JOIN users u ON t.assigned_to = u.id
    LEFT JOIN task_categories cat ON t.category_id = cat.id
    WHERE ${where.join(' AND ')} ORDER BY t.created_at DESC
  `).all(...params)

  const header = 'Titulo,Cliente,Etapa,Departamento,Responsavel,Categoria,Prioridade,Prazo,Criado,Atualizado'
  const rows = tasks.map(t => [t.title, t.cliente, t.etapa, t.departamento, t.responsavel, t.categoria, t.prioridade, t.prazo, t.criado, t.atualizado].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename=tarefas-${new Date().toISOString().slice(0, 10)}.csv`)
  res.send('\uFEFF' + [header, ...rows].join('\n'))
})

export default router
