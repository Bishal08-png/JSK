import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Package, Receipt, History,
  ShoppingBag, LogOut
} from 'lucide-react'

export default function Sidebar({ open, setOpen }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  const adminLinks = [
    { to: '/admin/dashboard', icon: <LayoutDashboard />, label: 'Dashboard' },
    { to: '/admin/inventory', icon: <Package />, label: 'Inventory' },
    { to: '/admin/billing', icon: <Receipt />, label: 'Billing / POS' },
    { to: '/admin/history', icon: <History />, label: 'Sales History' },
  ]
  const customerLinks = [
    { to: '/products', icon: <ShoppingBag />, label: 'Product Catalog' },
  ]
  const links = user?.role === 'admin' ? adminLinks : customerLinks

  return (
    <>
      <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">J</div>
          <div>
            <div className="logo-text">JSK</div>
            <div className="logo-sub">STATIONERY SHOP</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {links.map(({ to, icon, label }) => (
            <NavLink
              key={to} to={to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {icon} {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '8px 0' }}>
            <div className="avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          </div>
          <button className="nav-item" onClick={handleLogout} style={{ color: '#f87171', width: '100%' }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>
    </>
  )
}
