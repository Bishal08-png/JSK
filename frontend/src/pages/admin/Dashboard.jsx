import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { TrendingUp, ShoppingBag, Receipt, IndianRupee } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recentBills, setRecentBills] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get('/bills/stats'), api.get('/bills')])
      .then(([s, b]) => { setStats(s.data); setRecentBills(b.data.slice(0, 5)) })
      .finally(() => setLoading(false))
  }, [])

  const fmt = (n) => `₹${Number(n || 0).toFixed(2)}`
  const date = (d) => new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
  const time = (d) => new Date(d).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })

  const statCards = [
    { label: 'Total Revenue', value: fmt(stats?.totalRevenue), icon: <IndianRupee />, color: '#10b981', glow: 'rgba(16,185,129,0.15)' },
    { label: 'Total Bills', value: stats?.totalBills ?? '–', icon: <Receipt />, color: '#8b5cf6', glow: 'rgba(139,92,246,0.15)' },
    { label: "Today's Sales", value: fmt(stats?.todaySales), icon: <TrendingUp />, color: '#f59e0b', glow: 'rgba(245,158,11,0.15)' },
    { label: "Today's Bills", value: stats?.todayBills ?? '–', icon: <ShoppingBag />, color: '#06b6d4', glow: 'rgba(6,182,212,0.15)' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Sales Overview</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Real-time snapshot of your shop's performance.</p>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading stats...</p>
      ) : (
        <>
          <div className="grid grid-4" style={{ marginBottom: 28 }}>
            {statCards.map((s) => (
              <div key={s.label} className="stat-card" style={{ '--glow-color': s.glow }}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-icon" style={{ color: s.color }}>{s.icon}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Bills</h3>
            {recentBills.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No bills generated yet.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Bill No.</th><th>Customer</th><th>Items</th>
                      <th>Grand Total</th><th>Date</th><th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBills.map(b => (
                      <tr key={b._id}>
                        <td><span className="badge badge-purple">{b.billNumber}</span></td>
                        <td>{b.customerName}</td>
                        <td>{b.items.length} item{b.items.length > 1 ? 's' : ''}</td>
                        <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{fmt(b.grandTotal)}</td>
                        <td>{date(b.createdAt)}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{time(b.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
