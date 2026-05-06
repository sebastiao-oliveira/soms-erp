import { useState, useMemo, useCallback } from 'react'
import { useStore, type Supplier, type PurchaseOrder } from '../context/StoreContext'

type Tab = 'fornecedores' | 'pedidos'

const EMPTY_SUPPLIER = {
  name: '', document: '', contact: '', phone: '',
  email: '', address: '', city: '', state: '', paymentTerm: '', notes: ''
}

const STATUS_LABEL: Record<PurchaseOrder['status'], string> = {
  draft: 'Rascunho', sent: 'Enviado', received: 'Recebido', cancelled: 'Cancelado'
}
const STATUS_CLASS: Record<PurchaseOrder['status'], string> = {
  draft: 'badge-info', sent: 'badge-warning', received: 'badge-success', cancelled: 'badge-danger'
}

export default function Suppliers() {
  const { suppliers, purchaseOrders, products, addSupplier, updateSupplier, deleteSupplier,
    addPurchaseOrder, updatePurchaseOrder, receivePurchaseOrder, deletePurchaseOrder } = useStore()

  const [tab, setTab]               = useState<Tab>('fornecedores')
  const [showSupForm, setShowSupForm] = useState(false)
  const [showPOForm, setShowPOForm]   = useState(false)
  const [editingSup, setEditingSup]   = useState<Supplier | null>(null)
  const [selectedPO, setSelectedPO]   = useState<PurchaseOrder | null>(null)
  const [supForm, setSupForm]         = useState(EMPTY_SUPPLIER)
  const [toast, setToast]             = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Formulário de pedido
  const [poForm, setPOForm] = useState({
    supplierId: '',
    expectedDate: '',
    notes: '',
    items: [{ productId: '', productName: '', qty: 1, unitCost: 0 }]
  })

  const fmt = (v: number) => (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ── Fornecedor ───────────────────────────────────────
  const openSupForm = (s?: Supplier) => {
    setEditingSup(s ?? null)
    setSupForm(s ? { name: s.name, document: s.document, contact: s.contact,
      phone: s.phone, email: s.email, address: s.address,
      city: s.city ?? '', state: s.state ?? '',
      paymentTerm: s.paymentTerm ?? '', notes: s.notes ?? '' }
      : EMPTY_SUPPLIER)
    setShowSupForm(true)
  }

  const saveSup = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!supForm.name) { showToast('error', 'Nome obrigatório'); return }
    if (editingSup) {
      updateSupplier(editingSup.id, supForm)
      showToast('success', 'Fornecedor atualizado!')
    } else {
      addSupplier(supForm)
      showToast('success', 'Fornecedor cadastrado!')
    }
    setShowSupForm(false)
  }, [supForm, editingSup, addSupplier, updateSupplier, showToast])

  const deleteSup = (s: Supplier) => {
    if (!window.confirm(`Excluir ${s.name}?`)) return
    deleteSupplier(s.id)
    showToast('success', 'Removido')
  }

  // ── Pedido de compra ─────────────────────────────────
  const addPOItem = () => setPOForm(f => ({
    ...f, items: [...f.items, { productId: '', productName: '', qty: 1, unitCost: 0 }]
  }))
  const removePOItem = (i: number) => setPOForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const updatePOItem = (i: number, field: string, value: string | number) =>
    setPOForm(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item) }))

  const selectProduct = (i: number, productId: string) => {
    const p = products.find(pr => pr.id === productId)
    setPOForm(f => ({
      ...f, items: f.items.map((item, idx) => idx === i
        ? { ...item, productId, productName: p?.name ?? '', unitCost: p?.cost ?? 0 }
        : item)
    }))
  }

  const poTotal = useMemo(() =>
    poForm.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitCost) || 0), 0)
  , [poForm.items])

  const savePO = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!poForm.supplierId) { showToast('error', 'Selecione o fornecedor'); return }
    if (poForm.items.some(i => !i.productId)) { showToast('error', 'Selecione os produtos'); return }
    addPurchaseOrder({
      supplierId: poForm.supplierId,
      items: poForm.items.map(i => ({
        productId: i.productId, productName: i.productName,
        qty: Number(i.qty), unitCost: Number(i.unitCost)
      })),
      total: poTotal,
      status: 'draft',
      expectedDate: poForm.expectedDate,
      notes: poForm.notes,
    })
    showToast('success', 'Pedido criado!')
    setShowPOForm(false)
    setPOForm({ supplierId: '', expectedDate: '', notes: '', items: [{ productId: '', productName: '', qty: 1, unitCost: 0 }] })
  }, [poForm, poTotal, addPurchaseOrder, showToast])

  const handleReceive = (po: PurchaseOrder) => {
    if (!window.confirm('Confirmar recebimento? O estoque será atualizado.')) return
    receivePurchaseOrder(po.id)
    setSelectedPO(null)
    showToast('success', 'Recebimento registrado! Estoque atualizado.')
  }

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600,
    background: tab === t ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
    color: tab === t ? '#000' : '#fff', transition: 'all 0.2s'
  })

  const pendingOrders  = purchaseOrders.filter(o => o.status !== 'received' && o.status !== 'cancelled')
  const totalPurchased = purchaseOrders.filter(o => o.status === 'received').reduce((s, o) => s + o.total, 0)

  return (
    <div>
      {toast && (
        <div className="toast" style={{ background: toast.type === 'success' ? 'var(--success)' : 'var(--danger)' }}>
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Fornecedores</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="muted" onClick={() => openSupForm()}>+ Fornecedor</button>
          <button onClick={() => setShowPOForm(true)}>+ Pedido de Compra</button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Fornecedores</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{suppliers.length}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Pedidos Abertos</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: pendingOrders.length > 0 ? '#ffaa00' : '#44dd88' }}>
            {pendingOrders.length}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Total Comprado</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#4a9eff' }}>R$ {fmt(totalPurchased)}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Pedidos Total</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{purchaseOrders.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={tabStyle('fornecedores')} onClick={() => setTab('fornecedores')}>Fornecedores</button>
        <button style={tabStyle('pedidos')} onClick={() => setTab('pedidos')}>
          Pedidos de Compra
          {pendingOrders.length > 0 && (
            <span style={{ marginLeft: 6, background: '#ffaa00', color: '#000', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
              {pendingOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* ── FORNECEDORES ── */}
      {tab === 'fornecedores' && (
        <div className="panel">
          {suppliers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
              Nenhum fornecedor cadastrado
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {suppliers.map(s => {
                const myOrders = purchaseOrders.filter(o => o.supplierId === s.id && o.status === 'received')
                const total = myOrders.reduce((sum, o) => sum + o.total, 0)
                return (
                  <div key={s.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: 10
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {s.document && `CNPJ: ${s.document} • `}
                        {s.contact && `${s.contact} • `}
                        {s.phone}
                      </div>
                      {s.paymentTerm && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Prazo: {s.paymentTerm}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', marginRight: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#4a9eff' }}>R$ {fmt(total)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{myOrders.length} pedidos</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="muted" onClick={() => openSupForm(s)} style={{ padding: '6px 10px', fontSize: 12 }}>✏️</button>
                      <button className="muted" onClick={() => deleteSup(s)} style={{ padding: '6px 10px', fontSize: 12, color: '#ff4444' }}>✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PEDIDOS ── */}
      {tab === 'pedidos' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedPO ? '1fr 360px' : '1fr', gap: 16 }}>
          <div className="panel">
            {purchaseOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Nenhum pedido criado</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...purchaseOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(po => {
                  const sup = suppliers.find(s => s.id === po.supplierId)
                  return (
                    <div key={po.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: 10,
                      cursor: 'pointer',
                      border: selectedPO?.id === po.id ? '1px solid var(--accent)' : '1px solid transparent',
                      opacity: po.status === 'cancelled' ? 0.5 : 1
                    }} onClick={() => setSelectedPO(po)}>
                      <div>
                        <div style={{ fontWeight: 600 }}>OC#{po.id.slice(-6)} — {sup?.name ?? 'Fornecedor'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {new Date(po.createdAt).toLocaleDateString('pt-BR')}
                          {po.expectedDate && ` • Previsto: ${new Date(po.expectedDate).toLocaleDateString('pt-BR')}`}
                          {` • ${po.items.length} itens`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontWeight: 700 }}>R$ {fmt(po.total)}</span>
                        <span className={`badge ${STATUS_CLASS[po.status]}`}>{STATUS_LABEL[po.status]}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {selectedPO && (
            <div className="panel" style={{ position: 'sticky', top: 80, alignSelf: 'start' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>OC#{selectedPO.id.slice(-6)}</h3>
                <button className="muted" onClick={() => setSelectedPO(null)} style={{ padding: '4px 10px' }}>✕</button>
              </div>
              <div style={{ fontSize: 13, marginBottom: 16 }}>
                <div className="stat-row">
                  <span style={{ color: 'var(--text-muted)' }}>Fornecedor</span>
                  <strong>{suppliers.find(s => s.id === selectedPO.supplierId)?.name}</strong>
                </div>
                <div className="stat-row">
                  <span style={{ color: 'var(--text-muted)' }}>Status</span>
                  <span className={`badge ${STATUS_CLASS[selectedPO.status]}`}>{STATUS_LABEL[selectedPO.status]}</span>
                </div>
                <div className="stat-row">
                  <span style={{ color: 'var(--text-muted)' }}>Criado</span>
                  <span>{new Date(selectedPO.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                {selectedPO.expectedDate && (
                  <div className="stat-row">
                    <span style={{ color: 'var(--text-muted)' }}>Previsto</span>
                    <span>{new Date(selectedPO.expectedDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>ITENS</div>
                {selectedPO.items.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13
                  }}>
                    <span>{item.productName} × {item.qty}</span>
                    <span style={{ fontWeight: 600 }}>R$ {fmt(item.qty * item.unitCost)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontWeight: 700 }}>
                  <span>Total</span>
                  <span style={{ color: '#4a9eff' }}>R$ {fmt(selectedPO.total)}</span>
                </div>
              </div>
              {selectedPO.notes && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Obs: {selectedPO.notes}</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedPO.status === 'draft' && (
                  <button onClick={() => { updatePurchaseOrder(selectedPO.id, { status: 'sent' }); showToast('success', 'Pedido enviado!') }}>
                    Marcar como Enviado
                  </button>
                )}
                {(selectedPO.status === 'draft' || selectedPO.status === 'sent') && (
                  <button className="success" onClick={() => handleReceive(selectedPO)}>
                    ✓ Confirmar Recebimento
                  </button>
                )}
                {selectedPO.status !== 'received' && selectedPO.status !== 'cancelled' && (
                  <button className="muted" style={{ color: '#ff4444' }}
                    onClick={() => { updatePurchaseOrder(selectedPO.id, { status: 'cancelled' }); setSelectedPO(null); showToast('success', 'Cancelado') }}>
                    Cancelar Pedido
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal fornecedor */}
      {showSupForm && (
        <div className="modal-overlay">
          <form className="modal-box" onSubmit={saveSup} style={{ maxWidth: 520 }}>
            <h3 style={{ marginTop: 0 }}>{editingSup ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div><label>Nome / Razão Social *</label>
                <input value={supForm.name} onChange={e => setSupForm(f => ({ ...f, name: e.target.value }))} required /></div>
              <div><label>CNPJ</label>
                <input value={supForm.document} onChange={e => setSupForm(f => ({ ...f, document: e.target.value }))} placeholder="00.000.000/0001-00" /></div>
            </div>
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div><label>Contato</label>
                <input value={supForm.contact} onChange={e => setSupForm(f => ({ ...f, contact: e.target.value }))} /></div>
              <div><label>Telefone</label>
                <input value={supForm.phone} onChange={e => setSupForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label>E-mail</label>
              <input type="email" value={supForm.email} onChange={e => setSupForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div><label>Cidade</label>
                <input value={supForm.city} onChange={e => setSupForm(f => ({ ...f, city: e.target.value }))} /></div>
              <div><label>UF</label>
                <input value={supForm.state} onChange={e => setSupForm(f => ({ ...f, state: e.target.value }))} maxLength={2} /></div>
            </div>
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div><label>Prazo de Pagamento</label>
                <input value={supForm.paymentTerm} onChange={e => setSupForm(f => ({ ...f, paymentTerm: e.target.value }))} placeholder="Ex: 30/60 dias" /></div>
              <div><label>Endereço</label>
                <input value={supForm.address} onChange={e => setSupForm(f => ({ ...f, address: e.target.value }))} /></div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label>Observações</label>
              <textarea value={supForm.notes} onChange={e => setSupForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="muted" onClick={() => setShowSupForm(false)} style={{ flex: 1 }}>Cancelar</button>
              <button type="submit" style={{ flex: 1 }}>{editingSup ? 'Salvar' : 'Cadastrar'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal pedido de compra */}
      {showPOForm && (
        <div className="modal-overlay">
          <form className="modal-box" onSubmit={savePO} style={{ maxWidth: 580 }}>
            <h3 style={{ marginTop: 0 }}>Novo Pedido de Compra</h3>
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div><label>Fornecedor *</label>
                <select value={poForm.supplierId} onChange={e => setPOForm(f => ({ ...f, supplierId: e.target.value }))} required>
                  <option value="">Selecione...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div><label>Data Prevista</label>
                <input type="date" value={poForm.expectedDate} onChange={e => setPOForm(f => ({ ...f, expectedDate: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ margin: 0 }}>Itens *</label>
                <button type="button" className="muted" onClick={addPOItem} style={{ padding: '4px 12px', fontSize: 12 }}>+ Item</button>
              </div>
              {poForm.items.map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 32px', gap: 6, marginBottom: 8 }}>
                  <select value={item.productId} onChange={e => selectProduct(i, e.target.value)}>
                    <option value="">Produto...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input type="number" placeholder="Qtd" value={item.qty}
                    onChange={e => updatePOItem(i, 'qty', e.target.value)} />
                  <input type="number" step="0.01" placeholder="Custo" value={item.unitCost}
                    onChange={e => updatePOItem(i, 'unitCost', e.target.value)} />
                  <button type="button" className="muted" onClick={() => removePOItem(i)}
                    style={{ padding: '4px', color: '#ff4444' }}>✕</button>
                </div>
              ))}
              {poTotal > 0 && (
                <div style={{ textAlign: 'right', fontWeight: 700, color: '#4a9eff' }}>
                  Total: R$ {fmt(poTotal)}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label>Observações</label>
              <textarea value={poForm.notes} onChange={e => setPOForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="muted" onClick={() => setShowPOForm(false)} style={{ flex: 1 }}>Cancelar</button>
              <button type="submit" style={{ flex: 1 }}>Criar Pedido</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
