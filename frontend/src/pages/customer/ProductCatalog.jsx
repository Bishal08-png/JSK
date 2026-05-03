import { useEffect, useState } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import {
  Search, Package, ShoppingCart, Plus, Minus,
  Trash2, X, Tag, ChevronRight
} from 'lucide-react'
import { business } from '../../config/business'

/* ─── helpers ───────────────────────────────────── */
const fmt     = (n)  => `₹${Number(n).toFixed(2)}`

/* ─── Cart Drawer ───────────────────────────────── */
function CartDrawer({ cart, products, onClose, onQtyChange, onRemove }) {
  const items = Object.entries(cart)
    .map(([id, qty]) => ({ product: products.find(p => p._id === id), qty }))
    .filter(r => r.product)

  const subtotal    = items.reduce((s, r) => s + r.product.mrp        * r.qty, 0)
  const totalFinal  = items.reduce((s, r) => s + r.product.finalPrice * r.qty, 0)
  const totalSaving = subtotal - totalFinal

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)'
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
        width: 'min(420px, 100vw)',
        background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.25s cubic-bezier(0.34,1.1,0.64,1)'
      }}>
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `}</style>

        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ShoppingCart size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>My Cart</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {items.length} product{items.length !== 1 ? 's' : ''} · {items.reduce((s, r) => s + r.qty, 0)} items
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-card2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'var(--text)',
              display: 'flex', alignItems: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Items list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <ShoppingCart size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
              <p style={{ fontSize: 15, fontWeight: 600 }}>Your cart is empty</p>
              <p style={{ fontSize: 13, marginTop: 6 }}>Click "Add to Cart" on any product to begin.</p>
            </div>
          ) : items.map(({ product: p, qty }) => (
            <div key={p._id} style={{
              background: 'var(--bg-card2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 14px'
            }}>
              {/* Product name + remove */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14, flex: 1, marginRight: 8 }}>{p.name}</div>
                <button
                  onClick={() => onRemove(p._id)}
                  title="Remove"
                  style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: '#ef4444',
                    display: 'flex', flexShrink: 0
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Price row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>{fmt(p.finalPrice)}</span>
                {p.discountPercent > 0 && (
                  <>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'line-through' }}>{fmt(p.mrp)}</span>
                    <span className="badge badge-warning">{p.discountPercent}% OFF</span>
                  </>
                )}
              </div>

              {/* Qty controls + item total */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Qty stepper */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 0,
                  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden'
                }}>
                  <button
                    onClick={() => onQtyChange(p._id, qty - 1)}
                    disabled={qty <= 1}
                    style={{
                      padding: '7px 12px', background: 'none', border: 'none', color: 'var(--text)',
                      cursor: qty <= 1 ? 'not-allowed' : 'pointer', fontSize: 16, opacity: qty <= 1 ? 0.35 : 1
                    }}
                  ><Minus size={14} /></button>
                  <span style={{ padding: '7px 14px', fontWeight: 700, fontSize: 15, borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                    {qty}
                  </span>
                  <button
                    onClick={() => onQtyChange(p._id, qty + 1)}
                    disabled={qty >= p.quantity}
                    style={{
                      padding: '7px 12px', background: 'none', border: 'none', color: 'var(--text)',
                      cursor: qty >= p.quantity ? 'not-allowed' : 'pointer', fontSize: 16, opacity: qty >= p.quantity ? 0.35 : 1
                    }}
                  ><Plus size={14} /></button>
                </div>

                {/* Item total */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--accent)' }}>{fmt(p.finalPrice * qty)}</div>
                  {p.discountPercent > 0 && (
                    <div style={{ fontSize: 11, color: '#34d399' }}>
                      save {fmt((p.mrp - p.finalPrice) * qty)}
                    </div>
                  )}
                </div>
              </div>

              {/* Stock warning */}
              {qty >= p.quantity && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#f59e0b' }}>
                  ⚠️ Max available stock: {p.quantity}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary footer */}
        {items.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
            {/* Savings banner */}
            {totalSaving > 0 && (
              <div style={{
                background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 14,
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                <Tag size={14} color="#34d399" />
                <span style={{ fontSize: 13, color: '#34d399', fontWeight: 600 }}>
                  You save {fmt(totalSaving)} on this order!
                </span>
              </div>
            )}

            {/* Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
                <span>MRP Total</span>
                <span style={{ textDecoration: 'line-through' }}>{fmt(subtotal)}</span>
              </div>
              {totalSaving > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#34d399' }}>
                  <span>Total Discount</span>
                  <span>- {fmt(totalSaving)}</span>
                </div>
              )}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                paddingTop: 10, borderTop: '1px solid var(--border)',
                fontSize: 18, fontWeight: 800
              }}>
                <span>Total Amount</span>
                <span style={{ color: 'var(--accent)' }}>{fmt(totalFinal)}</span>
              </div>
            </div>

            {/* Info note */}
            <div style={{
              background: 'rgba(46,157,200,0.06)', border: '1px solid rgba(46,157,200,0.18)',
              borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6
            }}>
              📋 This is a <strong style={{ color: 'var(--text)' }}>price estimate</strong> for your reference.
              Please visit the shop counter to complete your purchase.
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/* ─── Main Component ────────────────────────────── */
export default function ProductCatalog() {
  const [products,    setProducts]    = useState([])
  const [search,      setSearch]      = useState('')
  const [loading,     setLoading]     = useState(true)
  const [cart,        setCart]        = useState({})       // { productId: qty }
  const [cartOpen,    setCartOpen]    = useState(false)

  useEffect(() => {
    api.get('/products')
      .then(r  => setProducts(r.data))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  /* cart helpers */
  const cartCount  = Object.values(cart).reduce((s, q) => s + q, 0)
  const cartTotal  = Object.entries(cart).reduce((s, [id, qty]) => {
    const p = products.find(x => x._id === id)
    return s + (p ? p.finalPrice * qty : 0)
  }, 0)

  const addToCart = (product) => {
    if (product.quantity === 0) { toast.error('Out of stock!'); return }
    setCart(prev => {
      const cur = prev[product._id] || 0
      if (cur >= product.quantity) { toast.error(`Only ${product.quantity} in stock`); return prev }
      toast.success(`${product.name} added to cart`)
      return { ...prev, [product._id]: cur + 1 }
    })
  }

  const changeQty = (id, newQty) => {
    if (newQty <= 0) { removeFromCart(id); return }
    const p = products.find(x => x._id === id)
    if (p && newQty > p.quantity) { toast.error(`Only ${p.quantity} available`); return }
    setCart(prev => ({ ...prev, [id]: newQty }))
  }

  const removeFromCart = (id) => {
    setCart(prev => { const n = { ...prev }; delete n[id]; return n })
    toast(`Item removed from cart`, { icon: '🗑️' })
  }

  const inCart = (id) => cart[id] || 0

  return (
    <div>
      {/* Cart Drawer */}
      {cartOpen && (
        <CartDrawer
          cart={cart}
          products={products}
          onClose={() => setCartOpen(false)}
          onQtyChange={changeQty}
          onRemove={removeFromCart}
        />
      )}

      {/* Page Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Product Catalog</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Browse all available {business.name} stationery products - {products.length} items in stock.
          </p>
        </div>

        {/* Cart button */}
        <button
          onClick={() => setCartOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: cartCount > 0
              ? 'linear-gradient(135deg, var(--primary-dark), var(--primary))'
              : 'var(--bg-card2)',
            border: cartCount > 0 ? 'none' : '1px solid var(--border)',
            borderRadius: 12, padding: '10px 18px', cursor: 'pointer',
            color: cartCount > 0 ? '#fff' : 'var(--text)',
            fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
            boxShadow: cartCount > 0 ? '0 4px 20px rgba(46,157,200,0.4)' : 'none',
            transition: 'all 0.25s', position: 'relative'
          }}
        >
          <ShoppingCart size={18} />
          {cartCount > 0 ? (
            <>
              <span>{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
              <span style={{
                height: '1px', width: '1px', background: 'rgba(255,255,255,0.3)',
                borderRadius: '50%', display: 'inline-block', margin: '0 2px'
              }} />
              <span style={{ color: '#d0f4ff', fontSize: 15, fontWeight: 800 }}>{fmt(cartTotal)}</span>
            </>
          ) : (
            <span>Cart</span>
          )}
        </button>
      </div>

      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(46,157,200,0.15), rgba(94,206,245,0.10))',
        border: '1px solid rgba(46,157,200,0.25)',
        borderRadius: 16, padding: '18px 24px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap'
      }}>
        <div style={{ fontSize: 38 }}>🛍️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Welcome to {business.name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Add items to your cart to calculate the total price before visiting the shop counter.
          </div>
        </div>
        {cartCount > 0 && (
          <button
            onClick={() => setCartOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(46,157,200,0.15)', border: '1px solid rgba(46,157,200,0.35)',
              borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
              color: 'var(--primary-dark)', fontFamily: 'inherit', fontWeight: 600, fontSize: 13
            }}
          >
            View Cart <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <div className="search-bar">
          <Search size={16} />
          <input
            className="form-control"
            placeholder="Search products by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <Package size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
          <p>Loading products...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <Package size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
          <p style={{ fontSize: 16, fontWeight: 600 }}>
            {search ? 'No matching products found.' : 'No products available yet.'}
          </p>
        </div>
      ) : (
        <>
          {/* Product Cards */}
          <div className="product-grid" style={{ marginBottom: 28 }}>
            {filtered.map(p => {
              const qty = inCart(p._id)
              const outOfStock = p.quantity === 0
              return (
                <div key={p._id} className="product-card" style={{ opacity: outOfStock ? 0.65 : 1 }}>
                  {/* Name + stock badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div className="product-name">{p.name}</div>
                    <span className={`badge ${outOfStock ? 'badge-danger' : p.quantity < 10 ? 'badge-warning' : 'badge-success'}`}>
                      {outOfStock ? 'Out of Stock' : `Qty: ${p.quantity}`}
                    </span>
                  </div>

                  {/* Price */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                      MRP: <span style={{ textDecoration: 'line-through' }}>{fmt(p.mrp)}</span>
                    </div>
                    <div className="product-price-row">
                      <span className="price-final">{fmt(p.finalPrice)}</span>
                      {p.discountPercent > 0 && (
                        <span className="price-badge">{p.discountPercent}% OFF</span>
                      )}
                    </div>
                  </div>

                  {/* Add to cart / Qty controls */}
                  {outOfStock ? (
                    <button disabled style={{
                      width: '100%', padding: '9px', borderRadius: 10, border: '1px solid var(--border)',
                      background: 'transparent', color: 'var(--text-muted)', fontFamily: 'inherit',
                      fontWeight: 600, fontSize: 13, cursor: 'not-allowed'
                    }}>
                      Out of Stock
                    </button>
                  ) : qty === 0 ? (
                    <button
                      onClick={() => addToCart(p)}
                      style={{
                        width: '100%', padding: '9px', borderRadius: 10, border: 'none',
                        background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
                        color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: 13,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 6, boxShadow: '0 3px 12px rgba(46,157,200,0.35)', transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <Plus size={14} /> Add to Cart
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      {/* Stepper */}
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        background: 'var(--bg)', border: '1px solid var(--primary)',
                        borderRadius: 10, overflow: 'hidden', flex: 1
                      }}>
                        <button
                          onClick={() => changeQty(p._id, qty - 1)}
                          style={{
                            padding: '8px 12px', background: 'none', border: 'none',
                            color: 'var(--text)', cursor: 'pointer', fontSize: 16
                          }}
                        ><Minus size={13} /></button>
                        <span style={{
                          flex: 1, textAlign: 'center', fontWeight: 800, fontSize: 14,
                          borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)'
                        }}>{qty}</span>
                        <button
                          onClick={() => changeQty(p._id, qty + 1)}
                          disabled={qty >= p.quantity}
                          style={{
                            padding: '8px 12px', background: 'none', border: 'none',
                            color: 'var(--text)', cursor: qty >= p.quantity ? 'not-allowed' : 'pointer',
                            fontSize: 16, opacity: qty >= p.quantity ? 0.35 : 1
                          }}
                        ><Plus size={13} /></button>
                      </div>
                      {/* Item total chip */}
                      <div style={{
                        background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: 10, padding: '6px 10px', textAlign: 'center', minWidth: 72
                      }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)' }}>
                          {fmt(p.finalPrice * qty)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Product Details Table */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Product Details</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Product Name</th><th>Available Qty</th>
                    <th>MRP</th><th>Discount</th><th>Final Price</th><th>In Cart</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={p._id}>
                      <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>
                        <span className={`badge ${p.quantity === 0 ? 'badge-danger' : p.quantity < 10 ? 'badge-warning' : 'badge-success'}`}>
                          {p.quantity}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>{fmt(p.mrp)}</td>
                      <td><span className="badge badge-warning">{p.discountPercent}% OFF</span></td>
                      <td style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 15 }}>{fmt(p.finalPrice)}</td>
                      <td>
                        {inCart(p._id) > 0 ? (
                          <span className="badge badge-purple">× {inCart(p._id)}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Floating cart bar — visible when cart has items */}
      {cartCount > 0 && !cartOpen && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 150, animation: 'fadeUp 0.3s ease'
        }}>
          <style>{`
            @keyframes fadeUp {
              from { transform: translateX(-50%) translateY(20px); opacity: 0; }
              to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
            }
          `}</style>
          <button
            onClick={() => setCartOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'linear-gradient(135deg, var(--primary-dark), var(--primary-light))',
              border: '1px solid rgba(46,157,200,0.4)',
              borderRadius: 50, padding: '14px 28px',
              cursor: 'pointer', color: '#fff', fontFamily: 'inherit',
              fontWeight: 700, fontSize: 15,
              boxShadow: '0 8px 32px rgba(46,157,200,0.45)',
              whiteSpace: 'nowrap'
            }}
          >
            <ShoppingCart size={20} />
            <span>{cartCount} item{cartCount !== 1 ? 's' : ''} in cart</span>
            <span style={{ height: 20, width: 1, background: 'rgba(255,255,255,0.3)' }} />
            <span style={{ color: '#a5f3d4', fontSize: 17 }}>{fmt(cartTotal)}</span>
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
