import { useEffect, useState, useCallback } from 'react'
import api from '../../api/axios'
import toast from 'react-hot-toast'
import {
  Calendar, ChevronDown, ChevronUp, Trash2,
  LayoutList, BarChart2, AlertTriangle, X, Download
} from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

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

/* ─── Main Component ──────────────────────────────── */
export default function SalesHistory() {
  const [bills,       setBills]       = useState([])
  const [daywise,     setDaywise]     = useState([])
  const [date,        setDate]        = useState('')
  const [loading,     setLoading]     = useState(false)
  const [viewMode,    setViewMode]    = useState('list')   // 'list' | 'daywise'
  const [expanded,    setExpanded]    = useState(null)
  const [expandedDay, setExpandedDay] = useState(null)
  const [toDelete,    setToDelete]    = useState(null)     // bill object pending deletion
  const [deleting,    setDeleting]    = useState(false)

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
  const totalRevenue  = bills.reduce((s, b) => s + b.grandTotal,    0)
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

  /* ── Download Report ────────────────────────────── */
  const [downloading, setDownloading] = useState(false)
  const handleDownloadReport = async () => {
    if (!date) return toast.error('Please select a date first')
    if (bills.length === 0) return toast.error('No sales data for this date')
    
    setDownloading(true)
    const reportDateStr = fmtDay(date)
    
    // Create hidden report container
    const root = document.createElement('div')
    root.style.position = 'absolute'
    root.style.left = '-9999px'
    root.style.top = '0'
    root.style.width = '800px' // A4 approx width in px
    root.style.background = '#ffffff'
    root.style.color = '#000000'
    root.style.padding = '40px'
    root.style.fontFamily = 'Inter, system-ui, sans-serif'
    
    root.innerHTML = `
      <div style="border-bottom: 2px solid #4c1d95; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h1 style="margin: 0; color: #4c1d95; font-size: 24px; font-weight: 800;">JSK STATIONERY SHOP</h1>
          <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px; font-weight: 600;">Daily Sales Report</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-size: 14px; color: #374151;">Date: <strong>${reportDateStr}</strong></p>
          <p style="margin: 2px 0 0; font-size: 11px; color: #9ca3af;">Generated on ${new Date().toLocaleString()}</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px;">
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center;">
          <p style="margin: 0 0 5px; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Day Total</p>
          <p style="margin: 0; font-size: 18px; font-weight: 800; color: #059669;">${fmt(totalRevenue)}</p>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center;">
          <p style="margin: 0 0 5px; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Total Bills</p>
          <p style="margin: 0; font-size: 18px; font-weight: 800; color: #4c1d95;">${bills.length}</p>
        </div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center;">
          <p style="margin: 0 0 5px; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Total Discount</p>
          <p style="margin: 0; font-size: 18px; font-weight: 800; color: #d97706;">${fmt(totalDiscount)}</p>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #000000;">
        <thead>
          <tr style="background: #f3f4f6; text-align: left; color: #4c1d95;">
            <th style="padding: 10px; border: 1px solid #e5e7eb;">BILL ID</th>
            <th style="padding: 10px; border: 1px solid #e5e7eb;">CUSTOMER</th>
            <th style="padding: 10px; border: 1px solid #e5e7eb;">TIME</th>
            <th style="padding: 10px; border: 1px solid #e5e7eb;">ITEMS</th>
            <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${bills.map(b => `
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 700; color: #111827;">${b.billNumber}</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb; color: #374151;">${b.customerName}</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb; color: #374151;">${fmtTime(b.createdAt)}</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb; color: #374151;">${b.items.map(i => i.productName).join(', ')}</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: 800; color: #111827;">${fmt(b.grandTotal)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-top: 40px; border-top: 1px dashed #e5e7eb; padding-top: 15px; text-align: center; color: #9ca3af; font-size: 10px;">
        This is an electronically generated report from JSK Stationery Management System.
      </div>
    `
    
    document.body.appendChild(root)
    
    try {
      const canvas = await html2canvas(root, { scale: 2 })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`JSK_Report_${date}.pdf`)
      toast.success('Report downloaded successfully!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate PDF')
    } finally {
      document.body.removeChild(root)
      setDownloading(false)
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
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
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
                boxShadow: viewMode === id ? '0 4px 12px rgba(108,62,184,0.4)' : 'none'
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters – only shown in list mode */}
      {viewMode === 'list' && (
        <div className="card" style={{ marginBottom: 20 }}>
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
                  onClick={handleDownloadReport}
                  disabled={downloading || bills.length === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(139,92,246,0.3)',
                    cursor: downloading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700,
                    background: 'rgba(139,92,246,0.1)', color: 'var(--primary-light)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={e => {
                    if (!downloading) {
                      e.currentTarget.style.background = 'rgba(139,92,246,0.2)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(139,92,246,0.2)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!downloading) {
                      e.currentTarget.style.background = 'rgba(139,92,246,0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }
                  }}
                >
                  <Download size={15} /> {downloading ? 'Generating...' : 'Download Report'}
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
            <div className="grid grid-3" style={{ marginBottom: 20 }}>
              <div className="stat-card" style={{ '--glow-color': 'rgba(16,185,129,0.15)' }}>
                <div className="stat-label">
                  {date ? `Revenue on ${fmtDate(date + 'T00:00:00')}` : 'Total Revenue'}
                </div>
                <div className="stat-value" style={{ color: 'var(--accent)' }}>{fmt(totalRevenue)}</div>
              </div>
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
          <div className="card">
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
            const allRevenue  = daywise.reduce((s, g) => s + g.totalRevenue,  0)
            const allDiscount = daywise.reduce((s, g) => s + g.totalDiscount, 0)
            const allBills    = daywise.reduce((s, g) => s + g.totalBills,    0)
            return (
              <div className="grid grid-3" style={{ marginBottom: 20 }}>
                <div className="stat-card" style={{ '--glow-color': 'rgba(16,185,129,0.15)' }}>
                  <div className="stat-label">Total Revenue (All Time)</div>
                  <div className="stat-value" style={{ color: 'var(--accent)' }}>{fmt(allRevenue)}</div>
                </div>
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

          <div className="card">
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
                          <div style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 16 }}>
                            {fmt(group.totalRevenue)}
                          </div>
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
    </div>
  )
}
