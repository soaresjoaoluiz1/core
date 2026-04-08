import { Router } from 'express'
import db from '../db.js'
import { requireRole } from '../middleware/auth.js'

const router = Router()

// All financial routes are dono-only
router.use(requireRole('dono'))

// GET /api/financial/overview?month=2026-04
router.get('/overview', (req, res) => {
  const month = req.query.month
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'month param required (YYYY-MM)' })

  const clients = db.prepare('SELECT id, name, monthly_fee, payment_day FROM clients WHERE is_active = 1 ORDER BY name').all()

  // Get all payments for this month
  const payments = db.prepare('SELECT * FROM payments WHERE reference_month = ?').all(month)
  const paymentMap = {}
  payments.forEach(p => { paymentMap[p.client_id] = p })

  // Calculate current date in SP timezone
  const now = new Date()
  const spNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const currentYear = spNow.getFullYear()
  const currentMonth = spNow.getMonth() + 1
  const currentDay = spNow.getDate()

  const [reqYear, reqMonth] = month.split('-').map(Number)

  let totalExpected = 0
  let totalReceived = 0
  let totalPending = 0
  let totalLate = 0
  let lateCount = 0

  const result = clients.map(c => {
    const fee = c.monthly_fee || 0
    totalExpected += fee

    const payment = paymentMap[c.id]
    if (payment) {
      totalReceived += payment.amount
      return {
        id: c.id, name: c.name, monthly_fee: fee, payment_day: c.payment_day || 10,
        status: 'paid', paid_at: payment.paid_at, amount_paid: payment.amount,
        days_late: 0, penalty: 0, total_due: fee
      }
    }

    // No payment - check if late
    const payDay = c.payment_day || 10
    // Payment is late if: requested month is in the past, OR it's current month and payment_day has passed
    const isCurrentMonth = reqYear === currentYear && reqMonth === currentMonth
    const isPastMonth = reqYear < currentYear || (reqYear === currentYear && reqMonth < currentMonth)
    const isLate = isPastMonth || (isCurrentMonth && currentDay > payDay)

    if (isLate && fee > 0) {
      // Calculate days late
      const dueDate = new Date(reqYear, reqMonth - 1, payDay)
      const diffMs = spNow.getTime() - dueDate.getTime()
      const daysLate = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
      const penalty = Math.round(fee * 0.01 * daysLate * 100) / 100
      const totalDue = Math.round((fee + penalty) * 100) / 100
      totalLate += totalDue
      lateCount++
      return {
        id: c.id, name: c.name, monthly_fee: fee, payment_day: payDay,
        status: 'late', paid_at: null, amount_paid: 0,
        days_late: daysLate, penalty, total_due: totalDue
      }
    }

    // Pending (not yet due)
    totalPending += fee
    return {
      id: c.id, name: c.name, monthly_fee: fee, payment_day: payDay,
      status: 'pending', paid_at: null, amount_paid: 0,
      days_late: 0, penalty: 0, total_due: fee
    }
  })

  res.json({
    clients: result,
    summary: {
      expected: totalExpected,
      received: totalReceived,
      pending: totalPending,
      late: totalLate,
      lateCount
    }
  })
})

// POST /api/financial/payments
router.post('/payments', (req, res) => {
  const { client_id, amount, reference_month, paid_at } = req.body
  if (!client_id || amount === undefined || !reference_month || !paid_at) {
    return res.status(400).json({ error: 'client_id, amount, reference_month e paid_at obrigatorios' })
  }
  if (!/^\d{4}-\d{2}$/.test(reference_month)) {
    return res.status(400).json({ error: 'reference_month deve ser YYYY-MM' })
  }

  // Check for duplicate
  const existing = db.prepare('SELECT id FROM payments WHERE client_id = ? AND reference_month = ?').get(client_id, reference_month)
  if (existing) {
    // Update existing payment
    db.prepare("UPDATE payments SET amount = ?, paid_at = ?, created_at = datetime('now', '-3 hours') WHERE id = ?").run(amount, paid_at, existing.id)
    return res.json({ payment: db.prepare('SELECT * FROM payments WHERE id = ?').get(existing.id) })
  }

  const result = db.prepare('INSERT INTO payments (client_id, amount, reference_month, paid_at) VALUES (?, ?, ?, ?)').run(client_id, amount, reference_month, paid_at)
  res.json({ payment: db.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid) })
})

// GET /api/financial/dashboard?year=2026
router.get('/dashboard', (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear()

  const months = []
  for (let m = 1; m <= 12; m++) {
    const monthStr = `${year}-${String(m).padStart(2, '0')}`
    const row = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE reference_month = ?').get(monthStr)
    months.push({ month: monthStr, total: row.total })
  }

  res.json({ months })
})

export default router
