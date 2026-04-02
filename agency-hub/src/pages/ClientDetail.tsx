import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchClient, updateClient, fetchClientCredentials, createClientCredential, updateClientCredential, deleteClientCredential, type Client, type ClientCredential } from '../lib/api'
import { ArrowLeft, Building2, ExternalLink, Plus, Edit3, Save, X, Trash2, Eye, EyeOff, Key } from 'lucide-react'

const PLATFORMS = ['Facebook', 'Instagram', 'Google Ads', 'Google Analytics', 'Google Meu Negocio', 'Meta Business', 'TikTok', 'LinkedIn', 'YouTube', 'Twitter/X', 'Pinterest', 'Kiwify', 'Hotmart', 'RD Station', 'Outro']

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [credentials, setCredentials] = useState<ClientCredential[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<any>({})
  const [activeTab, setActiveTab] = useState<'info' | 'credentials'>('info')
  const [showNewCred, setShowNewCred] = useState(false)
  const [newCred, setNewCred] = useState({ platform: '', login: '', password: '', observation: '' })
  const [showPasswords, setShowPasswords] = useState<Set<number>>(new Set())
  const [editCredId, setEditCredId] = useState<number | null>(null)
  const [editCredData, setEditCredData] = useState<any>({})

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await fetchClient(+id)
      setClient(data.client); setCredentials((data as any).credentials || [])
      setEditData({ name: data.client.name, contact_name: data.client.contact_name || '', contact_email: data.client.contact_email || '', contact_phone: (data.client as any).contact_phone || '', drive_folder: (data.client as any).drive_folder || '' })
    } catch {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [id])

  const handleSave = async () => { if (id) { await updateClient(+id, editData); setEditing(false); load() } }

  const handleCreateCred = async () => {
    if (!id || !newCred.platform || !newCred.login || !newCred.password) return
    await createClientCredential(+id, newCred)
    setShowNewCred(false); setNewCred({ platform: '', login: '', password: '', observation: '' }); load()
  }

  const handleSaveCred = async () => {
    if (!id || !editCredId) return
    await updateClientCredential(+id, editCredId, editCredData)
    setEditCredId(null); load()
  }

  const handleDeleteCred = async (credId: number) => {
    if (!id || !confirm('Remover este acesso?')) return
    await deleteClientCredential(+id, credId); load()
  }

  const togglePass = (credId: number) => setShowPasswords(prev => { const n = new Set(prev); n.has(credId) ? n.delete(credId) : n.add(credId); return n })

  if (loading) return <div className="loading-container"><div className="spinner" /></div>
  if (!client) return <div className="empty-state"><h3>Cliente nao encontrado</h3></div>

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-icon" onClick={() => navigate('/clients')}><ArrowLeft size={16} /></button>
          <h1><Building2 size={22} style={{ marginRight: 8 }} />{client.name}</h1>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className={`btn btn-sm ${activeTab === 'info' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('info')}>Dados</button>
          <button className={`btn btn-sm ${activeTab === 'credentials' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('credentials')}><Key size={12} /> Acessos ({credentials.length})</button>
        </div>
      </div>

      {/* Info tab */}
      {activeTab === 'info' && (
        <div className="card">
          {!editing ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}><button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}><Edit3 size={12} /> Editar</button></div>
              <div className="lead-info">
                <div className="lead-info-row"><span className="lead-info-label">Nome</span><span className="lead-info-value">{client.name}</span></div>
                <div className="lead-info-row"><span className="lead-info-label">Contato</span><span className="lead-info-value">{client.contact_name || '-'}</span></div>
                <div className="lead-info-row"><span className="lead-info-label">Email</span><span className="lead-info-value">{client.contact_email || '-'}</span></div>
                <div className="lead-info-row"><span className="lead-info-label">Telefone</span><span className="lead-info-value">{(client as any).contact_phone || '-'}</span></div>
                <div className="lead-info-row"><span className="lead-info-label">Pasta do Drive</span><span className="lead-info-value">
                  {(client as any).drive_folder ? <a href={(client as any).drive_folder} target="_blank" rel="noopener noreferrer" style={{ color: '#5DADE2', display: 'flex', alignItems: 'center', gap: 4 }}><ExternalLink size={12} /> Abrir Pasta</a> : '-'}
                </span></div>
              </div>
            </>
          ) : (
            <>
              <div className="form-group"><label>Nome</label><input className="input" value={editData.name} onChange={e => setEditData((p: any) => ({ ...p, name: e.target.value }))} /></div>
              <div className="form-row">
                <div className="form-group"><label>Nome do Contato</label><input className="input" value={editData.contact_name} onChange={e => setEditData((p: any) => ({ ...p, contact_name: e.target.value }))} /></div>
                <div className="form-group"><label>Email</label><input className="input" value={editData.contact_email} onChange={e => setEditData((p: any) => ({ ...p, contact_email: e.target.value }))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Telefone</label><input className="input" value={editData.contact_phone} onChange={e => setEditData((p: any) => ({ ...p, contact_phone: e.target.value }))} /></div>
                <div className="form-group"><label>Pasta do Drive</label><input className="input" value={editData.drive_folder} onChange={e => setEditData((p: any) => ({ ...p, drive_folder: e.target.value }))} placeholder="https://drive.google.com/drive/folders/..." /></div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                <button className="btn btn-primary btn-sm" onClick={handleSave}><Save size={12} /> Salvar</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}><X size={12} /> Cancelar</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Credentials tab */}
      {activeTab === 'credentials' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewCred(true)}><Plus size={14} /> Novo Acesso</button>
          </div>

          {credentials.length === 0 ? (
            <div className="empty-state" style={{ minHeight: 200 }}><h3>Nenhum acesso cadastrado</h3></div>
          ) : (
            <div className="table-card">
              <table>
                <thead><tr><th>Plataforma</th><th>Login</th><th>Senha</th><th>Observacao</th><th className="right">Acoes</th></tr></thead>
                <tbody>
                  {credentials.map(cred => editCredId === cred.id ? (
                    <tr key={cred.id}>
                      <td><select className="select" value={editCredData.platform} onChange={e => setEditCredData((p: any) => ({ ...p, platform: e.target.value }))} style={{ padding: '4px 8px' }}>{PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}</select></td>
                      <td><input className="input" value={editCredData.login} onChange={e => setEditCredData((p: any) => ({ ...p, login: e.target.value }))} style={{ padding: '4px 8px' }} /></td>
                      <td><input className="input" value={editCredData.password} onChange={e => setEditCredData((p: any) => ({ ...p, password: e.target.value }))} style={{ padding: '4px 8px' }} /></td>
                      <td><input className="input" value={editCredData.observation || ''} onChange={e => setEditCredData((p: any) => ({ ...p, observation: e.target.value }))} style={{ padding: '4px 8px' }} /></td>
                      <td className="right" style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary btn-sm btn-icon" onClick={handleSaveCred}><Save size={12} /></button>
                        <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setEditCredId(null)}><X size={12} /></button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={cred.id}>
                      <td className="name">{cred.platform}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{cred.login}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {showPasswords.has(cred.id) ? cred.password : '••••••••'}
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6580', padding: 2 }} onClick={() => togglePass(cred.id)}>
                            {showPasswords.has(cred.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </span>
                      </td>
                      <td style={{ color: '#6B6580', fontSize: 12 }}>{cred.observation || '-'}</td>
                      <td className="right" style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm btn-icon" onClick={() => { setEditCredId(cred.id); setEditCredData({ ...cred }) }}><Edit3 size={12} /></button>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDeleteCred(cred.id)}><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* New credential modal */}
          {showNewCred && (
            <div className="modal-overlay" onClick={() => setShowNewCred(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <h2>Novo Acesso</h2>
                <div className="form-group"><label>Plataforma *</label>
                  <select className="select" value={newCred.platform} onChange={e => setNewCred(p => ({ ...p, platform: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Login *</label><input className="input" value={newCred.login} onChange={e => setNewCred(p => ({ ...p, login: e.target.value }))} placeholder="email@exemplo.com" /></div>
                  <div className="form-group"><label>Senha *</label><input className="input" value={newCred.password} onChange={e => setNewCred(p => ({ ...p, password: e.target.value }))} /></div>
                </div>
                <div className="form-group"><label>Observacao</label><input className="input" value={newCred.observation} onChange={e => setNewCred(p => ({ ...p, observation: e.target.value }))} placeholder="Ex: conta principal, conta de backup..." /></div>
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setShowNewCred(false)}>Cancelar</button>
                  <button className="btn btn-primary" onClick={handleCreateCred}>Criar Acesso</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
