import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { business } from '../../config/business'

export default function AdminLogin() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      if (data.role !== 'admin') {
        setError('Access denied. Admin credentials required.')
        return
      }
      login(data)
      toast.success(`Welcome, Admin ${data.name}!`)
      navigate('/welcome')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="big-logo">{business.initials}</div>
          <h1>{business.initials}</h1>
          <p>Admin Portal</p>
        </div>
        <h2 className="auth-title">Admin Login</h2>
        <p className="auth-sub">Restricted access. Authorized personnel only.</p>
        <div style={{
          background: 'rgba(46,157,200,0.08)', border: '1px solid rgba(46,157,200,0.25)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12,
          color: 'var(--primary-dark)'
        }}>
          🔐 Change the default password from Profile after first login.
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Admin Email</label>
            <input className="form-control" type="email" placeholder="admin@lokonathenterprise.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-control" type="password" placeholder="Enter admin password"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          </div>
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'Authenticating...' : 'Admin Sign In'}
          </button>
        </form>
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/login" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Customer Login
          </Link>
        </div>
      </div>
    </div>
  )
}
