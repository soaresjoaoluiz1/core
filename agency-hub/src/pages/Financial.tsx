import { useState, useEffect } from 'react'
import { fetchFinancialOverview, fetchFinancialDashboard, recordPayment, formatBRL, type FinancialClient, type FinancialOverview, type MonthlyRevenue } from '../lib/api'
import { DollarSign, AlertTriangle, CheckCircle, Clock, TrendingUp, Calendar } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function currentMonth() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#130A24', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: '#9B96B0', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => <p key={p.name} style={{ color: '#FFB300', fontWeight: 700 }}>{formatBRL(p.value)}</p>)}
    </div>
  )
}

export default function Financial() {
  const [month, setMonth] = useState(currentMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  const [overview, setOverview] = useState<FinancialOverview | null>(null)
  const [dashboard, setDashboard] = useState<MonthlyRevenue[]>([])
  const [loading, setLoading] = useState(true)
  const [payModal, setPayModal] = useState<FinancialClient | null>(null)
  const [payDate, setPayDate] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const [ov, dash] = await Promise.all([
      fetchFinancialOverview(month).catch(() => null),
      fetchFinancialDashboard(year).catch(() => ({ months: [] }))
    ])
    setOverview(ov)
    setDashboard(dash?.months || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [month, year])

  const handlePay = async () => {
    if (!payModal || !payDate || !payAmount) return
    setSaving(true)
    await recordPayment({ client_id: payModal.id, amount: parseFloat(payAmount), reference_month: month, paid_at: payDate })
    setSaving(false)
    setPayModal(null)
    load()
  }

  const openPayModal = (c: FinancialClient) => {
    const today = new Date()
    setPayDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`)
    setPayAmount(String(c.total_due))
    setPayModal(c)
  }

  const s = overview?.summary
  const chartData = dashboard.map(d => ({ name: MONTH_NAMES[parseInt(d.month.split('-')[1]) - 1], Receita: d.total }))

  // Generate month options (12 months back + 2 forward)
  const monthOptions: string[] = []
  const now = new Date()
  for (let i = -12; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    monthOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const formatMonth = (m: string) => {
    const [y, mo] = m.split('-')
    return `${MONTH_NAMES[parseInt(mo) - 1]} ${y}`
  }

  if (loading && !overview) return <div className="loading-container"><div className="spinner" /><span>Carregando financeiro...</span></div>

  return (
    <div>
      <div className="page-header">
        <h1><DollarSign size={22} style={{ marginRight: 8 }} /> Financeiro</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="select" style={{ width: 160 }} value={month} onChange={e => setMonth(e.target.value)}>
            {monthOptions.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      {s && (
        <div className="metrics-grid" style={{ marginBottom: 20 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#6B6580', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Previsto</div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-heading)' }}>{formatBRL(s.expected)}</div>
          </div>
          <div className="card" style={{ textAlign: 'center', borderColor: 'rgba(52,199,89,0.2)' }}>
            <div style={{ fontSize: 11, color: '#34C759', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Recebido</div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#34C759' }}>{formatBRL(s.received)}</div>
          </div>
          <div className="card" style={{ textAlign: 'center', borderColor: 'rgba(251,188,4,0.2)' }}>
            <div style={{ fontSize: 11, color: '#FBBC04', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Pendente</div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#FBBC04' }}>{formatBRL(s.pending)}</div>
          </div>
          <div className="card" style={{ textAlign: 'center', borderColor: 'rgba(255,107,107,0.2)' }}>
            <div style={{ fontSize: 11, color: '#FF6B6B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Atrasado ({s.lateCount})</div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#FF6B6B' }}>{formatBRL(s.late)}</div>
          </div>
        </div>
      )}

      {/* Revenue Chart */}
      <section className="dash-section" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="section-title" style={{ margin: 0 }}>Receita Mensal</div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setYear(y => y - 1)}>&larr;</button>
            <span style={{ padding: '4px 12px', fontSize: 13, color: '#A8A3B8' }}>{year}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setYear(y => y + 1)}>&rarr;</button>
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fill: '#6B6580', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6B6580', fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="Receita" fill="#FFB300" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Client Table */}
      <section className="dash-section">
        <div className="section-title">Clientes — {formatMonth(month)}</div>
        <div className="table-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="campaign-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th className="right">Mensalidade</th>
                  <th className="right">Dia Venc.</th>
                  <th>Status</th>
                  <th className="right">Atraso</th>
                  <th className="right">Multa</th>
                  <th className="right">Total Devido</th>
                  <th className="right">Pago em</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {overview?.clients.filter(c => c.monthly_fee > 0).map(c => (
                  <tr key={c.id} style={{ background: c.status === 'late' ? 'rgba(255,107,107,0.03)' : undefined }}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td className="right">{formatBRL(c.monthly_fee)}</td>
                    <td className="right">{c.payment_day}</td>
                    <td>
                      {c.status === 'paid' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, background: 'rgba(52,199,89,0.12)', color: '#34C759', fontSize: 11, fontWeight: 700 }}><CheckCircle size={10} /> Pago</span>}
                      {c.status === 'pending' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, background: 'rgba(251,188,4,0.12)', color: '#FBBC04', fontSize: 11, fontWeight: 700 }}><Clock size={10} /> Pendente</span>}
                      {c.status === 'late' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, background: 'rgba(255,107,107,0.12)', color: '#FF6B6B', fontSize: 11, fontWeight: 700 }}><AlertTriangle size={10} /> Atrasado</span>}
                    </td>
                    <td className="right" style={{ color: c.days_late > 0 ? '#FF6B6B' : '#6B6580' }}>{c.days_late > 0 ? `${c.days_late} dias` : '-'}</td>
                    <td className="right" style={{ color: c.penalty > 0 ? '#FF6B6B' : '#6B6580' }}>{c.penalty > 0 ? formatBRL(c.penalty) : '-'}</td>
                    <td className="right" style={{ fontWeight: 700, color: c.status === 'late' ? '#FF6B6B' : '#A8A3B8' }}>{formatBRL(c.total_due)}</td>
                    <td className="right" style={{ color: '#6B6580', fontSize: 12 }}>{c.paid_at || '-'}</td>
                    <td className="right">
                      {c.status !== 'paid' ? (
                        <button className="btn btn-primary btn-sm" onClick={() => openPayModal(c)} style={{ fontSize: 11, padding: '4px 10px' }}>Marcar Pago</button>
                      ) : (
                        <span style={{ fontSize: 11, color: '#34C759' }}>&#10003;</span>
                      )}
                    </td>
                  </tr>
                ))}
                {overview?.clients.filter(c => c.monthly_fee > 0).length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: '#6B6580', padding: 32 }}>Nenhum cliente com mensalidade cadastrada. Configure no cadastro de cada cliente.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pay Modal */}
      {payModal && (
        <div className="modal-overlay" onClick={() => setPayModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h2>Registrar Pagamento</h2>
            <p style={{ color: '#9B96B0', fontSize: 13, marginBottom: 16 }}>{payModal.name} — {formatMonth(month)}</p>
            <div className="form-group">
              <label>Valor Pago (R$)</label>
              <input className="input" type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Data do Pagamento</label>
              <input className="input" type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
            </div>
            {payModal.penalty > 0 && (
              <div style={{ padding: '8px 12px', background: 'rgba(255,107,107,0.08)', borderRadius: 8, fontSize: 12, color: '#FF6B6B', marginBottom: 12 }}>
                <AlertTriangle size={12} style={{ marginRight: 4 }} /> Multa: {formatBRL(payModal.penalty)} ({payModal.days_late} dias de atraso)
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setPayModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handlePay} disabled={saving}>{saving ? 'Salvando...' : 'Confirmar Pagamento'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
