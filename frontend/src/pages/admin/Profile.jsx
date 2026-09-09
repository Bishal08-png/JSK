import { useState } from 'react'
import toast from 'react-hot-toast'
import { Eye, EyeOff, IndianRupee, Lock, ShieldCheck, UserRound, Camera, Upload } from 'lucide-react'
import api from '../../api/axios'
import { useAuth } from '../../context/useAuth'
import { business } from '../../config/business'

const krishnaImageUrl = 'https://images.pexels.com/photos/36887683/pexels-photo-36887683.jpeg'

export default function Profile() {
  const { user, login } = useAuth()
  const displayName = user?.name || `${business.initials} Admin`
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' })
  const [dpInput, setDpInput] = useState(user?.dp || '')
  const [saving, setSaving] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingDp, setSavingDp] = useState(false)
  const [revenueVisible, setRevenueVisible] = useState(false)
  const [revenueLoading, setRevenueLoading] = useState(false)
  const [stats, setStats] = useState(null)

  const currentDpUrl = user?.dp || krishnaImageUrl

  const fmt = (n) => `Rs. ${Number(n || 0).toFixed(2)}`

  const revealRevenue = async () => {
    if (revenueVisible) {
      setRevenueVisible(false)
      return
    }

    if (!stats) {
      setRevenueLoading(true)
      try {
        const { data } = await api.get('/bills/stats')
        setStats(data)
        setRevenueVisible(true)
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to load revenue')
      } finally {
        setRevenueLoading(false)
      }
      return
    }
    setRevenueVisible(true)
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New password and confirmation do not match')
      return
    }

    setSaving(true)
    try {
      await api.put('/auth/admin/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      })
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success('Admin password updated')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const { data } = await api.put('/auth/admin/profile', profileForm)
      login(data) // update auth context & local storage
      toast.success('Profile updated successfully')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image size must be less than 3MB')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setDpInput(reader.result)
      toast.success('Photo loaded into preview. Click "Save Display Picture" to apply.')
    }
    reader.readAsDataURL(file)
  }

  const handleDpUpdate = async (e) => {
    e.preventDefault()
    setSavingDp(true)
    try {
      const { data } = await api.put('/auth/admin/dp', { dp: dpInput })
      const updatedUser = data.user || { ...user, dp: dpInput }
      login(updatedUser)
      toast.success('Display Picture updated successfully!')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update Display Picture')
    } finally {
      setSavingDp(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Admin Profile</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Manage access and account details for {business.name}.
        </p>
      </div>

      <div className="grid grid-2 profile-grid">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ position: 'relative', width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--accent)', flexShrink: 0 }}>
              <img src={currentDpUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>{displayName || 'Admin'}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{user?.email || 'Admin Account'}</p>
            </div>
          </div>

          <div className="profile-row">
            <span>Name</span>
            <strong>{displayName || 'Admin'}</strong>
          </div>
          <div className="profile-row">
            <span>Email</span>
            <strong>{user?.email || 'Not available'}</strong>
          </div>
          <div className="profile-row">
            <span>Role</span>
            <strong style={{ textTransform: 'capitalize' }}>{user?.role || 'admin'}</strong>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div className="profile-icon"><IndianRupee size={20} /></div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Revenue</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Visible only after admin opens it here</p>
            </div>
          </div>

          <div className="revenue-box">
            <div>
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value" style={{ color: 'var(--accent)' }}>
                {revenueVisible ? fmt(stats?.totalRevenue) : 'Hidden'}
              </div>
            </div>
            <button className="btn btn-secondary" onClick={revealRevenue} disabled={revenueLoading}>
              {revenueVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              {revenueLoading ? 'Loading...' : revenueVisible ? 'Hide' : 'View'}
            </button>
          </div>
        </div>
      </div>

      {/* Change Display Picture (DP) Card */}
      <div className="card" style={{ marginTop: 20, maxWidth: 620 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div className="profile-icon"><Camera size={20} /></div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>Change Display Picture (DP)</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              Upload a profile photo or paste an image URL.
            </p>
          </div>
        </div>

        <form onSubmit={handleDpUpdate}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--accent)', flexShrink: 0 }}>
              <img src={dpInput || currentDpUrl} alt="DP Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Upload size={16} /> Upload Photo from Device
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Supports JPG, PNG, WEBP (Max 3MB)</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Or Image URL</label>
            <input
              className="form-control"
              type="text"
              placeholder="https://example.com/my-photo.jpg"
              value={dpInput}
              onChange={e => setDpInput(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" type="submit" disabled={savingDp}>
              <Camera size={16} /> {savingDp ? 'Saving DP...' : 'Save Display Picture'}
            </button>
            {dpInput && (
              <button className="btn btn-secondary" type="button" onClick={() => setDpInput('')}>
                Remove DP
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: 20, maxWidth: 620 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div className="profile-icon"><ShieldCheck size={20} /></div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>Change Password</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              The current password is required before setting a new one.
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              className="form-control"
              type="password"
              value={passwords.currentPassword}
              onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              className="form-control"
              type="password"
              minLength={6}
              value={passwords.newPassword}
              onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              className="form-control"
              type="password"
              minLength={6}
              value={passwords.confirmPassword}
              onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            <Lock size={16} /> {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: 20, maxWidth: 620 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div className="profile-icon"><UserRound size={20} /></div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>Change Name & Email</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              Update your admin profile details.
            </p>
          </div>
        </div>

        <form onSubmit={handleProfileUpdate}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              className="form-control"
              type="text"
              value={profileForm.name}
              onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-control"
              type="email"
              value={profileForm.email}
              onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={savingProfile}>
            <UserRound size={16} /> {savingProfile ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
