import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSSE } from '../context/SSEContext'
import { apiFetch } from '../lib/api'
import {
  LayoutDashboard, Kanban, ListTodo, CheckCircle, Building2, UsersRound,
  Layers, Tag, Briefcase, Settings, LogOut, Menu, X,
} from 'lucide-react'
import NotificationBell from './NotificationBell'

export default function Sidebar() {
  const { user, logout } = useAuth()
  const [approvalCount, setApprovalCount] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  if (!user) return null

  const isDono = user.role === 'dono'
  const isFunc = user.role === 'funcionario'
  const isCliente = user.role === 'cliente'
  const close = () => setMobileOpen(false)

  const [overdueCount, setOverdueCount] = useState(0)

  useEffect(() => {
    if (isDono) {
      apiFetch('/api/approvals/internal').then((d: any) => setApprovalCount(d.tasks?.length || 0)).catch(() => {})
      apiFetch('/api/dashboard/stats?days=1').then((d: any) => setOverdueCount(d.overdue || 0)).catch(() => {})
    } else if (isCliente) apiFetch('/api/approvals/client').then((d: any) => setApprovalCount(d.tasks?.length || 0)).catch(() => {})
  }, [isDono, isCliente])

  useSSE('task:stage_changed', () => {
    if (isDono) apiFetch('/api/approvals/internal').then((d: any) => setApprovalCount(d.tasks?.length || 0)).catch(() => {})
    else if (isCliente) apiFetch('/api/approvals/client').then((d: any) => setApprovalCount(d.tasks?.length || 0)).catch(() => {})
  })

  return (
    <>
      <button className="hamburger-btn" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
      {mobileOpen && <div className="sidebar-overlay" onClick={close} />}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div><img src="https://drosagencia.com.br/wp-content/uploads/2025/12/DROS-LOGO-1-1024x1024.png" alt="Dros" className="sidebar-logo" /><div className="sidebar-subtitle">HUB</div></div>
              <NotificationBell />
            </div>
            <button className="sidebar-close-btn" onClick={close}><X size={18} /></button>
          </div>
        </div>
        <nav className="sidebar-nav">
          {isDono && <div className="nav-section">Gestao</div>}
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={close}>
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>
          {(isDono || isFunc) && (
            <NavLink to="/pipeline" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={close}>
              <Kanban size={16} /> Pipeline
            </NavLink>
          )}
          <NavLink to="/tasks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={close}>
            <ListTodo size={16} /> {isCliente ? 'Minhas Tarefas' : 'Tarefas'}
            {overdueCount > 0 && isDono && <span className="nav-badge" style={{ background: '#FF6B6B' }}>{overdueCount}</span>}
          </NavLink>
          {(isDono || isCliente) && (
            <NavLink to="/approvals" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={close}>
              <CheckCircle size={16} /> Aprovacoes
              {approvalCount > 0 && <span className="nav-badge">{approvalCount}</span>}
            </NavLink>
          )}
          {isDono && (
            <>
              <div className="nav-section">Administracao</div>
              <NavLink to="/clients" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={close}><Building2 size={16} /> Clientes</NavLink>
              <NavLink to="/team" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={close}><UsersRound size={16} /> Equipe</NavLink>
              <NavLink to="/departments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={close}><Layers size={16} /> Departamentos</NavLink>
              <NavLink to="/categories" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={close}><Tag size={16} /> Categorias</NavLink>
              <NavLink to="/services" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={close}><Briefcase size={16} /> Servicos</NavLink>
              <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={close}><Settings size={16} /> Configuracoes</NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <div><div className="sidebar-user">{user.name}</div><div className="sidebar-role">{user.role === 'dono' ? 'CEO' : user.role === 'funcionario' ? 'Funcionario' : 'Cliente'}</div></div>
          <button className="logout-btn" onClick={logout} title="Sair"><LogOut size={16} /></button>
        </div>
      </aside>
    </>
  )
}
