import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import Login from './pages/auth/Login'
import AdminLogin from './pages/auth/AdminLogin'
import Signup from './pages/auth/Signup'
import WelcomeScreen from './pages/WelcomeScreen'
import Layout from './components/Layout'
import Dashboard from './pages/admin/Dashboard'
import Inventory from './pages/admin/Inventory'
import Billing from './pages/admin/Billing'
import SalesHistory from './pages/admin/SalesHistory'
import Profile from './pages/admin/Profile'
import ProductCatalog from './pages/customer/ProductCatalog'

const PrivateRoute = ({ children, role }) => {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

const AppRoutes = () => {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/welcome" /> : <Login />} />
      <Route path="/admin/login" element={user ? <Navigate to="/welcome" /> : <AdminLogin />} />
      <Route path="/signup" element={user ? <Navigate to="/welcome" /> : <Signup />} />
      <Route path="/welcome" element={<PrivateRoute><WelcomeScreen /></PrivateRoute>} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={
          user?.role === 'admin'
            ? <Navigate to="/admin/dashboard" replace />
            : <Navigate to="/products" replace />
        } />
        <Route path="admin/dashboard" element={<PrivateRoute role="admin"><Dashboard /></PrivateRoute>} />
        <Route path="admin/inventory" element={<PrivateRoute role="admin"><Inventory /></PrivateRoute>} />
        <Route path="admin/billing" element={<PrivateRoute role="admin"><Billing /></PrivateRoute>} />
        <Route path="admin/history" element={<PrivateRoute role="admin"><SalesHistory /></PrivateRoute>} />
        <Route path="admin/profile" element={<PrivateRoute role="admin"><Profile /></PrivateRoute>} />
        <Route path="products" element={<PrivateRoute><ProductCatalog /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/welcome' : '/login'} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
