import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { Receipt, ShoppingBag, TrendingUp, Users, Banknote } from 'lucide-react'

const fmt      = (n) => `₹${Number(n || 0).toFixed(2)}`
const fmtDate  = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtTime  = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

export default function Dashboard() {
  const [stats,   setStats]   = useState(null)
  const [bills,   setBills]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/bills/stats'),
      api.get('/bills')
    ])
      .then(([{ data: s }, { data: b }]) => {
        setStats(s)
        setBills(Array.isArray(b) ? b : [])
      })
      .finally(() => setLoading(false))
  }, [])

  /* Derive top customers from all bills */
  const safeBills = Array.isArray(bills) ? bills : []
  const customerMap = {}
  safeBills.forEach(b => {
    const key = b.customerName || 'Walk-in Customer'
    if (!customerMap[key]) customerMap[key] = { name: key, totalSpent: 0, totalBills: 0, lastSale: b.createdAt, items: [] }
    customerMap[key].totalSpent += b.grandTotal || 0
    customerMap[key].totalBills += 1
    if (new Date(b.createdAt) > new Date(customerMap[key].lastSale)) customerMap[key].lastSale = b.createdAt
    ;(b.items || []).forEach(i => customerMap[key].items.push(i.productName))
  })
  const customers = Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent)

  const totalRevenue = safeBills.reduce((s, b) => s + (b.grandTotal || 0), 0)

  const statCards = [
    { label: 'Total Bills',    value: stats?.totalBills ?? '-',    icon: <Receipt />,    color: '#3ba8d0', glow: 'rgba(59,168,208,0.15)' },
    { label: "Today's Sales",  value: fmt(stats?.todaySales),      icon: <TrendingUp />, color: '#0ea5c9', glow: 'rgba(14,165,201,0.15)' },
    { label: "Today's Bills",  value: stats?.todayBills ?? '-',    icon: <ShoppingBag />,color: '#2d87aa', glow: 'rgba(45,135,170,0.15)' },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>Sales Overview</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
          Live snapshot of sales, revenue & customer activity.
        </p>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading stats…</p>
      ) : (
        <>
          {/* Stat cards – 5 across */}
          <div className="dashboard-grid" style={{ marginBottom: 32 }}>
            {statCards.map((s) => (
              <div key={s.label} className="stat-card" style={{ '--glow-color': s.glow }}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color, fontSize: 22 }}>{s.value}</div>
                <div className="stat-icon" style={{ color: s.color }}>{s.icon}</div>
              </div>
            ))}
          </div>


          {/* Recent Bills */}
          {safeBills.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, color: 'var(--text)' }}>
                Recent Transactions
              </h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Bill #</th>
                      <th>Items</th>
                      <th>Grand Total</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeBills.slice(0, 8).map(b => (
                      <tr key={b._id}>
                        <td><span className="badge badge-purple">{b.billNumber}</span></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          {b.items.map(i => i.productName).join(', ')}
                        </td>
                        <td style={{ fontWeight: 800, color: 'var(--primary-dark)' }}>{fmt(b.grandTotal)}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          {fmtDate(b.createdAt)} · {fmtTime(b.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
