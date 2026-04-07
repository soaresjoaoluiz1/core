import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSSE } from '../context/SSEContext'
import { fetchPipelineTasks, fetchClients, fetchDepartments, fetchUsers, fetchCategories, createTask, moveTaskStage, type Task, type PipelineStage, type Client, type Department, type User as UserT, type TaskCategory } from '../lib/api'
import { Clock, Building2, User, ExternalLink, ChevronDown, ChevronRight, ArrowRight, Search, AlertTriangle, Plus } from 'lucide-react'

function timeAgo(d: string) { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 60) return `${m}m`; const h = Math.floor(m / 60); if (h < 24) return `${h}h`; return `${Math.floor(h / 24)}d` }
function isOverdue(d: string | null) { return d ? new Date(d) < new Date() : false }
function useIsMobile() { const [m, setM] = useState(window.innerWidth <= 640); useEffect(() => { const h = () => setM(window.innerWidth <= 640); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h) }, []); return m }

const PRIORITY_COLORS: Record<string, string> = { low: '#6B6580', normal: '#5DADE2', high: '#FFAA83', urgent: '#FF6B6B' }

export default function Pipeline() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [filterClient, setFilterClient] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [draggedTask, setDraggedTask] = useState<number | null>(null)
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())
  const [moveTaskId, setMoveTaskId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [showNew, setShowNew] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', client_id: '', category_id: '', department_id: '', assigned_to: '', due_date: '', priority: 'normal', drive_link_raw: '' })
  const isDono = user?.role === 'dono'

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const filters: Record<string, any> = {}
      if (filterClient) filters.client_id = filterClient
      if (filterDept) filters.department_id = filterDept
      const data = await fetchPipelineTasks(filters)
      setStages(data.stages); setTasks(data.tasks)
      if (isMobile) setExpandedStages(new Set(data.stages.filter(s => data.tasks.some(t => t.stage === s.slug)).map(s => s.slug)))
    } catch {} finally { setLoading(false) }
  }, [filterClient, filterDept, isMobile])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { if (isDono || user?.role === 'funcionario') { fetchClients().then(setClients).catch(() => {}); fetchDepartments().then(setDepartments).catch(() => {}); fetchUsers().then(u => setUsers(u as any)).catch(() => {}); fetchCategories().then(setCategories).catch(() => {}) } }, [isDono, user?.role])
  const [allUsers, setUsers] = useState<UserT[]>([])

  useSSE('task:created', useCallback(() => loadData(), [loadData]))
  useSSE('task:stage_changed', useCallback(() => loadData(), [loadData]))

  const handleDrop = async (stageSlug: string) => {
    if (!draggedTask) return
    const task = tasks.find(t => t.id === draggedTask)
    if (!task || task.stage === stageSlug) return
    if ((stageSlug === 'aprovacao_interna' || stageSlug === 'aguardando_cliente') && !task.approval_link) {
      alert('Preencha o "Conteudo para Aprovacao" na tarefa antes de enviar pra aprovacao.\n\nAbra a tarefa, clique em Editar e preencha o link na secao dourada.')
      setDraggedTask(null); return
    }
    setTasks(prev => prev.map(t => t.id === draggedTask ? { ...t, stage: stageSlug } : t))
    setDraggedTask(null)
    try { await moveTaskStage(draggedTask, stageSlug) } catch { loadData() }
  }

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.client_id) return
    await createTask({ ...newTask, client_id: +newTask.client_id, category_id: newTask.category_id ? +newTask.category_id : undefined, department_id: newTask.department_id ? +newTask.department_id : undefined, assigned_to: newTask.assigned_to ? +newTask.assigned_to : undefined } as any)
    setShowNew(false); setNewTask({ title: '', description: '', client_id: '', category_id: '', department_id: '', assigned_to: '', due_date: '', priority: 'normal', drive_link_raw: '' }); loadData()
  }

  const handleMobileMove = async (taskId: number, stageSlug: string) => {
    const task = tasks.find(t => t.id === taskId)
    if ((stageSlug === 'aprovacao_interna' || stageSlug === 'aguardando_cliente') && task && !task.approval_link) {
      alert('Preencha o "Conteudo para Aprovacao" na tarefa antes de enviar pra aprovacao.\n\nAbra a tarefa, clique em Editar e preencha o link na secao dourada.')
      setMoveTaskId(null); return
    }
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, stage: stageSlug } : t))
    setMoveTaskId(null)
    try { await moveTaskStage(taskId, stageSlug) } catch { loadData() }
  }

  if (loading) return <div className="loading-container"><div className="spinner" /></div>

  // Mobile vertical
  if (isMobile) return (
    <div>
      <div className="page-header"><h1>Pipeline</h1></div>
      {stages.filter(s => !s.is_terminal || tasks.some(t => t.stage === s.slug)).map(stage => {
        const stageTasks = tasks.filter(t => t.stage === stage.slug)
        const expanded = expandedStages.has(stage.slug)
        return (
          <div key={stage.id} className="kanban-mobile-stage">
            <div className="kanban-mobile-stage-header" onClick={() => setExpandedStages(prev => { const n = new Set(prev); n.has(stage.slug) ? n.delete(stage.slug) : n.add(stage.slug); return n })}>
              <div className="kanban-mobile-stage-title"><span style={{ width: 10, height: 10, borderRadius: '50%', background: stage.color }} />{stage.name}<span style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 10, fontSize: 12, color: '#A8A3B8' }}>{stageTasks.length}</span></div>
              {expanded ? <ChevronDown size={16} style={{ color: '#6B6580' }} /> : <ChevronRight size={16} style={{ color: '#6B6580' }} />}
            </div>
            {expanded && <div className="kanban-mobile-cards">
              {stageTasks.map(task => (
                <div key={task.id} className="kanban-mobile-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div onClick={() => navigate(`/tasks/${task.id}`)} style={{ cursor: 'pointer', flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{task.title}</div>
                      <div style={{ fontSize: 11, color: '#A8A3B8', marginTop: 2 }}>{task.client_name}</div>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setMoveTaskId(task.id)}><ArrowRight size={12} /></button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 10, color: '#6B6580', flexWrap: 'wrap' }}>
                    {task.department_name && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: task.department_color }} />{task.department_name}</span>}
                    {task.assigned_name && <span><User size={9} /> {task.assigned_name}</span>}
                    {task.due_date && <span style={{ color: isOverdue(task.due_date) ? '#FF6B6B' : undefined }}><Clock size={9} /> {task.due_date.slice(0, 10)}</span>}
                  </div>
                </div>
              ))}
              {stageTasks.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#6B6580', fontSize: 12 }}>Vazio</div>}
            </div>}
          </div>
        )
      })}
      {moveTaskId && (
        <div className="modal-overlay" onClick={() => setMoveTaskId(null)}><div className="modal" onClick={e => e.stopPropagation()}>
          <h2>Mover tarefa</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stages.map(s => { const current = tasks.find(t => t.id === moveTaskId)?.stage === s.slug; return (
              <button key={s.id} className={`btn ${current ? 'btn-primary' : 'btn-secondary'}`} disabled={current} onClick={() => !current && handleMobileMove(moveTaskId, s.slug)} style={{ justifyContent: 'flex-start', minHeight: 44 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />{s.name}{current && ' (atual)'}
              </button>
            )})}
          </div>
        </div></div>
      )}
    </div>
  )

  // Desktop Kanban
  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1>Pipeline</h1>
          {(isDono || user?.role === 'funcionario') && <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}><Plus size={14} /> Nova Tarefa</button>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6B6580' }} />
            <input className="input" placeholder="Buscar tarefa..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: 32, width: 200 }} />
          </div>
          {isDono && <>
            <select className="select" style={{ width: 160 }} value={filterClient} onChange={e => setFilterClient(e.target.value)}><option value="">Todos clientes</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <select className="select" style={{ width: 160 }} value={filterDept} onChange={e => setFilterDept(e.target.value)}><option value="">Todos deptos</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          </>}
        </div>
      </div>
      <div className="kanban-board">
        {stages.filter(s => !s.is_terminal || tasks.some(t => t.stage === s.slug)).map(stage => {
          const searchLower = searchQuery.toLowerCase()
          const stageTasks = tasks.filter(t => t.stage === stage.slug && (!searchQuery || t.title.toLowerCase().includes(searchLower) || t.client_name?.toLowerCase().includes(searchLower) || t.assigned_name?.toLowerCase().includes(searchLower)))
          return (
            <div key={stage.id} className="kanban-column"
              onDragOver={e => { e.preventDefault(); e.currentTarget.querySelector('.kanban-cards')?.classList.add('drag-over') }}
              onDragLeave={e => e.currentTarget.querySelector('.kanban-cards')?.classList.remove('drag-over')}
              onDrop={e => { e.preventDefault(); e.currentTarget.querySelector('.kanban-cards')?.classList.remove('drag-over'); handleDrop(stage.slug) }}>
              <div className="kanban-column-header">
                <div className="kanban-column-title"><span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, display: 'inline-block' }} />{stage.name}</div>
                <span className="kanban-column-count">{stageTasks.length}</span>
              </div>
              <div className="kanban-cards">
                {stageTasks.map(task => (
                  <div key={task.id} className={`kanban-card ${draggedTask === task.id ? 'dragging' : ''}`}
                    draggable onDragStart={() => setDraggedTask(task.id)} onDragEnd={() => setDraggedTask(null)}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    style={{ borderLeft: `3px solid ${stage.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div className="kanban-card-name">{task.title}</div>
                      {task.priority === 'urgent' && <span style={{ fontSize: 9, background: '#FF6B6B20', color: '#FF6B6B', padding: '1px 6px', borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>URGENTE</span>}
                      {task.priority === 'high' && <span style={{ fontSize: 9, background: '#FFAA8320', color: '#FFAA83', padding: '1px 6px', borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>ALTA</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#A8A3B8', marginBottom: 4 }}>
                      <Building2 size={10} /> {task.client_name}
                    </div>
                    {task.department_name && <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#6B6580' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: task.department_color }} />{task.department_name}</div>}
                    <div className="kanban-card-meta">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {task.assigned_name && <span><User size={10} /> {task.assigned_name}</span>}
                        {/* Days in stage */}
                        {(() => { const days = Math.floor((Date.now() - new Date(task.updated_at).getTime()) / 86400000); return days > 0 ? <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: days > 7 ? '#FF6B6B15' : days > 3 ? '#FBBC0415' : 'rgba(255,255,255,0.04)', color: days > 7 ? '#FF6B6B' : days > 3 ? '#FBBC04' : '#6B6580' }}>{days}d</span> : null })()}
                      </div>
                      {task.due_date && <span style={{ color: isOverdue(task.due_date) ? '#FF6B6B' : '#6B6580', fontWeight: isOverdue(task.due_date) ? 700 : 400, display: 'flex', alignItems: 'center', gap: 3 }}>{isOverdue(task.due_date) && <AlertTriangle size={9} />}<Clock size={10} />{task.due_date.slice(5, 10)}</span>}
                    </div>
                    {task.drive_link && <div style={{ marginTop: 4 }}><ExternalLink size={10} style={{ color: '#5DADE2' }} /></div>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* New task modal */}
      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}><div className="modal" style={{ maxWidth: 550 }} onClick={e => e.stopPropagation()}>
          <h2>Nova Tarefa</h2>
          <div className="form-group"><label>Titulo *</label><input className="input" value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} /></div>
          <div className="form-group"><label>Descricao</label><textarea className="input" rows={2} value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} /></div>
          <div className="form-row">
            <div className="form-group"><label>Cliente *</label><select className="select" value={newTask.client_id} onChange={e => setNewTask(p => ({ ...p, client_id: e.target.value }))}><option value="">Selecione</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="form-group"><label>Categoria</label><select className="select" value={newTask.category_id} onChange={e => setNewTask(p => ({ ...p, category_id: e.target.value }))}><option value="">Nenhuma</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Departamento</label><select className="select" value={newTask.department_id} onChange={e => setNewTask(p => ({ ...p, department_id: e.target.value }))}><option value="">Nenhum</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            <div className="form-group"><label>Responsavel</label><select className="select" value={newTask.assigned_to} onChange={e => setNewTask(p => ({ ...p, assigned_to: e.target.value }))}><option value="">Ninguem</option>{allUsers.filter((u: any) => u.role !== 'cliente').map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Prazo</label><input className="input" type="date" value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))} /></div>
            <div className="form-group"><label>Prioridade</label><select className="select" value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))}><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></div>
          </div>
          <div className="form-group"><label>Link Drive (Arquivo Bruto)</label><input className="input" value={newTask.drive_link_raw} onChange={e => setNewTask(p => ({ ...p, drive_link_raw: e.target.value }))} placeholder="https://drive.google.com/..." /></div>
          <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancelar</button><button className="btn btn-primary" onClick={handleCreateTask}>Criar Tarefa</button></div>
        </div></div>
      )}
    </div>
  )
}
