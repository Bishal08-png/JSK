import { useEffect, useState } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Search, Eye, EyeOff } from 'lucide-react'

const emptyForm = { name: '', quantity: '', mrp: '', discountPercent: '', buyingPrice: '' }

export default function Inventory() {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showBuyingPrice, setShowBuyingPrice] = useState(false)

  const fetch = async () => {
    try { const { data } = await api.get('/products'); setProducts(data) }
    catch { toast.error('Failed to load products') }
  }

  useEffect(() => { fetch() }, [])

  const finalPrice = () => {
    const m = parseFloat(form.mrp) || 0
    const d = parseFloat(form.discountPercent) || 0
    return (m - (m * d) / 100).toFixed(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    // Secure approach: Only send raw data, let backend calculate sensitive fields like finalPrice
    try {
      if (editId) {
        await api.put(`/products/${editId}`, form)
        toast.success('Product updated!')
      } else {
        await api.post('/products', form)
        toast.success('Product added!')
      }
      setForm(emptyForm); setEditId(null); setShowForm(false)
      fetch()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving product')
    } finally { setLoading(false) }
  }

  const handleEdit = (p) => {
    setForm({ name: p.name, quantity: p.quantity, mrp: p.mrp, discountPercent: p.discountPercent, buyingPrice: p.buyingPrice || '' })
    setEditId(p._id); setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this product?')) return
    try { await api.delete(`/products/${id}`); toast.success('Product removed'); fetch() }
    catch { toast.error('Failed to remove product') }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
  const fmt = (n) => `₹${Number(n).toFixed(2)}`
  const dateStr = (d) => new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800 }}>Inventory</h2>
          <p style={{ color:'var(--text-muted)', fontSize:13 }}>{products.length} products in stock</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(s => !s) }}>
          <Plus size={16} /> {showForm ? 'Cancel' : 'Add Product'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom:24 }}>
          <h3 style={{ fontSize:16, fontWeight:700, marginBottom:20 }}>
            {editId ? '✏️ Edit Product' : '➕ Add New Product'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input className="form-control" placeholder="e.g. Classmate Notebook" value={form.name} onChange={set('name')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input className="form-control" type="number" min="0" placeholder="e.g. 100" value={form.quantity} onChange={set('quantity')} required />
              </div>
              <div className="form-group">
                <label className="form-label">MRP (₹) *</label>
                <input className="form-control" type="number" min="0" step="0.01" placeholder="e.g. 50.00" value={form.mrp} onChange={set('mrp')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Discount % *</label>
                <input className="form-control" type="number" min="0" max="100" step="0.01" placeholder="e.g. 10" value={form.discountPercent} onChange={set('discountPercent')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Buying Price (₹)</label>
                <input className="form-control" type="number" min="0" step="0.01" placeholder="e.g. 35.00" value={form.buyingPrice} onChange={set('buyingPrice')} />
              </div>
            </div>
            {form.mrp && (
              <div style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:13, color:'var(--text-muted)' }}>Calculated Final Price:</span>
                <span style={{ fontSize:20, fontWeight:800, color:'var(--accent)' }}>₹{finalPrice()}</span>
              </div>
            )}
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? 'Saving...' : editId ? 'Update Product' : 'Add Product'}
              </button>
              <button className="btn btn-secondary" type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm) }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div style={{ marginBottom:16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div className="search-bar" style={{ flex: '1 1 200px', maxWidth: '300px' }}>
            <Search size={16} />
            <input className="form-control" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft:38 }} />
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowBuyingPrice(!showBuyingPrice)}>
            {showBuyingPrice ? <EyeOff size={16} /> : <Eye size={16} />}
            {showBuyingPrice ? 'Hide Buying Price' : 'Show Buying Price'}
          </button>
        </div>
        {filtered.length === 0 ? (
          <p style={{ color:'var(--text-muted)', fontSize:14, textAlign:'center', padding:'32px 0' }}>
            {search ? 'No products found.' : 'No products added yet. Click "Add Product" to get started.'}
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Product Name</th><th>Qty</th><th>MRP</th><th>Discount</th>{showBuyingPrice && <th>Buying Price</th>}<th>Final Price</th><th>Date Added</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p._id}>
                    <td style={{ fontWeight:600 }}>{p.name}</td>
                    <td>
                      <span className={`badge ${p.quantity === 0 ? 'badge-danger' : p.quantity < 10 ? 'badge-warning' : 'badge-success'}`}>
                        {p.quantity}
                      </span>
                    </td>
                    <td style={{ color:'var(--text-muted)', textDecoration:'line-through' }}>{fmt(p.mrp)}</td>
                    <td><span className="badge badge-warning">{p.discountPercent}% OFF</span></td>
                    {showBuyingPrice && <td style={{ color:'var(--text-muted)' }}>{fmt(p.buyingPrice || 0)}</td>}
                    <td style={{ color:'var(--accent)', fontWeight:700 }}>{fmt(p.finalPrice)}</td>
                    <td style={{ color:'var(--text-muted)', fontSize:12 }}>{dateStr(p.dateAdded)}</td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(p)} title="Edit"><Pencil size={13} /></button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id)} title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

