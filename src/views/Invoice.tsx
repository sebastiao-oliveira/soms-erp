import { useState, useMemo, useCallback } from 'react'
import { useStore } from '../context/StoreContext'

type InvoiceStatus = 'draft' | 'issued' | 'cancelled'

interface Invoice {
  id: string
  number: string
  client: string
  clientDoc: string
  items: { description: string; qty: number; unitPrice: number }[]
  total: number
  status: InvoiceStatus
  issuedAt: string
  notes: string
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export default function Invoice() {
  const { clients, sales } = useStore()
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try { return JSON.parse(localStorage.getItem('invoices') || '[]') } catch { return [] }
  })
  const [showForm, setShowForm] = useState(false)
  const [preview, setPreview] = useState<Invoice | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [form, setForm] = useState({
    client: '',
    clientDoc: '',
    notes: '',
    fromSale: '',
    items: [{ description: '', qty: 1, unitPrice: 0 }],
  })

  const fmt = (v: number) => (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const save = useCallback((list: Invoice[]) => {
    setInvoices(list)
    localStorage.setItem('invoices', JSON.stringify(list))
  }, [])

  // Preenche itens a partir de uma venda
  const fillFromSale = useCallback((saleId: string) => {
    const sale = sales.find(s => s.id === saleId)
    if (!sale) return
    const client = clients.find(c => c.id === sale.client)
    setForm(f => ({
      ...f,
      fromSale: saleId,
      client: client?.name ?? sale.client ?? '',
      clientDoc: client?.document ?? '',
      items: sale.items.map(i => ({ description: i.name, qty: i.qty, unitPrice: i.price }))
    }))
  }, [sales, clients])

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { description: '', qty: 1, unitPrice: 0 }] }))
  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const updateItem = (i: number, field: string, value: string | number) =>
    setForm(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item) }))

  const formTotal = useMemo(() =>
    form.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0)
  , [form.items])

  const nextNumber = useMemo(() => {
    const nums = invoices.map(inv => parseInt(inv.number)).filter(Boolean)
    return String((nums.length > 0 ? Math.max(...nums) : 0) + 1).padStart(6, '0')
  }, [invoices])

  const handleIssue = useCallback(() => {
    if (!form.client) { showToast('error', 'Informe o cliente'); return }
    if (form.items.some(i => !i.description)) { showToast('error', 'Preencha todos os itens'); return }

    const newInv: Invoice = {
      id: generateId(),
      number: nextNumber,
      client: form.client,
      clientDoc: form.clientDoc,
      items: form.items.map(i => ({ ...i, qty: Number(i.qty), unitPrice: Number(i.unitPrice) })),
      total: formTotal,
      status: 'issued',
      issuedAt: new Date().toISOString(),
      notes: form.notes,
    }
    const updated = [newInv, ...invoices]
    save(updated)
    showToast('success', `NF-e #${newInv.number} emitida!`)
    setShowForm(false)
    setPreview(newInv)
    setForm({ client: '', clientDoc: '', notes: '', fromSale: '', items: [{ description: '', qty: 1, unitPrice: 0 }] })
  }, [form, formTotal, invoices, nextNumber, save, showToast])

  const handleCancel = useCallback((id: string) => {
    if (!window.confirm('Cancelar esta nota fiscal?')) return
    save(invoices.map(inv => inv.id === id ? { ...inv, status: 'cancelled' } : inv))
    showToast('success', 'NF-e cancelada')
    if (preview?.id === id) setPreview(prev => prev ? { ...prev, status: 'cancelled' } : null)
  }, [invoices, preview, save, showToast])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const STATUS_LABEL: Record<InvoiceStatus, string> = {
    draft: 'Rascunho', issued: 'Emitida', cancelled: 'Cancelada'
  }
  const STATUS_CLASS: Record<InvoiceStatus, string> = {
    draft: 'badge-info', issued: 'badge-success', cancelled: 'badge-danger'
  }

  const completedSales = useMemo(() => sales.filter(s => s.status === 'completed'), [sales])

  return (
    <div>
      {toast && (
        <div className="toast" style={{ background: toast.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>NF-e / Notas Fiscais</h2>
        <button onClick={() => setShowForm(true)}>+ Nova NF-e</button>
      </div>

      {/* Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Total Emitidas</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{invoices.filter(i => i.status === 'issued').length}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Valor Total</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#44dd88' }}>
            R$ {fmt(invoices.filter(i => i.status === 'issued').reduce((s, i) => s + i.total, 0))}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Canceladas</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#ff4444' }}>
            {invoices.filter(i => i.status === 'cancelled').length}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Vendas sem NF-e</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#ffaa00' }}>
            {completedSales.filter(s => !invoices.some(inv => inv.fromSale === s.id)).length}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: preview ? '1fr 380px' : '1fr', gap: 16 }}>
        {/* Lista de NF-e */}
        <div className="panel">
          {invoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🧾</div>
              Nenhuma NF-e emitida ainda
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {invoices.map(inv => (
                <div key={inv.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: 8,
                  opacity: inv.status === 'cancelled' ? 0.5 : 1,
                  cursor: 'pointer',
                  border: preview?.id === inv.id ? '1px solid var(--accent)' : '1px solid transparent'
                }} onClick={() => setPreview(inv)}>
                  <div>
                    <div style={{ fontWeight: 700 }}>NF-e #{inv.number}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {inv.client} • {new Date(inv.issuedAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 700 }}>R$ {fmt(inv.total)}</span>
                    <span className={`badge ${STATUS_CLASS[inv.status]}`}>{STATUS_LABEL[inv.status]}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview da NF-e selecionada */}
        {preview && (
          <div className="panel" style={{ position: 'sticky', top: 80, alignSelf: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>NF-e #{preview.number}</h3>
              <button className="muted" onClick={() => setPreview(null)} style={{ padding: '4px 10px' }}>✕</button>
            </div>

            <div style={{ fontSize: 13, marginBottom: 16 }}>
              <div className="stat-row"><span style={{ color: 'var(--text-muted)' }}>Cliente</span><strong>{preview.client}</strong></div>
              {preview.clientDoc && <div className="stat-row"><span style={{ color: 'var(--text-muted)' }}>Doc.</span><span>{preview.clientDoc}</span></div>}
              <div className="stat-row"><span style={{ color: 'var(--text-muted)' }}>Emissão</span><span>{new Date(preview.issuedAt).toLocaleString('pt-BR')}</span></div>
              <div className="stat-row"><span style={{ color: 'var(--text-muted)' }}>Status</span><span className={`badge ${STATUS_CLASS[preview.status]}`}>{STATUS_LABEL[preview.status]}</span></div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>ITENS</div>
              {preview.items.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13
                }}>
                  <span>{item.description} × {item.qty}</span>
                  <span style={{ fontWeight: 600 }}>R$ {fmt(item.qty * item.unitPrice)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontWeight: 700, fontSize: 15 }}>
                <span>Total</span>
                <span style={{ color: '#44dd88' }}>R$ {fmt(preview.total)}</span>
              </div>
            </div>

            {preview.notes && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Obs: {preview.notes}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="muted" onClick={handlePrint} style={{ flex: 1 }}>🖨 Imprimir</button>
              {preview.status === 'issued' && (
                <button className="muted" onClick={() => handleCancel(preview.id)}
                  style={{ flex: 1, color: '#ff4444' }}>Cancelar</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal nova NF-e */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 560 }}>
            <h3 style={{ marginTop: 0 }}>Nova NF-e #{nextNumber}</h3>

            {/* Importar de venda */}
            <div style={{ marginBottom: 16 }}>
              <label>Importar de uma venda (opcional)</label>
              <select value={form.fromSale} onChange={e => fillFromSale(e.target.value)}>
                <option value="">Selecione uma venda...</option>
                {completedSales.map(s => (
                  <option key={s.id} value={s.id}>
                    Venda #{s.id.slice(-6)} — R$ {fmt(s.total)} — {new Date(s.date).toLocaleDateString('pt-BR')}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label>Cliente *</label>
                <input value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                  placeholder="Nome do cliente" />
              </div>
              <div>
                <label>CPF / CNPJ</label>
                <input value={form.clientDoc} onChange={e => setForm(f => ({ ...f, clientDoc: e.target.value }))}
                  placeholder="000.000.000-00" />
              </div>
            </div>

            {/* Itens */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ margin: 0 }}>Itens</label>
                <button type="button" className="muted" onClick={addItem}
                  style={{ padding: '4px 12px', fontSize: 12 }}>+ Item</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {form.items.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 90px 32px', gap: 6 }}>
                    <input placeholder="Descrição" value={item.description}
                      onChange={e => updateItem(i, 'description', e.target.value)} />
                    <input type="number" placeholder="Qtd" value={item.qty}
                      onChange={e => updateItem(i, 'qty', e.target.value)} />
                    <input type="number" step="0.01" placeholder="Preço" value={item.unitPrice}
                      onChange={e => updateItem(i, 'unitPrice', e.target.value)} />
                    <button type="button" className="muted" onClick={() => removeItem(i)}
                      style={{ padding: '4px', color: '#ff4444' }}>✕</button>
                  </div>
                ))}
              </div>
              {formTotal > 0 && (
                <div style={{ textAlign: 'right', marginTop: 8, fontWeight: 700, color: '#44dd88' }}>
                  Total: R$ {fmt(formTotal)}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label>Observações</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} placeholder="Informações adicionais..." />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="muted" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancelar</button>
              <button onClick={handleIssue} style={{ flex: 1 }}>Emitir NF-e</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
