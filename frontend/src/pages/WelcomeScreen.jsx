import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
        <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg, #6c3eb8, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18 }}>J</div>
        <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: 3, background: 'linear-gradient(135deg, #fff, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>JSK</span>
      </div>

      <div className="welcome-image-wrap">
        <img
          className="welcome-image"
          src="https://images.pexels.com/photos/36887683/pexels-photo-36887683.jpeg"
          alt="Radha Krishna – Divine Blessings"
          onError={e => { e.target.src = 'https://images.pexels.com/photos/36887683/pexels-photo-36887683.jpeg' }}
        />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at center, transparent 40%, rgba(108,62,184,0.15) 100%)', pointerEvents: 'none' }} />
      </div>

      <p className="welcome-greeting">🙏 Jai Shri Krishna</p>
      <h1 className="welcome-title">Welcome to JSK</h1>
      <p className="welcome-sub">
        {user?.role === 'admin'
          ? `Hello, ${user?.name} — Admin Dashboard awaits`
          : `Hello, ${user?.name} — Browse our stationery collection`}
      </p>

      <div style={{ width: '240px', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #6c3eb8, #f59e0b)', borderRadius: 10, transition: 'width 0.08s linear' }} />
      </div>

      <button
        className="btn btn-primary"
        onClick={() => navigate(destination)}
        style={{ padding: '12px 32px', fontSize: 15 }}
      >
        Continue to {user?.role === 'admin' ? 'Admin Panel' : 'Shop'} →
      </button>

      <p style={{ marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Auto-redirecting in a moment...</p>
    </div>
  )
}
