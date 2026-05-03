import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { Receipt, ShoppingBag, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/bills/stats')
      .then(({ data }) => setStats(data))
      .finally(() => setLoading(false))
  }, [])

  const fmt = (n) => `Rs. ${Number(n || 0).toFixed(2)}`

  const statCards = [
    { label: 'Total Bills', value: stats?.totalBills ?? '-', icon: <Receipt />, color: '#8b5cf6', glow: 'rgba(139,92,246,0.15)' },
    { label: "Today's Sales", value: fmt(stats?.todaySales), icon: <TrendingUp />, color: '#f59e0b', glow: 'rgba(245,158,11,0.15)' },
    { label: "Today's Bills", value: stats?.todayBills ?? '-', icon: <ShoppingBag />, color: '#06b6d4', glow: 'rgba(6,182,212,0.15)' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Sales Overview</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          A compact snapshot without customer details.
        </p>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading stats...</p>
      ) : (
        <div className="grid grid-3" style={{ marginBottom: 28 }}>
          {statCards.map((s) => (
            <div key={s.label} className="stat-card" style={{ '--glow-color': s.glow }}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-icon" style={{ color: s.color }}>{s.icon}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
