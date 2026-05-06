import { useEffect, useState, useCallback } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import {
  Calendar, ChevronDown, ChevronUp, Trash2,
  LayoutList, BarChart2, AlertTriangle, X, Download, Pencil, Plus, Minus, Printer
} from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { business } from '../../config/business'

/* ─── helpers ─────────────────────────────────────── */
const fmt      = (n)  => `₹${Number(n).toFixed(2)}`
const fmtDate  = (d)  => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtTime  = (d)  => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
const fmtDay   = (ds) => {
  // ds is "YYYY-MM-DD"
  const [y, m, d] = ds.split('-')
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

/* ─── Delete Confirmation Modal ───────────────────── */
function DeleteModal({ bill, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 18, padding: '32px 28px', maxWidth: 420, width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        animation: 'modalPop 0.2s cubic-bezier(0.34,1.56,0.64,1)'
      }}>
        {/* Icon */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
        }}>
          <AlertTriangle size={26} color="#ef4444" />
        </div>

        <h3 style={{ fontSize: 18, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>
          Delete Bill?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 6 }}>
          You are about to permanently delete:
        </p>
        <div style={{
          background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '10px 14px', marginBottom: 20, textAlign: 'center'
        }}>
          <span className="badge badge-purple" style={{ marginRight: 8 }}>{bill.billNumber}</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{bill.customerName}</span>
          <span style={{ display: 'block', color: 'var(--accent)', fontWeight: 800, marginTop: 4 }}>
            {fmt(bill.grandTotal)}
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#f87171', textAlign: 'center', marginBottom: 24 }}>
          ⚠️ This action cannot be undone. Stock will be restored.
        </p>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
            <X size={14} /> Cancel
          </button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={onConfirm}>
            <Trash2 size={14} /> Delete Bill
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Edit Bill Modal ─────────────────────────────── */
function EditModal({ bill, onSave, onCancel }) {
  const [customerName, setCustomerName] = useState(bill.customerName)
  const [products,     setProducts]     = useState([])
  const [rows,         setRows]         = useState(
    bill.items.map(i => ({ productId: i.productId, productName: i.productName, quantity: i.quantity }))
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/products').then(({ data }) => setProducts(data)).catch(() => {})
  }, [])

  const setRow = (idx, field, val) => setRows(r => r.map((row, i) => i === idx ? { ...row, [field]: val } : row))
  const addRow = () => setRows(r => [...r, { productId: '', productName: '', quantity: 1 }])
  const removeRow = idx => setRows(r => r.filter((_, i) => i !== idx))

  const handleSave = async () => {
    if (rows.some(r => !r.productId || r.quantity < 1))
      return toast.error('Fill all product rows correctly')
    setSaving(true)
    try {
      const updated = await api.patch(`/bills/${bill._id}`, {
        customerName,
        items: rows.map(r => ({ productId: r.productId, quantity: Number(r.quantity) }))
      })
      toast.success('Bill updated!')
      onSave(updated.data)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update bill')
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>✏️ Edit Bill – {bill.billNumber}</h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        {/* Customer name */}
        <div className="form-group">
          <label className="form-label">Customer Name</label>
          <input className="form-control" value={customerName} onChange={e => setCustomerName(e.target.value)} />
        </div>

        {/* Product rows */}
        <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Products</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {rows.map((row, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                className="form-control"
                style={{ flex: 2 }}
                value={row.productId}
                onChange={e => {
                  const p = products.find(p => p._id === e.target.value)
                  setRow(idx, 'productId', e.target.value)
                  if (p) setRow(idx, 'productName', p.name)
                }}
              >
                <option value="">Select product…</option>
                {products.map(p => <option key={p._id} value={p._id}>{p.name} – ₹{p.finalPrice}</option>)}
              </select>
              <input
                type="number" min={1} className="form-control"
                style={{ width: 70 }}
                value={row.quantity}
                onChange={e => setRow(idx, 'quantity', e.target.value)}
              />
              <button onClick={() => removeRow(idx)} style={{ background: 'rgba(229,62,62,0.1)', border: '1px solid rgba(229,62,62,0.3)', borderRadius: 8, padding: '7px 9px', cursor: 'pointer', color: '#e53e3e' }}>
                <Minus size={13} />
              </button>
            </div>
          ))}
        </div>
        <button className="btn btn-secondary btn-sm" style={{ marginBottom: 20 }} onClick={addRow}>
          <Plus size={13} /> Add Product
        </button>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel} disabled={saving}><X size={14} /> Cancel</button>
          <button className="btn btn-primary"   style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
            <Pencil size={14} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Component ──────────────────────────────── */
export default function SalesHistory() {
  const [bills,       setBills]       = useState([])
  const [daywise,     setDaywise]     = useState([])
  const [date,        setDate]        = useState('')
  const [loading,     setLoading]     = useState(false)
  const [viewMode,    setViewMode]    = useState('list')   // 'list' | 'daywise'
  const [expanded,    setExpanded]    = useState(null)
  const [expandedDay, setExpandedDay] = useState(null)
  const [toDelete,    setToDelete]    = useState(null)
  const [deleting,    setDeleting]    = useState(false)
  const [toEdit,      setToEdit]      = useState(null)     // bill being edited

  /* fetch flat list (with optional date filter) */
  const fetchBills = useCallback(async (d = date) => {
    setLoading(true)
    try {
      const params = d ? `?date=${d}` : ''
      const { data } = await api.get(`/bills${params}`)
      setBills(data)
    } catch { toast.error('Failed to load bills') }
    finally { setLoading(false) }
  }, [date])

  /* fetch day-wise aggregation */
  const fetchDaywise = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/bills/daywise')
      setDaywise(data)
    } catch { toast.error('Failed to load day-wise data') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchBills()
    fetchDaywise()
  }, []) // eslint-disable-line

  /* when date changes, re-fetch list immediately */
  const applyFilter = () => fetchBills(date)
  const clearFilter = () => { setDate(''); fetchBills('') }

  /* derived metrics (from current filtered list) */
  const totalDiscount = bills.reduce((s, b) => s + b.totalDiscount, 0)

  /* delete flow */
  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await api.delete(`/bills/${toDelete._id}`)
      toast.success('Bill deleted & stock restored')
      setToDelete(null)
      setExpanded(null)
      // Refresh both views
      await Promise.all([fetchBills(date), fetchDaywise()])
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete bill')
    } finally { setDeleting(false) }
  }

  /* ── Print Report ────────────────────────────── */
  const [reportData, setReportData] = useState(null)
  const [savingReport, setSavingReport] = useState(false)
  
  const handlePrintReport = () => {
    if (!date) return toast.error('Please select a date first')
    const reportBills = bills.filter(b => {
      const d = new Date(b.createdAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === date;
    });
    if (reportBills.length === 0) return toast.error('No sales data for this date')
    
    setReportData({ date: fmtDay(date), bills: reportBills, revenue: reportBills.reduce((s, b) => s + b.grandTotal, 0), discount: reportBills.reduce((s, b) => s + b.totalDiscount, 0) })
    setTimeout(() => { window.print(); setReportData(null) }, 100)
  }

  const saveReportAsPDF = async () => {
    if (!date) return toast.error('Please select a date first')
    const reportBills = bills.filter(b => {
      const d = new Date(b.createdAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === date;
    });
    if (reportBills.length === 0) return toast.error('No sales data for this date')

    setSavingReport(true)
    const reportRevenue = reportBills.reduce((s, b) => s + b.grandTotal, 0)
    const reportDiscount = reportBills.reduce((s, b) => s + b.totalDiscount, 0)

    // Create a temporary element for high-quality capture
    const root = document.createElement('div')
    root.style.width = '800px'
    root.style.padding = '40px'
    root.style.background = '#fff'
    root.style.color = '#000'
    root.style.fontFamily = 'Inter, sans-serif'
    root.innerHTML = `
      <div style="border-bottom: 2px solid #4c1d95; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h1 style="margin: 0; color: #4c1d95; font-size: 24px;">${business.name.toUpperCase()}</h1>
          <p style="margin: 5px 0; color: #666; font-size: 12px;">${business.address}</p>
          <h2 style="margin: 10px 0 0; font-size: 16px;">Daily Sales Report</h2>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-size: 14px;">Date: <strong>${fmtDay(date)}</strong></p>
          <p style="margin: 5px 0; font-size: 10px; color: #999;">Generated: ${new Date().toLocaleString()}</p>
        </div>
      </div>
      <div style="display: flex; gap: 20px; margin-bottom: 20px;">
        <div style="flex: 1; border: 1px solid #eee; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #888; text-transform: uppercase;">Revenue</div>
          <div style="font-size: 18px; font-weight: 800;">₹${reportRevenue.toFixed(2)}</div>
        </div>
        <div style="flex: 1; border: 1px solid #eee; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #888; text-transform: uppercase;">Bills</div>
          <div style="font-size: 18px; font-weight: 800;">${reportBills.length}</div>
        </div>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead style="background: #f8f9fa;">
          <tr>
            <th style="border: 1px solid #eee; padding: 8px; text-align: left;">Bill ID</th>
            <th style="border: 1px solid #eee; padding: 8px; text-align: left;">Customer</th>
            <th style="border: 1px solid #eee; padding: 8px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${reportBills.map(b => `
            <tr>
              <td style="border: 1px solid #eee; padding: 8px;">${b.billNumber}</td>
              <td style="border: 1px solid #eee; padding: 8px;">${b.customerName}</td>
              <td style="border: 1px solid #eee; padding: 8px; text-align: right; font-weight: 700;">₹${b.grandTotal.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    document.body.appendChild(root)
    try {
      const canvas = await html2canvas(root, { scale: 3 })
      const img = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const w = pdf.internal.pageSize.getWidth()
      const h = (canvas.height * w) / canvas.width
      pdf.addImage(img, 'PNG', 0, 0, w, h)
      pdf.save(`Report_${date}.pdf`)
      toast.success('Report Saved!')
    } catch (err) {
      toast.error('Failed to save report')
    } finally {
      document.body.removeChild(root)
      setSavingReport(false)
    }
  }

  /* ── BillRow ──────────────────────────────────────── */
  const BillRow = ({ b }) => (
    <div key={b._id} style={{
      border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px',
        background: expanded === b._id ? 'var(--bg-card2)' : 'var(--bg)',
        flexWrap: 'wrap', gap: 8
      }}>
        {/* Left – clickable to expand */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: 'pointer', minWidth: 0 }}
          onClick={() => setExpanded(expanded === b._id ? null : b._id)}
        >
          <span className="badge badge-purple" style={{ flexShrink: 0 }}>{b.billNumber}</span>
          <span style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {b.customerName}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 12, flexShrink: 0 }}>{b.items.length} item{b.items.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Right – amount + delete + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => setExpanded(expanded === b._id ? null : b._id)}>
            <div style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 16 }}>{fmt(b.grandTotal)}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{fmtDate(b.createdAt)} · {fmtTime(b.createdAt)}</div>
          </div>

          {/* Edit button */}
          <button
            title="Edit this bill (exchange/price update)"
            onClick={(e) => { e.stopPropagation(); setToEdit(b) }}
            style={{
              background: 'rgba(59,168,208,0.1)', border: '1px solid rgba(59,168,208,0.3)',
              borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', flexShrink: 0
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,168,208,0.22)'; e.currentTarget.style.borderColor = 'var(--primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,168,208,0.1)';  e.currentTarget.style.borderColor = 'rgba(59,168,208,0.3)' }}
          >
            <Pencil size={14} />
          </button>
          {/* Delete button */}
          <button
            title="Delete this bill"
            onClick={(e) => { e.stopPropagation(); setToDelete(b) }}
            style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#ef4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', flexShrink: 0
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)' }}
          >
            <Trash2 size={14} />
          </button>

          <div style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === b._id ? null : b._id)}>
            {expanded === b._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {/* Expanded items */}
      {expanded === b._id && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Product</th><th>Qty</th><th>MRP</th>
                  <th>Discount</th><th>Final Rate</th><th>Item Total</th>
                </tr>
              </thead>
              <tbody>
                {b.items.map((item, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{item.productName}</td>
                    <td>{item.quantity}</td>
                    <td style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>{fmt(item.mrp)}</td>
                    <td><span className="badge badge-warning">{item.discountPercent}%</span></td>
                    <td style={{ color: 'var(--accent)' }}>{fmt(item.finalPrice)}</td>
                    <td style={{ fontWeight: 700 }}>{fmt(item.itemTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: 24,
            marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Subtotal: {fmt(b.subtotal)}</span>
            <span style={{ fontSize: 13, color: '#34d399' }}>Discount: -{fmt(b.totalDiscount)}</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)' }}>Grand Total: {fmt(b.grandTotal)}</span>
          </div>
        </div>
      )}
    </div>
  )

  /* ── Render ──────────────────────────────────────── */
  return (
    <div>
      {/* keyframe for modal pop */}
      <style>{`
        @keyframes modalPop {
          from { transform: scale(0.88); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
      `}</style>

      {/* Edit modal */}
      {toEdit && (
        <EditModal
          bill={toEdit}
          onSave={(updated) => {
            setBills(prev => prev.map(b => b._id === updated._id ? updated : b))
            setToEdit(null)
          }}
          onCancel={() => setToEdit(null)}
        />
      )}
      {/* Delete confirmation modal */}
      {toDelete && !deleting && (
        <DeleteModal
          bill={toDelete}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
      {/* Deleting overlay */}
      {deleting && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ color: 'var(--text)', fontSize: 16, fontWeight: 700 }}>Deleting…</div>
        </div>
      )}

      {/* Page heading */}
      <div className="no-print" style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>Sales History</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Filter by date or switch to day-wise view.</p>
        </div>

        {/* View mode toggle */}
        <div style={{
          display: 'flex', background: 'var(--bg-card2)', borderRadius: 10,
          border: '1px solid var(--border)', padding: 4, gap: 4
        }}>
          {[
            { id: 'list',    icon: <LayoutList size={14} />, label: 'All Bills' },
            { id: 'daywise', icon: <BarChart2 size={14} />,  label: 'Day-Wise' },
          ].map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.2s',
                background: viewMode === id
                  ? 'linear-gradient(135deg, var(--primary), var(--primary-light))'
                  : 'transparent',
                color: viewMode === id ? '#fff' : 'var(--text-muted)',
                boxShadow: viewMode === id ? '0 4px 12px rgba(46,157,200,0.4)' : 'none'
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters – only shown in list mode */}
      {viewMode === 'list' && (
        <div className="card no-print" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
              <label className="form-label">Filter by Date</label>
              <input
                className="form-control" type="date" value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={applyFilter} disabled={loading}>
              <Calendar size={15} /> {loading ? 'Loading…' : 'Apply Filter'}
            </button>
            {date && (
              <>
                <button className="btn btn-secondary" onClick={clearFilter}>
                  Clear Filter
                </button>
                <button 
                  onClick={handlePrintReport}
                  disabled={bills.length === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 18px', borderRadius: 10, border: '1px solid var(--primary)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 700,
                    background: 'rgba(46,157,200,0.1)', color: 'var(--primary-dark)',
                    transition: 'all 0.2s',
                  }}
                >
                  <Printer size={15} /> Print Report
                </button>
                <button 
                  onClick={saveReportAsPDF}
                  disabled={savingReport || bills.length === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 18px', borderRadius: 10, border: '1px solid #10b981',
                    cursor: savingReport ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700,
                    background: 'rgba(16,185,129,0.1)', color: '#059669',
                    transition: 'all 0.2s',
                  }}
                >
                  <Download size={15} /> {savingReport ? 'Saving...' : 'Save PDF'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── LIST VIEW ─────────────────────────────── */}
      {viewMode === 'list' && (
        <>
          {/* Summary cards */}
          {(bills.length > 0 || date) && (
            <div className="grid grid-2 no-print" style={{ marginBottom: 20 }}>
              <div className="stat-card" style={{ '--glow-color': 'rgba(139,92,246,0.15)' }}>
                <div className="stat-label">
                  {date ? 'Bills on This Day' : 'Total Bills'}
                </div>
                <div className="stat-value" style={{ color: 'var(--primary-light)' }}>{bills.length}</div>
              </div>
              <div className="stat-card" style={{ '--glow-color': 'rgba(245,158,11,0.15)' }}>
                <div className="stat-label">
                  {date ? 'Discount on This Day' : 'Total Discount Given'}
                </div>
                <div className="stat-value" style={{ color: 'var(--secondary)' }}>{fmt(totalDiscount)}</div>
              </div>
            </div>
          )}

          {/* Bills list */}
          <div className="card no-print">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
              {date
                ? `Bills on ${new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`
                : 'All Bills'}
            </h3>
            {loading ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>Loading…</p>
            ) : bills.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0', fontSize: 14 }}>
                {date ? 'No bills found for this date.' : 'No bills generated yet.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {bills.map(b => <BillRow key={b._id} b={b} />)}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── DAY-WISE VIEW ─────────────────────────── */}
      {viewMode === 'daywise' && (
        <>
          {/* Overall summary */}
          {daywise.length > 0 && (() => {
            const allDiscount = daywise.reduce((s, g) => s + g.totalDiscount, 0)
            const allBills    = daywise.reduce((s, g) => s + g.totalBills,    0)
            return (
              <div className="grid grid-2 no-print" style={{ marginBottom: 20 }}>
                <div className="stat-card" style={{ '--glow-color': 'rgba(139,92,246,0.15)' }}>
                  <div className="stat-label">Total Bills (All Time)</div>
                  <div className="stat-value" style={{ color: 'var(--primary-light)' }}>{allBills}</div>
                </div>
                <div className="stat-card" style={{ '--glow-color': 'rgba(245,158,11,0.15)' }}>
                  <div className="stat-label">Total Discount (All Time)</div>
                  <div className="stat-value" style={{ color: 'var(--secondary)' }}>{fmt(allDiscount)}</div>
                </div>
              </div>
            )
          })()}

          <div className="card no-print">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Day-Wise Sales Breakdown</h3>
            {loading ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>Loading…</p>
            ) : daywise.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0', fontSize: 14 }}>
                No sales data yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {daywise.map(group => (
                  <div key={group.date} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>

                    {/* Day header row */}
                    <div
                      onClick={() => setExpandedDay(expandedDay === group.date ? null : group.date)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px', cursor: 'pointer', flexWrap: 'wrap', gap: 10,
                        background: expandedDay === group.date ? 'var(--bg-card2)' : 'var(--bg)'
                      }}
                    >
                      {/* Date + pill */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                          background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 800, color: '#fff'
                        }}>
                          {group.date.slice(8)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{fmtDay(group.date)}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                            {group.totalBills} bill{group.totalBills !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      {/* Right – revenue + discount + chevron */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: '#34d399', fontSize: 12 }}>
                            -{fmt(group.totalDiscount)} saved
                          </div>
                        </div>
                        {expandedDay === group.date ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    {/* Expanded individual bills for this day */}
                    {expandedDay === group.date && (
                      <div style={{ padding: '12px 12px 12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {group.bills
                          .slice()
                          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                          .map(b => <BillRow key={b._id} b={b} />)
                        }
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      {/* ── Hidden Printable Report ────────────────── */}
      {reportData && (
        <div className="print-report">
          <div style={{ borderBottom: '2px solid #4c1d95', paddingBottom: 10, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h1 style={{ margin: 0, color: '#4c1d95', fontSize: '21px', fontWeight: 800 }}>{business.name.toUpperCase()}</h1>
              <p style={{ margin: '3px 0 0', color: '#6b7280', fontSize: '10px' }}>{business.address}</p>
              <p style={{ margin: '3px 0 0', color: '#6b7280', fontSize: '12px', fontWeight: 600 }}>Daily Sales Report</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#374151' }}>Date: <strong>{reportData.date}</strong></p>
              <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#9ca3af' }}>Generated on {new Date().toLocaleString()}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 7, padding: 9, textAlign: 'center' }}>
              <p style={{ margin: '0 0 3px', fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Day Total</p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#059669' }}>{fmt(reportData.revenue)}</p>
            </div>
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 7, padding: 9, textAlign: 'center' }}>
              <p style={{ margin: '0 0 3px', fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Bills</p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#4c1d95' }}>{reportData.bills.length}</p>
            </div>
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 7, padding: 9, textAlign: 'center' }}>
              <p style={{ margin: '0 0 3px', fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Discount</p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#d97706' }}>{fmt(reportData.discount)}</p>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', color: '#000000' }}>
            <thead>
              <tr style={{ background: '#f3f4f6', textAlign: 'left', color: '#4c1d95' }}>
                <th style={{ padding: '5px 7px', border: '1px solid #e5e7eb' }}>BILL ID</th>
                <th style={{ padding: '5px 7px', border: '1px solid #e5e7eb' }}>CUSTOMER</th>
                <th style={{ padding: '5px 7px', border: '1px solid #e5e7eb' }}>TIME</th>
                <th style={{ padding: '5px 7px', border: '1px solid #e5e7eb' }}>ITEMS</th>
                <th style={{ padding: '5px 7px', border: '1px solid #e5e7eb', textAlign: 'right' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {reportData.bills.map(b => (
                <tr key={b._id}>
                  <td style={{ padding: '5px 7px', border: '1px solid #e5e7eb', fontWeight: 700, color: '#111827' }}>{b.billNumber}</td>
                  <td style={{ padding: '5px 7px', border: '1px solid #e5e7eb', color: '#374151' }}>{b.customerName}</td>
                  <td style={{ padding: '5px 7px', border: '1px solid #e5e7eb', color: '#374151' }}>{fmtTime(b.createdAt)}</td>
                  <td style={{ padding: '5px 7px', border: '1px solid #e5e7eb', color: '#374151' }}>{b.items.map(i => i.productName).join(', ')}</td>
                  <td style={{ padding: '5px 7px', border: '1px solid #e5e7eb', textAlign: 'right', fontWeight: 800, color: '#111827' }}>{fmt(b.grandTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 20, borderTop: '1px dashed #e5e7eb', paddingTop: 10, textAlign: 'center', color: '#9ca3af', fontSize: 9 }}>
            This is an electronically generated report from {business.name}.
          </div>
        </div>
      )}
    </div>
  )
}
