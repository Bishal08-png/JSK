import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import Sidebar from './Sidebar'
import { Menu } from 'lucide-react'
import { business } from '../config/business'

const krishnaImageUrl = 'https://images.pexels.com/photos/36887683/pexels-photo-36887683.jpeg'

const pageTitles = {
  '/admin/dashboard': 'Dashboard',
  '/admin/inventory': 'Inventory Management',
  '/admin/billing': 'Billing & POS',
  '/admin/history': 'Sales History',
  '/admin/profile': 'Admin Profile',
  '/products': 'Product Catalog',
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()
  const location = useLocation()
  const title = pageTitles[location.pathname] || business.initials
  const displayName = user?.role === 'admin' ? `${business.initials} Admin` : user?.name

  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <main className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="hamburger" onClick={() => setSidebarOpen(true)}>
              <Menu size={22} />
            </button>
            <h1 className="topbar-title">{title}</h1>
          </div>
          <div className="topbar-user">
            <div className="avatar">
              <img src={krishnaImageUrl} alt="Radha Krishna" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{displayName}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</span>
            </div>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
        <footer className="app-footer">
          <strong>{business.name}</strong>
          <span>{business.address}</span>
        </footer>
      </main>
    </div>
  )
}
