const getToken = () => localStorage.getItem('dros_hub_token')
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export async function apiFetch<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const url = path.startsWith('/api') ? `${BASE}${path}` : path
  const res = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json', ...opts.headers } })
  if (res.status === 401) { localStorage.removeItem('dros_hub_token'); window.location.href = `${BASE}/login`; throw new Error('Unauthorized') }
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `API error: ${res.status}`) }
  return res.json()
}

export function formatNumber(n: number) { return n.toLocaleString('pt-BR') }

// Types
export interface Client { id: number; name: string; slug: string; logo_url: string | null; contact_name: string | null; contact_email: string | null; contact_phone?: string | null; drive_folder?: string | null; is_active: number; task_count?: number; user_count?: number }
export interface ClientCredential { id: number; client_id: number; platform: string; login: string; password: string; observation: string | null; created_at: string }
export interface TimeEntry { id: number; task_id: number; user_id: number; started_at: string; ended_at: string | null; duration_seconds: number; description: string | null; user_name: string }
export interface Department { id: number; name: string; color: string; is_active: number; employee_count?: number; task_count?: number }
export interface TaskCategory { id: number; name: string; color: string; is_active: number }
export interface PipelineStage { id: number; name: string; slug: string; position: number; color: string; is_terminal: number }
export interface User { id: number; client_id: number | null; name: string; email: string; role: string; is_active: number; client_name?: string; departments?: Department[] }

export interface Task {
  id: number; client_id: number; category_id: number | null; department_id: number | null
  stage: string; title: string; description: string | null; due_date: string | null
  priority: string; assigned_to: number | null; drive_link: string | null; drive_link_raw: string | null
  approval_link: string | null; approval_text: string | null; publish_date: string | null; publish_objective: string | null
  created_by: number; is_active: number; created_at: string; updated_at: string
  client_name?: string; department_name?: string; department_color?: string
  category_name?: string; category_color?: string; assigned_name?: string
  created_by_name?: string; comment_count?: number; stage_name?: string; stage_color?: string
}

export interface TaskComment { id: number; task_id: number; user_id: number; content: string; is_internal: number; created_at: string; user_name: string; user_role: string }
export interface TaskHistory { id: number; task_id: number; from_stage: string | null; to_stage: string; user_id: number; comment: string | null; created_at: string; user_name: string; from_stage_name?: string; to_stage_name?: string }
export interface TaskAttachment { id: number; task_id: number; url: string; filename: string; type: string; uploaded_by_name?: string; created_at: string }

// API Functions
export const fetchClients = () => apiFetch<{ clients: Client[] }>('/api/clients').then(d => d.clients)
export const createClient = (data: Partial<Client>) => apiFetch<{ client: Client }>('/api/clients', { method: 'POST', body: JSON.stringify(data) }).then(d => d.client)
export const fetchClient = (id: number) => apiFetch<{ client: Client; users: User[]; tasksByStage: any[] }>(`/api/clients/${id}`)
export const updateClient = (id: number, data: Partial<Client>) => apiFetch(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const fetchDepartments = () => apiFetch<{ departments: Department[] }>('/api/departments').then(d => d.departments)
export const createDepartment = (name: string, color: string) => apiFetch<{ department: Department }>('/api/departments', { method: 'POST', body: JSON.stringify({ name, color }) }).then(d => d.department)
export const updateDepartment = (id: number, data: Partial<Department>) => apiFetch(`/api/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const fetchUsers = (filters?: Record<string, string>) => {
  const params = filters ? '?' + new URLSearchParams(filters).toString() : ''
  return apiFetch<{ users: User[] }>(`/api/users${params}`).then(d => d.users)
}
export const createUser = (data: { name: string; email: string; password: string; role: string; client_id?: number }) => apiFetch<{ user: User }>('/api/users', { method: 'POST', body: JSON.stringify(data) }).then(d => d.user)
export const updateUser = (id: number, data: any) => apiFetch(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const updateUserDepartments = (id: number, departmentIds: number[]) => apiFetch(`/api/users/${id}/departments`, { method: 'PUT', body: JSON.stringify({ department_ids: departmentIds }) })
export const deleteUser = (id: number) => apiFetch(`/api/users/${id}`, { method: 'DELETE' })

export const fetchCategories = () => apiFetch<{ categories: TaskCategory[] }>('/api/categories').then(d => d.categories)
export const createCategory = (name: string, color: string) => apiFetch<{ category: TaskCategory }>('/api/categories', { method: 'POST', body: JSON.stringify({ name, color }) }).then(d => d.category)
export const updateCategory = (id: number, data: Partial<TaskCategory>) => apiFetch(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const fetchStages = () => apiFetch<{ stages: PipelineStage[] }>('/api/stages').then(d => d.stages)

export interface TaskFilters { client_id?: number; department_id?: number; stage?: string; assigned_to?: number; category_id?: number; priority?: string; search?: string; date_from?: string; date_to?: string; page?: number; limit?: number }
export const fetchTasks = (filters: TaskFilters = {}) => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.set(k, String(v)) })
  return apiFetch<{ tasks: Task[]; total: number; page: number; totalPages: number }>(`/api/tasks?${params}`)
}
export const fetchPipelineTasks = (filters: Record<string, any> = {}) => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.set(k, String(v)) })
  return apiFetch<{ stages: PipelineStage[]; tasks: Task[] }>(`/api/tasks/pipeline?${params}`)
}
export const createTask = (data: Partial<Task>) => apiFetch<{ task: Task }>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }).then(d => d.task)
export const fetchTask = (id: number) => apiFetch<{ task: Task; comments: TaskComment[]; history: TaskHistory[]; attachments: TaskAttachment[]; timeEntries: TimeEntry[]; totalTimeSeconds: number; activeTimer: TimeEntry | null }>(`/api/tasks/${id}`)
export const updateTask = (id: number, data: Partial<Task>) => apiFetch(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const moveTaskStage = (id: number, stage: string, comment?: string) => apiFetch(`/api/tasks/${id}/stage`, { method: 'PUT', body: JSON.stringify({ stage, comment }) })
export const addTaskComment = (taskId: number, content: string, isInternal = false) => apiFetch<{ comment: TaskComment }>(`/api/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ content, is_internal: isInternal }) }).then(d => d.comment)
export const addTaskAttachment = (taskId: number, url: string, filename: string) => apiFetch(`/api/tasks/${taskId}/attachments`, { method: 'POST', body: JSON.stringify({ url, filename }) })

