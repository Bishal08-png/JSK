import { useEffect, useState, useRef } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import { Plus, Minus, Trash2, Download, Search } from 'lucide-react'
import { business } from '../../config/business'

export default function Billing() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [bill, setBill] = useState(null)
  const [activeTab, setActiveTab] = useState('product') // 'product' or 'service'
  const billRef = useRef()

  useEffect(() => { api.get('/products').then(r => setProducts(r.data)) }, [])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) && 
    (p.productType || 'product') === activeTab &&
    (activeTab === 'service' || p.quantity > 0)
  )

  const addToCart = (product) => {
    setCart(prev => {
      const ex = prev.find(i => i.productId === product._id)
      const isService = product.productType === 'service'
      
      if (ex) {
        if (!isService && ex.qty >= product.quantity) return toast.error('Stock limit reached') || prev
        return prev.map(i => i.productId === product._id ? { ...i, qty: i.qty + 1 } : i)
      }
      
      return [...prev, { 
        productId: product._id, 
        name: product.name, 
        mrp: product.mrp, 
        discountPercent: product.discountPercent || 0, 
        finalPrice: isService ? product.mrp : product.finalPrice, 
        maxQty: isService ? 999999 : product.quantity, 
        qty: 1,
        productType: product.productType || 'product'
      }]
    })
  }

  const updateQty = (id, val) => {
    const item = cart.find(i => i.productId === id)
    const n = parseInt(val)
    if (isNaN(n) || n < 1) return removeFromCart(id)
    if (item.productType !== 'service' && n > item.maxQty) return toast.error('Exceeds available stock')
    setCart(prev => prev.map(i => i.productId === id ? { ...i, qty: n } : i))
  }

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.productId !== id))

  const subtotal = cart.reduce((s, i) => {
    // For services, MRP is the same as Final Price (no discount usually)
    const price = i.productType === 'service' ? i.mrp : i.mrp
    return s + price * i.qty
  }, 0)
  
  const discount = cart.reduce((s, i) => {
    if (i.productType === 'service') return s
    return s + (i.mrp - i.finalPrice) * i.qty
  }, 0)
  
  const grandTotal = subtotal - discount

  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error('Cart is empty')
    setLoading(true)
    try {
      const { data } = await api.post('/bills', {
        customerName: customerName || 'Walk-in Customer',
        items: cart.map(i => ({ productId: i.productId, quantity: i.qty }))
      })
      setBill(data)
      setCart([])
      setCustomerName('')
      toast.success('Bill generated successfully!')
      api.get('/products').then(r => setProducts(r.data))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout failed')
    } finally { setLoading(false) }
  }

  const handlePrint = () => {
    window.print()
  }

  const fmtCur = (n) => `Rs. ${Number(n).toFixed(2)}`
  const fmtDate = (d) => new Date(d).toLocaleString('en-IN')

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Billing & POS</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Generate bills for products and shop services.</p>
      </div>

      {bill ? (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <button className="btn btn-success" onClick={handlePrint}><Download size={16} /> Print / Save PDF</button>
            <button className="btn btn-secondary" onClick={() => setBill(null)}><Plus size={16} /> New Bill</button>
          </div>
          <div ref={billRef} className="bill-preview" style={{ maxWidth: 480 }}>
            <div className="bill-header">
              <h2>{business.initials}</h2>
              <p style={{ fontSize: 13, fontWeight: 700 }}>{business.name}</p>
              <p>{business.address}</p>
              <p>Your trusted stationery destination</p>
              <p style={{ marginTop: 8 }}>Bill No: <strong>{bill.billNumber}</strong></p>
              <p>Date: {fmtDate(bill.createdAt)}</p>
              <p>Customer: <strong>{bill.customerName}</strong></p>
            </div>
            <table className="bill-items-table">
              <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
              <tbody>
                {bill.items.map((item, i) => (
                  <tr key={i}>
                    <td>{item.productName}</td>
                    <td>{item.quantity}</td>
                    <td>{fmtCur(item.finalPrice)}</td>
                    <td>{fmtCur(item.itemTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="bill-totals">
              <div className="row"><span>Subtotal (MRP)</span><span>{fmtCur(bill.subtotal)}</span></div>
              <div className="row" style={{ color: 'green' }}><span>Total Discount</span><span>- {fmtCur(bill.totalDiscount)}</span></div>
              <div className="row grand"><span>GRAND TOTAL</span><span>{fmtCur(bill.grandTotal)}</span></div>
            </div>
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: '#666' }}>
              Thank you for shopping at {business.name}!<br />Visit Again!
            </p>
          </div>
        </div>
      ) : (
        <div className="pos-grid">
          {/* Product Selector */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Customer Name</label>
                <input className="form-control" placeholder="Walk-in Customer" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
            </div>

            <div className="card">
              <div style={{ display:'flex', gap:10, marginBottom:16, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                <button 
                  onClick={() => setActiveTab('product')}
                  style={{ 
                    padding:'8px 16px', 
                    background:'none', 
                    border:'none', 
                    color: activeTab === 'product' ? 'var(--accent)' : 'var(--text-muted)',
                    fontWeight: 600,
                    cursor:'pointer',
                    fontSize: 13,
                    borderBottom: activeTab === 'product' ? '2px solid var(--accent)' : '2px solid transparent',
                  }}
                >
                  📦 Products
                </button>
                <button 
                  onClick={() => setActiveTab('service')}
                  style={{ 
                    padding:'8px 16px', 
                    background:'none', 
                    border:'none', 
                    color: activeTab === 'service' ? 'var(--accent)' : 'var(--text-muted)',
                    fontWeight: 600,
                    cursor:'pointer',
                    fontSize: 13,
                    borderBottom: activeTab === 'service' ? '2px solid var(--accent)' : '2px solid transparent',
                  }}
                >
                  ⚡ Services
                </button>
              </div>

              <div className="search-bar" style={{ marginBottom: 14 }}>
                <Search size={16} />
                <input className="form-control" placeholder={`Search ${activeTab === 'product' ? 'products' : 'services'}...`} value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38 }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No {activeTab}s found.</p>
                ) : filtered.map(p => (
                  <div key={p._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {activeTab === 'product' ? (
                          `Stock: ${p.quantity} | MRP: ₹${p.mrp} | Final: `
                        ) : (
                          'Service | Price: '
                        )}
                        <span style={{ color: 'var(--primary-dark)', fontWeight: 700 }}>₹{activeTab === 'product' ? p.finalPrice : p.mrp}</span>
                        {activeTab === 'service' && ' / unit'}
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => addToCart(p)}>
                      <Plus size={14} /> Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cart + Bill */}
          <div className="card" style={{ position: 'sticky', top: 80 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>🛒 Cart</h3>
            {cart.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>Add items from the left panel.</p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {cart.map(item => (
                    <div key={item.productId} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>
                          {item.productType === 'service' ? '⚡ ' : ''}{item.name}
                        </span>
                        <button onClick={() => removeFromCart(item.productId)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={14} /></button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button className="btn btn-secondary btn-sm" style={{ padding: '4px 9px' }} onClick={() => updateQty(item.productId, item.qty - 1)}><Minus size={12} /></button>
                          <input type="number" min="1" max={item.maxQty} value={item.qty} onChange={e => updateQty(item.productId, e.target.value)}
                            style={{ width: 55, textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)', padding: '4px', fontSize: 13 }} />
                          <button className="btn btn-secondary btn-sm" style={{ padding: '4px 9px' }} onClick={() => updateQty(item.productId, item.qty + 1)}><Plus size={12} /></button>
                        </div>
                        <span style={{ color: 'var(--primary-dark)', fontWeight: 700, fontSize: 14 }}>₹{(item.finalPrice * item.qty).toFixed(2)}</span>
                      </div>
                      {item.productType === 'service' && (
                        <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4, textAlign:'right' }}>
                          Unit Price: ₹{item.mrp.toFixed(2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                    <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--success)', marginBottom: 8 }}>
                    <span>Discount</span><span>- ₹{discount.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: 'var(--primary-dark)' }}>
                    <span>Grand Total</span><span>₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
                <button className="btn btn-success btn-full" style={{ marginTop: 16 }} onClick={handleCheckout} disabled={loading}>
                  {loading ? 'Processing...' : '✅ Generate Bill'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
