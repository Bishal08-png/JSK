import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { business } from '../config/business'

export default function WelcomeScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [progress, setProgress] = useState(0)

  const destination = user?.role === 'admin' ? '/admin/dashboard' : '/products'

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); return 100 }
        return p + 2
      })
    }, 80)
    const timer = setTimeout(() => navigate(destination), 4500)
    return () => { clearInterval(interval); clearTimeout(timer) }
  }, [navigate, destination])

  return (
    <div className="welcome-screen">
      <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg, var(--primary-dark), var(--primary-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#fff' }}>{business.initials}</div>
        <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: 1, color: 'var(--primary-dark)' }}>{business.initials}</span>
      </div>

      <div className="welcome-image-wrap">
        <img
          className="welcome-image"
          src="https://images.pexels.com/photos/36887683/pexels-photo-36887683.jpeg"
          alt="Radha Krishna blessings"
          onError={e => { e.target.src = 'https://images.pexels.com/photos/36887683/pexels-photo-36887683.jpeg' }}
        />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at center, transparent 40%, rgba(46,157,200,0.12) 100%)', pointerEvents: 'none' }} />
      </div>

      <p className="welcome-greeting">Jai Shri Krishna 🌸</p>
      <h1 className="welcome-title">Welcome to {business.name}</h1>
      <p className="welcome-sub">
        {user?.role === 'admin'
          ? `Hello, ${user?.name} – Admin Dashboard awaits`
          : `Hello, ${user?.name} – Browse our stationery collection`}
      </p>

      <div style={{ width: '240px', height: 4, background: 'rgba(46,157,200,0.15)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--primary-dark), var(--primary-light))', borderRadius: 10, transition: 'width 0.08s linear' }} />
      </div>

      <button
        className="btn btn-primary"
        onClick={() => navigate(destination)}
        style={{ padding: '12px 32px', fontSize: 15 }}
      >
        Continue to {user?.role === 'admin' ? 'Admin Panel' : 'Shop'}
      </button>

      <p style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>Auto-redirecting in a moment...</p>
    </div>
  )
}
