import { useState, useEffect } from 'react'
import { fetchTemplates, createTemplate, updateTemplate, deleteTemplate, fetchServices, fetchDepartments, type TaskTemplate, type Service, type Department, type TemplateSubtask } from '../lib/api'
import { Layers, Plus, Edit3, Trash2, Save, X, GripVertical } from 'lucide-react'

export default function Templates() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', service_id: '' as string | number, color: '#FFB300', subtasks: [] as TemplateSubtask[] })

  const load = async () => {
    setLoading(true)
    const [t, s, d] = await Promise.all([fetchTemplates().catch(() => []), fetchServices().catch(() => []), fetchDepartments().catch(() => [])])
    setTemplates(t as TaskTemplate[]); setServices(s as Service[]); setDepartments(d as Department[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const reset = () => { setForm({ name: '', service_id: '', color: '#FFB300', subtasks: [] }); setEditId(null); setShowForm(false) }

  const handleSave = async () => {
    if (!form.name || form.subtasks.length === 0) { alert('Preencha o nome e adicione ao menos 1 subtarefa'); return }
    if (form.subtasks.some(s => !s.name)) { alert('Todas as subtarefas precisam ter nome'); return }
    const data = { name: form.name, service_id: form.service_id ? +form.service_id : null, color: form.color, subtasks: form.subtasks }
    if (editId) await updateTemplate(editId, data)
    else await createTemplate(data)
    reset(); load()
  }

  const startEdit = (t: TaskTemplate) => {
    setForm({ name: t.name, service_id: t.service_id || '', color: t.color, subtasks: t.subtasks || [] })
    setEditId(t.id); setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Remover este template? Tarefas ja criadas nao serao afetadas.')) return
    await deleteTemplate(id); load()
  }

  const addSubtask = () => setForm(p => ({ ...p, subtasks: [...p.subtasks, { name: '', department_id: null }] }))
  const updateSubtask = (i: number, key: string, val: any) => setForm(p => ({ ...p, subtasks: p.subtasks.map((s, idx) => idx === i ? { ...s, [key]: val } : s) }))
  const removeSubtask = (i: number) => setForm(p => ({ ...p, subtasks: p.subtasks.filter((_, idx) => idx !== i) }))
  const moveSubtask = (i: number, dir: 'up' | 'down') => {
    const next = [...form.subtasks]
    const target = dir === 'up' ? i - 1 : i + 1
    if (target < 0 || target >= next.length) return
    ;[next[i], next[target]] = [next[target], next[i]]
    setForm(p => ({ ...p, subtasks: next }))
  }

  return (
    <div>
      <div className="page-header">
        <h1><Layers size={22} style={{ marginRight: 8 }} /> Templates de Tarefas</h1>
        <button className="btn btn-primary btn-sm" onClick={() => { reset(); setShowForm(true) }}><Plus size={14} /> Novo Template</button>
      </div>

      {loading ? <div className="loading-container"><div className="spinner" /></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {templates.length === 0 && <div className="empty-state"><h3>Nenhum template</h3><p style={{ color: '#9B96B0', fontSize: 13 }}>Crie templates pra gerar tarefas em lote (ex: linha editorial com 8 posts)</p></div>}
          {templates.map(t => (
            <div key={t.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</div>
                    {t.service_name && <div style={{ fontSize: 11, color: '#9B96B0', marginTop: 2 }}>Servico: <span style={{ color: t.service_color }}>{t.service_name}</span></div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => startEdit(t)}><Edit3 size={12} /> Editar</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(t.id)} style={{ color: '#FF6B6B' }}><Trash2 size={12} /></button>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 26 }}>
                {t.subtasks.map((s, i) => {
                  const dept = departments.find(d => d.id === s.department_id)
                  return (
                    <span key={i} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', color: '#A8A3B8', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#6B6580', fontFamily: 'monospace' }}>{i + 1}.</span>
                      {s.name}
                      {dept && <span style={{ color: dept.color, fontWeight: 600 }}>· {dept.name}</span>}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={reset}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <h2>{editId ? 'Editar Template' : 'Novo Template'}</h2>
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}><label>Nome do Template</label><input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Post Linha Editorial, Video Reels..." /></div>
              <div className="form-group" style={{ flex: 0, minWidth: 60 }}><label>Cor</label><input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} style={{ width: 50, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} /></div>
            </div>
            <div className="form-group">
              <label>Servico (opcional)</label>
              <select className="select" value={form.service_id} onChange={e => setForm(p => ({ ...p, service_id: e.target.value }))}>
                <option value="">Sem servico vinculado</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontWeight: 700, fontSize: 13 }}>Subtarefas (etapas)</label>
                <button className="btn btn-secondary btn-sm" onClick={addSubtask}><Plus size={12} /> Adicionar</button>
              </div>
              {form.subtasks.length === 0 && <p style={{ fontSize: 12, color: '#6B6580', padding: '8px 0' }}>Nenhuma subtarefa. Clique em "Adicionar" para criar as etapas (ex: Ideia, Copy, Roteiro, Captacao, Edicao).</p>}
              {form.subtasks.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button onClick={() => moveSubtask(i, 'up')} disabled={i === 0} style={{ background: 'transparent', border: 'none', color: '#6B6580', cursor: 'pointer', padding: 0, fontSize: 10 }}>▲</button>
                    <button onClick={() => moveSubtask(i, 'down')} disabled={i === form.subtasks.length - 1} style={{ background: 'transparent', border: 'none', color: '#6B6580', cursor: 'pointer', padding: 0, fontSize: 10 }}>▼</button>
                  </div>
                  <span style={{ color: '#6B6580', fontSize: 12, fontFamily: 'monospace', minWidth: 20 }}>{i + 1}.</span>
                  <input className="input" style={{ flex: 2, padding: '6px 10px', fontSize: 12 }} value={s.name} onChange={e => updateSubtask(i, 'name', e.target.value)} placeholder="Nome da etapa" />
                  <select className="select" style={{ flex: 1, padding: '6px 10px', fontSize: 12 }} value={s.department_id || ''} onChange={e => updateSubtask(i, 'department_id', e.target.value ? +e.target.value : null)}>
                    <option value="">Sem dept.</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <button onClick={() => removeSubtask(i)} style={{ background: 'transparent', border: 'none', color: '#FF6B6B', cursor: 'pointer', padding: 4 }}><Trash2 size={12} /></button>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={reset}><X size={12} /> Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave}><Save size={12} /> {editId ? 'Salvar' : 'Criar Template'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
