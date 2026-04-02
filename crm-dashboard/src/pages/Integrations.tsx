import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAccount } from '../context/AccountContext'
import { fetchWhatsAppInstances, createWhatsAppInstance, testWhatsAppConnection, type WhatsAppInstance } from '../lib/api'
import { Plug, Plus, Wifi, WifiOff, RefreshCw } from 'lucide-react'

export default function Integrations() {
  const { user } = useAuth()
  const { accountId } = useAccount()
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newInst, setNewInst] = useState({ instance_name: '', api_url: '', api_key: '' })
  const [testing, setTesting] = useState<number | null>(null)

  const load = () => { if (accountId) { setLoading(true); fetchWhatsAppInstances(accountId).then(setInstances).finally(() => setLoading(false)) } }
  useEffect(load, [accountId])

  const handleCreate = async () => {
    if (!accountId || !newInst.instance_name || !newInst.api_url || !newInst.api_key) return
    await createWhatsAppInstance(accountId, newInst)
    setShowNew(false); setNewInst({ instance_name: '', api_url: '', api_key: '' }); load()
  }

  const handleTest = async (inst: WhatsAppInstance) => {
    if (!accountId) return
    setTesting(inst.id)
    try {
      const result = await testWhatsAppConnection(inst.id, accountId)
      alert(result.success ? 'Conectado com sucesso!' : `Falha na conexao: ${result.status}`)
    } catch (e: any) { alert('Erro: ' + e.message) }
    setTesting(null); load()
  }

  return (
    <div>
      <div className="page-header">
        <h1><Plug size={20} style={{ marginRight: 8 }} />Integracoes</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}><Plus size={14} /> Nova Instancia WhatsApp</button>
      </div>

      <section className="dash-section">
        <div className="section-title">WhatsApp (Evolution API)</div>
        {loading ? <div className="loading-container"><div className="spinner" /></div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {instances.map(inst => (
              <div key={inst.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{inst.instance_name}</div>
                  <div style={{ fontSize: 12, color: '#9B96B0' }}>{inst.api_url}</div>
                  {inst.phone_number && <div style={{ fontSize: 12, color: '#9B96B0' }}>Tel: {inst.phone_number}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: inst.status === 'connected' ? '#34C759' : '#FF6B6B' }}>
                    {inst.status === 'connected' ? <Wifi size={14} /> : <WifiOff size={14} />}
                    {inst.status === 'connected' ? 'Conectado' : 'Desconectado'}
                  </span>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleTest(inst)} disabled={testing === inst.id}>
                    <RefreshCw size={12} className={testing === inst.id ? 'spinning' : ''} /> Testar
                  </button>
                </div>
              </div>
            ))}
            {instances.length === 0 && <div className="empty-state" style={{ minHeight: 150 }}><h3>Nenhuma instancia WhatsApp</h3><p>Configure a integracao com a Evolution API para receber leads via WhatsApp.</p></div>}
          </div>
        )}
      </section>

      <section className="dash-section">
        <div className="section-title">Webhook URLs</div>
        <div className="card">
          <p style={{ fontSize: 12, color: '#9B96B0', marginBottom: 12 }}>Use estes URLs pra configurar os webhooks:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
            <div><strong>Evolution API:</strong> <code style={{ background: '#0A0118', padding: '2px 8px', borderRadius: 4 }}>http://seu-servidor:3002/api/webhooks/evolution/{'{slug}'}</code></div>
            <div><strong>Meta Lead Forms:</strong> <code style={{ background: '#0A0118', padding: '2px 8px', borderRadius: 4 }}>http://seu-servidor:3002/api/webhooks/meta-leads/{'{slug}'}</code></div>
            <div><strong>Website:</strong> <code style={{ background: '#0A0118', padding: '2px 8px', borderRadius: 4 }}>http://seu-servidor:3002/api/webhooks/site/{'{slug}'}</code></div>
          </div>
        </div>
      </section>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Nova Instancia WhatsApp</h2>
            <div className="form-group"><label>Nome da Instancia</label><input className="input" value={newInst.instance_name} onChange={e => setNewInst(p => ({ ...p, instance_name: e.target.value }))} placeholder="ex: minha-instancia" /></div>
            <div className="form-group"><label>URL da API Evolution</label><input className="input" value={newInst.api_url} onChange={e => setNewInst(p => ({ ...p, api_url: e.target.value }))} placeholder="https://evo.exemplo.com.br" /></div>
            <div className="form-group"><label>API Key</label><input className="input" value={newInst.api_key} onChange={e => setNewInst(p => ({ ...p, api_key: e.target.value }))} placeholder="sua-api-key" /></div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreate}>Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