export const fetchInternalApprovals = () => apiFetch<{ tasks: Task[] }>('/api/approvals/internal').then(d => d.tasks)
export const fetchClientApprovals = () => apiFetch<{ tasks: Task[] }>('/api/approvals/client').then(d => d.tasks)
export const approveTask = (id: number, comment?: string) => apiFetch(`/api/approvals/${id}/approve`, { method: 'POST', body: JSON.stringify({ comment }) })
export const rejectTask = (id: number, comment: string) => apiFetch(`/api/approvals/${id}/reject`, { method: 'POST', body: JSON.stringify({ comment }) })

export const fetchDashboardStats = (days = 30) => apiFetch(`/api/dashboard/stats?days=${days}`)
export const fetchDashboardTrends = (days = 30) => apiFetch<{ created: { date: string; count: number }[]; completed: { date: string; count: number }[] }>(`/api/dashboard/trends?days=${days}`)
export const fetchTeamWorkload = () => apiFetch<{ workers: { id: number; name: string; open_tasks: number; overdue_tasks: number; status: string; departments: { name: string; color: string }[] }[] }>('/api/dashboard/workload')

// Bulk
export const bulkMoveTasks = (taskIds: number[], stage: string) => apiFetch('/api/tasks/bulk/stage', { method: 'POST', body: JSON.stringify({ task_ids: taskIds, stage }) })
export const bulkAssignTasks = (taskIds: number[], assignedTo: number | null) => apiFetch('/api/tasks/bulk/assign', { method: 'POST', body: JSON.stringify({ task_ids: taskIds, assigned_to: assignedTo }) })

// Notifications
export interface AppNotification { id: number; user_id: number; type: string; title: string; message: string | null; task_id: number | null; triggered_by: number | null; triggered_by_name?: string; task_title?: string; is_read: number; created_at: string }
export const fetchNotifications = (page = 1, unreadOnly = false) => apiFetch<{ notifications: AppNotification[]; total: number }>(`/api/notifications?page=${page}${unreadOnly ? '&unread_only=1' : ''}`)
export const fetchUnreadCount = () => apiFetch<{ count: number }>('/api/notifications/unread-count').then(d => d.count)
export const markNotificationRead = (id: number) => apiFetch(`/api/notifications/${id}/read`, { method: 'PUT' })
export const markAllNotificationsRead = () => apiFetch('/api/notifications/read-all', { method: 'PUT' })

// Time entries
export const startTimer = (taskId: number) => apiFetch<{ entry: TimeEntry }>(`/api/tasks/${taskId}/time/start`, { method: 'POST' }).then(d => d.entry)
export const stopTimer = (taskId: number, description?: string) => apiFetch<{ entry: TimeEntry }>(`/api/tasks/${taskId}/time/stop`, { method: 'POST', body: JSON.stringify({ description }) }).then(d => d.entry)

// Client credentials
export const fetchClientCredentials = (clientId: number) => apiFetch<{ credentials: ClientCredential[] }>(`/api/clients/${clientId}/credentials`).then(d => d.credentials)
export const createClientCredential = (clientId: number, data: Partial<ClientCredential>) => apiFetch(`/api/clients/${clientId}/credentials`, { method: 'POST', body: JSON.stringify(data) })
export const updateClientCredential = (clientId: number, credId: number, data: Partial<ClientCredential>) => apiFetch(`/api/clients/${clientId}/credentials/${credId}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteClientCredential = (clientId: number, credId: number) => apiFetch(`/api/clients/${clientId}/credentials/${credId}`, { method: 'DELETE' })

// Onboard
export const fetchClientOnboard = (clientId: number) => apiFetch<{ onboard: { data: Record<string, string>; created_at: string; updated_at: string } | null }>(`/api/clients/${clientId}/onboard`)
