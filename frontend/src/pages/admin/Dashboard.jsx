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
    { label: 'Total Revenue',  value: fmt(totalRevenue),           icon: <Banknote />,   color: '#0d7fad', glow: 'rgba(13,127,173,0.15)' },
    { label: 'Customers',      value: customers.length,            icon: <Users />,      color: '#5ecef5', glow: 'rgba(94,206,245,0.15)' },
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
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', marginBottom: 32, gap: 16 }}>
            {statCards.map((s) => (
              <div key={s.label} className="stat-card" style={{ '--glow-color': s.glow }}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color, fontSize: 22 }}>{s.value}</div>
                <div className="stat-icon" style={{ color: s.color }}>{s.icon}</div>
              </div>
            ))}
          </div>

          {/* Customer Selling Details */}
          <div className="card" style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Customer Selling Details</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                  All-time spending per customer.
                </p>
              </div>
              <span style={{
                background: 'rgba(59,168,208,0.12)', color: 'var(--primary)',
                border: '1px solid rgba(59,168,208,0.25)', borderRadius: 20,
                padding: '4px 14px', fontSize: 12, fontWeight: 700
              }}>
                {customers.length} customer{customers.length !== 1 ? 's' : ''}
              </span>
            </div>

            {customers.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0', fontSize: 14 }}>
                No customer data yet.
              </p>
            ) : (
              <div className="customer-table-wrap table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Customer Name</th>
                      <th>Total Bills</th>
                      <th>Total Spent</th>
                      <th>Products Bought</th>
                      <th>Last Purchase</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c, idx) => (
                      <tr key={c.name}>
                        <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: `linear-gradient(135deg, var(--primary), var(--primary-light))`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0
                            }}>
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-purple">{c.totalBills} bill{c.totalBills !== 1 ? 's' : ''}</span>
                        </td>
                        <td style={{ fontWeight: 800, color: 'var(--primary-dark)', fontSize: 15 }}>
                          {fmt(c.totalSpent)}
                        </td>
                        <td style={{ maxWidth: 220 }}>
                          <span style={{
                            display: 'block', overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 12
                          }}>
                            {[...new Set(c.items)].join(', ') || '—'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          {fmtDate(c.lastSale)}<br/>
                          <span style={{ fontSize: 11 }}>{fmtTime(c.lastSale)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Grand Total</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeBills.slice(0, 8).map(b => (
                      <tr key={b._id}>
                        <td><span className="badge badge-purple">{b.billNumber}</span></td>
                        <td style={{ fontWeight: 600 }}>{b.customerName}</td>
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
